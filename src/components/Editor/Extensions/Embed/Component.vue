<template>
    <NodeViewWrapper as="div">
        <iframe :src="attrs.src" @click="setNode" />
    </NodeViewWrapper>
</template>

<script>
import { computed } from 'vue'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
export default {
    components: {
        NodeViewWrapper,
    },
    props: nodeViewProps,
    setup(props) {
        const attrs = computed(() => props.node.attrs)
        const setNode = () => props.editor.commands.setNodeSelection(props.getPos())
        return { attrs, setNode }
    },
}
</script>
