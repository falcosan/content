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
        const patterns = {
            twitchLive: /https:\/\/www\.twitch\.tv\/(.*)/,
            vimeo: /(https:\/\/)?(www\.)?vimeo\.com\/(\d+)/,
            twitchClip: /^https:\/\/(?:www\.)?twitch\.tv\/\w+\/clip\/(\w+)-(\w+)/,
            dailymotion: /(https?:\/\/)(www\.)?(dailymotion\.com\/video\/)([a-zA-Z0-9]+)(.*)/,
            youtube:
                /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/)))([a-zA-Z0-9_-]+)(?:\S*)$/,
            url: /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/|ftp:\/\/|ftps:\/\/|blob:|localhost)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/,
        }
        function convertUrl(url) {
            const hosts = [
                'parent=aprograma.com',
                'parent=aprograma-dev.netlify.app',
                'parent=aprograma-editor.netlify.app',
            ].join('&')
            if (!patterns.url) return ''
            if (patterns.vimeo.test(url)) {
                return `https://player.vimeo.com/video/${url.replace(patterns.vimeo, '$3')}`
            } else if (patterns.dailymotion.test(url)) {
                return `https://www.dailymotion.com/embed/video/${url.replace(
                    patterns.dailymotion,
                    '$4'
                )}`
            } else if (patterns.twitchClip.test(url)) {
                return `${url.replace(
                    patterns.twitchClip,
                    'https://clips.twitch.tv/embed?clip=$1-$2'
                )}&${hosts}`
            } else if (patterns.twitchLive.test(url)) {
                return `${url.replace(
                    patterns.twitchLive,
                    'https://player.twitch.tv/?channel=$1'
                )}&${hosts}`
            } else if (patterns.youtube.test(url)) {
                const time = url.match(/(?:t|start)=(\d+)/)
                let path = `https://www.youtube.com/embed/${url.replace(patterns.youtube, '$1')}`
                if (time) path = `${path}?start=${time[1]}`
                return path
            } else {
                return url
            }
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
