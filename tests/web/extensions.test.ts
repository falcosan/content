import { Editor } from '@tiptap/vue-3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { editorExtensions } from '@/components/editor/extensions'
import { fromEditorHtml, toEditorHtml } from '@/lib/content'

const editors: Editor[] = []

const roundTrip = (html: string) => {
    const editor = new Editor({
        content: toEditorHtml(html),
        extensions: editorExtensions({ onImages: () => undefined }),
    })
    editors.push(editor)
    return fromEditorHtml(editor.getHTML())
}

const ALLOW =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'

const TABLE =
    '<div class="tableWrapper"><table style="min-width: 50px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th><p>Role</p></th><th><p>Owns</p></th></tr><tr><td><p>CTO</p></td><td><p>Principles, <em>the</em> constitution</p></td></tr></tbody></table></div>'

const createEditor = (content: string) => {
    const editor = new Editor({
        content,
        extensions: editorExtensions({ onImages: () => undefined }),
    })
    editors.push(editor)
    return editor
}

const paste = (editor: Editor, data: Record<string, string>) => {
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', {
        value: { files: [], types: Object.keys(data), getData: (type: string) => data[type] ?? '' },
    })
    editor.view.dom.dispatchEvent(event)
}

afterEach(() => {
    editors.splice(0).forEach((editor) => editor.destroy())
})

