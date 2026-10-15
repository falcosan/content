<script setup lang="ts">
import { NodeViewContent, nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { computed } from 'vue'
import { LANGUAGES } from './languages'

const props = defineProps(nodeViewProps)

const language = computed({
    get: () => (props.node.attrs.language as string | null) ?? '',
    set: (value: string) => props.updateAttributes({ language: value || null }),
})
</script>

<template>
    <NodeViewWrapper class="flex flex-col gap-2">
        <select
            v-model="language"
            contenteditable="false"
            aria-label="Code language"
            class="self-end rounded border border-border bg-bg px-2 py-1 font-sans text-xs text-text"
        >
            <option v-for="option in LANGUAGES" :key="option.value" :value="option.value">
                {{ option.label }}
            </option>
        </select>
        <pre><NodeViewContent as="code" :class="language ? `language-${language}` : undefined" /></pre>
    </NodeViewWrapper>
</template>
