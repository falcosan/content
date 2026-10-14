<script setup lang="ts">
import type { Asset } from '@/api/client'
import UiDialog from '@/components/ui/UiDialog.vue'
import MediaLibrary from './MediaLibrary.vue'

const { filetypes = [] } = defineProps<{ filetypes?: string[] }>()

const emit = defineEmits<{ pick: [asset: Asset] }>()

const open = defineModel<boolean>('open', { required: true })

const pick = (asset: Asset) => {
    emit('pick', asset)
    open.value = false
}
</script>

<template>
    <UiDialog v-model:open="open" title="Media library" size="xl">
        <MediaLibrary mode="pick" :filetypes @pick="pick" />
    </UiDialog>
</template>
