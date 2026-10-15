import { describe, expect, it } from 'vitest'
import { createSignedInApp, json, storyFixture } from '../fakes'

const validBody = {
    content: { component: 'Post', title: 'Hello', long_text: '<p>Body</p>' },
}

const candidates = (folder: string, base: string) =>
    [base, ...Array.from({ length: 49 }, (_, index) => `${base}-${index + 2}`)]
        .map((slug) => `${folder}/${slug}`)
        .join(',')

const blogFolder = () => json({ stories: [{ id: 100, full_slug: 'blog' }] })

const created = (id = 55) => json({ story: storyFixture({ id }) }, { status: 201 })

const slugTaken = () => json({ slug: ['has already been taken'] }, { status: 422 })

const draftFixture = (overrides: Parameters<typeof storyFixture>[0] = {}) =>
    storyFixture({ published: false, first_published_at: null, ...overrides })

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

    it('creates posts inside the blog folder, named after the title and with its slug', async () => {
        const { request, calls } = await createSignedInApp(({ method, query }) => {
            if (method === 'POST') return created()
            return query.by_slugs ? json({ stories: [] }) : blogFolder()
        })
        const response = await request('/api/stories', {
            method: 'POST',
            body: JSON.stringify({ title: '  The Year of the Rust Rewrite ' }),
        })
        expect(response.status).toBe(201)
        expect(await response.json()).toEqual({ id: 55 })
        expect(calls[0]?.query).toEqual({ with_slug: 'blog', folder_only: '1' })
        expect(calls[1]?.query).toEqual({
            by_slugs: candidates('blog', 'year-rust-rewrite'),
            per_page: '50',
        })
        expect(calls[2]).toMatchObject({
            method: 'POST',
            path: 'stories',
            body: {
                story: {
                    name: 'The Year of the Rust Rewrite',
                    slug: 'year-rust-rewrite',
                    parent_id: 100,
                    content: { component: 'Post', title: 'The Year of the Rust Rewrite' },
                },
            },
        })
        const content = (calls[2]?.body as { story: { content: { date: string } } }).story.content
        expect(content.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('numbers the slug after the ones already taken', async () => {
        const { request, calls } = await createSignedInApp(({ method, query }) => {
            if (method === 'POST') return created()
            if (!query.by_slugs) return blogFolder()
            return json({
                stories: [
                    storyFixture({ id: 1, slug: 'new-post' }),
                    storyFixture({ id: 2, slug: 'new-post-2' }),
                ],
            })
        })
        await request('/api/stories', { method: 'POST', body: '{"title":"New post"}' })
        expect(calls.filter(({ method }) => method === 'POST')).toHaveLength(1)
        expect(calls[2]?.body).toMatchObject({ story: { slug: 'new-post-3' } })
    })

    it('moves on to the next slug when Storyblok reports the slug as taken', async () => {
        let attempts = 0
        const { request, calls } = await createSignedInApp(({ method, query }) => {
            if (method === 'POST') return ++attempts === 1 ? slugTaken() : created()
            return query.by_slugs ? json({ stories: [] }) : blogFolder()
        })
        const response = await request('/api/stories', {
            method: 'POST',
            body: '{"title":"New post"}',
        })
        expect(response.status).toBe(201)
        expect(
            calls
                .filter(({ method }) => method === 'POST')
                .map(({ body }) => (body as { story: { slug: string } }).story.slug)
        ).toEqual(['new-post', 'new-post-2'])
    })

    it('gives up when every numbered slug is taken', async () => {
        const { request, calls } = await createSignedInApp(({ query }) => {
            if (!query.by_slugs) return blogFolder()
            return json({
                stories: query.by_slugs
                    .split(',')
                    .map((fullSlug, id) =>
                        storyFixture({ id, slug: fullSlug.slice('blog/'.length) })
                    ),
            })
        })
        const response = await request('/api/stories', {
            method: 'POST',
            body: '{"title":"New post"}',
        })
        expect(response.status).toBe(409)
        expect(await response.json()).toEqual({ error: 'Too many posts share this title' })
        expect(calls.some(({ method }) => method === 'POST')).toBe(false)
    })

    it('stops after a few conflicting writes, whatever the case of the error', async () => {
        const { request, calls } = await createSignedInApp(({ method, query }) => {
            if (method === 'POST') return json(['Slug is already taken'], { status: 422 })
            return query.by_slugs ? json({ stories: [] }) : blogFolder()
        })
        const response = await request('/api/stories', {
            method: 'POST',
            body: '{"title":"New post"}',
        })
        expect(response.status).toBe(409)
        expect(
            calls
                .filter(({ method }) => method === 'POST')
                .map(({ body }) => (body as { story: { slug: string } }).story.slug)
        ).toEqual(['new-post', 'new-post-2', 'new-post-3'])
    })

    it('fails clearly when the blog folder is missing', async () => {
        const { request } = await createSignedInApp(() => json({ stories: [] }))
        const response = await request('/api/stories', {
            method: 'POST',
            body: JSON.stringify({ title: 'New' }),
        })
        expect(response.status).toBe(500)
        expect(await response.json()).toEqual({ error: 'Blog folder not found' })
    })

    it.each([
        { title: '' },
        { title: '   ' },
        { title: 'x'.repeat(256) },
        { name: 'New', slug: 'new' },
    ])('rejects %j', async (body) => {
        const { request, calls } = await createSignedInApp(() => json({}))
        const response = await request('/api/stories', {
            method: 'POST',
            body: JSON.stringify(body),
        })
        expect(response.status).toBe(400)
        expect(calls).toHaveLength(0)
    })

    it('forwards upstream validation errors that are not about the slug', async () => {
        const { request, calls } = await createSignedInApp(({ method, query }) => {
            if (method === 'POST') return json({ content: ['is invalid'] }, { status: 422 })
            return query.by_slugs ? json({ stories: [] }) : blogFolder()
        })
        const response = await request('/api/stories', {
            method: 'POST',
            body: JSON.stringify({ title: 'New' }),
        })
        expect(response.status).toBe(422)
        expect(await response.json()).toEqual({ error: 'content is invalid' })
        expect(calls.filter(({ method }) => method === 'POST')).toHaveLength(1)
    })

    it('returns a blog post with its public URL', async () => {
        const { request, calls } = await createSignedInApp(() => json({ story: storyFixture() }))
        const response = await request('/api/stories/7')
        expect(calls[0]?.path).toBe('stories/7')
        expect(await response.json()).toEqual({
            id: 7,
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
                : json({ story: storyFixture({ name: 'Hello' }) })
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
        expect(calls.map(({ method }) => method)).not.toContain('PUT')
    })

    it('fixes the slug of a restored draft whose name already matches its title', async () => {
        let restored = false
        const { request, calls } = await createSignedInApp(({ method, path, query }) => {
            if (path.endsWith('restore_with')) {
                restored = true
                return json({})
            }
            if (query.by_slugs) return json({ stories: [] })
            if (method === 'PUT') return json({ story: draftFixture() })
            const story = restored
                ? { name: 'Original Title', slug: 'newer-title' }
                : { name: 'Newer Title', slug: 'newer-title' }
            return json({
                story: draftFixture({
                    ...story,
                    content: { component: 'Post', title: story.name },
                }),
            })
        })
        await request('/api/stories/7/versions/2/restore', { method: 'POST' })
        expect(calls.at(-1)).toMatchObject({
            method: 'PUT',
            body: { story: { name: 'Original Title', slug: 'original-title' } },
        })
    })

    it('renames a restored draft after its restored title', async () => {
        let restored = false
        const { request, calls } = await createSignedInApp(({ method, path, query }) => {
            if (path.endsWith('restore_with')) {
                restored = true
                return json({})
            }
            if (query.by_slugs) return json({ stories: [] })
            if (method === 'PUT') return json({ story: draftFixture() })
            const title = restored ? 'Original Title' : 'Hello'
            return json({
                story: draftFixture({
                    name: 'Hello',
                    slug: 'hello',
                    content: { component: 'Post', title },
                }),
            })
        })
        const response = await request('/api/stories/7/versions/2/restore', { method: 'POST' })
        expect(response.status).toBe(204)
        expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
            'GET stories/7',
            'GET stories/7/restore_with',
            'GET stories/7',
            'GET stories',
            'PUT stories/7',
        ])
        expect(calls[4]?.body).toEqual({
            story: {
                name: 'Original Title',
                slug: 'original-title',
                content: { component: 'Post', title: 'Original Title' },
            },
            publish: false,
        })
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
            ['/api/stories/7/duplicate', { method: 'POST', body: '{"title":"Copy"}' }],
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
            story: { name: 'Hello', slug: 'hello-world', content: validBody.content },
            publish: false,
        })

        await request('/api/stories/7', {
            method: 'PUT',
            body: JSON.stringify({ ...validBody, publish: true }),
        })
        expect(calls[3]?.body).toMatchObject({ publish: true })
    })

    it('regenerates the slug from the title until the post is first published', async () => {
        const { request, calls } = await createSignedInApp(({ query }) =>
            query.by_slugs
                ? json({ stories: [] })
                : json({ story: draftFixture({ slug: 'old-title' }) })
        )
        const content = { component: 'Post', title: 'Café Culture in the Age of AI' }
        await request('/api/stories/7', { method: 'PUT', body: JSON.stringify({ content }) })
        expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
            'GET stories/7',
            'GET stories',
            'PUT stories/7',
        ])
        expect(calls[1]?.query.by_slugs).toBe(candidates('blog', 'cafe-culture-age-ai'))
        expect(calls[2]?.body).toEqual({
            story: { name: 'Café Culture in the Age of AI', slug: 'cafe-culture-age-ai', content },
            publish: false,
        })
    })

    it('keeps its own numbered slug while another post holds the plain one', async () => {
        const { request, calls } = await createSignedInApp(({ query }) =>
            query.by_slugs
                ? json({
                      stories: [
                          storyFixture({ id: 8, slug: 'hello' }),
                          storyFixture({ id: 7, slug: 'hello-2' }),
                      ],
                  })
                : json({ story: draftFixture({ slug: 'hello-2' }) })
        )
        await request('/api/stories/7', { method: 'PUT', body: JSON.stringify(validBody) })
        expect(calls[2]?.body).toMatchObject({ story: { name: 'Hello', slug: 'hello-2' } })
    })

    it('skips the slug lookup when the slug already matches the title', async () => {
        const { request, calls } = await createSignedInApp(() =>
            json({ story: draftFixture({ slug: 'hello' }) })
        )
        await request('/api/stories/7', { method: 'PUT', body: JSON.stringify(validBody) })
        expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
            'GET stories/7',
            'PUT stories/7',
        ])
        expect(calls[1]?.body).toMatchObject({ story: { name: 'Hello', slug: 'hello' } })
    })

    it('keeps the published slug when the title changes', async () => {
        const { request, calls } = await createSignedInApp(() =>
            json({ story: storyFixture({ published: false }) })
        )
        const content = { component: 'Post', title: 'A brand new title' }
        await request('/api/stories/7', {
            method: 'PUT',
            body: JSON.stringify({ content, publish: true }),
        })
        expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
            'GET stories/7',
            'PUT stories/7',
        ])
        expect(calls[1]?.body).toEqual({
            story: { name: 'A brand new title', slug: 'hello-world', content },
            publish: true,
        })
    })

    it('keeps the name and slug while the title is blank', async () => {
        const { request, calls } = await createSignedInApp(() =>
            json({ story: draftFixture({ slug: 'kept' }) })
        )
        const content = { component: 'Post', title: '   ' }
        await request('/api/stories/7', { method: 'PUT', body: JSON.stringify({ content }) })
        expect(calls).toHaveLength(2)
        expect(calls[1]?.body).toMatchObject({ story: { name: 'Hello world', slug: 'kept' } })
    })

    it('moves on to the next slug when saving a draft collides with another post', async () => {
        let attempts = 0
        const { request, calls } = await createSignedInApp(({ method, query }) => {
            if (query.by_slugs) return json({ stories: [] })
            if (method === 'PUT')
                return ++attempts === 1 ? slugTaken() : json({ story: draftFixture() })
            return json({ story: draftFixture({ slug: 'old-title' }) })
        })
        const response = await request('/api/stories/7', {
            method: 'PUT',
            body: JSON.stringify({ content: { component: 'Post', title: 'New Title' } }),
        })
        expect(response.status).toBe(200)
        expect(
            calls
                .filter(({ method }) => method === 'PUT')
                .map(({ body }) => (body as { story: { slug: string } }).story.slug)
        ).toEqual(['new-title', 'new-title-2'])
    })

    it('forwards save errors that are not about the slug without retrying', async () => {
        const { request, calls } = await createSignedInApp(({ method, query }) => {
            if (query.by_slugs) return json({ stories: [] })
            if (method === 'PUT') return json({ content: ['is invalid'] }, { status: 422 })
            return json({ story: draftFixture({ slug: 'old-title' }) })
        })
        const response = await request('/api/stories/7', {
            method: 'PUT',
            body: JSON.stringify({ content: { component: 'Post', title: 'New Title' } }),
        })
        expect(response.status).toBe(422)
        expect(await response.json()).toEqual({ error: 'content is invalid' })
        expect(calls.filter(({ method }) => method === 'PUT')).toHaveLength(1)
    })

    it('keeps the slug of a live post even without a first publication date', async () => {
        const { request, calls } = await createSignedInApp(() =>
            json({ story: storyFixture({ published: true, first_published_at: null }) })
        )
        const content = { component: 'Post', title: 'Renamed' }
        await request('/api/stories/7', { method: 'PUT', body: JSON.stringify({ content }) })
        expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
            'GET stories/7',
            'PUT stories/7',
        ])
        expect(calls[1]?.body).toMatchObject({ story: { name: 'Renamed', slug: 'hello-world' } })
    })

    it.each([
        [{ title: 42 }, 'Hello world'],
        [{ title: `${'a'.repeat(254)}😀tail` }, `${'a'.repeat(254)}😀`],
    ])('names the story from the title %#', async (fields, name) => {
        const { request, calls } = await createSignedInApp(() => json({ story: storyFixture() }))
        const content = { component: 'Post', ...fields }
        await request('/api/stories/7', { method: 'PUT', body: JSON.stringify({ content }) })
        const story = (calls[1]?.body as { story: { name: string } }).story
        expect(story.name).toBe(name)
        expect(story.name.isWellFormed()).toBe(true)
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
        const { request, calls } = await createSignedInApp(({ method, query }) => {
            if (method === 'POST') return created(77)
            return query.by_slugs ? json({ stories: [] }) : json({ story: storyFixture() })
        })
        expect((await request('/api/stories/7', { method: 'DELETE' })).status).toBe(204)
        expect((await request('/api/stories/7/unpublish', { method: 'POST' })).status).toBe(204)
        const duplicate = await request('/api/stories/7/duplicate', {
            method: 'POST',
            body: JSON.stringify({ title: 'Hello (copy)' }),
        })
        expect(duplicate.status).toBe(201)
        expect(await duplicate.json()).toEqual({ id: 77 })
        expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
            'GET stories/7',
            'DELETE stories/7',
            'GET stories/7',
            'GET stories/7/unpublish',
            'GET stories/7',
            'GET stories',
            'POST stories',
        ])
        expect(calls[5]?.query.by_slugs).toBe(candidates('blog', 'hello-copy'))
        expect(calls[6]?.body).toEqual({
            story: {
                name: 'Hello (copy)',
                slug: 'hello-copy',
                parent_id: 100,
                content: { ...storyFixture().content, title: 'Hello (copy)' },
            },
        })
    })

    it('duplicates next to the original inside subfolders', async () => {
        const source = storyFixture({ full_slug: 'blog/archive/hello-world', parent_id: 300 })
        const { request, calls } = await createSignedInApp(({ method, query }) => {
            if (method === 'POST') return created(77)
            return query.by_slugs ? json({ stories: [] }) : json({ story: source })
        })
        await request('/api/stories/7/duplicate', { method: 'POST', body: '{"title":"Copy"}' })
        expect(calls[1]?.query.by_slugs).toBe(candidates('blog/archive', 'copy'))
        expect(calls[2]?.body).toMatchObject({ story: { slug: 'copy', parent_id: 300 } })
    })
})
