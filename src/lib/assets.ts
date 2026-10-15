import type { Asset } from '#types/api'
import type { AssetKind, AssetValue } from '#types/app'

const FILETYPE_MIME: Record<string, string[]> = {
    images: ['image/'],
    videos: ['video/'],
    audios: ['audio/'],
    texts: ['text/', 'application/'],
}

const OPTIMIZABLE = /\.(jpe?g|png|webp|avif)$/i

const STORYBLOK_ASSET = /^https:\/\/a(?:-[a-z]{2})?\.storyblok\.com\//

const IMAGE_FILE = /\.(jpe?g|png|gif|webp|avif|svg)$/i

export const isImage = (contentType: string) => contentType.startsWith('image/')

export const isImageUrl = (url: string) => IMAGE_FILE.test(url)

export const assetKind = (contentType: string): AssetKind => {
    if (isImage(contentType)) return 'image'
    if (contentType.startsWith('video/')) return 'video'
    if (contentType.startsWith('audio/')) return 'audio'
    if (contentType.startsWith('text/') || contentType === 'application/pdf') return 'document'
    return 'file'
}

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

export const thumbnailUrl = (url: string, width: number) =>
    STORYBLOK_ASSET.test(url) && OPTIMIZABLE.test(url) ? `${url}/m/${width}x0` : url

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

export const toAssetValue = ({ id, alt, title, source, url, copyright }: Asset): AssetValue => ({
    ...emptyAssetValue(),
    id,
    alt,
    title,
    source,
    filename: url,
    copyright,
})

export const toExternalAssetValue = (url: string, alt = ''): AssetValue => ({
    ...emptyAssetValue(),
    alt,
    filename: url,
    is_external_url: true,
})

export const isAssetValue = (value: unknown): value is AssetValue =>
    !!value &&
    typeof value === 'object' &&
    'filename' in value &&
    typeof value.filename === 'string'
