import { Node, mergeAttributes, findChildrenInRange } from '@tiptap/core';

export const CustomImage = Node.create({
    name: 'image',
    group: 'block',
    content: 'inline*',
    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },
    addAttributes() {
        return {
            caption: {
                default: '',
                parseHTML: (element) => {
                    const figcaption = element.querySelector('figcaption');
                    return figcaption.textContent;
                },
            },
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
        return [{ tag: 'figure', preserveWhitespace: 'full' }];
    },
    renderHTML({ HTMLAttributes, node }) {
        return [
            'figure',
            this.options.HTMLAttributes,
            ['img', mergeAttributes(HTMLAttributes, { caption: undefined })],
            ['figcaption', node.attrs.caption],
        ];
    },
    addCommands() {
        return {
            setImage:
                ({ ...attrs }) =>
                ({ tr, commands, chain }) => {
                    const { doc, selection } = tr;
                    const { from, to } = selection;
                    const images = findChildrenInRange(
                        doc,
                        { from, to },
                        (node) => node.type.name === 'image'
                    );
                    if (images.length) {
                        commands.forEach(images, () =>
                            commands.updateAttributes('image', attrs)
                        );
                    } else {
                        return chain()
                            .insertContent({ type: this.name, attrs })
                            .command(({ tr, commands }) => {
                                const { doc, selection } = tr;
                                const position = doc
                                    .resolve(selection.to - 2)
                                    .end();
                                return commands.setTextSelection(position);
                            })
                            .run();
                    }
                },
        };
    },
});
