import { createHash } from 'node:crypto'
import { vi } from 'vitest'
import type { Env } from '#types/server'
import type { StoryblokAsset, StoryblokStory } from '#types/storyblok'
import type { RecordedRequest, Responder } from '#types/tests'
import { createApp } from '../../server/app'

export const PASSWORD = 'correct horse battery staple'

export const testEnv: Env = {
    STORY_ID_SPACE: 42,
    STORY_OAUTH_TOKEN: 'management-token',
    STORY_AUTH_EMAIL: 'editor@example.com',
    STORY_AUTH_PASSWORD: createHash('sha256').update(PASSWORD).digest('hex'),
    STORY_DOMAIN_PRO: 'https://example.com/',
    STORY_API_URL: 'https://mapi.test/v1',
    STORY_CDN_URL: 'https://cdn.test/v2/cdn',
}

export const json = (body: unknown, init: ResponseInit = {}) => Response.json(body, init)

export const fakeFetch = (responder: Responder) => {
    const calls: RecordedRequest[] = []
    const fetch = vi.fn<typeof globalThis.fetch>(async (input, init = {}) => {
        const url = new URL(input instanceof Request ? input.url : input)
        const request: RecordedRequest = {
            method: init.method ?? 'GET',
            path: url.pathname.replace(/^\/v1\/spaces\/\d+\//, ''),
            query: Object.fromEntries(url.searchParams),
            body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
            headers: new Headers(init.headers),
        }
        calls.push(request)
        return responder(request)
    })
    return { fetch, calls }
}

export const createTestApp = (responder: Responder = () => json({})) => {
    const { fetch, calls } = fakeFetch(responder)
    return { app: createApp(testEnv, fetch), calls }
}

export const signIn = async (app: ReturnType<typeof createApp>) => {
    const response = await app.request('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: testEnv.STORY_AUTH_EMAIL, password: PASSWORD }),
    })
    const cookie = response.headers.get('set-cookie')?.split(';')[0]
    if (!cookie) throw new Error('Sign in failed')
    return cookie
}

export const createSignedInApp = async (responder: Responder) => {
    const { app, calls } = createTestApp(responder)
    const cookie = await signIn(app)
    const request = (url: string, init: RequestInit = {}) =>
        app.request(url, {
            ...init,
            headers: { Cookie: cookie, 'Content-Type': 'application/json', ...init.headers },
        })
    return { request, calls }
}

export const storyFixture = (overrides: Partial<StoryblokStory> = {}): StoryblokStory => ({
    id: 7,
    name: 'Hello world',
    slug: 'hello-world',
    full_slug: 'blog/hello-world',
    parent_id: 100,
    published: true,
    unpublished_changes: false,
    updated_at: '2025-01-02T10:00:00.000Z',
    first_published_at: '2025-01-01T12:00:00.000Z',
    content: { component: 'Post', _uid: 'uid', title: 'Hello', intro: 'Intro', date: '2025-01-01' },
    ...overrides,
})

export const assetFixture = (overrides: Partial<StoryblokAsset> = {}): StoryblokAsset => ({
    id: 9,
    filename: 'https://s3.amazonaws.com/a.storyblok.com/f/42/1280x720/abc/photo.webp',
    short_filename: 'photo.webp',
    content_type: 'image/webp',
    content_length: 2048,
    alt: 'A photo',
    title: null,
    copyright: '',
    source: null,
    asset_folder_id: 3,
    created_at: '2025-03-01T10:00:00.000Z',
    ...overrides,
})
