import { Node, mergeAttributes, findChildrenInRange } from '@tiptap/core'

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
            },
        }
    },
    parseHTML() {
        return [{ tag: 'iframe' }]
    },
    renderHTML({ node }) {
        const patterns = {
            youtube: /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+).*$/,
            url: /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/|ftp:\/\/|ftps:\/\/|blob:|localhost)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/,
        }
        function convertUrl(url) {
            if (!patterns.url) return ''
            if (!patterns.youtube.test(url)) return url
            return `https://www.youtube.com/embed/${url.replace(patterns.youtube, '$3')}`
        }
        return [
            'div',
            [
                'iframe',
                mergeAttributes(this.options.HTMLAttributes, {
                    src: convertUrl(node.attrs.src),
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
})
