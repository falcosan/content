import { api, parseResponse, type Asset } from '@/api/client'

export interface UploadOptions {
    folderId: number | null
    onProgress?: (ratio: number) => void
}

const RASTER_IMAGE = /^image\/(?!svg)/

export const imageSize = async (file: Blob) => {
    if (!RASTER_IMAGE.test(file.type)) return {}
    const bitmap = await createImageBitmap(file)
    try {
        return { width: bitmap.width, height: bitmap.height }
    } finally {
        bitmap.close()
    }
}

export const postForm = (
    url: string,
    fields: Record<string, string>,
    file: File,
    onProgress?: (ratio: number) => void
) =>
    new Promise<void>((resolve, reject) => {
        const form = new FormData()
        for (const [key, value] of Object.entries(fields)) form.append(key, value)
        form.append('file', file)
        const request = new XMLHttpRequest()
        request.open('POST', url)
        request.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) onProgress?.(event.loaded / event.total)
        })
        request.addEventListener('load', () => {
            if (request.status >= 200 && request.status < 300) resolve()
            else reject(new Error(`Upload of ${file.name} failed (${request.status})`))
        })
        request.addEventListener('error', () => reject(new Error(`Upload of ${file.name} failed`)))
        request.send(form)
    })

export const uploadAsset = async (
    file: File,
    { folderId, onProgress }: UploadOptions
): Promise<Asset> => {
    const size = await imageSize(file).catch(() => ({}))
    const signed = await parseResponse(
        api.assets.uploads.$post({ json: { filename: file.name, folderId, ...size } })
    )
    await postForm(signed.url, signed.fields, file, onProgress)
    return parseResponse(api.assets[':id'].finish.$post({ param: { id: String(signed.id) } }))
}
