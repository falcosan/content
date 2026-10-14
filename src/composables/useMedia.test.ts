import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { createApp } from 'vue'
import { useDeleteAssets, useMoveAssets } from './useMedia'

const withMutations = () => {
    let mutations: {
        remove: ReturnType<typeof useDeleteAssets>
        move: ReturnType<typeof useMoveAssets>
    }
    const app = createApp({
        setup() {
            mutations = { remove: useDeleteAssets(), move: useMoveAssets() }
            return () => null
        },
    })
    app.use(VueQueryPlugin, { queryClient: new QueryClient() }).mount(document.createElement('div'))
    return { ...mutations!, unmount: () => app.unmount() }
}

const bodies = (fetch: Mock<typeof globalThis.fetch>) =>
    fetch.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('bulk asset mutations', () => {
    const ids = Array.from({ length: 150 }, (_, index) => index + 1)

    it('deletes in batches of one hundred', async () => {
        const fetch = vi.fn<typeof globalThis.fetch>(
            async () => new Response(null, { status: 204 })
        )
        vi.stubGlobal('fetch', fetch)
        const { remove, unmount } = withMutations()
        await remove.mutateAsync(ids)
        expect(bodies(fetch).map(({ ids: batch }) => batch.length)).toEqual([100, 50])
        expect(String(fetch.mock.calls[0]?.[0])).toBe('/api/assets/delete')
        unmount()
    })

    it('moves in batches and keeps the target folder', async () => {
        const fetch = vi.fn<typeof globalThis.fetch>(
            async () => new Response(null, { status: 204 })
        )
        vi.stubGlobal('fetch', fetch)
        const { move, unmount } = withMutations()
        await move.mutateAsync({ ids, folderId: 7 })
        expect(bodies(fetch)).toEqual([
            { ids: ids.slice(0, 100), folderId: 7 },
            { ids: ids.slice(100), folderId: 7 },
        ])
        unmount()
    })
})
