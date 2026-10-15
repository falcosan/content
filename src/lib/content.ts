import { marked } from 'marked'
import TurndownService from 'turndown'

const EMPTY_DOCUMENT = '<p></p>'

const MEDIA_TAG = /<(img|iframe|hr)\b/i

const INLINE_HTML = ['mark', 'u', 'sub', 'sup', 'kbd'] as const

const GFM_ALIGNMENT: Record<string, string> = { left: ':---', center: ':---:', right: '---:' }

const MARKDOWN_SYNTAX = {
    headingBlock: /^#{1,6}[ \t]+\S.*\n[ \t]*\n/m,
    quote: /^ {0,3}>[ \t]/m,
    consecutiveListItems: /^[ \t]*(?:[-*+]|\d+[.)])[ \t]+\S.*\n[ \t]*(?:[-*+]|\d+[.)])[ \t]+\S/m,
    fence: /^ {0,3}(?:```|~~~)/m,
    tableDelimiter: /^ *\|? *:?-+:? *(?:\| *:?-+:? *)+\|? *$/m,
    link: /\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)/,
}

export const isMarkdown = (text: string) =>
    Object.values(MARKDOWN_SYNTAX).some((syntax) => syntax.test(text))

export const markdownToHtml = (markdown: string) =>
    marked.parse(markdown, { async: false }).replaceAll('\n</code></pre>', '</code></pre>')

export const toEditorHtml = (value: string) =>
    /^\s*</.test(value) || !value.trim() ? value : markdownToHtml(value)

export const fromEditorHtml = (html: string) => (html === EMPTY_DOCUMENT ? '' : html)

export const plainText = (html: string) =>
    new DOMParser().parseFromString(html, 'text/html').body.textContent ?? ''

export const isBlankHtml = (html: string) => !MEDIA_TAG.test(html) && !plainText(html).trim()

const htmlBlock = (node: HTMLElement) => `\n\n${node.outerHTML.replaceAll('\n', '&#10;')}\n\n`

const isGfmTable = (table: HTMLTableElement) =>
    [...table.rows].every((row, index) =>
        [...row.cells].every(
            (cell) =>
                cell.tagName === (index ? 'TD' : 'TH') &&
                cell.colSpan === 1 &&
                cell.rowSpan === 1 &&
                [...cell.children].every(({ tagName }) => tagName === 'P')
        )
    ) &&
    ![...table.querySelectorAll('code')].some(({ textContent }) => textContent?.includes('\\|'))

const delimiterOf = (table: HTMLTableElement, column: number) => {
    const [alignment = '', ...others] = new Set(
        [...table.rows].map((row) => row.cells[column]?.style.textAlign ?? '')
    )
    return (!others.length && GFM_ALIGNMENT[alignment]) || '---'
}

const gfmCell = (cell: HTMLTableCellElement): string =>
    turndown
        .turndown(cell.innerHTML)
        .replace(/ *\n+ */g, '<br>')
        .replaceAll('|', '\\|')

const gfmTable = (table: HTMLTableElement) => {
    const [header = [], ...body] = [...table.rows].map((row) => [...row.cells].map(gfmCell))
    const delimiters = header.map((_, column) => delimiterOf(table, column))
    const rows = [header, delimiters, ...body].map((cells) => `| ${cells.join(' | ')} |`)
    return `\n\n${rows.join('\n')}\n\n`
}

const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    hr: '---',
    bulletListMarker: '-',
})
    .addRule('details', {
        filter: 'details',
        replacement: (_content, node) => htmlBlock(node as HTMLElement),
    })
    .addRule('table', {
        filter: 'table',
        replacement: (_content, node) => {
            const table = node as HTMLTableElement
            return isGfmTable(table) ? gfmTable(table) : htmlBlock(table)
        },
    })
    .addRule('strikethrough', {
        filter: 's',
        replacement: (content) => `~~${content}~~`,
    })
    .addRule('inlineHtml', {
        filter: [...INLINE_HTML],
        replacement: (content, node) => {
            const tag = node.nodeName.toLowerCase()
            return `<${tag}>${content}</${tag}>`
        },
    })

export const toMarkdown = (html: string) => turndown.turndown(html)
