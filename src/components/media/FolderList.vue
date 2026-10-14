<script setup lang="ts">
import { Folder, FolderOpen, FolderPlus, Images, Pencil, Trash, Trash2 } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import type { AssetFolder } from '@/api/client'
import { foldersQuery } from '@/api/queries'
import UiButton from '@/components/ui/UiButton.vue'
import { confirmAction } from '@/composables/useConfirm'
import { useDeleteFolder } from '@/composables/useMedia'
import { flattenFolders, type MediaLocation } from '@/lib/folders'
import FolderDialog from './FolderDialog.vue'

const { manageable = false } = defineProps<{ manageable?: boolean }>()

const selected = defineModel<MediaLocation>({ required: true })

const { data } = useQuery(foldersQuery())
const folders = computed(() => flattenFolders(data.value ?? []))

const dialogOpen = ref(false)
const editing = ref<AssetFolder>()
const deleteFolder = useDeleteFolder()

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

const parentId = computed(() => (typeof selected.value === 'number' ? selected.value : null))

const itemClass =
    'flex w-full min-w-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-ink/5 aria-[current=true]:bg-ink aria-[current=true]:text-paper'
</script>

<template>
    <nav aria-label="Folders" class="flex flex-col gap-1">
        <div class="mb-1 flex items-center justify-between">
            <h2 class="text-xs font-semibold tracking-wide uppercase">Folders</h2>
            <UiButton
                v-if="manageable"
                variant="ghost"
                size="sm"
                :icon="FolderPlus"
                aria-label="New folder"
                title="New folder"
                @click="create"
            />
        </div>
        <button
            type="button"
            :class="itemClass"
            :aria-current="selected === null"
            @click="selected = null"
        >
            <Images class="size-4 shrink-0" aria-hidden="true" />
            All assets
        </button>
        <div v-for="folder in folders" :key="folder.id" class="group flex items-center gap-1">
            <button
                type="button"
                :class="itemClass"
                :style="{ paddingLeft: `${0.625 + folder.depth * 0.875}rem` }"
                :aria-current="selected === folder.id"
                @click="selected = folder.id"
            >
                <component
                    :is="selected === folder.id ? FolderOpen : Folder"
                    class="size-4 shrink-0"
                    aria-hidden="true"
                />
                <span class="truncate">{{ folder.name }}</span>
            </button>
            <template v-if="manageable">
                <UiButton
                    variant="ghost"
                    size="sm"
                    :icon="Pencil"
                    :aria-label="`Rename ${folder.name}`"
                    title="Rename"
                    class="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
                    @click="rename(folder)"
                />
                <UiButton
                    variant="ghost"
                    size="sm"
                    :icon="Trash2"
                    :aria-label="`Delete ${folder.name}`"
                    title="Delete"
                    class="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
                    @click="remove(folder)"
                />
            </template>
        </div>
        <button
            v-if="manageable"
            type="button"
            :class="[itemClass, 'mt-2 border-t border-ink/15 pt-2.5']"
            :aria-current="selected === 'trash'"
            @click="selected = 'trash'"
        >
            <Trash class="size-4 shrink-0" aria-hidden="true" />
            Trash
        </button>
        <FolderDialog
            v-if="manageable"
            v-model:open="dialogOpen"
            :folder="editing"
            :parent-id="parentId"
        />
    </nav>
</template>
