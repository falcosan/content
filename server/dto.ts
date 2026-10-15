import type {
    Asset,
    AssetFolder,
    Field,
    FieldBase,
    Story,
    StoryStatus,
    StorySummary,
    StoryVersion,
} from '#types/api'
import type {
    StoryblokAsset,
    StoryblokAssetFolder,
    StoryblokComponent,
    StoryblokSchemaField,
    StoryblokStory,
    StoryblokStoryVersion,
} from '#types/storyblok'
import { BLOG } from '../shared/blog'

const text = (value: unknown) => (typeof value === 'string' ? value : '')

const statusOf = (story: StoryblokStory): StoryStatus => {
    if (!story.published) return 'draft'
    return story.unpublished_changes ? 'changed' : 'published'
}

const assetUrl = (value: unknown) => {
    if (!value || typeof value !== 'object' || !('filename' in value)) return null
    return text(value.filename) || null
}

export const toStorySummary = (
    story: StoryblokStory,
    content: Record<string, unknown> = {}
): StorySummary => ({
    id: story.id,
    status: statusOf(story),
    updatedAt: story.updated_at,
    title: text(content[BLOG.fields.title]) || story.name,
    intro: text(content[BLOG.fields.intro]),
    date: text(content[BLOG.fields.date]) || null,
    cover: assetUrl(content[BLOG.fields.cover]),
})

export const toStory = (story: StoryblokStory, siteUrl: string): Story => ({
    id: story.id,
    status: statusOf(story),
    url: new URL(story.full_slug, siteUrl).href,
    updatedAt: story.updated_at,
    firstPublishedAt: story.first_published_at,
    content: { ...story.content, component: text(story.content?.component) },
})

export const toStoryVersion = (version: StoryblokStoryVersion): StoryVersion => ({
    id: version.id,
    createdAt: version.created_at,
    status: version.status,
    author: version.user?.friendly_name ?? '',
})

export const publicAssetUrl = (filename: string) =>
    filename.replace(/^https?:\/\/s3\.amazonaws\.com\/([^/]+)\//, 'https://$1/')

const dimensions = (filename: string) => {
    const match = /\/(\d+)x(\d+)\//.exec(new URL(filename).pathname)
    return match ? { width: Number(match[1]), height: Number(match[2]) } : null
}

export const toAsset = (asset: StoryblokAsset): Asset => {
    const url = publicAssetUrl(asset.filename)
    const size = dimensions(url)
    return {
        id: asset.id,
        url,
        name: asset.short_filename ?? url.split('/').pop() ?? '',
        contentType: asset.content_type ?? '',
        size: asset.content_length ?? null,
        width: size?.width ?? null,
        height: size?.height ?? null,
        alt: asset.alt ?? '',
        title: asset.title ?? '',
        copyright: asset.copyright ?? '',
        source: asset.source ?? '',
        folderId: asset.asset_folder_id ?? null,
        createdAt: asset.created_at,
        deletedAt: asset.deleted_at ?? null,
    }
}

export const toAssetFolder = (folder: StoryblokAssetFolder): AssetFolder => ({
    id: folder.id,
    name: folder.name,
    parentId: folder.parent_id,
})

const positive = (value: unknown) => {
    const number = Number(value)
    return Number.isInteger(number) && number > 0 ? number : null
}

const humanize = (key: string) => {
    const words = key.replace(/[_-]+/g, ' ').trim()
    return words.charAt(0).toUpperCase() + words.slice(1)
}

export const acceptsNewOptions = (field: StoryblokSchemaField) =>
    field.type === 'options' && (!field.source || field.source === 'self')

const toField = (key: string, field: StoryblokSchemaField): Field | null => {
    const base: FieldBase = {
        key,
        label: field.display_name?.trim() || humanize(key),
        required: field.required === true,
        description: field.description?.trim() ?? '',
    }
    const options = (field.options ?? []).map(({ name, value }) => ({ name, value }))
    switch (field.type) {
        case 'text':
        case 'textarea':
        case 'markdown':
            return { ...base, type: field.type, maxLength: positive(field.max_length) }
        case 'datetime':
            return { ...base, type: 'datetime', withTime: field.disable_time !== true }
        case 'option':
            return { ...base, type: 'option', options, allowEmpty: !field.exclude_empty_option }
        case 'options':
            return {
                ...base,
                type: 'options',
                options,
                maxOptions: positive(field.max_options),
                allowNewOptions: acceptsNewOptions(field),
            }
        case 'asset':
            return {
                ...base,
                type: 'asset',
                filetypes: field.filetypes ?? [],
                allowExternalUrl: field.allow_external_url === true,
            }
        case 'boolean':
        case 'number':
            return { ...base, type: field.type }
        default:
            return null
    }
}

export const toFields = (component: StoryblokComponent): Field[] =>
    Object.entries(component.schema)
        .sort(([, a], [, b]) => (a.pos ?? 0) - (b.pos ?? 0))
        .map(([key, field]) => toField(key, field))
        .filter((field) => field !== null)
