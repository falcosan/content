import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Field } from '@/api/client'
import FieldControl from './FieldControl.vue'
import OptionsField from './OptionsField.vue'
import TagsInput from './TagsInput.vue'

const base = { label: 'Field', required: false, translatable: false, description: '' }

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
                modelValue: '',
                'onUpdate:modelValue': onUpdate,
            },
        })
        await wrapper.findAll('button')[1]!.trigger('click')
        expect(onUpdate).toHaveBeenCalledWith(['b'])
    })
})

describe('TagsInput', () => {
    const mountTags = (modelValue: string[]) => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () =>
                Response.json(['news', 'vue'], { headers: { 'Content-Type': 'application/json' } })
            )
        )
        const onUpdate = vi.fn()
        const wrapper = mount(TagsInput, {
            props: { inputId: 'tags', modelValue, 'onUpdate:modelValue': onUpdate },
            global: {
                plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
            },
        })
        return { wrapper, onUpdate }
    }

    it('adds trimmed unique tags on Enter and comma', async () => {
        const { wrapper, onUpdate } = mountTags(['news'])
        const input = wrapper.get('input')
        await input.setValue('  launch ')
        await input.trigger('keydown', { key: 'Enter' })
        expect(onUpdate).toHaveBeenLastCalledWith(['news', 'launch'])
        await input.setValue('news')
        await input.trigger('keydown', { key: ',' })
        expect(onUpdate).toHaveBeenCalledTimes(1)
    })

    it('removes tags with the button and Backspace', async () => {
        const { wrapper, onUpdate } = mountTags(['news', 'vue'])
        await wrapper.get('button[aria-label="Remove tag news"]').trigger('click')
        expect(onUpdate).toHaveBeenLastCalledWith(['vue'])
        await wrapper.get('input').trigger('keydown', { key: 'Backspace' })
        expect(onUpdate).toHaveBeenLastCalledWith(['news'])
    })
})
