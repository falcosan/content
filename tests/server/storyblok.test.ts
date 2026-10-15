import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRateLimiter, createStoryblok, StoryblokError } from '../../server/storyblok'
import { fakeFetch, json } from './fakes'

const client = (responder: Parameters<typeof fakeFetch>[0]) => {
    const { fetch, calls } = fakeFetch(responder)
    return {
        storyblok: createStoryblok({
            apiUrl: 'https://mapi.test/v1',
            cdnUrl: 'https://cdn.test/v2/cdn',
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
    it('reads full story contents from the CDN with a cached preview token', async () => {
        let cdnFails = false
        const { storyblok, calls } = client(({ path }) => {
            if (path === '') return json({ space: { first_token: 'preview-token' } })
            if (cdnFails) return json(['Unauthorized'], { status: 401 })
            return json({ stories: [{ id: 1, content: { intro: 'Full intro' } }] })
        })

        expect(await storyblok.listStoryContents([])).toEqual([])
        expect(calls).toHaveLength(0)

        expect(await storyblok.listStoryContents([1, 2])).toEqual([
            { id: 1, content: { intro: 'Full intro' } },
        ])
        await storyblok.listStoryContents([1])
        expect(calls.map(({ path }) => path)).toEqual(['', '/v2/cdn/stories', '/v2/cdn/stories'])
        expect(calls[1]?.query).toEqual({
            by_ids: '1,2',
            version: 'draft',
            per_page: '2',
            token: 'preview-token',
        })
        expect(calls[1]?.headers.has('Authorization')).toBe(false)

        cdnFails = true
        await expect(storyblok.listStoryContents([1])).rejects.toMatchObject({ status: 401 })
        cdnFails = false
        await storyblok.listStoryContents([1])
        expect(calls.map(({ path }) => path).slice(3)).toEqual([
            '/v2/cdn/stories',
            '',
            '/v2/cdn/stories',
        ])
    })

    it('shares one preview token request between concurrent lists', async () => {
        const { storyblok, calls } = client(({ path }) =>
            path === '' ? json({ space: { first_token: 'preview-token' } }) : json({ stories: [] })
        )
        await Promise.all([storyblok.listStoryContents([1]), storyblok.listStoryContents([2])])
        expect(calls.map(({ path }) => path)).toEqual(['', '/v2/cdn/stories', '/v2/cdn/stories'])
    })

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

    it('asks for the preview token again after it could not be read', async () => {
        let spaceFails = true
        const { storyblok, calls } = client(({ path }) => {
            if (path === '') {
                return spaceFails
                    ? json(['Unavailable'], { status: 500 })
                    : json({ space: { first_token: 'preview-token' } })
            }
            return json({ stories: [] })
        })
        await expect(storyblok.listStoryContents([1])).rejects.toMatchObject({ status: 500 })
        spaceFails = false
        expect(await storyblok.listStoryContents([1])).toEqual([])
        expect(calls.map(({ path }) => path)).toEqual(['', '', '/v2/cdn/stories'])
    })

    it('fails clearly when the space has no preview token', async () => {
        const { storyblok, calls } = client(() => json({ space: { first_token: null } }))
        await expect(storyblok.listStoryContents([1])).rejects.toMatchObject({
            status: 502,
            message: 'The space has no preview token',
        })
        await expect(storyblok.listStoryContents([1])).rejects.toMatchObject({ status: 502 })
        expect(calls.map(({ path }) => path)).toEqual(['', ''])
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

    it('retries rate limited requests and releases their bodies', async () => {
        const limited: Response[] = []
        const { storyblok } = client(() => {
            if (limited.length === 2) {
                return json({ asset_folders: [{ id: 1, name: 'a', parent_id: null }] })
            }
            const response = json(
                { error: 'slow down' },
                { status: 429, headers: { 'retry-after': '0' } }
            )
            limited.push(response)
            return response
        })
        await expect(storyblok.listAssetFolders()).resolves.toEqual([
            { id: 1, name: 'a', parent_id: null },
        ])
        expect(limited.map(({ bodyUsed }) => bodyUsed)).toEqual([true, true])
    })

    it('gives up after the retry budget', async () => {
        let attempts = 0
        const { storyblok } = client(() => {
            attempts++
            return json({ error: 'slow down' }, { status: 429, headers: { 'retry-after': '0' } })
        })
        await expect(storyblok.listAssetFolders()).rejects.toMatchObject({
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
                : json({ asset_folders: [] })
        )
        const pending = storyblok.listAssetFolders()
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
