<script setup lang="ts">
import { ArchiveRestore, ImageOff, Search, Trash2, Upload, X } from '@lucide/vue'
import { useInfiniteQuery, useQuery } from '@tanstack/vue-query'
import { refDebounced, useDropZone } from '@vueuse/core'
import { computed, ref, useTemplateRef, watch } from 'vue'
import { errorMessage, type Asset } from '@/api/client'
import { assetsQuery, foldersQuery } from '@/api/queries'
import UiButton from '@/components/ui/UiButton.vue'
import { confirmAction } from '@/composables/useConfirm'
import { useDeleteAssets, useMoveAssets, useRestoreAssets } from '@/composables/useMedia'
import { notify } from '@/composables/useToasts'
import { useUploads } from '@/composables/useUploads'
import { acceptFor, matchesFiletypes } from '@/lib/assets'
import { flattenFolders, folderLabel, type MediaLocation } from '@/lib/folders'
import AssetCard from './AssetCard.vue'
import AssetDetailsDialog from './AssetDetailsDialog.vue'
import FolderList from './FolderList.vue'

const { mode = 'manage', filetypes = [] } = defineProps<{
    mode?: 'manage' | 'pick'
    filetypes?: string[]
}>()

const emit = defineEmits<{ pick: [asset: Asset] }>()

const search = ref('')
const debouncedSearch = refDebounced(search, 300)
const location = ref<MediaLocation>(null)
const selected = ref(new Set<number>())
const details = ref<Asset | null>(null)
const moveTarget = ref<number | null>(null)

const folderId = computed(() => (typeof location.value === 'number' ? location.value : null))
const inTrash = computed(() => location.value === 'trash')

const filters = computed(() => ({
    search: debouncedSearch.value.trim(),
    folder: folderId.value,
    trash: inTrash.value,
}))

const assets = useInfiniteQuery(computed(() => assetsQuery(filters.value)))
const { data: folderData } = useQuery(foldersQuery())

const items = computed(() =>
    (assets.data.value?.pages.flatMap((page) => page.assets) ?? []).filter((asset) =>
        matchesFiletypes(asset.contentType, filetypes)
    )
)
const total = computed(() => assets.data.value?.pages[0]?.total ?? 0)
const folders = computed(() => flattenFolders(folderData.value ?? []))
const accept = computed(() => acceptFor(filetypes) || undefined)

watch(filters, () => selected.value.clear())

const { upload } = useUploads()
const moveAssets = useMoveAssets()
const deleteAssets = useDeleteAssets()
const restoreAssets = useRestoreAssets()

const uploadFiles = async (files: File[]) => {
    const accepted = files.filter((file) => matchesFiletypes(file.type, filetypes))
    const skipped = files.length - accepted.length
    if (skipped)
        notify(
            `${skipped} ${skipped === 1 ? 'file was' : 'files were'} skipped: unsupported type`,
            'error'
        )
    if (!accepted.length) return
    const uploaded = await upload(accepted, { folderId: folderId.value })
    if (mode === 'pick' && uploaded.length === 1 && uploaded[0]) emit('pick', uploaded[0])
}

const dropZone = useTemplateRef('dropZone')
const { isOverDropZone } = useDropZone(dropZone, {
    onDrop: (files) => files && uploadFiles(files),
})

const fileInput = useTemplateRef('fileInput')

const onFileInput = (event: Event) => {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files ?? [])
    input.value = ''
    void uploadFiles(files)
}

const open = (asset: Asset) => {
    if (mode === 'pick') emit('pick', asset)
    else if (inTrash.value) toggle(asset.id)
    else details.value = asset
}

const toggle = (id: number) => {
    if (selected.value.has(id)) selected.value.delete(id)
    else selected.value.add(id)
}

const moveSelected = () => {
    if (moveTarget.value === null) return
    moveAssets.mutate(
        { ids: [...selected.value], folderId: moveTarget.value },
        { onSuccess: () => selected.value.clear() }
    )
}

const restoreSelected = () =>
    restoreAssets.mutate([...selected.value], { onSuccess: () => selected.value.clear() })

const emptyMessage = computed(() => {
    if (filters.value.search) return 'No assets match your search.'
    return inTrash.value ? 'The trash is empty.' : 'Drop files here or use Upload.'
})

const deleteSelected = async () => {
    const count = selected.value.size
    const confirmed = await confirmAction({
        title: 'Delete assets',
        message: `Delete ${count} ${count === 1 ? 'asset' : 'assets'}? Posts that use them will show broken files.`,
        action: 'Delete',
    })
    if (confirmed)
        deleteAssets.mutate([...selected.value], { onSuccess: () => selected.value.clear() })
}
</script>

