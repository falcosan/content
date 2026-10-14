import FileHandler from '@tiptap/extension-file-handler'
import Highlight from '@tiptap/extension-highlight'
import { CharacterCount, Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { CodeBlockWithLanguage } from './codeBlock'
import { Embed } from './embed'
import { Figure } from './figure'

export const IMAGE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/svg+xml',
]

export interface ExtensionOptions {
    maxLength: number | null
    onImages: (files: File[], position?: number) => void
}

export const editorExtensions = ({ maxLength, onImages }: ExtensionOptions) => [
    StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3, 4, 5] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
        dropcursor: { color: 'currentColor', width: 2 },
    }),
    CodeBlockWithLanguage,
    Highlight,
    Figure,
    Embed,
    Placeholder.configure({ placeholder: 'Start writing…' }),
    CharacterCount.configure({ limit: maxLength }),
    FileHandler.configure({
        allowedMimeTypes: IMAGE_TYPES,
        onDrop: (_editor, files, position) => onImages(files, position),
        onPaste: (_editor, files) => onImages(files),
    }),
]
