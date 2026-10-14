<script setup lang="ts">
import { Images, X } from '@lucide/vue'
import { computed, ref } from 'vue'
import type { Asset } from '@/api/client'
import AssetPickerDialog from '@/components/media/AssetPickerDialog.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { emptyAssetValue, isAssetValue, isImageUrl, thumbnailUrl, toAssetValue } from '@/lib/assets'

const {
    filetypes,
    labelledBy,
    invalid = false,
} = defineProps<{
    filetypes: string[]
    labelledBy: string
    invalid?: boolean
}>()

const model = defineModel<unknown>()

const picking = ref(false)

const value = computed(() =>
    isAssetValue(model.value) && model.value.filename ? model.value : null
)

const name = computed(() => value.value?.filename.split('/').pop() ?? '')

const pick = (asset: Asset) => {
    model.value = toAssetValue(asset)
}

const setAlt = (alt: string) => {
    if (value.value) model.value = { ...value.value, alt }
}
</script>

<template>
    <div role="group" :aria-labelledby="labelledBy" class="flex flex-col gap-2">
        <div
            :class="[
                'grid aspect-video place-items-center overflow-hidden rounded-md border bg-ink/5',
                invalid ? 'border-2 border-ink' : 'border-dashed border-ink/30',
            ]"
        >
            <img
                v-if="value && isImageUrl(value.filename)"
                :src="thumbnailUrl(value.filename, 640)"
                :alt="value.alt"
                class="size-full object-cover"
            />
            <span v-else-if="value" class="px-3 text-center text-xs break-all">{{ name }}</span>
            <UiButton
                v-else
                size="sm"
                :icon="Images"
                :aria-invalid="invalid || undefined"
                @click="picking = true"
            >
                Choose file
            </UiButton>
        </div>
        <div v-if="value" class="flex items-center gap-2">
            <UiButton size="sm" :icon="Images" @click="picking = true">Replace</UiButton>
            <UiButton size="sm" :icon="X" @click="model = emptyAssetValue()">Remove</UiButton>
        </div>
        <label v-if="value" class="block">
            <span class="sr-only">Alt text</span>
            <input
                :value="value.alt"
                class="control"
                placeholder="Alt text"
                @input="setAlt(($event.target as HTMLInputElement).value)"
            />
        </label>
        <AssetPickerDialog v-model:open="picking" :filetypes @pick="pick" />
    </div>
</template>
