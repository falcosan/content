import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Field } from '#types/api'
import AssetField from '@/components/fields/AssetField.vue'
import FieldControl from '@/components/fields/FieldControl.vue'
import NewOption from '@/components/fields/NewOption.vue'
import OptionsField from '@/components/fields/OptionsField.vue'
import { emptyAssetValue } from '@/lib/assets'

const base = { label: 'Field', required: false, description: '' }

const mountField = (field: Field, modelValue: unknown) =>
    mount(FieldControl, { props: { field, modelValue } })

const lastUpdate = (wrapper: ReturnType<typeof mountField>) =>
    wrapper.emitted('update:modelValue')?.at(-1)?.[0]

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('FieldControl', () => {
    it('renders text with a live counter and required marker', async () => {
        const wrapper = mountField(
            { ...base, key: 'title', type: 'text', required: true, maxLength: 48 },
            'Hello'
        )
        const input = wrapper.get('input')
        expect(input.attributes('maxlength')).toBe('48')
        expect(wrapper.text()).toContain('5/48')
        expect(wrapper.text()).toContain('Field *')
        await input.setValue('Hello world')
        expect(lastUpdate(wrapper)).toBe('Hello world')
    })

    it('stores date-only values as YYYY-MM-DD', async () => {
        const wrapper = mountField(
            { ...base, key: 'date', type: 'datetime', withTime: false },
            '2025-08-07 00:00'
        )
        const input = wrapper.get('input')
        expect(input.attributes('type')).toBe('date')
        expect((input.element as HTMLInputElement).value).toBe('2025-08-07')
        await input.setValue('2025-09-01')
        expect(lastUpdate(wrapper)).toBe('2025-09-01')
    })

    it('stores date-time values in Storyblok format', async () => {
        const wrapper = mountField(
            { ...base, key: 'at', type: 'datetime', withTime: true },
            '2025-08-07 10:30'
        )
        const input = wrapper.get('input')
        expect(input.attributes('type')).toBe('datetime-local')
        expect((input.element as HTMLInputElement).value).toBe('2025-08-07T10:30')
        await input.setValue('2025-09-01T08:15')
        expect(lastUpdate(wrapper)).toBe('2025-09-01 08:15')
    })

    it('offers an empty choice only when allowed', () => {
        const options = [{ name: 'Daniele', value: 'Daniele' }]
        const optional = mountField(
            { ...base, key: 'author', type: 'option', options, allowEmpty: true },
            ''
        )
        expect(optional.findAll('option').map((option) => option.text())).toEqual(['—', 'Daniele'])
        const strict = mountField(
            { ...base, key: 'author', type: 'option', options, allowEmpty: false },
            'Daniele'
        )
        expect(strict.findAll('option')).toHaveLength(1)
    })

    it('keeps number values as the strings Storyblok stores', async () => {
        const wrapper = mountField({ ...base, key: 'minutes', type: 'number' }, '3')
        const input = wrapper.get('input')
        expect(input.attributes('type')).toBe('number')
        expect((input.element as HTMLInputElement).value).toBe('3')
        await input.setValue('8')
        expect(lastUpdate(wrapper)).toBe('8')
        await wrapper.setProps({ modelValue: lastUpdate(wrapper) })
        expect((input.element as HTMLInputElement).value).toBe('8')
    })

    it('marks option groups invalid and focusable so errors can be reached', () => {
        const options = [{ name: 'Vue', value: 'vue' }]
        const wrapper = mount(FieldControl, {
            props: {
                field: {
                    ...base,
                    key: 'categories',
                    type: 'options',
                    options,
                    maxOptions: null,
                    allowNewOptions: false,
                },
                modelValue: [],
                error: 'This field is required',
            },
        })
        const group = wrapper.get('[role="group"]')
        expect(group.attributes('aria-invalid')).toBe('true')
        expect(group.attributes('tabindex')).toBe('-1')
        expect(wrapper.get(`[id="${group.attributes('aria-describedby')}"]`).text()).toBe(
            'This field is required'
        )
    })

    it('links errors and descriptions for assistive tech', () => {
        const wrapper = mount(FieldControl, {
            props: {
                field: {
                    ...base,
                    key: 'intro',
                    type: 'textarea',
                    maxLength: null,
                    description: 'Shown in lists',
                },
                modelValue: '',
                error: 'This field is required',
            },
        })
        const textarea = wrapper.get('textarea')
        expect(textarea.attributes('aria-invalid')).toBe('true')
        const describedBy = textarea.attributes('aria-describedby')!.split(' ')
        expect(describedBy).toHaveLength(2)
        expect(describedBy.map((id) => wrapper.get(`[id="${id}"]`).text())).toEqual([
            'Shown in lists',
            'This field is required',
        ])
    })
})

