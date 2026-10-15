<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import { useAddOption } from '@/composables/useSchema'
import { MAX_LENGTH } from '../../../shared/validation'

const { fieldKey } = defineProps<{ fieldKey: string }>()

const emit = defineEmits<{ added: [value: string] }>()

const addOption = useAddOption(fieldKey)
const name = ref('')

const add = () => {
    const value = name.value.trim()
    if (!value || addOption.isPending.value) return
    addOption.mutate(value, {
        onSuccess: ({ option }) => {
            name.value = ''
            emit('added', option.value)
        },
    })
}
</script>

<template>
    <div class="flex gap-2">
        <input
            v-model="name"
            class="control h-8 py-1 text-xs"
            placeholder="New option"
            aria-label="New option"
            :maxlength="MAX_LENGTH.optionName"
            @keydown.enter.prevent="add"
        />
        <UiButton
            size="sm"
            :icon="Plus"
            :disabled="!name.trim()"
            :loading="addOption.isPending.value"
            @click="add"
        >
            Add
        </UiButton>
    </div>
</template>
