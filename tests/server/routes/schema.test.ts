import { describe, expect, it } from 'vitest'
import type { Responder } from '#types/tests'
import { createSignedInApp, json } from '../fakes'

const options = [
    { _uid: 'a', name: 'Vue', value: 'vue; vue; vue' },
    { _uid: 'b', name: 'Rust', value: 'rust; rust; rust' },
]

describe('schema routes', () => {
    it('maps the post schema into ordered editable fields', async () => {
        const { request } = await createSignedInApp(() =>
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
                            file: {
                                type: 'asset',
                                pos: 0,
                                filetypes: ['images'],
                                allow_external_url: true,
                            },
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
                            align_text: { type: 'option', pos: 11, options },
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
            {
                ...base,
                key: 'file',
                label: 'File',
                type: 'asset',
                filetypes: ['images'],
                allowExternalUrl: true,
            },
            {
                ...base,
                key: 'categories',
                label: 'Categories',
                type: 'options',
                maxOptions: 4,
                allowNewOptions: true,
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

    describe('adding options', () => {
        const schema = {
            categories: {
                type: 'options',
                pos: 1,
                options: [
                    { _uid: 'v', name: 'Vue', value: 'vue; vue; vue' },
                    { _uid: 'a', name: 'API', value: 'api; api; api' },
                    { _uid: 'r', name: 'Rust', value: 'rust; rust; rust' },
                ],
            },
            tags: { type: 'options', pos: 2, options: [] },
            sourced: { type: 'options', pos: 3, source: 'internal', datasource_slug: 'tags' },
            author: { type: 'option', pos: 4, options: [] },
            align_text: { type: 'options', pos: 5, options: [] },
            title: { type: 'text', pos: 6, required: true },
        }

        const setupAdd = async (update: Responder = () => json({ component: {} })) => {
            const { request, calls } = await createSignedInApp((call) =>
                call.method === 'GET'
                    ? json({ components: [{ id: 7, name: 'Post', schema }] })
                    : update(call)
            )
            const add = (key: string, name: string) =>
                request(`/api/schema/fields/${key}/options`, {
                    method: 'POST',
                    body: JSON.stringify({ name }),
                })
            return { add, calls }
        }

        it('adds the option with the format of the others and sorts the list', async () => {
            const { add, calls } = await setupAdd()
            const response = await add('categories', '  Machine Learning ')
            expect(response.status).toBe(201)
            const value = 'machinelearning; machinelearning; machinelearning'
            expect(await response.json()).toEqual({
                option: { name: 'Machine Learning', value },
                created: true,
            })
            expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
                'GET components',
                'PUT components/7',
            ])
            const { component } = calls[1]?.body as { component: { schema: typeof schema } }
            expect(component.schema).toEqual({
                ...schema,
                categories: {
                    ...schema.categories,
                    options: [
                        { _uid: 'a', name: 'API', value: 'api; api; api' },
                        { _uid: expect.any(String), name: 'Machine Learning', value },
                        { _uid: 'r', name: 'Rust', value: 'rust; rust; rust' },
                        { _uid: 'v', name: 'Vue', value: 'vue; vue; vue' },
                    ],
                },
            })
        })

        it('uses a plain value when there is no format to follow yet', async () => {
            const { add, calls } = await setupAdd()
            expect(await (await add('tags', 'Open Source')).json()).toEqual({
                option: { name: 'Open Source', value: 'opensource' },
                created: true,
            })
            const { component } = calls[1]?.body as { component: { schema: typeof schema } }
            expect(component.schema.tags.options).toEqual([
                { _uid: expect.any(String), name: 'Open Source', value: 'opensource' },
            ])
        })

        it('returns the existing option instead of duplicating it', async () => {
            const { add, calls } = await setupAdd()
            for (const name of ['rust', ' RUST ', 'Ápi']) {
                const response = await add('categories', name)
                expect(response.status).toBe(200)
                expect((await response.json()).created).toBe(false)
            }
            expect(calls.every(({ method }) => method === 'GET')).toBe(true)
        })

        it('only extends visible options fields defined in the schema', async () => {
            const { add, calls } = await setupAdd()
            for (const key of ['author', 'sourced', 'align_text', 'title', 'missing']) {
                const response = await add(key, 'New')
                expect(response.status).toBe(404)
                expect(await response.json()).toEqual({ error: 'Field not found' })
            }
            expect(calls.every(({ method }) => method === 'GET')).toBe(true)
        })

        it('reports a schema update that Storyblok rejects', async () => {
            const { add } = await setupAdd(() => json({ schema: ['is invalid'] }, { status: 422 }))
            const response = await add('categories', 'Machine Learning')
            expect(response.status).toBe(422)
            expect(await response.json()).toEqual({ error: 'schema is invalid' })
        })

        it('rejects names that would break the value format', async () => {
            const { add, calls } = await setupAdd()
            expect((await add('categories', 'A; B')).status).toBe(400)
            expect((await add('categories', '   ')).status).toBe(400)
            expect(calls).toHaveLength(0)
        })
    })

    it('fails when the post component is missing', async () => {
        const { request } = await createSignedInApp(() => json({ components: [] }))
        const response = await request('/api/schema/fields')
        expect(response.status).toBe(500)
        expect(await response.json()).toEqual({ error: 'Component Post not found' })
    })

    it('lists the configured languages', async () => {
        const { request } = await createSignedInApp(() =>
            json({
                space: {
                    default_lang_name: 'English',
                    languages: [
                        { code: 'es', name: 'Spanish', ai_translation_code: 'es' },
                        { code: 'it' },
                        { name: 'Without code' },
                    ],
                },
            })
        )
        expect(await (await request('/api/schema/languages')).json()).toEqual({
            defaultName: 'English',
            languages: [
                { code: 'es', name: 'Spanish' },
                { code: 'it', name: 'it' },
            ],
        })
    })

    it('handles spaces without languages', async () => {
        const { request } = await createSignedInApp(() => json({ space: {} }))
        expect(await (await request('/api/schema/languages')).json()).toEqual({
            defaultName: 'Default',
            languages: [],
        })
    })
})