describe('OptionsField', () => {
    const options = ['a', 'b', 'c'].map((value) => ({ name: value.toUpperCase(), value }))

    it('toggles values and enforces the maximum', async () => {
        const onUpdate = vi.fn()
        const wrapper = mount(OptionsField, {
            props: {
                options,
                maxOptions: 2,
                labelledBy: 'label',
                fieldKey: 'tags',
                modelValue: ['a', 'b'],
                'onUpdate:modelValue': onUpdate,
            },
        })
        const buttons = wrapper.findAll('button')
        expect(buttons.map((button) => button.attributes('aria-pressed'))).toEqual([
            'true',
            'true',
            'false',
        ])
        expect(buttons[2]!.attributes('disabled')).toBeDefined()
        await buttons[0]!.trigger('click')
        expect(onUpdate).toHaveBeenCalledWith(['b'])
    })

    it('treats missing values as an empty selection', async () => {
        const onUpdate = vi.fn()
        const wrapper = mount(OptionsField, {
            props: {
                options,
                labelledBy: 'label',
                fieldKey: 'tags',
                modelValue: '',
                'onUpdate:modelValue': onUpdate,
            },
        })
        await wrapper.findAll('button')[1]!.trigger('click')
        expect(onUpdate).toHaveBeenCalledWith(['b'])
    })

    describe('adding options', () => {
        const added = (option: { name: string; value: string }, created = true) => {
            const fetch = vi.fn<typeof globalThis.fetch>(async () =>
                Response.json({ option, created }, { status: created ? 201 : 200 })
            )
            vi.stubGlobal('fetch', fetch)
            return fetch
        }

        const mountAdding = (modelValue: string[], maxOptions: number | null = null) => {
            const onUpdate = vi.fn()
            const wrapper = mount(OptionsField, {
                props: {
                    options,
                    maxOptions,
                    labelledBy: 'label',
                    fieldKey: 'tags',
                    allowNew: true,
                    modelValue,
                    'onUpdate:modelValue': onUpdate,
                },
                global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] },
            })
            return { wrapper, onUpdate }
        }

        it('creates the option and selects it', async () => {
            const fetch = added({ name: 'Data Science', value: 'datascience' })
            const { wrapper, onUpdate } = mountAdding(['a'])
            const input = wrapper.get('input[aria-label="New option"]')
            await input.setValue('  Data Science ')
            await input.trigger('keydown', { key: 'Enter' })
            await flushPromises()
            expect(String(fetch.mock.calls[0]?.[0])).toBe('/api/schema/fields/tags/options')
            expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
                name: 'Data Science',
            })
            expect(onUpdate).toHaveBeenCalledWith(['a', 'datascience'])
            expect((input.element as HTMLInputElement).value).toBe('')
        })

        it('selects an existing option instead of duplicating it', async () => {
            added({ name: 'B', value: 'b' }, false)
            const { wrapper, onUpdate } = mountAdding(['a'])
            await wrapper.get('input[aria-label="New option"]').setValue('b')
            await wrapper.findAll('button').at(-1)!.trigger('click')
            await flushPromises()
            expect(onUpdate).toHaveBeenCalledWith(['a', 'b'])
        })

        it('keeps the selection when the maximum is reached', async () => {
            added({ name: 'D', value: 'd' })
            const { wrapper, onUpdate } = mountAdding(['a', 'b'], 2)
            await wrapper.get('input[aria-label="New option"]').setValue('D')
            await wrapper.findAll('button').at(-1)!.trigger('click')
            await flushPromises()
            expect(onUpdate).not.toHaveBeenCalled()
        })

        it('sends one schema update at a time across fields', async () => {
            const first = Promise.withResolvers<Response>()
            const fetch = vi
                .fn<typeof globalThis.fetch>()
                .mockReturnValueOnce(first.promise)
                .mockResolvedValueOnce(
                    Response.json({ option: { name: 'B', value: 'b' }, created: true })
                )
            vi.stubGlobal('fetch', fetch)
            const queryClient = new QueryClient()
            const forms = ['categories', 'tags'].map((fieldKey) =>
                mount(NewOption, {
                    props: { fieldKey },
                    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
                })
            )
            for (const [index, form] of forms.entries()) {
                await form.get('input').setValue(`Option ${index}`)
                await form.get('input').trigger('keydown', { key: 'Enter' })
            }
            await flushPromises()
            expect(fetch).toHaveBeenCalledOnce()
            first.resolve(Response.json({ option: { name: 'A', value: 'a' }, created: true }))
            await flushPromises()
            expect(fetch).toHaveBeenCalledTimes(2)
        })

        it('ignores blank names', async () => {
            const fetch = added({ name: 'X', value: 'x' })
            const { wrapper } = mountAdding([])
            await wrapper.get('input[aria-label="New option"]').setValue('   ')
            await wrapper.get('input[aria-label="New option"]').trigger('keydown', { key: 'Enter' })
            await flushPromises()
            expect(fetch).not.toHaveBeenCalled()
            expect(wrapper.findAll('button').at(-1)!.attributes('disabled')).toBeDefined()
        })
    })
})

