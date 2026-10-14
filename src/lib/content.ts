import { marked } from 'marked'
import TurndownService from 'turndown'

const EMPTY_DOCUMENT = '<p></p>'

const MEDIA_TAG = /<(img|iframe|hr)\b/i

export const toEditorHtml = (value: string) =>
    /^\s*</.test(value) || !value.trim() ? value : marked.parse(value, { async: false })

export const fromEditorHtml = (html: string) => (html === EMPTY_DOCUMENT ? '' : html)

export const plainText = (html: string) =>
    new DOMParser().parseFromString(html, 'text/html').body.textContent ?? ''

export const isBlankHtml = (html: string) => !MEDIA_TAG.test(html) && !plainText(html).trim()

const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    hr: '---',
    bulletListMarker: '-',
}).addRule('mark', {
    filter: 'mark',
    replacement: (content) => `<mark>${content}</mark>`,
})

export const toMarkdown = (html: string) => turndown.turndown(html)
