import { Node } from '@tiptap/core'
import { parseHttpsUrl } from '@/lib/embed'
import { moveCursorAfterNode } from './selection'

const ALLOW =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'

const frameOf = (element: HTMLElement) =>
    element.tagName === 'IFRAME' ? element : element.querySelector(':scope > iframe')

const sourceOf = (element: HTMLElement) => {
    const src = frameOf(element)?.getAttribute('src') ?? ''
    return parseHttpsUrl(src) ? src : null
}

export const Embed = Node.create({
    name: 'embed',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            src: {
                default: '',
                parseHTML: (element: HTMLElement) => sourceOf(element) ?? '',
            },
        }
    },

    parseHTML() {
        return [
            { tag: 'div', getAttrs: (element) => (sourceOf(element) ? null : false) },
            { tag: 'iframe[src]', getAttrs: (element) => (sourceOf(element) ? null : false) },
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
