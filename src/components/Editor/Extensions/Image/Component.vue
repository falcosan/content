<template>
    <NodeViewWrapper as="figure">
        <img
            :src="attrs.src"
            :alt="attrs.alt"
            :title="attrs.title"
            @click="setAttributes"
        />
        <figcaption v-if="attrs.caption" v-text="attrs.caption" />
        <NodeViewContent class="hidden pointer-events-none select-none" />
    </NodeViewWrapper>
</template>

<script>
import { computed, inject } from 'vue';
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3';
export default {
    components: {
        NodeViewWrapper,
        NodeViewContent,
    },
    props: nodeViewProps,
    setup(props) {
        const setText = inject('setText');
        const attrs = computed(() => props.node.attrs);
        const setAttributes = () => {
            props.editor.commands.setNodeSelection(props.getPos());
            setText('image');
        };
        return { attrs, setAttributes };
    },
};
</script>
