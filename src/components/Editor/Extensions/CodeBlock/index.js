import Component from './Component.vue';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import CodeBlock from '@tiptap/extension-code-block';

export const CustomCodeBlock = CodeBlock.extend({
    addAttributes() {
        return {
            language: {
                default: '',
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: 'pre',
                preserveWhitespace: 'full',
                getAttrs: (node) => {
                    const code = node.getElementsByTagName('code')[0];
                    const language = code?.className || '';
                    return { language };
                },
            },
        ];
    },
    renderHTML({ node }) {
        return ['pre', ['code', { class: node.attrs.language }, 0]];
    },
    addNodeView() {
        return VueNodeViewRenderer(Component);
    },
});
