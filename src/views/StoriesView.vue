<script setup lang="ts">
import { FileText, Plus, Search } from '@lucide/vue'
import { useInfiniteQuery } from '@tanstack/vue-query'
import { refDebounced } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { errorMessage } from '@/api/client'
import { storiesQuery, type StatusFilter } from '@/api/queries'
import StoryDialog from '@/components/stories/StoryDialog.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { formatDate, formatRelative } from '@/lib/format'
import { thumbnailUrl } from '@/lib/assets'

const STATUSES: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Drafts' },
]

const route = useRoute()
const router = useRouter()

const initialStatus = STATUSES.find(({ value }) => value === route.query.status)?.value
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const status = ref<StatusFilter>(initialStatus ?? 'all')
const debouncedSearch = refDebounced(search, 300)
const creating = ref(false)

const filters = computed(() => ({ search: debouncedSearch.value.trim(), status: status.value }))

watch(filters, ({ search, status }) =>
    router.replace({
        query: { q: search || undefined, status: status === 'all' ? undefined : status },
    })
)

const stories = useInfiniteQuery(computed(() => storiesQuery(filters.value)))

const items = computed(() => stories.data.value?.pages.flatMap((page) => page.stories) ?? [])
const total = computed(() => stories.data.value?.pages[0]?.total ?? 0)
</script>

<template>
    <div class="flex flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold tracking-tight">Posts</h1>
                <p class="text-sm text-ink/60" aria-live="polite">
                    {{ total }} {{ total === 1 ? 'post' : 'posts' }}
                </p>
            </div>
            <UiButton variant="solid" :icon="Plus" @click="creating = true">New post</UiButton>
        </header>

        <div class="flex flex-wrap items-center gap-3">
            <label class="relative min-w-60 flex-1">
                <span class="sr-only">Search posts</span>
                <Search
                    class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink/50"
                    aria-hidden="true"
                />
                <input
                    v-model="search"
                    type="search"
                    class="control pl-9"
                    placeholder="Search posts"
                />
            </label>
            <div
                role="radiogroup"
                aria-label="Status"
                class="flex rounded-md border border-ink/25 p-0.5"
            >
                <label
                    v-for="option in STATUSES"
                    :key="option.value"
                    class="cursor-pointer rounded px-3 py-1.5 text-sm font-medium text-ink/70 transition-colors has-checked:bg-ink has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-ink"
                >
                    <input v-model="status" type="radio" class="sr-only" :value="option.value" />
                    {{ option.label }}
                </label>
            </div>
        </div>

        <p
            v-if="stories.isError.value"
            role="alert"
            class="rounded-md border border-ink px-4 py-3 text-sm"
        >
            {{ errorMessage(stories.error.value) }}
            <button type="button" class="ml-2 font-medium underline" @click="stories.refetch()">
                Retry
            </button>
        </p>

        <ul
            v-else-if="stories.isPending.value"
            class="divide-y divide-ink/10"
            aria-busy="true"
            aria-label="Loading posts"
        >
            <li v-for="index in 6" :key="index" class="flex animate-pulse gap-4 py-4">
                <div class="aspect-video w-24 rounded bg-ink/10" />
                <div class="flex-1 space-y-2 py-1">
                    <div class="h-4 w-1/3 rounded bg-ink/10" />
                    <div class="h-3 w-2/3 rounded bg-ink/10" />
                </div>
            </li>
        </ul>

        <div
            v-else-if="!items.length"
            class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-ink/30 px-6 py-16 text-center"
        >
            <FileText class="size-8 text-ink/40" aria-hidden="true" />
            <p class="text-sm text-ink/60">
                {{ filters.search ? 'No posts match your search.' : 'No posts yet.' }}
            </p>
        </div>

        <ul v-else class="divide-y divide-ink/10" :aria-busy="stories.isFetching.value">
            <li v-for="story in items" :key="story.id">
                <RouterLink
                    :to="{ name: 'story', params: { id: story.id } }"
                    class="group -mx-3 grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-4 rounded-lg px-3 py-4 transition-colors hover:bg-ink/5 sm:grid-cols-[7rem_minmax(0,1fr)_auto]"
                >
                    <div class="aspect-video overflow-hidden rounded bg-ink/10">
                        <img
                            v-if="story.cover"
                            :src="thumbnailUrl(story.cover, 320)"
                            alt=""
                            loading="lazy"
                            class="size-full object-cover"
                        />
                    </div>
                    <div class="min-w-0">
                        <p class="truncate font-semibold group-hover:underline">
                            {{ story.title }}
                        </p>
                        <p v-if="story.intro" class="line-clamp-1 text-sm text-ink/70">
                            {{ story.intro }}
                        </p>
                        <p class="mt-1 text-xs text-ink/60">
                            <span v-if="story.date">{{ formatDate(story.date) }} · </span>
                            Updated {{ formatRelative(story.updatedAt) }}
                        </p>
                    </div>
                    <StatusBadge :status="story.status" class="col-start-2 sm:col-start-auto" />
                </RouterLink>
            </li>
        </ul>

        <div v-if="stories.hasNextPage.value" class="flex justify-center">
            <UiButton :loading="stories.isFetchingNextPage.value" @click="stories.fetchNextPage()">
                Load more
            </UiButton>
        </div>

        <StoryDialog v-model:open="creating" />
    </div>
</template>
