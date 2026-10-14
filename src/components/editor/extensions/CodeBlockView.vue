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
    <NodeViewWrapper class="relative">
        <select
            v-model="language"
            contenteditable="false"
            aria-label="Code language"
            class="absolute top-2 right-2 z-10 rounded border border-paper/30 bg-ink px-2 py-1 font-sans text-xs text-paper"
        >
            <option v-for="option in LANGUAGES" :key="option.value" :value="option.value">
                {{ option.label }}
            </option>
        </select>
        <pre><NodeViewContent as="code" :class="language ? `language-${language}` : undefined" /></pre>
    </NodeViewWrapper>
</template>
