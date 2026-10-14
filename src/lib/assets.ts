import type { Asset } from '@/api/client'

export interface AssetValue {
    id: number | null
    alt: string
    name: string
    focus: string
    title: string
    source: string
    filename: string
    copyright: string
    fieldtype: 'asset'
    meta_data: Record<string, unknown>
    is_external_url: boolean
}

const FILETYPE_MIME: Record<string, string[]> = {
    images: ['image/'],
    videos: ['video/'],
    audios: ['audio/'],
    texts: ['text/', 'application/'],
}

const OPTIMIZABLE = /\.(jpe?g|png|webp|avif)$/i

const IMAGE_FILE = /\.(jpe?g|png|gif|webp|avif|svg)$/i

export const isImage = (contentType: string) => contentType.startsWith('image/')

export const isImageUrl = (url: string) => IMAGE_FILE.test(url)

export const acceptFor = (filetypes: string[]) =>
    filetypes
        .flatMap((type) => FILETYPE_MIME[type] ?? [])
        .map((prefix) => `${prefix}*`)
        .join(',')

export const matchesFiletypes = (contentType: string, filetypes: string[]) =>
    filetypes.length === 0 ||
    filetypes.some((type) =>
        (FILETYPE_MIME[type] ?? []).some((prefix) => contentType.startsWith(prefix))
    )

export const thumbnailUrl = (url: string, width = 480) =>
    OPTIMIZABLE.test(url) ? `${url}/m/${width}x0` : url

export const toAssetValue = (asset: Asset): AssetValue => ({
    id: asset.id,
    alt: asset.alt,
    name: '',
    focus: '',
    title: asset.title,
    source: asset.source,
    filename: asset.url,
    copyright: asset.copyright,
    fieldtype: 'asset',
    meta_data: {},
    is_external_url: false,
})

export const emptyAssetValue = (): AssetValue => ({
    id: null,
    alt: '',
    name: '',
    focus: '',
    title: '',
    source: '',
    filename: '',
    copyright: '',
    fieldtype: 'asset',
    meta_data: {},
    is_external_url: false,
})

export const isAssetValue = (value: unknown): value is AssetValue =>
    !!value &&
    typeof value === 'object' &&
    'filename' in value &&
    typeof value.filename === 'string'
