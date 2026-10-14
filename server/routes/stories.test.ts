import { describe, expect, it } from 'vitest'
import { createTestApp, json, signIn, storyFixture, type Responder } from '../test/fakes'

const setup = async (responder: Responder) => {
    const { app, calls } = createTestApp(responder)
    const cookie = await signIn(app)
    const request = (url: string, init: RequestInit = {}) =>
        app.request(url, {
            ...init,
            headers: { Cookie: cookie, 'Content-Type': 'application/json', ...init.headers },
        })
    return { request, calls }
}

const validBody = {
    name: 'Hello world',
    slug: 'hello-world',
    tags: ['news'],
    content: { component: 'Post', title: 'Hello', long_text: '<p>Body</p>' },
}

describe('story routes', () => {
    it('lists blog posts with summaries and status', async () => {
        const { request, calls } = await setup(() =>
            json(
                {
                    stories: [
                        storyFixture({
                            content: undefined,
                            content_summary: {
                                title: 'Summary title',
                                intro: 'Short',
                                date: '2025-01-01',
                                file: { filename: 'https://a.storyblok.com/f/42/cover.png' },
                            },
                        }),
                        storyFixture({ id: 8, published: true, unpublished_changes: true }),
                        storyFixture({ id: 9, published: false, content_summary: {} }),
                    ],
                },
                { headers: { total: '30' } }
            )
        )
        const response = await request('/api/stories?page=2&search=%20hello%20&status=published')
        expect(response.status).toBe(200)
        expect(calls[0]?.query).toEqual({
            starts_with: 'blog/',
            story_only: '1',
            with_summary: '1',
            sort_by: 'content.date:desc',
            per_page: '24',
            page: '2',
            text_search: 'hello',
            is_published: 'true',
        })
        const body = await response.json()
        expect(body).toMatchObject({ total: 30, page: 2, perPage: 24 })
        expect(body.stories[0]).toEqual({
            id: 7,
            name: 'Hello world',
            slug: 'hello-world',
            status: 'published',
            updatedAt: '2025-01-02T10:00:00.000Z',
            title: 'Summary title',
            intro: 'Short',
            date: '2025-01-01',
            cover: 'https://a.storyblok.com/f/42/cover.png',
        })
        expect(body.stories[1].status).toBe('changed')
        expect(body.stories[2]).toMatchObject({
            status: 'draft',
            title: 'Hello world',
            intro: '',
            date: null,
            cover: null,
        })
    })

    it('filters drafts and ignores blank searches', async () => {
        const { request, calls } = await setup(() => json({ stories: [] }))
        await request('/api/stories?status=draft&search=%20%20')
        expect(calls[0]?.query).toMatchObject({ is_published: 'false', page: '1' })
        expect(calls[0]?.query).not.toHaveProperty('text_search')
    })

    it('rejects unknown filters', async () => {
        const { request, calls } = await setup(() => json({ stories: [] }))
        const response = await request('/api/stories?status=archived')
        expect(response.status).toBe(400)
        expect(calls).toHaveLength(0)
    })

    it('creates posts inside the blog folder', async () => {
        const { request, calls } = await setup(({ method }) =>
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
        const { request } = await setup(() => json({ stories: [] }))
        const response = await request('/api/stories', {
            method: 'POST',
            body: JSON.stringify({ name: 'New', slug: 'new' }),
        })
        expect(response.status).toBe(500)
        expect(await response.json()).toEqual({ error: 'Blog folder not found' })
    })

    it.each(['Not A Slug', 'trailing-', 'double--hyphen', ''])('rejects slug %j', async (slug) => {
        const { request, calls } = await setup(() => json({}))
        const response = await request('/api/stories', {
            method: 'POST',
            body: JSON.stringify({ name: 'New', slug }),
        })
        expect(response.status).toBe(400)
        expect(calls).toHaveLength(0)
    })

    it('forwards upstream validation errors', async () => {
        const { request } = await setup(({ method }) =>
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
        const { request, calls } = await setup(() => json({ story: storyFixture() }))
        const response = await request('/api/stories/7')
        expect(calls[0]?.path).toBe('stories/7')
        expect(await response.json()).toEqual({
            id: 7,
            name: 'Hello world',
            slug: 'hello-world',
            fullSlug: 'blog/hello-world',
            status: 'published',
            url: 'https://example.com/blog/hello-world',
            tags: ['news'],
            updatedAt: '2025-01-02T10:00:00.000Z',
            firstPublishedAt: '2025-01-01T12:00:00.000Z',
            stageId: null,
            content: storyFixture().content,
        })
    })

    it('exposes the current workflow stage', async () => {
        const { request } = await setup(() =>
            json({ story: storyFixture({ stage: { workflow_stage_id: 12 } }) })
        )
        expect((await (await request('/api/stories/7')).json()).stageId).toBe(12)
    })

    it('lists versions newest first and restores one', async () => {
        const { request, calls } = await setup(({ path }) =>
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
        expect(calls[0]?.query).toEqual({ by_story_id: '7', per_page: '100' })

        const restored = await request('/api/stories/7/versions/2/restore', { method: 'POST' })
        expect(restored.status).toBe(204)
        expect(calls[1]).toMatchObject({
            method: 'GET',
            path: 'stories/7/restore_with',
            query: { version: '2', versions_v2: 'true' },
        })
    })

    it('returns only the AI translated fields of the requested language', async () => {
        const { request, calls } = await setup(({ path }) =>
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
        expect(calls[1]).toMatchObject({
            method: 'PUT',
            path: 'stories/7/ai_translate',
            body: { code: 'es-custom', lang: 'es', overwrite: true },
        })
    })

    it('rejects translations into unknown languages', async () => {
        const { request, calls } = await setup(() => json({ space: { languages: [] } }))
        const response = await request('/api/stories/7/translate', {
            method: 'POST',
            body: JSON.stringify({ language: 'fr' }),
        })
        expect(response.status).toBe(404)
        expect(calls).toHaveLength(1)
    })

    it('changes the workflow stage', async () => {
        const { request, calls } = await setup(() =>
            json({ workflow_stage_change: { id: 1 } }, { status: 201 })
        )
        const response = await request('/api/stories/7/stage', {
            method: 'POST',
            body: JSON.stringify({ stageId: 12 }),
        })
        expect(response.status).toBe(204)
        expect(calls[0]).toMatchObject({
            method: 'POST',
            path: 'workflow_stage_changes',
            body: { workflow_stage_change: { story_id: 7, workflow_stage_id: 12 } },
        })
        const invalid = await request('/api/stories/7/stage', {
            method: 'POST',
            body: JSON.stringify({ stageId: 'x' }),
        })
        expect(invalid.status).toBe(400)
    })

    it('hides stories outside the blog folder', async () => {
        const { request } = await setup(() => json({ story: storyFixture({ full_slug: 'home' }) }))
        const response = await request('/api/stories/7')
        expect(response.status).toBe(404)
    })

    it('hides stories that are in the trash', async () => {
        const { request } = await setup(() =>
            json({ story: storyFixture({ deleted_at: '2026-01-01T00:00:00.000Z' }) })
        )
        const response = await request('/api/stories/7')
        expect(response.status).toBe(404)
        expect(await response.json()).toEqual({ error: 'Story not found' })
    })

    it('maps upstream not found and auth failures', async () => {
        const notFound = await setup(() =>
            json(['This record could not be found'], { status: 404 })
        )
        const missing = await notFound.request('/api/stories/7')
        expect(missing.status).toBe(404)
        expect(await missing.json()).toEqual({ error: 'This record could not be found' })

        const misconfigured = await setup(() => json({ error: 'Unauthorized' }, { status: 401 }))
        expect((await misconfigured.request('/api/stories/7')).status).toBe(502)
    })

    it('rejects non numeric ids', async () => {
        const { request, calls } = await setup(() => json({}))
        expect((await request('/api/stories/abc')).status).toBe(400)
        expect(calls).toHaveLength(0)
    })

    it('saves drafts and publishes', async () => {
        const { request, calls } = await setup(() =>
            json({ story: storyFixture({ unpublished_changes: true }) })
        )
        const draft = await request('/api/stories/7', {
            method: 'PUT',
            body: JSON.stringify(validBody),
        })
        expect(draft.status).toBe(200)
        expect((await draft.json()).status).toBe('changed')
        expect(calls[0]).toMatchObject({
            method: 'PUT',
            path: 'stories/7',
            body: {
                story: {
                    name: 'Hello world',
                    slug: 'hello-world',
                    tag_list: ['news'],
                    content: validBody.content,
                },
                publish: false,
            },
        })

        await request('/api/stories/7', {
            method: 'PUT',
            body: JSON.stringify({ ...validBody, publish: true }),
        })
        expect(calls[1]?.body).toMatchObject({ publish: true })
    })

    it('only accepts post content', async () => {
        const { request, calls } = await setup(() => json({}))
        const response = await request('/api/stories/7', {
            method: 'PUT',
            body: JSON.stringify({ ...validBody, content: { component: 'Page' } }),
        })
        expect(response.status).toBe(400)
        expect(calls).toHaveLength(0)
    })

    it('deletes, unpublishes and duplicates', async () => {
        const { request, calls } = await setup(({ path }) =>
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
            'DELETE stories/7',
            'GET stories/7/unpublish',
            'PUT stories/7/duplicate',
        ])
        expect(calls[2]?.body).toEqual({ story: { name: 'Copy', slug: 'copy' } })
    })
})
