<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import type { AssetFolder } from '#types/api'
import UiButton from '@/components/ui/UiButton.vue'
import UiDialog from '@/components/ui/UiDialog.vue'
import { useSaveFolder } from '@/composables/useMedia'
import { MAX_LENGTH } from '../../../shared/validation'

const { folder, parentId = null } = defineProps<{
    folder?: AssetFolder
    parentId?: number | null
}>()

const open = defineModel<boolean>('open', { required: true })

const save = useSaveFolder()
const formId = useId()

const name = ref('')

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
        <form :id="formId" @submit.prevent="submit">
            <label class="block">
                <span class="label">Name</span>
                <input
                    v-model="name"
                    class="control"
                    required
                    :maxlength="MAX_LENGTH.folderName"
                    autofocus
                />
            </label>
        </form>
        <template #footer>
            <UiButton @click="open = false">Cancel</UiButton>
            <UiButton
                type="submit"
                :form="formId"
                variant="solid"
                :disabled="!name.trim()"
                :loading="save.isPending.value"
            >
                {{ folder ? 'Rename' : 'Create' }}
            </UiButton>
        </template>
    </UiDialog>
</template>
