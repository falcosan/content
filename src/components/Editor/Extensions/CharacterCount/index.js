import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const CustomCharacterCount = Extension.create({
    name: 'characterCount',
    addOptions() {
        return {
            limit: null,
        }
    },
    addStorage() {
        return {
            characters() {
                return 0
            },
        }
    },
    onBeforeCreate() {
        this.storage.characters = (options) => {
            const node = options?.node || this.editor.state.doc
            const text = node.textBetween(0, node.content.size, undefined, ' ')
            return text.length
        }
    },
    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('characterCount'),
                filterTransaction: (transaction, state) => {
                    const limit = this.options.limit
                    if (
                        !transaction.docChanged ||
                        limit === 0 ||
                        limit === null ||
                        limit === false ||
                        limit === undefined
                    ) {
                        return true
                    }
                    const oldSize = this.storage.characters({
                        node: state.doc,
                    })
                    const newSize = this.storage.characters({
                        node: transaction.doc,
                    })
                    if (newSize <= limit) return true
                    if (oldSize > limit && newSize > limit && newSize <= oldSize) {
                        return true
                    }
                    if (oldSize > limit && newSize > limit && newSize > oldSize) {
                        return false
                    }
                    const isPaste = transaction.getMeta('paste')
                    if (!isPaste) return false
                    const pos = transaction.selection.$head.pos
                    const over = newSize - limit
                    const from = pos - over
                    const to = pos
                    transaction.deleteRange(from, to)
                    const updatedSize = this.storage.characters({
                        node: transaction.doc,
                    })
                    if (updatedSize > limit) return false
                    return true
                },
            }),
        ]
    },
})
