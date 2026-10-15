<script setup lang="ts">
import { FileText, Plus, Search } from '@lucide/vue'
import { useInfiniteQuery } from '@tanstack/vue-query'
import { refDebounced } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { StatusFilter } from '#types/app'
import { errorMessage } from '@/api/client'
import { storiesQuery } from '@/api/queries'
import StoryDialog from '@/components/stories/StoryDialog.vue'
import StoryRow from '@/components/stories/StoryRow.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiSegmentedControl from '@/components/ui/UiSegmentedControl.vue'
import { SEARCH_DEBOUNCE_MS, STATUS_OPTIONS, storyFilters } from '@/lib/filters'

const LIST = 'grid gap-3 divide-border/40 sm:gap-0 sm:divide-y'

const route = useRoute()
const router = useRouter()

const search = ref(storyFilters(route.query).search)
const creating = ref(false)

const debouncedSearch = refDebounced(search, SEARCH_DEBOUNCE_MS)
const stories = useInfiniteQuery(computed(() => storiesQuery(storyFilters(route.query))))

const filters = computed(() => storyFilters(route.query))
const status = computed({
    get: () => filters.value.status,
    set: (value: StatusFilter) =>
        router.replace({ query: { ...route.query, status: value === 'all' ? undefined : value } }),
})

const items = computed(() => stories.data.value?.pages.flatMap((page) => page.stories) ?? [])
const total = computed(() => stories.data.value?.pages[0]?.total ?? 0)

watch(debouncedSearch, (value) =>
    router.replace({ query: { ...route.query, q: value || undefined } })
)

watch(
    () => filters.value.search,
    (value) => {
        if (value !== debouncedSearch.value) search.value = value
    }
)
</script>

<template>
    <div class="flex flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold tracking-tight">Posts</h1>
                <p
                    v-if="!stories.isLoadingError.value"
                    class="text-sm text-text-light"
                    aria-live="polite"
                >
                    <span
                        v-if="stories.isPending.value"
                        class="skeleton-text animate-pulse"
                        aria-hidden="true"
                    >
                        00 posts
                    </span>
                    <template v-else>{{ total }} {{ total === 1 ? 'post' : 'posts' }}</template>
                </p>
            </div>
            <UiButton variant="solid" :icon="Plus" @click="creating = true">New post</UiButton>
        </header>

        <div class="flex flex-wrap items-center gap-3">
            <label class="relative min-w-60 flex-1">
                <span class="sr-only">Search posts</span>
                <Search
                    class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-light"
                    aria-hidden="true"
                />
                <input
                    v-model.trim="search"
                    type="search"
                    class="control pl-9"
                    placeholder="Search posts"
                />
            </label>
            <UiSegmentedControl v-model="status" :options="STATUS_OPTIONS" label="Status" />
        </div>

        <p
            v-if="stories.isError.value"
            role="alert"
            class="rounded-md border border-border px-4 py-3 text-sm"
        >
            {{ errorMessage(stories.error.value) }}
            <button type="button" class="ml-2 font-medium underline" @click="stories.refetch()">
                Retry
            </button>
        </p>

        <ul
            v-if="stories.isPending.value"
            :class="LIST"
            aria-busy="true"
            aria-label="Loading posts"
        >
            <li v-for="index in 6" :key="index">
                <StoryRow />
            </li>
        </ul>

        <ul v-else-if="items.length" :class="LIST" :aria-busy="stories.isFetching.value">
            <li v-for="story in items" :key="story.id">
                <StoryRow :story />
            </li>
        </ul>

        <div
            v-else-if="!stories.isError.value"
            class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-16 text-center"
        >
            <FileText class="size-8 text-text-light" aria-hidden="true" />
            <p class="text-sm text-text-light">
                {{
                    filters.search || filters.status !== 'all'
                        ? 'No posts match your filters.'
                        : 'No posts yet.'
                }}
            </p>
        </div>

        <div v-if="stories.hasNextPage.value" class="flex justify-center">
            <UiButton :loading="stories.isFetchingNextPage.value" @click="stories.fetchNextPage()">
                Load more
            </UiButton>
        </div>

        <StoryDialog v-model:open="creating" />
    </div>
</template>
