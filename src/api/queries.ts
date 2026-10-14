import { infiniteQueryOptions, keepPreviousData, queryOptions } from '@tanstack/vue-query'
import { api, parseResponse, type Story } from './client'

export type StatusFilter = 'all' | 'published' | 'draft'

export interface StoryFilters {
    search: string
    status: StatusFilter
}

export interface AssetFilters {
    search: string
    folder: number | null
    trash: boolean
}

export const keys = {
    session: ['session'],
    fields: ['schema', 'fields'],
    tags: ['schema', 'tags'],
    stories: ['stories'],
    story: (id: number) => ['story', id],
    versions: (id: number) => ['story', id, 'versions'],
    workflowStages: ['schema', 'workflow-stages'],
    languages: ['schema', 'languages'],
    assets: ['assets'],
    folders: ['folders'],
} as const

interface Page {
    page: number
    perPage: number
    total: number
}

const nextPage = ({ page, perPage, total }: Page) => (page * perPage < total ? page + 1 : undefined)

export const sessionQuery = () =>
    queryOptions({
        queryKey: keys.session,
        queryFn: () => parseResponse(api.session.$get()),
        staleTime: Infinity,
        retry: false,
    })

export const fieldsQuery = () =>
    queryOptions({
        queryKey: keys.fields,
        queryFn: () => parseResponse(api.schema.fields.$get()),
        staleTime: Infinity,
    })

export const tagsQuery = () =>
    queryOptions({
        queryKey: keys.tags,
        queryFn: () => parseResponse(api.schema.tags.$get()),
        staleTime: 5 * 60_000,
    })

export const storiesQuery = (filters: StoryFilters) =>
    infiniteQueryOptions({
        queryKey: [...keys.stories, filters],
        queryFn: ({ pageParam }) =>
            parseResponse(
                api.stories.$get({
                    query: {
                        page: String(pageParam),
                        search: filters.search,
                        status: filters.status,
                    },
                })
            ),
        initialPageParam: 1,
        getNextPageParam: nextPage,
        placeholderData: keepPreviousData,
    })

export const storyQuery = (id: number) =>
    queryOptions({
        queryKey: keys.story(id),
        queryFn: (): Promise<Story> =>
            parseResponse(api.stories[':id'].$get({ param: { id: String(id) } })),
    })

export const assetsQuery = (filters: AssetFilters) =>
    infiniteQueryOptions({
        queryKey: [...keys.assets, filters],
        queryFn: ({ pageParam }) =>
            parseResponse(
                api.assets.$get({
                    query: {
                        page: String(pageParam),
                        search: filters.search,
                        folder: filters.folder === null ? undefined : String(filters.folder),
                        trash: filters.trash ? '1' : undefined,
                    },
                })
            ),
        initialPageParam: 1,
        getNextPageParam: nextPage,
        placeholderData: keepPreviousData,
    })

export const versionsQuery = (id: number) =>
    queryOptions({
        queryKey: keys.versions(id),
        queryFn: () =>
            parseResponse(api.stories[':id'].versions.$get({ param: { id: String(id) } })),
        staleTime: 0,
    })

export const workflowStagesQuery = () =>
    queryOptions({
        queryKey: keys.workflowStages,
        queryFn: () => parseResponse(api.schema['workflow-stages'].$get()),
        staleTime: Infinity,
    })

export const languagesQuery = () =>
    queryOptions({
        queryKey: keys.languages,
        queryFn: () => parseResponse(api.schema.languages.$get()),
        staleTime: Infinity,
    })

export const foldersQuery = () =>
    queryOptions({
        queryKey: keys.folders,
        queryFn: () => parseResponse(api.folders.$get()),
        staleTime: 5 * 60_000,
    })
