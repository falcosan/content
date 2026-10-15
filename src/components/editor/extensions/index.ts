import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details'
import FileHandler from '@tiptap/extension-file-handler'
import Highlight from '@tiptap/extension-highlight'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { CharacterCount, Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import type { ExtensionOptions } from '#types/editor'
import { CodeBlockWithLanguage } from './codeBlock'
import { Embed } from './embed'
import { Figure } from './figure'
import { Kbd } from './kbd'
import { MarkdownPaste } from './markdownPaste'
import { FluidTable } from './table'

export const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const

const IMAGE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/svg+xml',
]

export const editorExtensions = ({ onImages }: ExtensionOptions) => [
    StarterKit.configure({
        codeBlock: false,
        trailingNode: false,
        heading: { levels: [...HEADING_LEVELS] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
        dropcursor: { color: 'currentColor', width: 2 },
    }),
    CodeBlockWithLanguage,
    Highlight,
    Subscript,
    Superscript,
    Kbd,
    FluidTable,
    Details,
    DetailsSummary,
    DetailsContent,
    Figure,
    Embed,
    MarkdownPaste,
    Placeholder.configure({ placeholder: 'Start writing…' }),
    CharacterCount,
    FileHandler.configure({
        allowedMimeTypes: IMAGE_TYPES,
        onDrop: (_editor, files, position) => onImages(files, position),
        onPaste: (_editor, files, html) => {
            if (!html) onImages(files)
        },
    }),
]
