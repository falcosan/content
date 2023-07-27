<template>
    <NodeViewWrapper
        as="div"
        class="cursor-pointer rounded transition-[background-color] hover:bg-opacity-70 hover:bg-white"
        @click="setAttributes"
    >
        <iframe
            :src="attrs.src"
            :allow="attrs.allow"
            :frameborder="attrs.frameborder"
            :allowfullscreen="attrs.allowfullscreen"
        />
    </NodeViewWrapper>
</template>

<script>
import { computed, inject } from 'vue'
import { formatURL } from '@/utils/string'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
export default {
    components: {
        NodeViewWrapper,
    },
    props: nodeViewProps,
    setup(props) {
        const setText = inject('setText')
        const attrs = computed(() => ({
            ...props.node.attrs,
            ...props.extension.options.HTMLAttributes,
            src: formatURL(props.node.attrs.src),
        }))
        const setAttributes = () => {
            props.editor.commands.setNodeSelection(props.getPos())
            setText('embed')
        }
        return { attrs, setAttributes }
    },
}
</script>
