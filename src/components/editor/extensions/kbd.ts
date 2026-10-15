import { Mark } from '@tiptap/core'

export const Kbd = Mark.create({
    name: 'kbd',

    exitable: true,

    keepOnSplit: false,

    parseHTML() {
        return [{ tag: 'kbd' }]
    },

    renderHTML({ HTMLAttributes }) {
        return ['kbd', HTMLAttributes, 0]
    },

    addCommands() {
        return {
            toggleKbd:
                () =>
                ({ commands }) =>
                    commands.toggleMark(this.name),
        }
    },
})
