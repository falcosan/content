<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AssetFolder } from '@/api/client'
import UiButton from '@/components/ui/UiButton.vue'
import UiDialog from '@/components/ui/UiDialog.vue'
import { useSaveFolder } from '@/composables/useMedia'

const { folder, parentId = null } = defineProps<{
    folder?: AssetFolder
    parentId?: number | null
}>()

const open = defineModel<boolean>('open', { required: true })

const name = ref('')
const save = useSaveFolder()

watch(open, (isOpen) => {
    if (isOpen) name.value = folder?.name ?? ''
})

const submit = () => {
    const trimmed = name.value.trim()
    if (!trimmed) return
    save.mutate(
        { id: folder?.id, name: trimmed, parentId: folder ? folder.parentId : parentId },
        { onSuccess: () => (open.value = false) }
    )
}
</script>

<template>
    <UiDialog v-model:open="open" :title="folder ? 'Rename folder' : 'New folder'" size="sm">
        <form id="folder-form" @submit.prevent="submit">
            <label class="block">
                <span class="label">Name</span>
                <input v-model="name" class="control" required maxlength="100" autofocus />
            </label>
        </form>
        <template #footer>
            <UiButton @click="open = false">Cancel</UiButton>
            <UiButton
                type="submit"
                form="folder-form"
                variant="solid"
                :disabled="!name.trim()"
                :loading="save.isPending.value"
            >
                {{ folder ? 'Rename' : 'Create' }}
            </UiButton>
        </template>
    </UiDialog>
</template>