describe('editor HTML compatibility', () => {
    it.each([
        '<p>Plain <strong>bold</strong> <em>italic</em> <u>under</u> <s>strike</s> <mark>mark</mark> <code>code</code></p>',
        '<h1>One</h1><h2>Two</h2><h3>Three</h3><h4>Four</h4><h5>Five</h5>',
        '<ul><li><p>a</p></li><li><p>b</p></li></ul><ol><li><p>c</p></li></ol>',
        '<blockquote><p>Quote</p></blockquote><hr>',
        '<figure><img src="https://a.storyblok.com/f/1/a.png" alt="Alt" title="Title"><figcaption>Caption</figcaption></figure>',
        '<figure><img src="https://a.storyblok.com/f/1/a.png" alt=""></figure>',
        `<div><iframe src="https://www.youtube.com/embed/abc" frameborder="0" allowfullscreen="true" allow="${ALLOW}"></iframe></div>`,
        '<pre><code class="language-javascript">const a = 1</code></pre>',
        '<pre><code>plain</code></pre>',
        '<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">link</a></p>',
        '<h6>Six</h6>',
        '<p>H<sub>2</sub>O, E = mc<sup>2</sup>, <kbd>Ctrl</kbd> + <kbd>S</kbd></p>',
        TABLE,
        '<div class="tableWrapper"><table style="min-width: 50px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><td colspan="2"><p>Merged</p></td></tr><tr><td><p>a</p></td><td style="text-align: right;"><p>-23%</p></td></tr></tbody></table></div>',
        '<details><summary>Closed</summary><div data-type="detailsContent"><ul><li><p>item</p></li></ul></div></details>',
    ])('preserves %s', (html) => {
        expect(roundTrip(html)).toBe(html)
    })

    it('upgrades bare and legacy images to figures', () => {
        expect(roundTrip('<p><img src="https://a.storyblok.com/f/1/a.png" alt="A"></p>')).toBe(
            '<figure><img src="https://a.storyblok.com/f/1/a.png" alt="A"></figure>'
        )
        expect(
            roundTrip(
                '<figure><img src="https://a.storyblok.com/f/1/a.png" alt="" title=""></figure>'
            )
        ).toBe('<figure><img src="https://a.storyblok.com/f/1/a.png" alt=""></figure>')
    })

    it('reads tables pasted from documents without their fixed column widths', () => {
        const editor = createEditor('<p>Before</p>')
        editor.commands.setTextSelection(editor.state.doc.content.size - 1)
        paste(editor, {
            'text/html':
                '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1"><div dir="ltr" align="left"><table style="border:none;border-collapse:collapse;"><colgroup><col width="250"><col width="150"></colgroup><tbody><tr style="height:0pt"><td style="border:solid #000 1pt;padding:5pt"><p dir="ltr"><span style="font-weight:700">Skill in the job posting</span></p></td><td><p><span>Change in demand</span></p></td></tr><tr><td><p><span>Task division</span></p></td><td><p><span>-23%</span></p></td></tr></tbody></table></div></b>',
            'text/plain': 'Skill in the job posting\tChange in demand\nTask division\t-23%',
        })
        expect(editor.getHTML()).toBe(
            '<p>Before</p><div class="tableWrapper"><table style="min-width: 50px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><td><p><strong>Skill in the job posting</strong></p></td><td><p>Change in demand</p></td></tr><tr><td><p>Task division</p></td><td><p>-23%</p></td></tr></tbody></table></div>'
        )
    })

    it('wraps bare tables in a scroll container', () => {
        expect(
            roundTrip(
                '<table><tbody><tr><th>Role</th><th>Owns</th></tr><tr><td>CTO</td><td>Principles, <em>the</em> constitution</td></tr></tbody></table>'
            )
        ).toBe(TABLE)
    })

    it('reads tables with header sections and standard details markup', () => {
        expect(
            roundTrip(
                '<table><thead><tr><th>Role</th><th>Owns</th></tr></thead><tbody><tr><td>CTO</td><td>Principles, <em>the</em> constitution</td></tr></tbody></table>'
            )
        ).toBe(TABLE)
        expect(roundTrip('<details open><summary>More</summary><p>Body</p></details>')).toBe(
            '<details><summary>More</summary><div data-type="detailsContent"><p>Body</p></div></details>'
        )
    })

    it('opens and closes collapsible sections without editing the document', () => {
        const onUpdate = vi.fn()
        const editor = new Editor({
            content:
                '<details><summary>More</summary><div data-type="detailsContent"><p>Body</p></div></details>',
            extensions: editorExtensions({ onImages: () => undefined }),
            onUpdate,
        })
        editors.push(editor)
        const toggle = editor.view.dom.querySelector<HTMLButtonElement>(
            '[data-type="details"] > button'
        )
        toggle?.click()
        expect(editor.view.dom.querySelector('[data-type="details"]')?.classList).toContain(
            'is-open'
        )
        toggle?.click()
        expect(onUpdate).not.toHaveBeenCalled()
    })

    it('leaves keyboard keys with the arrow keys and does not carry them into new paragraphs', () => {
        const editor = createEditor('<p><kbd>Ctrl</kbd></p>')
        editor.commands.setTextSelection(editor.state.doc.content.size - 1)
        editor.commands.keyboardShortcut('ArrowRight')
        editor.commands.insertContent('then')
        expect(editor.getHTML()).toBe('<p><kbd>Ctrl</kbd> then</p>')

        editor.commands.setContent('<p><kbd>Use</kbd></p>')
        editor.commands.setTextSelection(editor.state.doc.content.size - 1)
        editor.commands.splitBlock()
        editor.commands.insertContent('Next')
        expect(editor.getHTML()).toBe('<p><kbd>Use</kbd></p><p>Next</p>')
    })

    it('formats pasted inline Markdown with the editor paste rules', () => {
        const editor = createEditor('<p></p>')
        paste(editor, { 'text/plain': 'A **strong** claim with `code`' })
        expect(editor.getHTML()).toBe(
            '<p>A <strong>strong</strong> claim with <code>code</code></p>'
        )
    })

    it('turns pasted Markdown into formatted content', () => {
        const editor = createEditor('<p>Intro</p><p></p>')
        editor.commands.setTextSelection(editor.state.doc.content.size - 1)
        paste(editor, {
            'text/plain':
                '## Who does what\n\n| Role | Owns |\n| --- | --- |\n| CTO | Principles, *the* constitution |\n\n- One **merge** gate\n- [Spec Kit](https://github.com/github/spec-kit)',
        })
        expect(editor.getHTML()).toBe(
            `<p>Intro</p><h2>Who does what</h2>${TABLE}<ul><li><p>One <strong>merge</strong> gate</p></li><li><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/github/spec-kit">Spec Kit</a></p></li></ul>`
        )
    })

    it('reads Markdown with Windows line endings and keeps pasted code blocks tight', () => {
        const editor = createEditor('<p></p>')
        paste(editor, {
            'text/plain': '## Title\r\n\r\n- one\r\n- two\r\n\r\n```js\r\nconst a = 1\r\n```',
        })
        expect(editor.getHTML()).toBe(
            '<h2>Title</h2><ul><li><p>one</p></li><li><p>two</p></li></ul><pre><code class="language-js">const a = 1</code></pre>'
        )
    })

    it('only embeds https frames, whether pasted as HTML or Markdown', () => {
        const editor = createEditor('<p></p>')
        paste(editor, {
            'text/html':
                '<p>Before</p><iframe src="javascript:alert(1)"></iframe><div><iframe src="data:text/html,x"></iframe></div>',
        })
        expect(editor.getHTML()).toBe('<p>Before</p>')

        editor.commands.setContent('<p></p>')
        paste(editor, {
            'text/plain':
                '- one\n- two\n\n<iframe src="javascript:alert(1)"></iframe>\n\n<iframe src="https://player.vimeo.com/video/1"></iframe>',
        })
        expect(editor.getHTML()).toBe(
            `<ul><li><p>one</p></li><li><p>two</p></li></ul><div><iframe src="https://player.vimeo.com/video/1" frameborder="0" allowfullscreen="true" allow="${ALLOW}"></iframe></div>`
        )
    })

    it('pastes plain text, plain pastes and code as they are', () => {
        const editor = createEditor('<p></p>')
        paste(editor, { 'text/plain': 'First line\nSecond line' })
        expect(editor.getHTML()).toBe('<p>First line</p><p>Second line</p>')

        editor.commands.setContent('<p></p>')
        editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { shiftKey: true }))
        paste(editor, { 'text/plain': '- one\n- two' })
        expect(editor.getHTML()).toBe('<p>- one</p><p>- two</p>')

        editor.commands.setContent('<pre><code></code></pre>')
        editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { shiftKey: false }))
        paste(editor, { 'text/plain': '# kept\n- as code' })
        expect(editor.getHTML()).toBe('<pre><code># kept\n- as code</code></pre>')

        editor.commands.setContent('<p></p>')
        paste(editor, { 'text/plain': '# ignored', 'text/html': '<p>Rich <em>copy</em></p>' })
        expect(editor.getHTML()).toBe('<p>Rich <em>copy</em></p>')
    })

    it('does not treat ordinary divs as embeds', () => {
        expect(roundTrip('<div><p>Just a block</p></div>')).toBe('<p>Just a block</p>')
    })

    it('converts legacy markdown content', () => {
        expect(roundTrip('## Title\n\n![Alt](https://a.storyblok.com/f/1/a.png)\n\n- one')).toBe(
            '<h2>Title</h2><figure><img src="https://a.storyblok.com/f/1/a.png" alt="Alt"></figure><ul><li><p>one</p></li></ul>'
        )
    })

    it('keeps empty content empty', () => {
        expect(roundTrip('')).toBe('')
    })

    it('uploads pasted files only when the clipboard has no HTML to paste', () => {
        const onImages = vi.fn()
        const editor = new Editor({
            content: '<p>Intro</p>',
            extensions: editorExtensions({ onImages }),
        })
        editors.push(editor)
        const file = new File(['x'], 'cat.png', { type: 'image/png' })
        const paste = (html: string) =>
            editor.view.pasteHTML(html, {
                clipboardData: {
                    files: [file],
                    getData: (type: string) => (type === 'text/html' ? html : ''),
                },
                preventDefault: () => undefined,
                stopPropagation: () => undefined,
            } as unknown as ClipboardEvent)

        paste('<img src="https://example.org/cat.png">')
        expect(onImages).not.toHaveBeenCalled()
        expect(editor.getHTML().match(/<figure>/g)).toHaveLength(1)

        paste('')
        expect(onImages).toHaveBeenCalledExactlyOnceWith([file])
    })

    it('places the caret after inserted media so consecutive inserts stack', () => {
        const editor = new Editor({
            content: '<p>Intro</p>',
            extensions: editorExtensions({ onImages: () => undefined }),
        })
        editors.push(editor)
        editor.commands.setTextSelection(editor.state.doc.content.size - 1)
        editor.commands.setEmbed({ src: 'https://player.vimeo.com/video/1' })
        editor.commands.setFigure({
            src: 'https://a.storyblok.com/f/1/a.png',
            alt: '',
            title: '',
            caption: '',
        })
        editor.commands.insertContent('After')
        expect(editor.getHTML()).toBe(
            `<p>Intro</p><div><iframe src="https://player.vimeo.com/video/1" frameborder="0" allowfullscreen="true" allow="${ALLOW}"></iframe></div><figure><img src="https://a.storyblok.com/f/1/a.png" alt=""></figure><p>After</p>`
        )
    })

    it('moves into the following paragraph without adding blank lines', () => {
        const editor = new Editor({
            content: '<p>One</p><p>Two</p>',
            extensions: editorExtensions({ onImages: () => undefined }),
        })
        editors.push(editor)
        editor.commands.setTextSelection(4)
        editor.commands.setFigure({
            src: 'https://a.storyblok.com/f/1/a.png',
            alt: 'A',
            title: '',
            caption: '',
        })
        editor.commands.insertContent('→')
        expect(editor.getHTML()).toBe(
            '<p>One</p><figure><img src="https://a.storyblok.com/f/1/a.png" alt="A"></figure><p>→Two</p>'
        )
    })

    it.each([
        '<p>Intro</p><figure><img src="https://a.storyblok.com/f/1/a.png" alt=""></figure>',
        '<p>Intro</p><hr>',
        '<ul><li><p>one</p></li></ul>',
        '<h2>Title</h2>',
    ])('never edits %s when the user only moves the caret', (html) => {
        const onUpdate = vi.fn()
        const editor = new Editor({
            content: html,
            extensions: editorExtensions({ onImages: () => undefined }),
            onUpdate,
        })
        editors.push(editor)
        editor.commands.setTextSelection(1)
        editor.commands.focus()
        editor.commands.blur()
        expect(onUpdate).not.toHaveBeenCalled()
        expect(editor.getHTML()).toBe(html)
    })
})
