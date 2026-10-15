import type { StoryblokAssetFolder, StoryblokComponent, StoryContent } from './storyblok'

export interface MockStory {
    id: number
    name: string
    slug: string
    full_slug: string
    parent_id: number | null
    is_folder: boolean
    published: boolean
    unpublished_changes: boolean
    created_at: string
    updated_at: string
    first_published_at: string | null
    content: StoryContent
}

interface MockVersion {
    id: number
    story_id: number
    created_at: string
    status: string
    content: StoryContent
}

export interface MockAsset {
    id: number
    filename: string
    short_filename: string
    content_type: string
    content_length: number
    alt: string
    title: string
    copyright: string
    source: string
    asset_folder_id: number | null
    created_at: string
    updated_at: string
    deleted_at: string | null
    finished: boolean
}

export interface MockState {
    stories: MockStory[]
    assets: MockAsset[]
    folders: StoryblokAssetFolder[]
    versions: MockVersion[]
    components: StoryblokComponent[]
    nextId: number
}

export interface StorageUpload {
    fields: Record<string, string>
    fileName: string
}

export interface RecordedRequest {
    method: string
    path: string
    query: Record<string, string>
    body: unknown
    headers: Headers
}

export type Responder = (request: RecordedRequest) => Response | Promise<Response>

export type Compatibility<Official, Ours> = {
    [Key in keyof Ours]-?: Key extends keyof Official
        ? [Official[Key]] extends [Ours[Key]]
            ? 'ok'
            : { official: Official[Key]; ours: Ours[Key] }
        : 'not in the official type'
}

export type AllOk<Ours> = { [Key in keyof Ours]-?: 'ok' }
