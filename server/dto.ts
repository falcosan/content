import { BLOG } from '../shared/blog'
import type {
    StoryblokAsset,
    StoryblokAssetFolder,
    StoryblokComponent,
    StoryblokSchemaField,
    StoryblokStory,
    StoryblokStoryVersion,
    StoryblokWorkflowStage,
    StoryContent,
} from './storyblok'

export type { StoryContent }

export type StoryStatus = 'draft' | 'published' | 'changed'

export interface StorySummary {
    id: number
    name: string
    slug: string
    status: StoryStatus
    updatedAt: string
    title: string
    intro: string
    date: string | null
    cover: string | null
}

export interface Story {
    id: number
    name: string
    slug: string
    fullSlug: string
    status: StoryStatus
    url: string
    tags: string[]
    updatedAt: string
    firstPublishedAt: string | null
    stageId: number | null
    content: StoryContent
}

export interface StoryVersion {
    id: number
    createdAt: string
    status: string
    author: string
}

export interface WorkflowStage {
    id: number
    name: string
}

export interface Asset {
    id: number
    url: string
    name: string
    contentType: string
    size: number | null
    width: number | null
    height: number | null
    alt: string
    title: string
    copyright: string
    source: string
    folderId: number | null
    createdAt: string
}

export interface AssetFolder {
    id: number
    name: string
    parentId: number | null
}

export interface FieldOption {
    name: string
    value: string
}

interface FieldBase {
    key: string
    label: string
    required: boolean
    translatable: boolean
    description: string
}

export interface Language {
    code: string
    name: string
}

export type Field =
    | (FieldBase & { type: 'text' | 'textarea' | 'markdown'; maxLength: number | null })
    | (FieldBase & { type: 'datetime'; withTime: boolean })
    | (FieldBase & { type: 'option'; options: FieldOption[]; allowEmpty: boolean })
    | (FieldBase & { type: 'options'; options: FieldOption[]; maxOptions: number | null })
    | (FieldBase & { type: 'asset'; filetypes: string[] })
    | (FieldBase & { type: 'boolean' | 'number' })

export type FieldType = Field['type']

const text = (value: unknown) => (typeof value === 'string' ? value : '')

const statusOf = (story: StoryblokStory): StoryStatus => {
    if (!story.published) return 'draft'
    return story.unpublished_changes ? 'changed' : 'published'
}

const assetUrl = (value: unknown) => {
    if (!value || typeof value !== 'object' || !('filename' in value)) return null
    return text(value.filename) || null
}

export const toStorySummary = (story: StoryblokStory): StorySummary => {
    const summary = story.content_summary ?? {}
    return {
        id: story.id,
        name: story.name,
        slug: story.slug,
        status: statusOf(story),
        updatedAt: story.updated_at,
        title: text(summary[BLOG.fields.title]) || story.name,
        intro: text(summary[BLOG.fields.intro]),
        date: text(summary[BLOG.fields.date]) || null,
        cover: assetUrl(summary[BLOG.fields.cover]),
    }
}

export const toStory = (story: StoryblokStory, siteUrl: string): Story => ({
    id: story.id,
    name: story.name,
    slug: story.slug,
    fullSlug: story.full_slug,
    status: statusOf(story),
    url: new URL(story.full_slug, siteUrl).href,
    tags: story.tag_list,
    updatedAt: story.updated_at,
    firstPublishedAt: story.first_published_at,
    stageId: story.stage?.workflow_stage_id ?? null,
    content: { ...story.content, component: text(story.content?.component) },
})

export const toStoryVersion = (version: StoryblokStoryVersion): StoryVersion => ({
    id: version.id,
    createdAt: version.created_at,
    status: version.status,
    author: version.user?.friendly_name ?? '',
})

export const toWorkflowStage = ({ id, name }: StoryblokWorkflowStage): WorkflowStage => ({
    id,
    name,
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

const toField = (key: string, field: StoryblokSchemaField): Field | null => {
    const base: FieldBase = {
        key,
        label: field.display_name?.trim() || humanize(key),
        required: field.required === true,
        translatable: field.translatable === true,
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
            return { ...base, type: 'options', options, maxOptions: positive(field.max_options) }
        case 'asset':
            return { ...base, type: 'asset', filetypes: field.filetypes ?? [] }
        case 'boolean':
        case 'number':
            return { ...base, type: field.type }
        default:
            return null
    }
}

export const toFields = (component: StoryblokComponent): Field[] =>
    Object.entries(component.schema)
        .flatMap(([key, field]) => (field ? [{ key, field }] : []))
        .sort((a, b) => (a.field.pos ?? 0) - (b.field.pos ?? 0))
        .map(({ key, field }) => toField(key, field))
        .filter((field) => field !== null)
