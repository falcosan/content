import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { postForm, uploadAsset } from './upload'

class FakeUpload extends EventTarget {}

class FakeRequest extends EventTarget {
    static last: FakeRequest | null = null
    static status = 204
    static failNetwork = false
    upload = new FakeUpload()
    method = ''
    url = ''
    body: FormData | null = null
    status = 0

    constructor() {
        super()
        FakeRequest.last = this
    }

    open(method: string, url: string) {
        this.method = method
        this.url = url
    }

    send(body: FormData) {
        this.body = body
        queueMicrotask(() => {
            if (FakeRequest.failNetwork) {
                this.dispatchEvent(new Event('error'))
                return
            }
            const progress = Object.assign(new Event('progress'), {
                lengthComputable: true,
                loaded: 5,
                total: 10,
            })
            this.upload.dispatchEvent(progress)
            this.status = FakeRequest.status
            this.dispatchEvent(new Event('load'))
        })
    }
}

const asset = {
    id: 11,
    url: 'https://a.storyblok.com/f/1/notes.txt',
    name: 'notes.txt',
    contentType: 'text/plain',
    size: 5,
    width: null,
    height: null,
    alt: '',
    title: '',
    copyright: '',
    source: '',
    folderId: 3,
    createdAt: '2025-01-01T00:00:00Z',
}

beforeEach(() => {
    FakeRequest.status = 204
    FakeRequest.failNetwork = false
    vi.stubGlobal('XMLHttpRequest', FakeRequest)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('postForm', () => {
    it('posts signed fields before the file and reports progress', async () => {
        const onProgress = vi.fn()
        const file = new File(['hello'], 'notes.txt', { type: 'text/plain' })
        await postForm('https://s3.test', { key: 'k', policy: 'p' }, file, onProgress)
        const request = FakeRequest.last!
        expect(request.method).toBe('POST')
        expect(request.url).toBe('https://s3.test')
        expect([...request.body!.keys()]).toEqual(['key', 'policy', 'file'])
        expect(request.body!.get('file')).toBe(file)
        expect(onProgress).toHaveBeenCalledWith(0.5)
    })

    it('rejects failed uploads', async () => {
        const file = new File(['x'], 'big.png', { type: 'image/png' })
        FakeRequest.status = 403
        await expect(postForm('https://s3.test', {}, file)).rejects.toThrow(
            'Upload of big.png failed (403)'
        )
        FakeRequest.failNetwork = true
        await expect(postForm('https://s3.test', {}, file)).rejects.toThrow(
            'Upload of big.png failed'
        )
    })
})

describe('uploadAsset', () => {
    const respond = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
        })

    it('signs, uploads to storage and finishes the asset', async () => {
        const fetch = vi.fn<typeof globalThis.fetch>(async (input) =>
            String(input).endsWith('/uploads')
                ? respond({ id: 11, url: 'https://s3.test', fields: { key: 'k' } }, 201)
                : respond(asset)
        )
        vi.stubGlobal('fetch', fetch)
        const file = new File(['hello'], 'notes.txt', { type: 'text/plain' })
        await expect(uploadAsset(file, { folderId: 3 })).resolves.toEqual(asset)
        expect(String(fetch.mock.calls[0]?.[0])).toBe('/api/assets/uploads')
        expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
            filename: 'notes.txt',
            folderId: 3,
        })
        expect(FakeRequest.last?.url).toBe('https://s3.test')
        expect(String(fetch.mock.calls[1]?.[0])).toBe('/api/assets/11/finish')
    })

    it('sends raster image dimensions', async () => {
        const fetch = vi.fn<typeof globalThis.fetch>(async (input) =>
            String(input).endsWith('/uploads')
                ? respond({ id: 9, url: 'https://s3.test', fields: {} }, 201)
                : respond({ ...asset, id: 9 })
        )
        vi.stubGlobal('fetch', fetch)
        vi.stubGlobal(
            'createImageBitmap',
            vi.fn(async () => ({ width: 640, height: 480, close: vi.fn() }))
        )
        const file = new File(['png'], 'photo.png', { type: 'image/png' })
        await uploadAsset(file, { folderId: null })
        expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
            filename: 'photo.png',
            folderId: null,
            width: 640,
            height: 480,
        })
    })

    it('does not touch storage when signing fails', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => respond({ error: 'Nope' }, 422))
        )
        FakeRequest.last = null
        const file = new File(['x'], 'x.txt', { type: 'text/plain' })
        await expect(uploadAsset(file, { folderId: null })).rejects.toThrow()
        expect(FakeRequest.last).toBeNull()
    })
})
