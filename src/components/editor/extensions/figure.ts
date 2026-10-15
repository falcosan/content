import { Node } from '@tiptap/core'
import type { FigureAttributes } from '#types/editor'
import { moveCursorAfterNode } from './selection'

const imageOf = (element: HTMLElement) =>
    element.tagName === 'IMG' ? element : element.querySelector('img')

const isImageParagraph = (element: HTMLElement) =>
    element.childElementCount === 1 &&
    element.firstElementChild?.tagName === 'IMG' &&
    !element.textContent?.trim()

const imageAttribute = (name: string) => ({
    default: '',
    parseHTML: (element: HTMLElement) => imageOf(element)?.getAttribute(name) ?? '',
})

export const Figure = Node.create({
    name: 'figure',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            src: imageAttribute('src'),
            alt: imageAttribute('alt'),
            title: imageAttribute('title'),
            caption: {
                default: '',
                parseHTML: (element: HTMLElement) =>
                    element.querySelector('figcaption')?.textContent?.trim() ?? '',
            },
        }
    },

    parseHTML() {
        return [
            { tag: 'figure', getAttrs: (element) => (element.querySelector('img') ? null : false) },
            {
                tag: 'p',
                priority: 60,
                getAttrs: (element) => (isImageParagraph(element) ? null : false),
            },
            { tag: 'img[src]' },
        ]
    },

    renderHTML({ node }) {
        const { src, alt, title, caption } = node.attrs as FigureAttributes
        const image = ['img', { src, alt, ...(title && { title }) }] as const
        return caption ? ['figure', image, ['figcaption', caption]] : ['figure', image]
    },

    addCommands() {
        return {
            setFigure:
                (attributes) =>
                ({ chain }) =>
                    chain()
                        .insertContent({ type: this.name, attrs: attributes })
                        .command(moveCursorAfterNode)
                        .run(),
        }
    },
})
