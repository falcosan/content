import { Extension } from '@tiptap/core'
import { DOMParser as SchemaParser, type Slice } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import { isMarkdown, markdownToHtml } from '@/lib/content'

const DEFAULT_TEXT_PARSING = null as unknown as Slice

export const MarkdownPaste = Extension.create({
    name: 'markdownPaste',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                props: {
                    clipboardTextParser: (text, $context, plain, view) => {
                        const markdown = text.replace(/\r\n?/g, '\n')
                        if (plain || !isMarkdown(markdown)) return DEFAULT_TEXT_PARSING
                        const { body } = new DOMParser().parseFromString(
                            markdownToHtml(markdown),
                            'text/html'
                        )
                        return SchemaParser.fromSchema(view.state.schema).parseSlice(body, {
                            context: $context,
                        })
                    },
                },
            }),
        ]
    },
})
