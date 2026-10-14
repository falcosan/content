<script setup lang="ts">
import { Copy, ExternalLink, Trash2 } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { computed, reactive, watch } from 'vue'
import type { Asset } from '@/api/client'
import { foldersQuery } from '@/api/queries'
import UiButton from '@/components/ui/UiButton.vue'
import UiDialog from '@/components/ui/UiDialog.vue'
import { confirmAction } from '@/composables/useConfirm'
import { useDeleteAssets, useUpdateAsset, type AssetMetadata } from '@/composables/useMedia'
import { notify } from '@/composables/useToasts'
import { isImage, thumbnailUrl } from '@/lib/assets'
import { flattenFolders, folderLabel } from '@/lib/folders'
import { formatBytes, formatDate } from '@/lib/format'
import AssetIcon from './AssetIcon.vue'

const asset = defineModel<Asset | null>('asset', { required: true })

const open = computed({
    get: () => asset.value !== null,
    set: (value) => {
        if (!value) asset.value = null
    },
})

const { data: folderData } = useQuery(foldersQuery())
const folders = computed(() => flattenFolders(folderData.value ?? []))

const form = reactive<AssetMetadata>({
    alt: '',
    title: '',
    copyright: '',
    source: '',
    folderId: null,
})

watch(
    () => asset.value?.id,
    () => {
        if (!asset.value) return
        const { alt, title, copyright, source, folderId } = asset.value
        Object.assign(form, { alt, title, copyright, source, folderId })
    },
    { immediate: true }
)

const update = useUpdateAsset()
const remove = useDeleteAssets()

const kind = computed(() => {
    const type = asset.value?.contentType ?? ''
    if (isImage(type)) return 'image'
    if (type.startsWith('video/')) return 'video'
    if (type.startsWith('audio/')) return 'audio'
    return 'file'
})

const save = () => {
    if (!asset.value) return
    update.mutate({ id: asset.value.id, ...form }, { onSuccess: (saved) => (asset.value = saved) })
}

const copyUrl = async () => {
    if (!asset.value) return
    await navigator.clipboard.writeText(asset.value.url)
    notify('URL copied to clipboard')
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
                    class="grid min-h-48 place-items-center overflow-hidden rounded-md border border-ink/15 bg-ink/5"
                >
                    <img
                        v-if="kind === 'image'"
                        :src="thumbnailUrl(asset.url, 960)"
                        :alt="asset.alt"
                        class="max-h-[50dvh] w-full object-contain"
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
                        class="size-12 text-ink/50"
                    />
                </div>
                <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                    <dt class="text-ink/60">Type</dt>
                    <dd>{{ asset.contentType }}</dd>
                    <template v-if="asset.size !== null">
                        <dt class="text-ink/60">Size</dt>
                        <dd>{{ formatBytes(asset.size) }}</dd>
                    </template>
                    <template v-if="asset.width && asset.height">
                        <dt class="text-ink/60">Dimensions</dt>
                        <dd>{{ asset.width }} × {{ asset.height }}</dd>
                    </template>
                    <dt class="text-ink/60">Uploaded</dt>
                    <dd>{{ formatDate(asset.createdAt) }}</dd>
                </dl>
                <div class="flex flex-wrap gap-2">
                    <UiButton size="sm" :icon="Copy" @click="copyUrl">Copy URL</UiButton>
                    <UiButton size="sm" :icon="ExternalLink" :href="asset.url">Open</UiButton>
                </div>
            </div>
            <form id="asset-form" class="flex flex-col gap-4" @submit.prevent="save">
                <label class="block">
                    <span class="label">Alt text</span>
                    <input v-model="form.alt" class="control" maxlength="1000" />
                    <p class="hint">Describes the image for screen readers and search engines.</p>
                </label>
                <label class="block">
                    <span class="label">Title</span>
                    <input v-model="form.title" class="control" maxlength="1000" />
                </label>
                <label class="block">
                    <span class="label">Copyright</span>
                    <input v-model="form.copyright" class="control" maxlength="1000" />
                </label>
                <label class="block">
                    <span class="label">Source</span>
                    <input v-model="form.source" class="control" maxlength="1000" />
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
                form="asset-form"
                variant="solid"
                :loading="update.isPending.value"
            >
                Save
            </UiButton>
        </template>
    </UiDialog>
</template>
