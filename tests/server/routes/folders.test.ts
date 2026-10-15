import { describe, expect, it } from 'vitest'
import { createSignedInApp, json } from '../fakes'

describe('folder routes', () => {
    it('lists folders sorted by name', async () => {
        const { request } = await createSignedInApp(() =>
            json({
                asset_folders: [
                    { id: 2, name: 'Zebra', parent_id: null },
                    { id: 1, name: 'apple', parent_id: 2 },
                ],
            })
        )
        expect(await (await request('/api/folders')).json()).toEqual([
            { id: 1, name: 'apple', parentId: 2 },
            { id: 2, name: 'Zebra', parentId: null },
        ])
    })

    it('creates, renames and deletes folders', async () => {
        const { request, calls } = await createSignedInApp(({ method }) =>
            method === 'POST'
                ? json({ asset_folder: { id: 5, name: 'Covers', parent_id: 1 } }, { status: 201 })
                : new Response(null, { status: 204 })
        )
        const created = await request('/api/folders', {
            method: 'POST',
            body: JSON.stringify({ name: ' Covers ', parentId: 1 }),
        })
        expect(created.status).toBe(201)
        expect(await created.json()).toEqual({ id: 5, name: 'Covers', parentId: 1 })

        const renamed = await request('/api/folders/5', {
            method: 'PUT',
            body: JSON.stringify({ name: 'Heroes', parentId: null }),
        })
        expect(renamed.status).toBe(204)

        expect((await request('/api/folders/5', { method: 'DELETE' })).status).toBe(204)

        expect(calls.map(({ method, path, body }) => [method, path, body])).toEqual([
            ['POST', 'asset_folders', { asset_folder: { name: 'Covers', parent_id: 1 } }],
            ['PUT', 'asset_folders/5', { asset_folder: { name: 'Heroes', parent_id: null } }],
            ['DELETE', 'asset_folders/5', undefined],
        ])
    })

    it('requires a folder name', async () => {
        const { request, calls } = await createSignedInApp(() => json({}))
        const response = await request('/api/folders', {
            method: 'POST',
            body: JSON.stringify({ name: '   ' }),
        })
        expect(response.status).toBe(400)
        expect(calls).toHaveLength(0)
    })
})
