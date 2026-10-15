<script setup lang="ts">
import type { StorySummary } from '#types/api'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { thumbnailUrl } from '@/lib/assets'
import { formatDate, formatRelative } from '@/lib/format'

const { story } = defineProps<{ story?: StorySummary }>()

const ROW =
    'grid grid-cols-1 gap-x-4 gap-y-3 rounded-lg max-sm:border max-sm:border-border/40 max-sm:p-3 sm:grid-cols-[7rem_minmax(0,1fr)_minmax(10rem,auto)] sm:items-center sm:py-4'
const THUMBNAIL = 'aspect-video overflow-hidden rounded bg-text/10'
const BADGE_SLOT = 'justify-self-start sm:col-start-3 sm:row-start-1 sm:justify-self-end'
const TITLE = 'font-semibold wrap-break-word'
const INTRO = 'min-h-5 text-sm wrap-break-word'
const META = 'mt-1 text-xs'
</script>

<template>
    <RouterLink
        v-if="story"
        :to="{ name: 'story', params: { id: story.id } }"
        :class="[
            ROW,
            'group transition-colors hover:bg-text/5 focus-visible:outline-offset-0 sm:-mx-3 sm:px-3',
        ]"
    >
        <div :class="THUMBNAIL">
            <img
                v-if="story.cover"
                :src="thumbnailUrl(story.cover, 320)"
                :srcset="`${thumbnailUrl(story.cover, 320)} 320w, ${thumbnailUrl(story.cover, 640)} 640w`"
                sizes="(width >= 40rem) 7rem, 100vw"
                alt=""
                loading="lazy"
                class="size-full object-cover"
            />
        </div>
        <div class="min-w-0">
            <p :class="[TITLE, 'group-hover:underline']">{{ story.title }}</p>
            <p :class="[INTRO, 'text-text-light']">{{ story.intro }}</p>
            <p :class="[META, 'text-text-light']">
                <span v-if="story.date">{{ formatDate(story.date) }} · </span>
                Updated {{ formatRelative(story.updatedAt) }}
            </p>
        </div>
        <StatusBadge :status="story.status" :class="BADGE_SLOT" />
    </RouterLink>
    <div v-else :class="[ROW, 'animate-pulse']" aria-hidden="true">
        <div :class="THUMBNAIL" />
        <div class="min-w-0">
            <p :class="TITLE"><span class="skeleton-text">A post title</span></p>
            <p :class="INTRO">
                <span class="skeleton-text">The intro of a post</span>
            </p>
            <p :class="META">
                <span class="skeleton-text">Jan 1, 2025 · Updated 2 years ago</span>
            </p>
        </div>
        <span :class="[BADGE_SLOT, 'inline-flex h-6 w-20 rounded-full bg-text/10']" />
    </div>
</template>
