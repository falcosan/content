<script setup lang="ts">
import { X } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { computed, ref, useId } from 'vue'
import { tagsQuery } from '@/api/queries'

const { inputId } = defineProps<{ inputId: string }>()

const tags = defineModel<string[]>({ required: true })

const draft = ref('')
const listId = useId()
const { data } = useQuery(tagsQuery())

const suggestions = computed(() => (data.value ?? []).filter((tag) => !tags.value.includes(tag)))

const add = () => {
    const value = draft.value.replace(/,/g, '').trim()
    draft.value = ''
    if (value && !tags.value.includes(value)) tags.value = [...tags.value, value]
}

const remove = (tag: string) => {
    tags.value = tags.value.filter((item) => item !== tag)
}

const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault()
        add()
    } else if (event.key === 'Backspace' && !draft.value && tags.value.length) {
        tags.value = tags.value.slice(0, -1)
    }
}
</script>

<template>
    <div
        class="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-ink/25 px-2 py-1.5 transition-colors focus-within:border-ink hover:border-ink/50"
    >
        <span
            v-for="tag in tags"
            :key="tag"
            class="inline-flex h-6 items-center gap-1 rounded-full bg-ink pr-1 pl-2.5 text-xs font-medium text-paper"
        >
            {{ tag }}
            <button
                type="button"
                class="rounded-full p-0.5 hover:bg-paper/20"
                :aria-label="`Remove tag ${tag}`"
                @click="remove(tag)"
            >
                <X class="size-3" aria-hidden="true" />
            </button>
        </span>
        <input
            :id="inputId"
            v-model="draft"
            :list="listId"
            class="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-ink/60"
            placeholder="Add tag"
            @keydown="onKeydown"
            @blur="add"
        />
        <datalist :id="listId">
            <option v-for="tag in suggestions" :key="tag" :value="tag" />
        </datalist>
    </div>
</template>
