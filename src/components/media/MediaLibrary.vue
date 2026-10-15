<script setup lang="ts">
import { ArchiveRestore, ImageOff, Search, Trash2, Upload, X } from '@lucide/vue'
import { useInfiniteQuery, useQuery } from '@tanstack/vue-query'
import { refDebounced, useDropZone } from '@vueuse/core'
import { computed, ref, useTemplateRef, watch } from 'vue'
import type { Asset } from '#types/api'
import type { MediaLocation } from '#types/app'
import { errorMessage } from '@/api/client'
import { assetsQuery, foldersQuery } from '@/api/queries'
import UiButton from '@/components/ui/UiButton.vue'
import { confirmAction } from '@/composables/useConfirm'
import { useDeleteAssets, useMoveAssets, useRestoreAssets } from '@/composables/useMedia'
import { notify } from '@/composables/useToasts'
import { useUploads } from '@/composables/useUploads'
import { acceptFor, matchesFiletypes } from '@/lib/assets'
import { SEARCH_DEBOUNCE_MS } from '@/lib/filters'
import { folderLabel } from '@/lib/folders'
import AssetCard from './AssetCard.vue'
import AssetDetailsDialog from './AssetDetailsDialog.vue'
import FolderList from './FolderList.vue'

const { mode = 'manage', filetypes = [] } = defineProps<{
    mode?: 'manage' | 'pick'
    filetypes?: string[]
}>()

const emit = defineEmits<{ pick: [asset: Asset] }>()

const GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))]'

const { data: folders } = useQuery(foldersQuery())
const { upload } = useUploads()
const moveAssets = useMoveAssets()
const deleteAssets = useDeleteAssets()
const restoreAssets = useRestoreAssets()

const search = ref('')
const location = ref<MediaLocation>(null)
const selected = ref(new Set<number>())
const details = ref<Asset | null>(null)
const moveTarget = ref<number | null>(null)
const dropZone = useTemplateRef('dropZone')
const fileInput = useTemplateRef('fileInput')

const { isOverDropZone } = useDropZone(dropZone, {
    onDrop: (files) => files && !inTrash.value && uploadFiles(files),
})

const debouncedSearch = refDebounced(search, SEARCH_DEBOUNCE_MS)
const assets = useInfiniteQuery(
    computed(() => assetsQuery({ search: debouncedSearch.value, location: location.value }))
)

const folderId = computed(() => (typeof location.value === 'number' ? location.value : null))
const inTrash = computed(() => location.value === 'trash')

const items = computed(() =>
    (assets.data.value?.pages.flatMap((page) => page.assets) ?? []).filter((asset) =>
        matchesFiletypes(asset.contentType, filetypes)
    )
)
const selection = computed(() =>
    items.value.filter(({ id }) => selected.value.has(id)).map(({ id }) => id)
)
const total = computed(() => assets.data.value?.pages[0]?.total ?? 0)
const accept = computed(() => acceptFor(filetypes) || undefined)

const emptyMessage = computed(() => {
    if (assets.hasNextPage.value) return 'No matching files on the loaded pages yet.'
    if (debouncedSearch.value) return 'No assets match your search.'
    return inTrash.value ? 'The trash is empty.' : 'Drop files here or use Upload.'
})

watch([debouncedSearch, location], () => selected.value.clear())

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

const onFileInput = (event: Event) => {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files ?? [])
    input.value = ''
    void uploadFiles(files)
}

const open = (asset: Asset) => {
    if (mode === 'pick') emit('pick', asset)
    else details.value = asset
}

const toggle = (id: number) => {
    if (selected.value.has(id)) selected.value.delete(id)
    else selected.value.add(id)
}

const moveSelected = () => {
    if (moveTarget.value === null) return
    moveAssets.mutate(
        { ids: selection.value, folderId: moveTarget.value },
        { onSuccess: () => selected.value.clear() }
    )
}

const restoreSelected = () =>
    restoreAssets.mutate(selection.value, { onSuccess: () => selected.value.clear() })

const deleteSelected = async () => {
    const count = selection.value.length
    const confirmed = await confirmAction({
        title: 'Delete assets',
        message: `Delete ${count} ${count === 1 ? 'asset' : 'assets'}? Posts that use them will show broken files.`,
        action: 'Delete',
    })
    if (confirmed) deleteAssets.mutate(selection.value, { onSuccess: () => selected.value.clear() })
}
</script>

<template>
    <div class="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)]">
        <FolderList v-model="location" :manageable="mode === 'manage'" />

        <section ref="dropZone" class="relative flex min-w-0 flex-col gap-4" aria-label="Assets">
            <div class="flex flex-wrap items-center gap-3">
                <label class="relative min-w-40 flex-1">
                    <span class="sr-only">Search assets</span>
                    <Search
                        class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-light"
                        aria-hidden="true"
                    />
                    <input
                        v-model.trim="search"
                        type="search"
                        class="control pl-9"
                        placeholder="Search files"
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
                v-if="selection.length"
                class="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2"
            >
                <span class="text-sm font-medium">{{ selection.length }} selected</span>
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
                        class="h-8 rounded-md border border-border bg-bg px-2 text-xs"
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
                v-if="!assets.isLoadingError.value && !filetypes.length"
                class="text-xs text-text-light"
                aria-live="polite"
            >
                <span
                    v-if="assets.isPending.value"
                    class="skeleton-text animate-pulse"
                    aria-hidden="true"
                >
                    00 assets
                </span>
                <template v-else>{{ total }} {{ total === 1 ? 'asset' : 'assets' }}</template>
            </p>

            <p
                v-if="assets.isError.value"
                role="alert"
                class="rounded-md border border-border px-4 py-3 text-sm"
            >
                {{ errorMessage(assets.error.value) }}
                <button type="button" class="ml-2 font-medium underline" @click="assets.refetch()">
                    Retry
                </button>
            </p>

            <div
                v-if="assets.isPending.value"
                :class="GRID"
                role="status"
                aria-busy="true"
                aria-label="Loading assets"
            >
                <AssetCard v-for="index in 12" :key="index" />
            </div>

            <div v-else-if="items.length" :class="GRID" :aria-busy="assets.isFetching.value">
                <AssetCard
                    v-for="asset in items"
                    :key="asset.id"
                    :asset
                    :action="mode === 'pick' ? 'Choose' : 'Open'"
                    :selectable="mode === 'manage' && !inTrash"
                    :selected="selected.has(asset.id)"
                    @open="open(asset)"
                    @toggle="toggle(asset.id)"
                />
            </div>

            <div
                v-else-if="!assets.isError.value"
                class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-16 text-center"
            >
                <ImageOff class="size-8 text-text-light" aria-hidden="true" />
                <p class="text-sm text-text-light">
                    {{ emptyMessage }}
                </p>
            </div>

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
                class="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-lg border-2 border-dashed border-accent bg-bg/90"
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
