import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import type { Asset } from '#types/api'
import { keys } from '@/api/queries'
import { dismissUpload, useUploads } from '@/composables/useUploads'
import { uploadAsset } from '@/lib/upload'

vi.mock('@/lib/upload', () => ({ uploadAsset: vi.fn() }))

const withUploads = () => {
    const queryClient = new QueryClient()
    let uploads: ReturnType<typeof useUploads>
    const app = createApp({
        setup() {
            uploads = useUploads()
            return () => null
        },
    })
    app.use(VueQueryPlugin, { queryClient }).mount(document.createElement('div'))
    const dispose = () => {
        for (const { id } of [...uploads.items]) dismissUpload(id)
        app.unmount()
    }
    return { ...uploads!, queryClient, dispose }
}

const file = (name: string) => new File(['x'], name, { type: 'image/png' })

const assetNamed = (name: string): Asset => ({
    id: name.length,
    url: `https://a.storyblok.com/f/1/${name}`,
    name,
    contentType: 'image/png',
    size: 1,
    width: null,
    height: null,
    alt: '',
    title: '',
    copyright: '',
    source: '',
    folderId: null,
    createdAt: '2025-01-01T00:00:00Z',
    deletedAt: null,
})

afterEach(() => {
    vi.mocked(uploadAsset).mockReset()
})

describe('uploads', () => {
    it('uploads two files at a time and keeps their order', async () => {
        let running = 0
        let peak = 0
        vi.mocked(uploadAsset).mockImplementation(async (upload) => {
            running++
            peak = Math.max(peak, running)
            await new Promise((resolve) => setTimeout(resolve, 5))
            running--
            return assetNamed(upload.name)
        })
        const names = ['a.png', 'b.png', 'c.png', 'd.png', 'e.png']
        const { upload, dispose } = withUploads()
        const uploaded = await upload(names.map(file), { folderId: 3 })
        expect(peak).toBe(2)
        expect(uploaded.map(({ name }) => name)).toEqual(names)
        expect(vi.mocked(uploadAsset).mock.calls.map(([, options]) => options.folderId)).toEqual(
            names.map(() => 3)
        )
        dispose()
    })

    it('keeps going after a failure, marks it and refreshes the library', async () => {
        vi.mocked(uploadAsset).mockImplementation(async (upload, { onProgress }) => {
            if (upload.name === 'broken.png') throw new Error('Storage rejected the file')
            onProgress?.(0.5)
            return assetNamed(upload.name)
        })
        const { upload, items, queryClient, dispose } = withUploads()
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
        const uploaded = await upload([file('ok.png'), file('broken.png'), file('fine.png')], {
            folderId: null,
        })
        expect(uploaded.map(({ name }) => name)).toEqual(['ok.png', 'fine.png'])
        expect(
            items.map(({ name, status, progress, error }) => [name, status, progress, error])
        ).toEqual([
            ['ok.png', 'done', 1, ''],
            ['broken.png', 'failed', 0, 'Storage rejected the file'],
            ['fine.png', 'done', 1, ''],
        ])
        expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.assets })
        dispose()
    })
})
