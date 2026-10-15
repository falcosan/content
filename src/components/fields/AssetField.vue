<script setup lang="ts">
import { CircleAlert, Images, X } from '@lucide/vue'
import { computed, ref, useId, watch } from 'vue'
import type { Asset } from '#types/api'
import AssetPickerDialog from '@/components/media/AssetPickerDialog.vue'
import UiButton from '@/components/ui/UiButton.vue'
import {
    emptyAssetValue,
    isAssetValue,
    isImageUrl,
    thumbnailUrl,
    toAssetValue,
    toExternalAssetValue,
} from '@/lib/assets'
import { parseHttpsUrl } from '@/lib/embed'

const {
    filetypes,
    allowExternalUrl = false,
    labelledBy,
    describedBy,
    invalid = false,
} = defineProps<{
    filetypes: string[]
    allowExternalUrl?: boolean
    labelledBy: string
    describedBy?: string
    invalid?: boolean
}>()

const model = defineModel<unknown>()

const urlErrorId = useId()

const picking = ref(false)
const broken = ref(false)
const url = ref('')
const urlInvalid = ref(false)

const value = computed(() =>
    isAssetValue(model.value) && model.value.filename ? model.value : null
)

const name = computed(() => value.value?.filename.split('/').pop() ?? '')

const showImage = computed(
    () =>
        !!value.value &&
        !broken.value &&
        (value.value.is_external_url || isImageUrl(value.value.filename))
)

const externalUrl = computed(() => (value.value?.is_external_url ? value.value.filename : ''))

watch(
    () => value.value?.filename,
    () => (broken.value = false)
)

watch(
    externalUrl,
    (current) => {
        url.value = current
        urlInvalid.value = false
    },
    { immediate: true }
)

const pick = (asset: Asset) => {
    url.value = ''
    urlInvalid.value = false
    model.value = toAssetValue(asset)
}

const remove = () => {
    url.value = ''
    urlInvalid.value = false
    model.value = emptyAssetValue()
}

const applyUrl = () => {
    const input = url.value.trim()
    if (!input) {
        urlInvalid.value = false
        if (value.value?.is_external_url) model.value = emptyAssetValue()
        return
    }
    const parsed = parseHttpsUrl(input)
    urlInvalid.value = !parsed
    if (parsed) model.value = toExternalAssetValue(parsed.href, value.value?.alt)
}

const setAlt = (alt: string) => {
    if (value.value) model.value = { ...value.value, alt }
}
</script>

<template>
    <div role="group" :aria-labelledby="labelledBy" class="flex flex-col gap-2">
        <div
            :class="[
                'grid aspect-video grid-cols-1 grid-rows-1 place-items-center overflow-hidden rounded-md border bg-text/5',
                invalid ? 'border-2 border-text' : 'border-dashed border-border',
            ]"
        >
            <img
                v-if="showImage && value"
                :src="thumbnailUrl(value.filename, 640)"
                :alt="value.alt"
                class="size-full object-cover"
                @error="broken = true"
            />
            <span v-else-if="value" class="px-3 text-center text-xs break-all">{{ name }}</span>
            <UiButton
                v-else
                size="sm"
                :icon="Images"
                :aria-invalid="invalid || undefined"
                :aria-describedby="describedBy"
                @click="picking = true"
            >
                Choose from library
            </UiButton>
        </div>
        <div v-if="value" class="flex flex-wrap items-center gap-2">
            <UiButton size="sm" :icon="Images" @click="picking = true">Replace</UiButton>
            <UiButton size="sm" :icon="X" @click="remove">Remove</UiButton>
        </div>
        <label v-if="allowExternalUrl" class="block">
            <span class="sr-only">Image URL</span>
            <input
                v-model="url"
                type="url"
                class="control"
                placeholder="Or paste an image URL"
                :aria-invalid="urlInvalid || undefined"
                :aria-describedby="urlInvalid ? urlErrorId : undefined"
                @change="applyUrl"
            />
        </label>
        <p
            v-if="allowExternalUrl && urlInvalid"
            :id="urlErrorId"
            class="flex items-center gap-1.5 text-xs font-semibold"
        >
            <CircleAlert class="size-3.5 shrink-0" aria-hidden="true" />
            Enter a valid https URL
        </p>
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
