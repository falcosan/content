import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { EditorContent, type Editor } from '@tiptap/vue-3'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Asset } from '#types/api'
import { keys } from '@/api/queries'
import RichEditor from '@/components/editor/RichEditor.vue'
import { useUploads } from '@/composables/useUploads'
import { validateContent } from '@/lib/validation'

vi.mock('@/composables/useUploads', () => ({ useUploads: vi.fn() }))

const asset: Asset = {
    id: 1,
    url: 'https://a.storyblok.com/f/1/cat.png',
    name: 'cat.png',
    contentType: 'image/png',
    size: 1,
    width: null,
    height: null,
    alt: 'Cat',
    title: '',
    copyright: '',
    source: '',
    folderId: null,
    createdAt: '2025-01-01T00:00:00Z',
    deletedAt: null,
}

const mountEditor = async (modelValue: string, maxLength: number | null = null) => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(keys.session, { siteUrl: 'https://site.test/' })
    const onUpdate = vi.fn()
    const wrapper = mount(RichEditor, {
        props: { modelValue, maxLength, 'onUpdate:modelValue': onUpdate },
        global: { plugins: [[VueQueryPlugin, { queryClient }]] },
    })
    await flushPromises()
    const editor = wrapper.findComponent(EditorContent).props('editor') as Editor
    return { wrapper, editor, onUpdate }
}

afterEach(() => {
    vi.mocked(useUploads).mockReset()
})

describe('RichEditor', () => {
    it('keeps content over the limit and counts it like validation does', async () => {
        vi.mocked(useUploads).mockReturnValue({ items: [], upload: vi.fn() })
        const html =
            '<h2>Title</h2><p>Body text here</p><figure><img src="https://a.storyblok.com/f/1/a.png" alt=""><figcaption>Caption</figcaption></figure>'
        const { wrapper, editor, onUpdate } = await mountEditor(html, 10)
        editor.commands.setTextSelection(3)
        expect(onUpdate).not.toHaveBeenCalled()
        expect(editor.getHTML()).toBe(html)
        expect(wrapper.text()).toContain('26/10 characters')
        const field = {
            key: 'long_text',
            label: 'Text',
            required: false,
            translatable: false,
            description: '',
            type: 'markdown' as const,
            maxLength: 10,
        }
        expect(validateContent([field], { component: 'Post', long_text: html })).toEqual({
            long_text: 'Use at most 10 characters',
        })
    })

    it('inserts a dropped image where it was dropped while the text moves during the upload', async () => {
        const { promise, resolve } = Promise.withResolvers<Asset[]>()
        vi.mocked(useUploads).mockReturnValue({ items: [], upload: vi.fn(() => promise) })
        const { editor } = await mountEditor('<p>Hello world</p>')
        const fileHandler = editor.extensionManager.extensions.find(
            ({ name }) => name === 'fileHandler'
        )
        const file = new File(['x'], 'cat.png', { type: 'image/png' })
        fileHandler?.options.onDrop(editor, [file], editor.state.doc.content.size - 1)
        editor.commands.insertContentAt(1, 'Intro ')
        resolve([asset])
        await flushPromises()
        expect(editor.getHTML()).toBe(
            '<p>Intro Hello world</p><figure><img src="https://a.storyblok.com/f/1/cat.png" alt="Cat"></figure>'
        )
    })
})
