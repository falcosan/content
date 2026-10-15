<script setup lang="ts">
import { ref, useId } from 'vue'
import type { Asset } from '#types/api'
import { isImage, isImageUrl, thumbnailUrl } from '@/lib/assets'
import { formatBytes, formatDate } from '@/lib/format'
import AssetIcon from './AssetIcon.vue'

const {
    asset,
    action = 'Open',
    selectable = false,
    selected = false,
} = defineProps<{
    asset?: Asset
    action?: 'Open' | 'Choose'
    selectable?: boolean
    selected?: boolean
}>()

const emit = defineEmits<{ open: []; toggle: [] }>()

const FRAME = 'grid aspect-square place-items-center overflow-hidden rounded-md border bg-text/5'

const detailsId = useId()

const broken = ref(false)
</script>

<template>
    <article v-if="asset" class="group relative">
        <button
            type="button"
            class="block w-full rounded-md text-left"
            :aria-label="`${asset.deletedAt ? 'Select' : action} ${asset.name}`"
            :aria-pressed="asset.deletedAt ? selected : undefined"
            :aria-describedby="detailsId"
            @click="asset.deletedAt ? emit('toggle') : emit('open')"
        >
            <span
                :class="[
                    FRAME,
                    'transition-colors group-hover:border-accent',
                    selected ? 'border-accent outline-2 outline-accent' : 'border-border/40',
                ]"
            >
                <img
                    v-if="
                        !asset.deletedAt &&
                        !broken &&
                        (isImage(asset.contentType) || isImageUrl(asset.url))
                    "
                    :src="thumbnailUrl(asset.url, 320)"
                    :alt="asset.alt"
                    loading="lazy"
                    class="size-full object-cover"
                    @error="broken = true"
                />
                <span
                    v-else
                    class="flex flex-col items-center gap-2 px-3 text-center text-xs text-text-light"
                >
                    <AssetIcon :content-type="asset.contentType" class="size-8 text-text-light" />
                    <template v-if="asset.deletedAt">No preview while deleted</template>
                </span>
            </span>
            <span class="mt-1.5 block text-xs font-medium wrap-break-word">{{ asset.name }}</span>
            <span :id="detailsId" class="block text-xs text-text-light wrap-break-word">
                <span class="block">
                    <template v-if="asset.width && asset.height">
                        {{ asset.width }}×{{ asset.height }} ·
                    </template>
                    {{ asset.size === null ? asset.contentType : formatBytes(asset.size) }}
                </span>
                <span v-if="asset.deletedAt" class="block">
                    Deleted {{ formatDate(asset.deletedAt) }}
                </span>
            </span>
        </button>
        <label
            v-if="selectable"
            :class="[
                'absolute top-2 left-2 grid size-7 cursor-pointer place-items-center rounded-md border border-border bg-bg transition-opacity',
                selected
                    ? 'opacity-100'
                    : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 any-pointer-coarse:opacity-100',
            ]"
        >
            <input
                type="checkbox"
                class="size-4 accent-accent"
                :checked="selected"
                :aria-label="`Select ${asset.name}`"
                @change="emit('toggle')"
            />
        </label>
    </article>
    <div v-else class="animate-pulse" aria-hidden="true">
        <span :class="[FRAME, 'border-border/40']" />
        <span class="mt-1.5 block text-xs font-medium">
            <span class="skeleton-text">filename.webp</span>
        </span>
        <span class="block text-xs"><span class="skeleton-text">1280×720 · 120 kB</span></span>
    </div>
</template>
