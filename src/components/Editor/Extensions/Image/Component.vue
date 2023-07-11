<template>
    <NodeViewWrapper as="figure">
        <img :src="attrs.src" :alt="attrs.alt" :title="attrs.title" @click="setAttributes" />
        <figcaption v-if="attrs.caption" v-text="attrs.caption" />
    </NodeViewWrapper>
</template>

<script>
import { computed, inject } from 'vue'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
export default {
    components: {
        NodeViewWrapper,
    },
    props: nodeViewProps,
    setup(props) {
        const setText = inject('setText')
        const attrs = computed(() => props.node.attrs)
        const setAttributes = () => {
            props.editor.commands.setNodeSelection(props.getPos())
            setText('image')
        }
        return { attrs, setAttributes }
    },
}
</script>
