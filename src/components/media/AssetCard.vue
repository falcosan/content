<script setup lang="ts">
import { ref } from 'vue'
import type { Asset } from '@/api/client'
import { isImage, isImageUrl, thumbnailUrl } from '@/lib/assets'
import { formatBytes } from '@/lib/format'
import AssetIcon from './AssetIcon.vue'

const {
    asset,
    selectable = false,
    selected = false,
} = defineProps<{
    asset: Asset
    selectable?: boolean
    selected?: boolean
}>()

const emit = defineEmits<{ open: []; toggle: [] }>()

const broken = ref(false)
</script>

<template>
    <article class="group relative">
        <button
            type="button"
            class="block w-full rounded-md text-left"
            :aria-label="`Open ${asset.name}`"
            @click="emit('open')"
        >
            <div
                :class="[
                    'grid aspect-square place-items-center overflow-hidden rounded-md border bg-ink/5 transition-colors group-hover:border-ink',
                    selected ? 'border-ink outline-2 outline-ink' : 'border-ink/15',
                ]"
            >
                <img
                    v-if="!broken && (isImage(asset.contentType) || isImageUrl(asset.url))"
                    :src="thumbnailUrl(asset.url, 320)"
                    :alt="asset.alt"
                    loading="lazy"
                    class="size-full object-cover"
                    @error="broken = true"
                />
                <AssetIcon v-else :content-type="asset.contentType" class="size-8 text-ink/50" />
            </div>
            <p class="mt-1.5 truncate text-xs font-medium" :title="asset.name">{{ asset.name }}</p>
            <p class="text-xs text-ink/60">
                <template v-if="asset.width && asset.height">
                    {{ asset.width }}×{{ asset.height }} ·
                </template>
                {{ asset.size === null ? asset.contentType : formatBytes(asset.size) }}
            </p>
        </button>
        <label
            v-if="selectable"
            :class="[
                'absolute top-2 left-2 grid size-7 cursor-pointer place-items-center rounded-md border border-ink bg-paper transition-opacity',
                selected
                    ? 'opacity-100'
                    : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
            ]"
        >
            <input
                type="checkbox"
                class="size-4 accent-ink"
                :checked="selected"
                :aria-label="`Select ${asset.name}`"
                @change="emit('toggle')"
            />
        </label>
    </article>
</template>
