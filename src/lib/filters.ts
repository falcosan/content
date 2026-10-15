import type { LocationQuery } from 'vue-router'
import type { StatusFilter, StoryFilters } from '#types/app'

export const SEARCH_DEBOUNCE_MS = 300

export const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Drafts' },
]

export const storyFilters = (query: LocationQuery): StoryFilters => ({
    search: typeof query.q === 'string' ? query.q.trim() : '',
    status: STATUS_OPTIONS.find(({ value }) => value === query.status)?.value ?? 'all',
})

const sameExceptSearch = <Filters extends { search: string }>(a: Filters, b: Filters) =>
    (Object.keys(a) as (keyof Filters)[]).every((key) => key === 'search' || a[key] === b[key])

export const keepWhileSearching =
    <Filters extends { search: string }>(filters: Filters) =>
    <Data>(previous: Data | undefined, query?: { queryKey: readonly [unknown, Filters] }) =>
        query && sameExceptSearch(query.queryKey[1], filters) ? previous : undefined
