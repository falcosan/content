import { Editor } from '@tiptap/vue-3'
import { afterEach, describe, expect, it } from 'vitest'
import { fromEditorHtml, toEditorHtml } from '@/lib/content'
import { editorExtensions } from '.'

const editors: Editor[] = []

const roundTrip = (html: string) => {
    const editor = new Editor({
        content: toEditorHtml(html),
        extensions: editorExtensions({ maxLength: null, onImages: () => undefined }),
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

    it('enforces the character limit', () => {
        const editor = new Editor({
            content: '<p>abc</p>',
            extensions: editorExtensions({ maxLength: 5, onImages: () => undefined }),
        })
        editors.push(editor)
        editor.commands.insertContentAt(editor.state.doc.content.size - 1, 'defgh')
        expect(editor.storage.characterCount.characters()).toBeLessThanOrEqual(5)
    })

    it('places the caret after inserted media so consecutive inserts stack', () => {
        const editor = new Editor({
            content: '<p>Intro</p>',
            extensions: editorExtensions({ maxLength: null, onImages: () => undefined }),
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
            extensions: editorExtensions({ maxLength: null, onImages: () => undefined }),
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
})
