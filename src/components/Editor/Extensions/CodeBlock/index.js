import Component from './Component.vue';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import CodeBlock from '@tiptap/extension-code-block';

export const CustomCodeBlock = CodeBlock.extend({
    addAttributes() {
        return {
            language: {
                default: '',
                parseHTML: (element) =>
                    element.querySelector('code')?.getAttribute('language'),
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: 'pre',
                preserveWhitespace: 'full',
            },
        ];
    },
    renderHTML({ node }) {
        return [
            'pre',
            this.options.HTMLAttributes,
            ['code', { class: node.attrs.language }, 0],
        ];
    },
    addNodeView() {
        return VueNodeViewRenderer(Component);
    },
});