<template>
    <div class="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)]">
        <FolderList v-model="location" :manageable="mode === 'manage'" />

        <section ref="dropZone" class="relative flex min-w-0 flex-col gap-4" aria-label="Assets">
            <div class="flex flex-wrap items-center gap-3">
                <label class="relative min-w-52 flex-1">
                    <span class="sr-only">Search assets</span>
                    <Search
                        class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink/50"
                        aria-hidden="true"
                    />
                    <input
                        v-model="search"
                        type="search"
                        class="control pl-9"
                        placeholder="Search by filename"
                    />
                </label>
                <UiButton
                    v-if="!inTrash"
                    variant="solid"
                    :icon="Upload"
                    @click="fileInput?.click()"
                >
                    Upload
                </UiButton>
                <input
                    ref="fileInput"
                    type="file"
                    multiple
                    class="hidden"
                    :accept
                    @change="onFileInput"
                />
            </div>

            <div
                v-if="selected.size"
                class="flex flex-wrap items-center gap-2 rounded-md border border-ink px-3 py-2"
            >
                <span class="text-sm font-medium">{{ selected.size }} selected</span>
                <UiButton
                    variant="ghost"
                    size="sm"
                    :icon="X"
                    aria-label="Clear selection"
                    @click="selected.clear()"
                />
                <div v-if="inTrash" class="ml-auto">
                    <UiButton
                        size="sm"
                        :icon="ArchiveRestore"
                        :loading="restoreAssets.isPending.value"
                        @click="restoreSelected"
                    >
                        Restore
                    </UiButton>
                </div>
                <div v-else class="ml-auto flex flex-wrap items-center gap-2">
                    <select
                        v-model="moveTarget"
                        class="h-8 rounded-md border border-ink/25 bg-paper px-2 text-xs"
                        aria-label="Move to folder"
                    >
                        <option :value="null" disabled>Move to…</option>
                        <option v-for="option in folders" :key="option.id" :value="option.id">
                            {{ folderLabel(option) }}
                        </option>
                    </select>
                    <UiButton
                        size="sm"
                        :disabled="moveTarget === null"
                        :loading="moveAssets.isPending.value"
                        @click="moveSelected"
                    >
                        Move
                    </UiButton>
                    <UiButton
                        size="sm"
                        :icon="Trash2"
                        :loading="deleteAssets.isPending.value"
                        @click="deleteSelected"
                    >
                        Delete
                    </UiButton>
                </div>
            </div>

            <p
                v-if="assets.isError.value"
                role="alert"
                class="rounded-md border border-ink px-4 py-3 text-sm"
            >
                {{ errorMessage(assets.error.value) }}
                <button type="button" class="ml-2 font-medium underline" @click="assets.refetch()">
                    Retry
                </button>
            </p>

            <div
                v-else-if="assets.isPending.value"
                class="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4"
                aria-busy="true"
                aria-label="Loading assets"
            >
                <div v-for="index in 12" :key="index" class="animate-pulse">
                    <div class="aspect-square rounded-md bg-ink/10" />
                    <div class="mt-2 h-3 w-3/4 rounded bg-ink/10" />
                </div>
            </div>

            <div
                v-else-if="!items.length"
                class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-ink/30 px-6 py-16 text-center"
            >
                <ImageOff class="size-8 text-ink/40" aria-hidden="true" />
                <p class="text-sm text-ink/60">
                    {{ emptyMessage }}
                </p>
            </div>

            <template v-else>
                <p class="text-xs text-ink/60" aria-live="polite">
                    {{ total }} {{ total === 1 ? 'asset' : 'assets' }}
                </p>
                <div
                    class="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4"
                    :aria-busy="assets.isFetching.value"
                >
                    <AssetCard
                        v-for="asset in items"
                        :key="asset.id"
                        :asset
                        :selectable="mode === 'manage'"
                        :selected="selected.has(asset.id)"
                        @open="open(asset)"
                        @toggle="toggle(asset.id)"
                    />
                </div>
            </template>

            <div v-if="assets.hasNextPage.value" class="flex justify-center">
                <UiButton
                    :loading="assets.isFetchingNextPage.value"
                    @click="assets.fetchNextPage()"
                >
                    Load more
                </UiButton>
            </div>

            <div
                v-if="isOverDropZone && !inTrash"
                class="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-lg border-2 border-dashed border-ink bg-paper/90"
            >
                <p class="flex items-center gap-2 text-sm font-semibold">
                    <Upload class="size-5" aria-hidden="true" />
                    Drop to upload
                </p>
            </div>
        </section>

        <AssetDetailsDialog v-if="mode === 'manage'" v-model:asset="details" />
    </div>
</template>
