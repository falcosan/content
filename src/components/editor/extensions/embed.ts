import { Node } from '@tiptap/core'
import { moveCursorAfterNode } from './selection'

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        embed: {
            setEmbed: (attributes: { src: string }) => ReturnType
        }
    }
}

const ALLOW =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'

const frameOf = (element: HTMLElement) =>
    element.tagName === 'IFRAME' ? element : element.querySelector(':scope > iframe')

export const Embed = Node.create({
    name: 'embed',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            src: {
                default: '',
                parseHTML: (element: HTMLElement) => frameOf(element)?.getAttribute('src') ?? '',
            },
        }
    },

    parseHTML() {
        return [
            { tag: 'div', getAttrs: (element) => (frameOf(element) ? null : false) },
            { tag: 'iframe[src]' },
        ]
    },

    renderHTML({ node }) {
        return [
            'div',
            [
                'iframe',
                {
                    src: node.attrs.src as string,
                    frameborder: '0',
                    allowfullscreen: 'true',
                    allow: ALLOW,
                },
            ],
        ]
    },

    addCommands() {
        return {
            setEmbed:
                (attributes) =>
                ({ chain }) =>
                    chain()
                        .insertContent({ type: this.name, attrs: attributes })
                        .command(moveCursorAfterNode)
                        .run(),
        }
    },
})
