import { Extension } from '@tiptap/core'
import { TableCell, TableHeader, TableKit } from '@tiptap/extension-table'

const fluidColumns = {
    colwidth: { default: null, parseHTML: () => null },
}

export const FluidTable = Extension.create({
    name: 'fluidTable',

    addExtensions() {
        return [
            TableKit.configure({
                table: { renderWrapper: true },
                tableCell: false,
                tableHeader: false,
            }),
            TableCell.extend({
                addAttributes() {
                    return { ...this.parent?.(), ...fluidColumns }
                },
            }),
            TableHeader.extend({
                addAttributes() {
                    return { ...this.parent?.(), ...fluidColumns }
                },
            }),
        ]
    },
})
