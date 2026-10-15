<script setup lang="ts">
import { Copy, ExternalLink, Trash2 } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { computed, reactive, ref, useId, watch } from 'vue'
import type { Asset } from '#types/api'
import type { AssetMetadata } from '#types/app'
import { foldersQuery } from '@/api/queries'
import UiButton from '@/components/ui/UiButton.vue'
import UiDialog from '@/components/ui/UiDialog.vue'
import { confirmAction } from '@/composables/useConfirm'
import { useDeleteAssets, useUpdateAsset } from '@/composables/useMedia'
import { assetKind, thumbnailUrl } from '@/lib/assets'
import { copyToClipboard } from '@/lib/clipboard'
import { folderLabel } from '@/lib/folders'
import { formatBytes, formatDate } from '@/lib/format'
import { MAX_LENGTH } from '../../../shared/validation'
import AssetIcon from './AssetIcon.vue'

const asset = defineModel<Asset | null>('asset', { required: true })

const { data: folders } = useQuery(foldersQuery())
const update = useUpdateAsset()
const remove = useDeleteAssets()
const formId = useId()
const altId = useId()
const altHintId = useId()

const form = reactive<AssetMetadata>({
    alt: '',
    title: '',
    copyright: '',
    source: '',
    folderId: null,
})
const broken = ref(false)

const open = computed({
    get: () => asset.value !== null,
    set: (value) => {
        if (!value) asset.value = null
    },
})

const kind = computed(() => assetKind(asset.value?.contentType ?? ''))

watch(
    () => asset.value?.id,
    () => {
        broken.value = false
        if (!asset.value) return
        const { alt, title, copyright, source, folderId } = asset.value
        Object.assign(form, { alt, title, copyright, source, folderId })
    },
    { immediate: true }
)

const save = () => {
    if (!asset.value) return
    update.mutate({ id: asset.value.id, ...form }, { onSuccess: (saved) => (asset.value = saved) })
}

const destroy = async () => {
    if (!asset.value) return
    const { id, name } = asset.value
    const confirmed = await confirmAction({
        title: 'Delete asset',
        message: `Delete “${name}”? Posts that use it will show a broken file.`,
        action: 'Delete asset',
    })
    if (confirmed) remove.mutate([id], { onSuccess: () => (asset.value = null) })
}
</script>

<template>
    <UiDialog v-model:open="open" :title="asset?.name ?? ''" size="lg">
        <div v-if="asset" class="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
            <div class="flex flex-col gap-3">
                <div
                    class="grid min-h-48 place-items-center overflow-hidden rounded-md border border-border/40 bg-text/5"
                >
                    <img
                        v-if="kind === 'image' && !broken"
                        :src="thumbnailUrl(asset.url, 960)"
                        :alt="asset.alt"
                        class="max-h-[50dvh] w-full object-contain"
                        @error="broken = true"
                    />
                    <video
                        v-else-if="kind === 'video'"
                        :src="asset.url"
                        controls
                        class="max-h-[50dvh] w-full"
                    />
                    <audio v-else-if="kind === 'audio'" :src="asset.url" controls class="w-full" />
                    <AssetIcon
                        v-else
                        :content-type="asset.contentType"
                        class="size-12 text-text-light"
                    />
                </div>
                <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                    <dt class="text-text-light">Type</dt>
                    <dd>{{ asset.contentType }}</dd>
                    <template v-if="asset.size !== null">
                        <dt class="text-text-light">Size</dt>
                        <dd>{{ formatBytes(asset.size) }}</dd>
                    </template>
                    <template v-if="asset.width && asset.height">
                        <dt class="text-text-light">Dimensions</dt>
                        <dd>{{ asset.width }} × {{ asset.height }}</dd>
                    </template>
                    <dt class="text-text-light">Uploaded</dt>
                    <dd>{{ formatDate(asset.createdAt) }}</dd>
                </dl>
                <div class="flex flex-wrap gap-2">
                    <UiButton
                        size="sm"
                        :icon="Copy"
                        @click="copyToClipboard(asset.url, 'URL copied to clipboard')"
                    >
                        Copy URL
                    </UiButton>
                    <UiButton size="sm" :icon="ExternalLink" :href="asset.url">Open</UiButton>
                </div>
            </div>
            <form :id="formId" class="flex flex-col gap-4" @submit.prevent="save">
                <div>
                    <label class="label" :for="altId">Alt text</label>
                    <input
                        :id="altId"
                        v-model="form.alt"
                        class="control"
                        :maxlength="MAX_LENGTH.assetText"
                        :aria-describedby="altHintId"
                    />
                    <p :id="altHintId" class="hint">
                        Describes the image for screen readers and search engines.
                    </p>
                </div>
                <label class="block">
                    <span class="label">Title</span>
                    <input v-model="form.title" class="control" :maxlength="MAX_LENGTH.assetText" />
                </label>
                <label class="block">
                    <span class="label">Copyright</span>
                    <input
                        v-model="form.copyright"
                        class="control"
                        :maxlength="MAX_LENGTH.assetText"
                    />
                </label>
                <label class="block">
                    <span class="label">Source</span>
                    <input
                        v-model="form.source"
                        class="control"
                        :maxlength="MAX_LENGTH.assetText"
                    />
                </label>
                <label class="block">
                    <span class="label">Folder</span>
                    <select v-model="form.folderId" class="control">
                        <option :value="null">No folder</option>
                        <option v-for="folder in folders" :key="folder.id" :value="folder.id">
                            {{ folderLabel(folder) }}
                        </option>
                    </select>
                </label>
            </form>
        </div>
        <template #footer>
            <UiButton
                class="mr-auto"
                :icon="Trash2"
                :loading="remove.isPending.value"
                @click="destroy"
            >
                Delete
            </UiButton>
            <UiButton @click="open = false">Close</UiButton>
            <UiButton
                type="submit"
                :form="formId"
                variant="solid"
                :loading="update.isPending.value"
            >
                Save
            </UiButton>
        </template>
    </UiDialog>
</template>
