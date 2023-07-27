import Component from './Component.vue'
import { formatURL } from '@/utils/string'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { Node, findChildrenInRange, mergeAttributes } from '@tiptap/core'

export const EmbedCustom = Node.create({
    name: 'embed',
    group: 'block',
    atom: true,
    addOptions() {
        return {
            HTMLAttributes: {
                frameborder: 0,
                allowFullscreen: true,
                allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            },
        }
    },
    addAttributes() {
        return {
            src: {
                default: null,
                parseHTML: (element) => element.querySelector('iframe')?.getAttribute('src'),
            },
        }
    },
    parseHTML() {
        return [{ tag: 'div', preserveWhitespace: 'full' }]
    },
    renderHTML({ node }) {
        return [
            'div',
            [
                'iframe',
                mergeAttributes(this.options.HTMLAttributes, {
                    src: formatURL(node.attrs.src),
                }),
            ],
        ]
    },
    addCommands() {
        return {
            addEmbed:
                (options) =>
                ({ tr, dispatch }) => {
                    const { selection } = tr
                    const node = this.type.create(options)
                    if (dispatch) tr.replaceRangeWith(selection.from, selection.to, node)
                    return true
                },
            removeEmbed:
                () =>
                ({ tr, commands }) => {
                    const { doc, selection } = tr
                    const { from, to } = selection
                    const embeds = findChildrenInRange(
                        doc,
                        { from, to },
                        (node) => node.type.name === 'embed'
                    )
                    if (!embeds.length) return
                    else return commands.deleteSelection()
                },
        }
    },
    addNodeView() {
        return VueNodeViewRenderer(Component)
    },
})
