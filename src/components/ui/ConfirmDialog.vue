<script setup lang="ts">
import { computed } from 'vue'
import { settleConfirm, useConfirmRequest } from '@/composables/useConfirm'
import UiButton from './UiButton.vue'
import UiDialog from './UiDialog.vue'

const request = useConfirmRequest()

const open = computed({
    get: () => request.value !== null,
    set: (value) => {
        if (!value) settleConfirm(false)
    },
})
</script>

<template>
    <UiDialog v-model:open="open" :title="request?.title ?? ''" size="sm">
        <p class="text-sm leading-6">{{ request?.message }}</p>
        <template #footer>
            <UiButton @click="settleConfirm(false)">Cancel</UiButton>
            <UiButton variant="solid" autofocus @click="settleConfirm(true)">
                {{ request?.action }}
            </UiButton>
        </template>
    </UiDialog>
</template>
