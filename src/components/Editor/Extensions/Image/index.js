import { Node, mergeAttributes } from '@tiptap/core';

export const CustomImage = Node.create({
    name: 'image',
    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },
    group: 'block',
    content: 'inline*',
    isolating: true,
    addAttributes() {
        return {
            src: {
                default: '',
                parseHTML: (element) =>
                    element.querySelector('img')?.getAttribute('src'),
            },
            alt: {
                default: '',
                parseHTML: (element) =>
                    element.querySelector('img')?.getAttribute('alt'),
            },
            title: {
                default: '',
                parseHTML: (element) =>
                    element.querySelector('img')?.getAttribute('title'),
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: 'figure',
                contentElement: 'figcaption',
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return [
            'figure',
            this.options.HTMLAttributes,
            ['img', mergeAttributes(HTMLAttributes)],
            ['figcaption', 0],
        ];
    },
    addCommands() {
        return {
            setImage:
                ({ caption, ...attrs }) =>
                ({ chain }) => {
                    return chain()
                        .insertContent({
                            type: this.name,
                            attrs,
                            content: caption
                                ? [{ type: 'text', text: caption }]
                                : [],
                        })
                        .command(({ tr, commands }) => {
                            const { doc, selection } = tr;
                            const position = doc
                                .resolve(selection.to - 2)
                                .end();
                            return commands.setTextSelection(position);
                        })
                        .run();
                },
        };
    },
});
