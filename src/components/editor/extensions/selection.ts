import type { CommandProps } from '@tiptap/core'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'

export const moveCursorAfterNode = ({ tr }: CommandProps) => {
    const { selection } = tr
    if (!(selection instanceof NodeSelection)) return true
    const after = selection.to
    if (!tr.doc.resolve(after).nodeAfter?.isTextblock) {
        tr.insert(after, tr.doc.type.schema.nodes.paragraph!.create())
    }
    tr.setSelection(TextSelection.create(tr.doc, after + 1))
    return true
}
