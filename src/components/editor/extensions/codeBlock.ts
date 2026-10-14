import CodeBlock from '@tiptap/extension-code-block'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CodeBlockView from './CodeBlockView.vue'

export const CodeBlockWithLanguage = CodeBlock.extend({
    addNodeView() {
        return VueNodeViewRenderer(CodeBlockView)
    },
})
