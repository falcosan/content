import { describe, expect, it } from 'vitest'
import { createTestApp, json, signIn, type Responder } from '../test/fakes'

const setup = async (responder: Responder) => {
    const { app } = createTestApp(responder)
    const cookie = await signIn(app)
    return (url: string) => app.request(url, { headers: { Cookie: cookie } })
}

const options = [
    { _uid: 'a', name: 'Vue', value: 'vue; vue; vue' },
    { _uid: 'b', name: 'Rust', value: 'rust; rust; rust' },
]

describe('schema routes', () => {
    it('maps the post schema into ordered editable fields', async () => {
        const request = await setup(() =>
            json({
                components: [
                    { name: 'Page', schema: { body: { type: 'bloks', pos: 0 } } },
                    {
                        name: 'Post',
                        schema: {
                            long_text: { type: 'markdown', pos: 7, required: true },
                            title: {
                                type: 'text',
                                pos: 4,
                                required: true,
                                translatable: true,
                                max_length: '48',
                            },
                            intro: { type: 'textarea', pos: 6, description: ' Teaser ' },
                            date: { type: 'datetime', pos: 5, disable_time: true },
                            file: { type: 'asset', pos: 0, filetypes: ['images'] },
                            categories: {
                                type: 'options',
                                pos: 1,
                                options,
                                max_options: '4',
                            },
                            author: {
                                type: 'option',
                                pos: 2,
                                options,
                                exclude_empty_option: true,
                                display_name: 'Written by',
                            },
                            editor: { type: 'custom', pos: 3 },
                            featured: { type: 'boolean', pos: 8 },
                            'tab-1': { type: 'tab', pos: 9 },
                            reading_time: { type: 'number', pos: 10, max_length: '' },
                        },
                    },
                ],
            })
        )
        const fields = await (await request('/api/schema/fields')).json()
        const base = { required: false, translatable: false, description: '' }
        expect(fields).toEqual([
            { ...base, key: 'file', label: 'File', type: 'asset', filetypes: ['images'] },
            {
                ...base,
                key: 'categories',
                label: 'Categories',
                type: 'options',
                maxOptions: 4,
                options: [
                    { name: 'Vue', value: 'vue; vue; vue' },
                    { name: 'Rust', value: 'rust; rust; rust' },
                ],
            },
            {
                ...base,
                key: 'author',
                label: 'Written by',
                type: 'option',
                allowEmpty: false,
                options: [
                    { name: 'Vue', value: 'vue; vue; vue' },
                    { name: 'Rust', value: 'rust; rust; rust' },
                ],
            },
            {
                ...base,
                key: 'title',
                label: 'Title',
                type: 'text',
                required: true,
                translatable: true,
                maxLength: 48,
            },
            { ...base, key: 'date', label: 'Date', type: 'datetime', withTime: false },
            {
                ...base,
                key: 'intro',
                label: 'Intro',
                type: 'textarea',
                description: 'Teaser',
                maxLength: null,
            },
            {
                ...base,
                key: 'long_text',
                label: 'Long text',
                type: 'markdown',
                required: true,
                maxLength: null,
            },
            { ...base, key: 'featured', label: 'Featured', type: 'boolean' },
            { ...base, key: 'reading_time', label: 'Reading time', type: 'number' },
        ])
    })

    it('fails when the post component is missing', async () => {
        const request = await setup(() => json({ components: [] }))
        const response = await request('/api/schema/fields')
        expect(response.status).toBe(500)
        expect(await response.json()).toEqual({ error: 'Component Post not found' })
    })

    it('lists the workflow stages of the post workflow in order', async () => {
        const request = await setup(({ path }) =>
            path === 'workflows'
                ? json({
                      workflows: [
                          { id: 1, is_default: true, content_types: [] },
                          { id: 2, is_default: false, content_types: ['Post'] },
                      ],
                  })
                : json({
                      workflow_stages: [
                          { id: 21, name: 'Review', position: 2, workflow_id: 2 },
                          { id: 11, name: 'Other', position: 1, workflow_id: 1 },
                          { id: 20, name: 'Draft', position: 1, workflow_id: 2 },
                      ],
                  })
        )
        expect(await (await request('/api/schema/workflow-stages')).json()).toEqual([
            { id: 20, name: 'Draft' },
            { id: 21, name: 'Review' },
        ])
    })

    it('falls back to the default workflow', async () => {
        const request = await setup(({ path }) =>
            path === 'workflows'
                ? json({ workflows: [{ id: 1, is_default: true, content_types: [] }] })
                : json({
                      workflow_stages: [{ id: 11, name: 'Drafting', position: 1, workflow_id: 1 }],
                  })
        )
        expect(await (await request('/api/schema/workflow-stages')).json()).toEqual([
            { id: 11, name: 'Drafting' },
        ])
    })

    it('lists the configured languages', async () => {
        const request = await setup(() =>
            json({
                space: {
                    default_lang_name: 'English',
                    languages: [{ code: 'es', name: 'Spanish', ai_translation_code: 'es' }],
                },
            })
        )
        expect(await (await request('/api/schema/languages')).json()).toEqual({
            defaultName: 'English',
            languages: [{ code: 'es', name: 'Spanish' }],
        })
    })

    it('handles spaces without languages', async () => {
        const request = await setup(() => json({ space: {} }))
        expect(await (await request('/api/schema/languages')).json()).toEqual({
            defaultName: 'Default',
            languages: [],
        })
    })

    it('lists tag names alphabetically', async () => {
        const request = await setup(() =>
            json({
                tags: [
                    { name: 'vue', taggings_count: 2 },
                    { name: 'astro', taggings_count: 1 },
                ],
            })
        )
        expect(await (await request('/api/schema/tags')).json()).toEqual(['astro', 'vue'])
    })
})
