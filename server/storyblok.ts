import type {
    Method,
    Query,
    StoryblokAsset,
    StoryblokAssetFolder,
    StoryblokAssetFolderInput,
    StoryblokAssetInput,
    StoryblokCdnStory,
    StoryblokComponent,
    StoryblokComponentInput,
    StoryblokOptions,
    StoryblokSignRequest,
    StoryblokSignedUpload,
    StoryblokSpace,
    StoryblokStory,
    StoryblokStoryInput,
    StoryblokStoryVersion,
} from '#types/storyblok'

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

const RETRIES = 5

const BACKOFF_MS = 300

const VERSIONS_PER_PAGE = 100

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const retryDelay = (response: Response, attempt: number) => {
    const header = response.headers.get('retry-after')
    const seconds = header === null ? Number.NaN : Number(header)
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
    return 2 ** attempt * BACKOFF_MS + Math.random() * BACKOFF_MS
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

const withQuery = (url: URL, query: Query) => {
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value))
    }
    return url
}

export const createStoryblok = ({
    apiUrl,
    cdnUrl,
    spaceId,
    token,
    fetch,
    requestsPerSecond = 5,
}: StoryblokOptions) => {
    const acquire = createRateLimiter(requestsPerSecond)

    const send = async <T>(url: URL, init: RequestInit): Promise<{ data: T; total: number }> => {
        for (let attempt = 0; ; attempt++) {
            await acquire()
            const response = await fetch(url, init)
            if (response.status === 429 && attempt < RETRIES) {
                await response.body?.cancel()
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

    const request = <T>(
        method: Method,
        path: string,
        { query = {}, body }: { query?: Query; body?: unknown } = {}
    ) =>
        send<T>(withQuery(new URL(`${apiUrl}/spaces/${spaceId}/${path}`), query), {
            method,
            headers: {
                Authorization: token,
                Accept: 'application/json',
                ...(body !== undefined && { 'Content-Type': 'application/json' }),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        })

    const data = async <T>(...args: Parameters<typeof request>) => (await request<T>(...args)).data

    const getSpace = async () => (await data<{ space: StoryblokSpace }>('GET', '')).space

    let previewToken: Promise<string> | undefined

    const readPreviewToken = () =>
        (previewToken ??= getSpace().then(({ first_token }) => {
            if (!first_token) throw new StoryblokError(502, 'The space has no preview token')
            return first_token
        }))

    const listStoryContents = async (ids: number[]) => {
        if (!ids.length) return []
        const pendingToken = readPreviewToken()
        try {
            const query = {
                by_ids: ids.join(','),
                version: 'draft',
                per_page: ids.length,
                token: await pendingToken,
            }
            return (
                await send<{ stories: StoryblokCdnStory[] }>(
                    withQuery(new URL(`${cdnUrl}/stories`), query),
                    { headers: { Accept: 'application/json' } }
                )
            ).data.stories
        } catch (error) {
            if (previewToken === pendingToken) previewToken = undefined
            throw error
        }
    }

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
        getSpace,
        listStoryContents,
        translateStory: async (id: number, code: string, lang: string) =>
            (
                await data<{ story: StoryblokStory }>('PUT', `stories/${id}/ai_translate`, {
                    body: { code, lang, overwrite: true },
                })
            ).story,
        listComponents: async () =>
            (await data<{ components: StoryblokComponent[] }>('GET', 'components')).components,
        updateComponent: async (id: number, component: StoryblokComponentInput) => {
            await request('PUT', `components/${id}`, { body: { component } })
        },
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
                    query: { by_story_id: storyId, per_page: VERSIONS_PER_PAGE },
                })
            ).story_versions,
        restoreStoryVersion: async (storyId: number, versionId: number) => {
            await request('GET', `stories/${storyId}/restore_with`, {
                query: { version: versionId, versions_v2: true },
            })
        },
        listAssetFolders: async () =>
            (await data<{ asset_folders: StoryblokAssetFolder[] }>('GET', 'asset_folders'))
                .asset_folders,
        createAssetFolder: async (folder: StoryblokAssetFolderInput) =>
            (
                await data<{ asset_folder: StoryblokAssetFolder }>('POST', 'asset_folders', {
                    body: { asset_folder: folder },
                })
            ).asset_folder,
        updateAssetFolder: async (id: number, folder: StoryblokAssetFolderInput) => {
            await request('PUT', `asset_folders/${id}`, { body: { asset_folder: folder } })
        },
        deleteAssetFolder: async (id: number) => {
            await request('DELETE', `asset_folders/${id}`)
        },
    }
}
