import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRateLimiter, createStoryblok, StoryblokError } from './storyblok'
import { fakeFetch, json } from './test/fakes'

const client = (responder: Parameters<typeof fakeFetch>[0]) => {
    const { fetch, calls } = fakeFetch(responder)
    return {
        storyblok: createStoryblok({
            apiUrl: 'https://mapi.test/v1',
            spaceId: 42,
            token: 'tkn',
            fetch,
            requestsPerSecond: 1000,
        }),
        calls,
    }
}

afterEach(() => {
    vi.useRealTimers()
})

describe('createStoryblok', () => {
    it('sends authenticated requests with defined query params only', async () => {
        const { storyblok, calls } = client(() =>
            json({ stories: [] }, { headers: { total: '17' } })
        )
        const result = await storyblok.listStories({
            page: 2,
            text_search: undefined,
            story_only: 1,
        })
        expect(result.total).toBe(17)
        expect(calls[0]).toMatchObject({
            method: 'GET',
            path: 'stories',
            query: { page: '2', story_only: '1' },
        })
        expect(calls[0]?.headers.get('authorization')).toBe('tkn')
        expect(calls[0]?.headers.has('content-type')).toBe(false)
    })

    it('serializes JSON bodies', async () => {
        const { storyblok, calls } = client(() => json({ story: { id: 1 } }))
        await storyblok.updateStory(1, { name: 'A' }, true)
        expect(calls[0]).toMatchObject({
            method: 'PUT',
            path: 'stories/1',
            body: { story: { name: 'A' }, publish: true },
        })
        expect(calls[0]?.headers.get('content-type')).toBe('application/json')
    })

    it('retries rate limited requests', async () => {
        let attempts = 0
        const { storyblok } = client(() =>
            ++attempts < 3
                ? json({ error: 'slow down' }, { status: 429, headers: { 'retry-after': '0' } })
                : json({ tags: [{ name: 'a', taggings_count: 1 }] })
        )
        await expect(storyblok.listTags()).resolves.toEqual([{ name: 'a', taggings_count: 1 }])
        expect(attempts).toBe(3)
    })

    it('gives up after the retry budget', async () => {
        let attempts = 0
        const { storyblok } = client(() => {
            attempts++
            return json({ error: 'slow down' }, { status: 429, headers: { 'retry-after': '0' } })
        })
        await expect(storyblok.listTags()).rejects.toMatchObject({
            status: 429,
            message: 'slow down',
        })
        expect(attempts).toBe(6)
    })

    it.each([
        [['This record could not be found'], 'This record could not be found'],
        [{ error: 'Unauthorized' }, 'Unauthorized'],
        [{ slug: ['has already been taken'] }, 'slug has already been taken'],
    ])('describes error body %j', async (body, message) => {
        const { storyblok } = client(() => json(body, { status: 422 }))
        const error = await storyblok.getStory(1).catch((caught: unknown) => caught)
        expect(error).toBeInstanceOf(StoryblokError)
        expect(error).toMatchObject({ status: 422, message })
    })

    it('falls back to the status text for empty error bodies', async () => {
        const { storyblok } = client(
            () => new Response(null, { status: 500, statusText: 'Internal Server Error' })
        )
        await expect(storyblok.deleteStory(1)).rejects.toMatchObject({
            status: 500,
            message: 'Internal Server Error',
        })
    })

    it('accepts empty success bodies', async () => {
        const { storyblok, calls } = client(() => new Response(null, { status: 204 }))
        await expect(storyblok.deleteAssets([1, 2])).resolves.toBeUndefined()
        expect(calls[0]).toMatchObject({ path: 'assets/bulk_destroy', body: { ids: [1, 2] } })
    })

    it('backs off when the rate limit response has no Retry-After header', async () => {
        vi.useFakeTimers()
        let attempts = 0
        const { storyblok } = client(() =>
            ++attempts === 1
                ? json({ error: 'Rate limit reached' }, { status: 429 })
                : json({ tags: [] })
        )
        const pending = storyblok.listTags()
        await vi.advanceTimersByTimeAsync(250)
        expect(attempts).toBe(1)
        await vi.advanceTimersByTimeAsync(400)
        expect(attempts).toBe(2)
        await expect(pending).resolves.toEqual([])
    })
})

describe('createRateLimiter', () => {
    it('lets a burst through and delays the rest to the next window', async () => {
        vi.useFakeTimers()
        const acquire = createRateLimiter(2)
        const started: number[] = []
        const calls = [0, 1, 2].map((index) => acquire().then(() => started.push(index)))
        await vi.advanceTimersByTimeAsync(0)
        expect(started).toEqual([0, 1])
        await vi.advanceTimersByTimeAsync(999)
        expect(started).toEqual([0, 1])
        await vi.advanceTimersByTimeAsync(1)
        expect(started).toEqual([0, 1, 2])
        await Promise.all(calls)
    })
})
