export type StoryContent = { component: string; _uid?: string } & Record<string, unknown>

export interface StoryblokStory {
    id: number
    name: string
    slug: string
    full_slug: string
    published: boolean | null
    unpublished_changes: boolean | null
    created_at: string
    updated_at: string
    deleted_at?: string | null
    first_published_at: string | null
    tag_list: string[]
    stage?: { workflow_stage_id: number } | null
    content?: Record<string, unknown>
    content_summary?: Record<string, unknown>
}

export interface StoryblokStoryInput {
    name?: string
    slug?: string
    parent_id?: number
    tag_list?: string[]
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
    updated_at: string
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

export interface StoryblokSchemaField {
    type?: string
    pos?: number
    translatable?: boolean
    display_name?: string | null
    description?: string | null
    required?: boolean
    max_length?: string | number | null
    options?: { name: string; value: string }[]
    max_options?: string | number | null
    filetypes?: string[]
    disable_time?: boolean
    exclude_empty_option?: boolean
}

export interface StoryblokComponent {
    name: string
    schema: Record<string, StoryblokSchemaField | undefined>
}

export interface StoryblokTag {
    name: string
    taggings_count: number
}

export interface StoryblokLanguage {
    code: string
    name: string
    ai_translation_code?: string | null
}

export interface StoryblokSpace {
    languages?: StoryblokLanguage[]
    default_lang_name?: string | null
}

export interface StoryblokStoryVersion {
    id: number
    created_at: string
    status: string
    user?: { friendly_name?: string | null } | null
}

export interface StoryblokWorkflow {
    id: number
    is_default: boolean
    content_types: string[]
}

export interface StoryblokWorkflowStage {
    id: number
    name: string
    position: number
    workflow_id: number
}

export interface StoryblokOptions {
    apiUrl: string
    spaceId: number
    token: string
    fetch?: typeof fetch
    retries?: number
    requestsPerSecond?: number
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

type Query = Record<string, string | number | boolean | undefined>

export class StoryblokError extends Error {
    constructor(
        readonly status: number,
        message: string
    ) {
        super(message)
        this.name = 'StoryblokError'
    }
}

const describe = (body: unknown): string => {
    if (typeof body === 'string') return body
    if (Array.isArray(body)) return body.map(describe).join(', ')
    if (body && typeof body === 'object') {
        if ('error' in body) return describe(body.error)
        return Object.entries(body)
            .map(([key, value]) => `${key} ${describe(value)}`)
            .join('; ')
    }
    return ''
}

const readBody = async (response: Response): Promise<unknown> => {
    const text = await response.text()
    if (!text) return null
    return response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text
}

const RATE_WINDOW_MS = 1000

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const retryDelay = (response: Response, attempt: number) => {
    const header = response.headers.get('retry-after')
    const seconds = header === null ? Number.NaN : Number(header)
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
    return 2 ** attempt * 300 + Math.random() * 300
}

export const createRateLimiter = (limit: number) => {
    const starts: number[] = []
    const acquire = async (): Promise<void> => {
        const now = Date.now()
        while (starts.length && now - starts[0]! >= RATE_WINDOW_MS) starts.shift()
        if (starts.length < limit) {
            starts.push(now)
            return
        }
        await wait(starts[0]! + RATE_WINDOW_MS - now)
        return acquire()
    }
    return acquire
}

export const createStoryblok = ({
    apiUrl,
    spaceId,
    token,
    fetch = globalThis.fetch,
    retries = 5,
    requestsPerSecond = 5,
}: StoryblokOptions) => {
    const acquire = createRateLimiter(requestsPerSecond)

    const request = async <T>(
        method: Method,
        path: string,
        { query = {}, body }: { query?: Query; body?: unknown } = {}
    ): Promise<{ data: T; total: number }> => {
        const url = new URL(`${apiUrl}/spaces/${spaceId}/${path}`)
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined) url.searchParams.set(key, String(value))
        }
        for (let attempt = 0; ; attempt++) {
            await acquire()
            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: token,
                    Accept: 'application/json',
                    ...(body !== undefined && { 'Content-Type': 'application/json' }),
                },
                body: body === undefined ? undefined : JSON.stringify(body),
            })
            if (response.status === 429 && attempt < retries) {
                await wait(retryDelay(response, attempt))
                continue
            }
            const data = await readBody(response)
            if (!response.ok) {
                throw new StoryblokError(response.status, describe(data) || response.statusText)
            }
            return { data: data as T, total: Number(response.headers.get('total') ?? 0) }
        }
    }

    const data = async <T>(...args: Parameters<typeof request>) => (await request<T>(...args)).data

    return {
        listStories: (query: Query) =>
            request<{ stories: StoryblokStory[] }>('GET', 'stories', { query }),
        getStory: async (id: number) =>
            (await data<{ story: StoryblokStory }>('GET', `stories/${id}`)).story,
        findFolder: async (slug: string) =>
            (
                await data<{ stories: StoryblokStory[] }>('GET', 'stories', {
                    query: { with_slug: slug, folder_only: 1 },
                })
            ).stories[0],
        createStory: async (story: StoryblokStoryInput) =>
            (await data<{ story: StoryblokStory }>('POST', 'stories', { body: { story } })).story,
        updateStory: async (id: number, story: StoryblokStoryInput, publish: boolean) =>
            (
                await data<{ story: StoryblokStory }>('PUT', `stories/${id}`, {
                    body: { story, publish },
                })
            ).story,
        deleteStory: async (id: number) => {
            await request('DELETE', `stories/${id}`)
        },
        unpublishStory: async (id: number) => {
            await request('GET', `stories/${id}/unpublish`)
        },
        duplicateStory: async (id: number, story: StoryblokStoryInput) =>
            (
                await data<{ story: StoryblokStory }>('PUT', `stories/${id}/duplicate`, {
                    body: { story },
                })
            ).story,
        getSpace: async () => (await data<{ space: StoryblokSpace }>('GET', '')).space,
        translateStory: async (id: number, language: StoryblokLanguage) =>
            (
                await data<{ story: StoryblokStory }>('PUT', `stories/${id}/ai_translate`, {
                    body: {
                        code: language.code,
                        lang: language.ai_translation_code ?? language.code,
                        overwrite: true,
                    },
                })
            ).story,
        listComponents: async () =>
            (await data<{ components: StoryblokComponent[] }>('GET', 'components')).components,
        listTags: async () => (await data<{ tags: StoryblokTag[] }>('GET', 'tags')).tags,
        listAssets: (query: Query) =>
            request<{ assets: StoryblokAsset[] }>('GET', 'assets', { query }),
        getAsset: (id: number) => data<StoryblokAsset>('GET', `assets/${id}`),
        signAsset: (body: StoryblokSignRequest) =>
            data<StoryblokSignedUpload>('POST', 'assets', {
                body: { ...body, validate_upload: 1 },
            }),
        finishAssetUpload: async (id: number) => {
            await request('GET', `assets/${id}/finish_upload`)
        },
        updateAsset: async (id: number, asset: StoryblokAssetInput) => {
            await request('PUT', `assets/${id}`, { body: { asset } })
        },
        moveAssets: async (ids: number[], folderId: number) => {
            await request('POST', 'assets/bulk_update', {
                body: { ids, asset: { asset_folder_id: folderId } },
            })
        },
        deleteAssets: async (ids: number[]) => {
            await request('POST', 'assets/bulk_destroy', { body: { ids } })
        },
        restoreAssets: async (ids: number[]) => {
            await request('POST', 'assets/bulk_restore', { body: { ids } })
        },
        listStoryVersions: async (storyId: number) =>
            (
                await data<{ story_versions: StoryblokStoryVersion[] }>('GET', 'story_versions', {
                    query: { by_story_id: storyId, per_page: 100 },
                })
            ).story_versions,
        restoreStoryVersion: async (storyId: number, versionId: number) => {
            await request('GET', `stories/${storyId}/restore_with`, {
                query: { version: versionId, versions_v2: true },
            })
        },
        listWorkflows: async () =>
            (await data<{ workflows: StoryblokWorkflow[] }>('GET', 'workflows')).workflows,
        listWorkflowStages: async () =>
            (await data<{ workflow_stages: StoryblokWorkflowStage[] }>('GET', 'workflow_stages'))
                .workflow_stages,
        changeWorkflowStage: async (storyId: number, stageId: number) => {
            await request('POST', 'workflow_stage_changes', {
                body: { workflow_stage_change: { story_id: storyId, workflow_stage_id: stageId } },
            })
        },
        listAssetFolders: async () =>
            (await data<{ asset_folders: StoryblokAssetFolder[] }>('GET', 'asset_folders'))
                .asset_folders,
        createAssetFolder: async (folder: { name: string; parent_id: number | null }) =>
            (
                await data<{ asset_folder: StoryblokAssetFolder }>('POST', 'asset_folders', {
                    body: { asset_folder: folder },
                })
            ).asset_folder,
        updateAssetFolder: async (
            id: number,
            folder: { name: string; parent_id: number | null }
        ) => {
            await request('PUT', `asset_folders/${id}`, { body: { asset_folder: folder } })
        },
        deleteAssetFolder: async (id: number) => {
            await request('DELETE', `asset_folders/${id}`)
        },
    }
}

export type Storyblok = ReturnType<typeof createStoryblok>
