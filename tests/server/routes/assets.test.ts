import { describe, expect, it } from 'vitest'
import { assetFixture, createSignedInApp, json } from '../fakes'

const expectedAsset = {
    id: 9,
    url: 'https://a.storyblok.com/f/42/1280x720/abc/photo.webp',
    name: 'photo.webp',
    contentType: 'image/webp',
    size: 2048,
    width: 1280,
    height: 720,
    alt: 'A photo',
    title: '',
    copyright: '',
    source: '',
    folderId: 3,
    createdAt: '2025-03-01T10:00:00.000Z',
    deletedAt: null,
}

describe('asset routes', () => {
    it('lists assets with public URLs and dimensions', async () => {
        const { request, calls } = await createSignedInApp(() =>
            json(
                {
                    assets: [
                        assetFixture(),
                        assetFixture({
                            id: 10,
                            filename: 'https://a.storyblok.com/f/42/doc/file.pdf',
                            content_type: 'application/pdf',
                        }),
                    ],
                },
                { headers: { total: '2' } }
            )
        )
        const response = await request('/api/assets?folder=3&search=photo&page=1')
        expect(calls[0]?.query).toEqual({
            page: '1',
            per_page: '48',
            search: 'photo',
            in_folder: '3',
            sort_by: 'created_at:desc',
        })
        const body = await response.json()
        expect(body).toMatchObject({ total: 2, page: 1, perPage: 48 })
        expect(body.assets[0]).toEqual(expectedAsset)
        expect(body.assets[1]).toMatchObject({ width: null, height: null })
    })

    it('lists the trash and restores assets', async () => {
        const { request, calls } = await createSignedInApp(({ path }) =>
            path === 'assets'
                ? json(
                      { assets: [assetFixture({ content_type: null, deleted_at: '2025-04-01' })] },
                      { headers: { total: '1' } }
                  )
                : new Response(null, { status: 204 })
        )
        const trash = await (await request('/api/assets?trash=1&folder=3')).json()
        expect(calls[0]?.query).toMatchObject({ in_folder: '-1' })
        expect(trash.assets[0]).toMatchObject({ id: 9, contentType: '', deletedAt: '2025-04-01' })

        const restored = await request('/api/assets/restore', {
            method: 'POST',
            body: JSON.stringify({ ids: [9] }),
        })
        expect(restored.status).toBe(204)
        expect(calls[1]).toMatchObject({ path: 'assets/bulk_restore', body: { ids: [9] } })
    })

    it('signs uploads with dimensions and folder', async () => {
        const { request, calls } = await createSignedInApp(() =>
            json({
                id: 11,
                post_url: 'https://s3.amazonaws.com/a.storyblok.com',
                fields: { key: 'f/42/x/photo.png', policy: 'p' },
                pretty_url: 'ignored',
            })
        )
        const response = await request('/api/assets/uploads', {
            method: 'POST',
            body: JSON.stringify({
                filename: 'photo.png',
                width: 800,
                height: 600,
                folderId: 3,
            }),
        })
        expect(response.status).toBe(201)
        expect(await response.json()).toEqual({
            id: 11,
            url: 'https://s3.amazonaws.com/a.storyblok.com',
            fields: { key: 'f/42/x/photo.png', policy: 'p' },
        })
        expect(calls[0]).toMatchObject({
            method: 'POST',
            path: 'assets',
            body: {
                filename: 'photo.png',
                size: '800x600',
                asset_folder_id: 3,
                validate_upload: 1,
            },
        })
    })

    it('signs plain uploads without optional fields', async () => {
        const { request, calls } = await createSignedInApp(() =>
            json({ id: 12, post_url: 'https://s3.test', fields: {} })
        )
        await request('/api/assets/uploads', {
            method: 'POST',
            body: JSON.stringify({ filename: 'notes.txt' }),
        })
        expect(calls[0]?.body).toEqual({ filename: 'notes.txt', validate_upload: 1 })
    })

    it('finishes uploads and returns the stored asset', async () => {
        const { request, calls } = await createSignedInApp(({ path }) =>
            path.endsWith('finish_upload') ? json({ id: 9 }) : json(assetFixture())
        )
        const response = await request('/api/assets/9/finish', { method: 'POST' })
        expect(await response.json()).toEqual(expectedAsset)
        expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
            'GET assets/9/finish_upload',
            'GET assets/9',
        ])
    })

    it('updates metadata', async () => {
        const { request, calls } = await createSignedInApp(({ method }) =>
            method === 'PUT' ? new Response(null, { status: 204 }) : json(assetFixture())
        )
        const response = await request('/api/assets/9', {
            method: 'PUT',
            body: JSON.stringify({
                alt: ' New alt ',
                title: 'T',
                copyright: 'C',
                source: 'S',
                folderId: null,
            }),
        })
        expect(response.status).toBe(200)
        expect(calls[0]).toMatchObject({
            method: 'PUT',
            path: 'assets/9',
            body: {
                asset: {
                    alt: 'New alt',
                    title: 'T',
                    copyright: 'C',
                    source: 'S',
                    asset_folder_id: null,
                },
            },
        })
    })

    it('moves and deletes in bulk', async () => {
        const { request, calls } = await createSignedInApp(
            () => new Response(null, { status: 204 })
        )
        expect(
            (
                await request('/api/assets/move', {
                    method: 'POST',
                    body: JSON.stringify({ ids: [1, 2], folderId: 3 }),
                })
            ).status
        ).toBe(204)
        expect(
            (
                await request('/api/assets/delete', {
                    method: 'POST',
                    body: JSON.stringify({ ids: [1, 2] }),
                })
            ).status
        ).toBe(204)
        expect(calls[0]).toMatchObject({
            path: 'assets/bulk_update',
            body: { ids: [1, 2], asset: { asset_folder_id: 3 } },
        })
        expect(calls[1]).toMatchObject({ path: 'assets/bulk_destroy', body: { ids: [1, 2] } })
    })

    it.each([[[]], [Array.from({ length: 101 }, (_, index) => index + 1)], [[0]]])(
        'rejects invalid bulk ids %#',
        async (ids) => {
            const { request, calls } = await createSignedInApp(() => json({}))
            const response = await request('/api/assets/delete', {
                method: 'POST',
                body: JSON.stringify({ ids }),
            })
            expect(response.status).toBe(400)
            expect(calls).toHaveLength(0)
        }
    )
})
