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
import { formatURL } from '@/utils/string'
import { computed, inject, watch } from 'vue'
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
        watch(
            () => props.selected,
            (val) => {
                if (val) props.updateAttributes({ src: formatURL(attrs.value.src) })
            }
        )
        return { attrs, setAttributes }
    },
}
</script>