describe('AssetField', () => {
    const mountAsset = (modelValue: unknown, allowExternalUrl = true) =>
        mount(AssetField, {
            props: { filetypes: ['images'], allowExternalUrl, labelledBy: 'label', modelValue },
            global: { stubs: { AssetPickerDialog: true } },
        })

    it('hides the URL input when the schema does not allow external URLs', () => {
        const wrapper = mountAsset(emptyAssetValue(), false)
        expect(wrapper.find('input[type=url]').exists()).toBe(false)
        expect(wrapper.text()).toContain('Choose from library')
    })

    const lastValue = (wrapper: ReturnType<typeof mountAsset>) =>
        wrapper.emitted('update:modelValue')?.at(-1)?.[0]

    it('turns a pasted URL into an external Storyblok asset', async () => {
        const wrapper = mountAsset(emptyAssetValue())
        await wrapper.get('input[type=url]').setValue(' https://images.example.org/cover.jpg ')
        expect(lastValue(wrapper)).toEqual({
            ...emptyAssetValue(),
            filename: 'https://images.example.org/cover.jpg',
            is_external_url: true,
        })
    })

    it('keeps the alt text and previews external images without the image service', async () => {
        const wrapper = mountAsset({
            ...emptyAssetValue(),
            alt: 'Kept',
            filename: 'https://images.example.org/old.jpg',
            is_external_url: true,
        })
        expect(wrapper.get('img').attributes('src')).toBe('https://images.example.org/old.jpg')
        expect((wrapper.get('input[type=url]').element as HTMLInputElement).value).toBe(
            'https://images.example.org/old.jpg'
        )
        await wrapper.get('input[type=url]').setValue('https://images.example.org/new.jpg')
        expect(lastValue(wrapper)).toMatchObject({
            alt: 'Kept',
            filename: 'https://images.example.org/new.jpg',
            is_external_url: true,
        })
    })

    it('rejects invalid URLs and clears an external cover when emptied', async () => {
        const wrapper = mountAsset({
            ...emptyAssetValue(),
            filename: 'https://images.example.org/old.jpg',
            is_external_url: true,
        })
        const input = wrapper.get('input[type=url]')
        await input.setValue('javascript:alert(1)')
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
        expect(input.attributes('aria-invalid')).toBe('true')
        expect(wrapper.text()).toContain('Enter a valid https URL')
        expect((input.element as HTMLInputElement).value).toBe('javascript:alert(1)')
        await input.setValue('http://images.example.org/insecure.jpg')
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
        expect(input.attributes('aria-invalid')).toBe('true')
        expect((input.element as HTMLInputElement).value).toBe(
            'http://images.example.org/insecure.jpg'
        )
        await input.setValue('')
        expect(lastValue(wrapper)).toEqual(emptyAssetValue())
    })

    it('does not clear a library asset when the URL field is left empty', async () => {
        const wrapper = mountAsset({
            ...emptyAssetValue(),
            id: 9,
            filename: 'https://a.storyblok.com/f/1/800x600/a/cover.png',
        })
        expect(wrapper.get('img').attributes('src')).toBe(
            'https://a.storyblok.com/f/1/800x600/a/cover.png/m/640x0'
        )
        await wrapper.get('input[type=url]').setValue('')
        expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
})
