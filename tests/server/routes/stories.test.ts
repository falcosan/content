import { describe, expect, it } from 'vitest'
import { createSignedInApp, json, storyFixture } from '../fakes'

const validBody = {
    name: 'Hello world',
    slug: 'hello-world',
    content: { component: 'Post', title: 'Hello', long_text: '<p>Body</p>' },
}

describe('story routes', () => {
    it('lists blog posts with their full content and status', async () => {
        const intro =
            'An introduction that is much longer than the fifty characters Storyblok keeps'
        const { request, calls } = await createSignedInApp(({ path }) => {
            if (path === '') return json({ space: { first_token: 'preview-token' } })
            if (path === '/v2/cdn/stories') {
                return json({
                    stories: [
                        {
                            id: 7,
                            content: {
                                title: 'Full title',
                                intro,
                                date: '2025-01-01',
                                file: { filename: 'https://a.storyblok.com/f/42/cover.png' },
                            },
                        },
                        { id: 8, content: { title: 'Changed' } },
                    ],
                })
            }
            return json(
                {
                    stories: [
                        storyFixture(),
                        storyFixture({ id: 8, published: true, unpublished_changes: true }),
                        storyFixture({ id: 9, published: false }),
                    ],
                },
                { headers: { total: '30' } }
            )
        })
        const response = await request('/api/stories?page=2&search=%20hello%20&status=published')
        expect(response.status).toBe(200)
        expect(calls[0]?.query).toEqual({
            starts_with: 'blog/',
            story_only: '1',
            sort_by: 'content.date:desc',
            per_page: '24',
            page: '2',
            text_search: 'hello',
            is_published: 'true',
        })
        expect(calls.at(-1)?.query).toEqual({
            by_ids: '7,8,9',
            version: 'draft',
            per_page: '3',
            token: 'preview-token',
        })
        const body = await response.json()
        expect(body).toMatchObject({ total: 30, page: 2, perPage: 24 })
        expect(body.stories[0]).toEqual({
            id: 7,
            status: 'published',
            updatedAt: '2025-01-02T10:00:00.000Z',
            title: 'Full title',
            intro,
            date: '2025-01-01',
            cover: 'https://a.storyblok.com/f/42/cover.png',
        })
        expect(body.stories[1]).toMatchObject({ status: 'changed', title: 'Changed' })
        expect(body.stories[2]).toMatchObject({
            status: 'draft',
            title: 'Hello world',
            intro: '',
            date: null,
            cover: null,
        })
    })

    it('fails the list when the full contents cannot be read', async () => {
        const { request } = await createSignedInApp(({ path }) => {
            if (path === '') return json({ space: { first_token: 'preview-token' } })
            if (path === '/v2/cdn/stories') return json(['Unauthorized'], { status: 401 })
            return json({ stories: [storyFixture()] })
        })
        const response = await request('/api/stories')
        expect(response.status).toBe(502)
        expect(await response.json()).toEqual({ error: 'Unauthorized' })
    })

    it('filters drafts and ignores blank searches', async () => {
        const { request, calls } = await createSignedInApp(() => json({ stories: [] }))
        await request('/api/stories?status=draft&search=%20%20')
        expect(calls[0]?.query).toMatchObject({ is_published: 'false', page: '1' })
        expect(calls[0]?.query).not.toHaveProperty('text_search')
    })

    it('rejects unknown filters', async () => {
        const { request, calls } = await createSignedInApp(() => json({ stories: [] }))
        const response = await request('/api/stories?status=archived')
        expect(response.status).toBe(400)
        expect(calls).toHaveLength(0)
    })

    it('creates posts inside the blog folder', async () => {
        const { request, calls } = await createSignedInApp(({ method }) =>
            method === 'GET'
                ? json({ stories: [{ id: 100, full_slug: 'blog' }] })
                : json({ story: storyFixture({ id: 55 }) }, { status: 201 })
        )
        const response = await request('/api/stories', {
            method: 'POST',
            body: JSON.stringify({ name: '  New post ', slug: 'new-post' }),
        })
        expect(response.status).toBe(201)
        expect(await response.json()).toEqual({ id: 55 })
        expect(calls[0]?.query).toEqual({ with_slug: 'blog', folder_only: '1' })
        expect(calls[1]).toMatchObject({
            method: 'POST',
            path: 'stories',
            body: {
                story: {
                    name: 'New post',
                    slug: 'new-post',
                    parent_id: 100,
                    content: { component: 'Post', title: 'New post' },
                },
            },
        })
        const content = (calls[1]?.body as { story: { content: { date: string } } }).story.content
        expect(content.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('fails clearly when the blog folder is missing', async () => {
        const { request } = await createSignedInApp(() => json({ stories: [] }))
        const response = await request('/api/stories', {
            method: 'POST',
            body: JSON.stringify({ name: 'New', slug: 'new' }),
        })
        expect(response.status).toBe(500)
        expect(await response.json()).toEqual({ error: 'Blog folder not found' })
    })

    it.each(['Not A Slug', 'trailing-', 'double--hyphen', ''])('rejects slug %j', async (slug) => {
        const { request, calls } = await createSignedInApp(() => json({}))
        const response = await request('/api/stories', {
            method: 'POST',
            body: JSON.stringify({ name: 'New', slug }),
        })
        expect(response.status).toBe(400)
        expect(calls).toHaveLength(0)
    })

    it('forwards upstream validation errors', async () => {
        const { request } = await createSignedInApp(({ method }) =>
            method === 'GET'
                ? json({ stories: [{ id: 100 }] })
                : json({ slug: ['has already been taken'] }, { status: 422 })
        )
        const response = await request('/api/stories', {
            method: 'POST',
            body: JSON.stringify({ name: 'New', slug: 'taken' }),
        })
        expect(response.status).toBe(422)
        expect(await response.json()).toEqual({ error: 'slug has already been taken' })
    })

    it('returns a blog post with its public URL', async () => {
        const { request, calls } = await createSignedInApp(() => json({ story: storyFixture() }))
        const response = await request('/api/stories/7')
        expect(calls[0]?.path).toBe('stories/7')
        expect(await response.json()).toEqual({
            id: 7,
            name: 'Hello world',
            slug: 'hello-world',
            status: 'published',
            url: 'https://example.com/blog/hello-world',
            updatedAt: '2025-01-02T10:00:00.000Z',
            firstPublishedAt: '2025-01-01T12:00:00.000Z',
            content: storyFixture().content,
        })
    })

    it('lists versions newest first and restores one', async () => {
        const { request, calls } = await createSignedInApp(({ path }) =>
            path === 'story_versions'
                ? json({
                      story_versions: [
                          {
                              id: 1,
                              created_at: '2025-01-01T10:00:00.000Z',
                              status: 'draft',
                              user: { friendly_name: 'Daniele' },
                          },
                          {
                              id: 2,
                              created_at: '2025-01-02T10:00:00.000Z',
                              status: 'published',
                              user: null,
                          },
                      ],
                  })
                : json({ story: storyFixture() })
        )
        const versions = await (await request('/api/stories/7/versions')).json()
        expect(versions).toEqual([
            { id: 2, createdAt: '2025-01-02T10:00:00.000Z', status: 'published', author: '' },
            { id: 1, createdAt: '2025-01-01T10:00:00.000Z', status: 'draft', author: 'Daniele' },
        ])
        expect(calls[1]?.query).toEqual({ by_story_id: '7', per_page: '100' })

        const restored = await request('/api/stories/7/versions/2/restore', { method: 'POST' })
        expect(restored.status).toBe(204)
        expect(calls[3]).toMatchObject({
            method: 'GET',
            path: 'stories/7/restore_with',
            query: { version: '2', versions_v2: 'true' },
        })
    })

    it('returns only the AI translated fields of the requested language', async () => {
        const { request, calls } = await createSignedInApp(({ path }) =>
            path === ''
                ? json({
                      space: {
                          languages: [
                              { code: 'es-custom', name: 'Spanish', ai_translation_code: 'es' },
                          ],
                      },
                  })
                : json({
                      story: storyFixture({
                          content: {
                              component: 'Post',
                              title: 'Hello',
                              'title__i18n__es-custom': 'Hola',
                              'intro__i18n__es-custom': 'Intro ES',
                              title__i18n__it: 'Ciao',
                          },
                      }),
                  })
        )
        const response = await request('/api/stories/7/translate', {
            method: 'POST',
            body: JSON.stringify({ language: 'es-custom' }),
        })
        expect(await response.json()).toEqual({
            content: { 'title__i18n__es-custom': 'Hola', 'intro__i18n__es-custom': 'Intro ES' },
        })
        expect(calls[2]).toMatchObject({
            method: 'PUT',
            path: 'stories/7/ai_translate',
            body: { code: 'es-custom', lang: 'es', overwrite: true },
        })
    })

    it('rejects translations into unknown languages', async () => {
        const { request, calls } = await createSignedInApp(({ path }) =>
            path === '' ? json({ space: { languages: [] } }) : json({ story: storyFixture() })
        )
        const response = await request('/api/stories/7/translate', {
            method: 'POST',
            body: JSON.stringify({ language: 'fr' }),
        })
        expect(response.status).toBe(404)
        expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
            'GET stories/7',
            'GET ',
        ])
    })

    it('hides stories outside the blog folder', async () => {
        const { request } = await createSignedInApp(() =>
            json({ story: storyFixture({ full_slug: 'home' }) })
        )
        const response = await request('/api/stories/7')
        expect(response.status).toBe(404)
    })

    it('refuses to change or read the history of stories outside the blog folder', async () => {
        const { request, calls } = await createSignedInApp(() =>
            json({ story: storyFixture({ full_slug: 'home' }) })
        )
        const attempts: [string, RequestInit][] = [
            ['/api/stories/7', { method: 'PUT', body: JSON.stringify(validBody) }],
            ['/api/stories/7', { method: 'DELETE' }],
            ['/api/stories/7/unpublish', { method: 'POST' }],
            ['/api/stories/7/versions', {}],
            ['/api/stories/7/versions/2/restore', { method: 'POST' }],
            ['/api/stories/7/translate', { method: 'POST', body: '{"language":"es"}' }],
            [
                '/api/stories/7/duplicate',
                { method: 'POST', body: JSON.stringify({ name: 'Copy', slug: 'copy' }) },
            ],
        ]
        for (const [url, init] of attempts) {
            expect((await request(url, init)).status).toBe(404)
        }
        expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual(
            Array.from({ length: attempts.length }, () => 'GET stories/7')
        )
    })

    it.each([
        ['folders', { is_folder: true, content: {} }],
        ['other content types', { content: { component: 'Page' } }],
    ])('hides %s inside the blog folder', async (_kind, overrides) => {
        const { request } = await createSignedInApp(() =>
            json({ story: { ...storyFixture({ full_slug: 'blog/archive' }), ...overrides } })
        )
        const response = await request('/api/stories/7')
        expect(response.status).toBe(404)
    })

    it('hides stories that are in the trash', async () => {
        const { request } = await createSignedInApp(() =>
            json({ story: storyFixture({ deleted_at: '2026-01-01T00:00:00.000Z' }) })
        )
        const response = await request('/api/stories/7')
        expect(response.status).toBe(404)
        expect(await response.json()).toEqual({ error: 'Story not found' })
    })

    it('maps upstream not found and auth failures', async () => {
        const notFound = await createSignedInApp(() =>
            json(['This record could not be found'], { status: 404 })
        )
        const missing = await notFound.request('/api/stories/7')
        expect(missing.status).toBe(404)
        expect(await missing.json()).toEqual({ error: 'This record could not be found' })

        const misconfigured = await createSignedInApp(() =>
            json({ error: 'Unauthorized' }, { status: 401 })
        )
        expect((await misconfigured.request('/api/stories/7')).status).toBe(502)
    })

    it('rejects non numeric ids', async () => {
        const { request, calls } = await createSignedInApp(() => json({}))
        expect((await request('/api/stories/abc')).status).toBe(400)
        expect(calls).toHaveLength(0)
    })

    it('saves drafts and publishes', async () => {
        const { request, calls } = await createSignedInApp(() =>
            json({ story: storyFixture({ unpublished_changes: true }) })
        )
        const draft = await request('/api/stories/7', {
            method: 'PUT',
            body: JSON.stringify(validBody),
        })
        expect(draft.status).toBe(200)
        expect((await draft.json()).status).toBe('changed')
        expect(calls[0]).toMatchObject({ method: 'GET', path: 'stories/7' })
        expect(calls[1]).toMatchObject({ method: 'PUT', path: 'stories/7' })
        expect(calls[1]?.body).toEqual({
            story: { name: 'Hello world', slug: 'hello-world', content: validBody.content },
            publish: false,
        })

        await request('/api/stories/7', {
            method: 'PUT',
            body: JSON.stringify({ ...validBody, publish: true }),
        })
        expect(calls[3]?.body).toMatchObject({ publish: true })
    })

    it('only accepts post content', async () => {
        const { request, calls } = await createSignedInApp(() => json({}))
        const response = await request('/api/stories/7', {
            method: 'PUT',
            body: JSON.stringify({ ...validBody, content: { component: 'Page' } }),
        })
        expect(response.status).toBe(400)
        expect(calls).toHaveLength(0)
    })

    it('deletes, unpublishes and duplicates', async () => {
        const { request, calls } = await createSignedInApp(({ path }) =>
            path.endsWith('duplicate')
                ? json({ story: storyFixture({ id: 77 }) })
                : json({ story: storyFixture() })
        )
        expect((await request('/api/stories/7', { method: 'DELETE' })).status).toBe(204)
        expect((await request('/api/stories/7/unpublish', { method: 'POST' })).status).toBe(204)
        const duplicate = await request('/api/stories/7/duplicate', {
            method: 'POST',
            body: JSON.stringify({ name: 'Copy', slug: 'copy' }),
        })
        expect(duplicate.status).toBe(201)
        expect(await duplicate.json()).toEqual({ id: 77 })
        expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
            'GET stories/7',
            'DELETE stories/7',
            'GET stories/7',
            'GET stories/7/unpublish',
            'GET stories/7',
            'PUT stories/7/duplicate',
        ])
        expect(calls[5]?.body).toEqual({ story: { name: 'Copy', slug: 'copy' } })
    })
})
