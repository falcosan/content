import type { createStoryblok } from '../server/storyblok'

export type StoryContent = { component: string; _uid?: string } & Record<string, unknown>

export interface StoryblokStory {
    id: number
    name: string
    slug: string
    full_slug: string
    published: boolean | null
    unpublished_changes: boolean | null
    updated_at: string
    deleted_at?: string | null
    first_published_at: string | null
    content?: Record<string, unknown>
}

export interface StoryblokStoryInput {
    name?: string
    slug?: string
    parent_id?: number
    content?: StoryContent
}

export interface StoryblokAsset {
    id: number
    filename: string
    short_filename?: string
    content_type?: string | null
    content_length?: number | null
    alt?: string | null
    title?: string | null
    copyright?: string | null
    source?: string | null
    asset_folder_id?: number | null
    created_at: string
    deleted_at?: string | null
}

export interface StoryblokAssetInput {
    alt?: string
    title?: string
    copyright?: string
    source?: string
    asset_folder_id?: number | null
}

export interface StoryblokSignedUpload {
    id: number
    post_url: string
    fields: Record<string, string>
}

export interface StoryblokSignRequest {
    filename: string
    size?: string
    asset_folder_id?: number
}

export interface StoryblokAssetFolder {
    id: number
    name: string
    parent_id: number | null
}

export interface StoryblokAssetFolderInput {
    name: string
    parent_id: number | null
}

type StoryblokFieldType =
    | 'bloks'
    | 'text'
    | 'textarea'
    | 'richtext'
    | 'markdown'
    | 'number'
    | 'datetime'
    | 'boolean'
    | 'options'
    | 'option'
    | 'asset'
    | 'multiasset'
    | 'multilink'
    | 'table'
    | 'section'
    | 'commerce'
    | 'custom'
    | 'image'
    | 'file'
    | 'tab'
    | 'link'
    | 'group'

export type StoryblokSchemaField = {
    type?: StoryblokFieldType
    pos?: number
    translatable?: boolean
    display_name?: string
    description?: string
    required?: boolean
    max_length?: string | number | null
    options?: { _uid?: string; name: string; value: string }[]
    source?: string | null
    max_options?: string | number | null
    filetypes?: string[]
    allow_external_url?: boolean
    disable_time?: boolean
    exclude_empty_option?: boolean
}

export interface StoryblokComponent {
    id: number
    name: string
    schema: Record<string, StoryblokSchemaField>
}

export interface StoryblokComponentInput {
    schema: StoryblokComponent['schema']
}

interface StoryblokLanguage {
    code?: string
    name?: string
    ai_translation_code?: string | null
}

export interface StoryblokSpace {
    languages?: StoryblokLanguage[]
    default_lang_name?: string | null
    first_token?: string | null
}

export interface StoryblokCdnStory {
    id: number
    content: Record<string, unknown>
}

export interface StoryblokStoryVersion {
    id: number
    created_at: string
    status: string
    user?: { friendly_name?: string | null } | null
}

export interface StoryblokOptions {
    apiUrl: string
    cdnUrl: string
    spaceId: number
    token: string
    fetch: typeof fetch
    requestsPerSecond?: number
}

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

export type Query = Record<string, string | number | boolean | undefined>

export type Storyblok = ReturnType<typeof createStoryblok>
