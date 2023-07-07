import Component from './Component.vue';
import { mergeAttributes } from '@tiptap/core';
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
    renderHTML({ HTMLAttributes }) {
        return [
            'pre',
            this.options.HTMLAttributes,
            ['code', mergeAttributes(HTMLAttributes), 0],
        ];
    },
    addNodeView() {
        return VueNodeViewRenderer(Component);
    },
});
