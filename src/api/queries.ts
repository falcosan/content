import { infiniteQueryOptions, queryOptions } from '@tanstack/vue-query'
import type { Story } from '#types/api'
import type { AssetFilters, Page, StoryFilters } from '#types/app'
import { keepWhileSearching } from '@/lib/filters'
import { flattenFolders } from '@/lib/folders'
import { api, parseResponse } from './client'

export const keys = {
    session: ['session'],
    fields: ['schema', 'fields'],
    stories: ['stories'],
    story: (id: number) => ['story', id],
    preview: (token: string) => ['preview', token],
    versions: (id: number) => ['story', id, 'versions'],
    assets: ['assets'],
    folders: ['folders'],
} as const

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

export const storiesQuery = (filters: StoryFilters) =>
    infiniteQueryOptions({
        queryKey: [...keys.stories, filters] as const,
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
        placeholderData: keepWhileSearching(filters),
    })

export const storyQuery = (id: number) =>
    queryOptions({
        queryKey: keys.story(id),
        queryFn: (): Promise<Story> =>
            parseResponse(api.stories[':id'].$get({ param: { id: String(id) } })),
    })

export const previewQuery = (token: string) =>
    queryOptions({
        queryKey: keys.preview(token),
        queryFn: (): Promise<Story> =>
            parseResponse(api.preview[':token'].$get({ param: { token } })),
        refetchOnWindowFocus: 'always',
    })

export const assetsQuery = (filters: AssetFilters) =>
    infiniteQueryOptions({
        queryKey: [...keys.assets, filters] as const,
        queryFn: ({ pageParam }) =>
            parseResponse(
                api.assets.$get({
                    query: {
                        page: String(pageParam),
                        search: filters.search,
                        folder:
                            typeof filters.location === 'number'
                                ? String(filters.location)
                                : undefined,
                        trash: filters.location === 'trash' ? '1' : undefined,
                    },
                })
            ),
        initialPageParam: 1,
        getNextPageParam: nextPage,
        placeholderData: keepWhileSearching(filters),
    })

export const versionsQuery = (id: number) =>
    queryOptions({
        queryKey: keys.versions(id),
        queryFn: () =>
            parseResponse(api.stories[':id'].versions.$get({ param: { id: String(id) } })),
        staleTime: 0,
    })

export const foldersQuery = () =>
    queryOptions({
        queryKey: keys.folders,
        queryFn: () => parseResponse(api.folders.$get()),
        staleTime: 5 * 60_000,
        select: flattenFolders,
    })
