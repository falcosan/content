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
