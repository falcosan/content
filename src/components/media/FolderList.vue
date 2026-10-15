<script setup lang="ts">
import { Folder, FolderOpen, FolderPlus, Images, Pencil, Trash, Trash2 } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import type { AssetFolder } from '#types/api'
import type { MediaLocation } from '#types/app'
import { foldersQuery } from '@/api/queries'
import UiButton from '@/components/ui/UiButton.vue'
import { confirmAction } from '@/composables/useConfirm'
import { useDeleteFolder } from '@/composables/useMedia'
import { folderIndent } from '@/lib/folders'
import FolderDialog from './FolderDialog.vue'

const { manageable = false } = defineProps<{ manageable?: boolean }>()

const selected = defineModel<MediaLocation>({ required: true })

const ITEM_CLASS =
    'flex min-w-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-text/5 aria-[current=true]:bg-accent aria-[current=true]:text-accent-text md:w-full'

const { data: folders } = useQuery(foldersQuery())
const deleteFolder = useDeleteFolder()

const dialogOpen = ref(false)
const editing = ref<AssetFolder>()

const parentId = computed(() => (typeof selected.value === 'number' ? selected.value : null))

const selectedFolder = computed(() =>
    typeof selected.value === 'number'
        ? folders.value?.find(({ id }) => id === selected.value)
        : undefined
)

const create = () => {
    editing.value = undefined
    dialogOpen.value = true
}

const rename = (folder: AssetFolder) => {
    editing.value = folder
    dialogOpen.value = true
}

const remove = async (folder: AssetFolder) => {
    const confirmed = await confirmAction({
        title: 'Delete folder',
        message: `Delete the folder “${folder.name}”? This cannot be undone.`,
        action: 'Delete folder',
    })
    if (!confirmed) return
    deleteFolder.mutate(folder.id, {
        onSuccess: () => {
            if (selected.value === folder.id) selected.value = null
        },
    })
}
</script>

<template>
    <nav aria-label="Folders" class="flex min-w-0 flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
            <h2 class="text-xs font-semibold tracking-wide uppercase">Folders</h2>
            <div v-if="manageable" class="flex items-center gap-1">
                <template v-if="selectedFolder">
                    <UiButton
                        variant="ghost"
                        size="sm"
                        :icon="Pencil"
                        :aria-label="`Rename ${selectedFolder.name}`"
                        title="Rename folder"
                        @click="rename(selectedFolder)"
                    />
                    <UiButton
                        variant="ghost"
                        size="sm"
                        :icon="Trash2"
                        :aria-label="`Delete ${selectedFolder.name}`"
                        title="Delete folder"
                        :loading="deleteFolder.isPending.value"
                        @click="remove(selectedFolder)"
                    />
                </template>
                <UiButton
                    variant="ghost"
                    size="sm"
                    :icon="FolderPlus"
                    aria-label="New folder"
                    title="New folder"
                    @click="create"
                />
            </div>
        </div>
        <div class="flex flex-wrap gap-1 md:flex-col md:flex-nowrap">
            <button
                type="button"
                :class="ITEM_CLASS"
                :aria-current="selected === null"
                @click="selected = null"
            >
                <Images class="size-4 shrink-0" aria-hidden="true" />
                All assets
            </button>
            <button
                v-for="folder in folders"
                :key="folder.id"
                type="button"
                :class="[ITEM_CLASS, 'md:pl-[calc(0.625rem+var(--depth)*0.875rem)]']"
                :style="{ '--depth': folder.depth }"
                :aria-current="selected === folder.id"
                @click="selected = folder.id"
            >
                <component
                    :is="selected === folder.id ? FolderOpen : Folder"
                    class="size-4 shrink-0"
                    aria-hidden="true"
                />
                <span class="min-w-0 wrap-break-word">
                    <span v-if="folder.depth" class="md:hidden" aria-hidden="true">
                        {{ folderIndent(folder.depth) }}
                    </span>
                    {{ folder.name }}
                </span>
            </button>
            <button
                v-if="manageable"
                type="button"
                :class="[ITEM_CLASS, 'md:mt-1 md:border-t md:border-border/40 md:pt-2.5']"
                :aria-current="selected === 'trash'"
                @click="selected = 'trash'"
            >
                <Trash class="size-4 shrink-0" aria-hidden="true" />
                Trash
            </button>
        </div>
        <FolderDialog
            v-if="manageable"
            v-model:open="dialogOpen"
            :folder="editing"
            :parent-id="parentId"
        />
    </nav>
</template>
