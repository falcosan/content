import {
    Node,
    Tracker,
    nodeInputRule,
    mergeAttributes,
    findChildrenInRange,
} from '@tiptap/core';

export const CustomImage = Node.create({
    name: 'CustomImage',
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
                default: null,
                parseHTML: (element) =>
                    element.querySelector('img')?.getAttribute('src'),
            },
            alt: {
                default: null,
                parseHTML: (element) =>
                    element.querySelector('img')?.getAttribute('alt'),
            },
            title: {
                default: null,
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
            imageToFigure:
                () =>
                ({ tr, commands }) => {
                    const { doc, selection } = tr;
                    const { from, to } = selection;
                    const images = findChildrenInRange(
                        doc,
                        { from, to },
                        (node) => node.type.name === 'image'
                    );
                    if (!images.length) return false;
                    const tracker = new Tracker(tr);
                    return commands.forEach(images, ({ node, pos }) => {
                        const mapResult = tracker.map(pos);
                        if (mapResult.deleted) return false;
                        const range = {
                            from: mapResult.position,
                            to: mapResult.position + node.nodeSize,
                        };
                        return commands.insertContentAt(range, {
                            type: this.name,
                            attrs: {
                                src: node.attrs.src,
                            },
                        });
                    });
                },
            figureToImage:
                () =>
                ({ tr, commands }) => {
                    const { doc, selection } = tr;
                    const { from, to } = selection;
                    const figures = findChildrenInRange(
                        doc,
                        { from, to },
                        (node) => node.type.name === this.name
                    );
                    if (!figures.length) return false;
                    const tracker = new Tracker(tr);
                    return commands.forEach(figures, ({ node, pos }) => {
                        const mapResult = tracker.map(pos);
                        if (mapResult.deleted) return false;
                        const range = {
                            from: mapResult.position,
                            to: mapResult.position + node.nodeSize,
                        };
                        return commands.insertContentAt(range, {
                            type: 'image',
                            attrs: {
                                src: node.attrs.src,
                            },
                        });
                    });
                },
        };
    },
    addInputRules() {
        const inputRegex = /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/;
        return [
            nodeInputRule({
                find: inputRegex,
                type: this.type,
                getAttributes: (match) => {
                    const [, src, alt, title] = match;
                    return { src, alt, title };
                },
            }),
        ];
    },
});
