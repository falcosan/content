import type { Field, StoryContent } from '@/api/client'
import { isAssetValue } from './assets'
import { isBlankHtml, plainText } from './content'

export type FieldErrors = Record<string, string>

const isBlank = (field: Field, value: unknown) => {
    switch (field.type) {
        case 'markdown':
            return typeof value !== 'string' || isBlankHtml(value)
        case 'options':
            return !Array.isArray(value) || value.length === 0
        case 'asset':
            return !isAssetValue(value) || !value.filename
        case 'boolean':
            return false
        default:
            return typeof value !== 'string' || !value.trim()
    }
}

export const textLength = (field: Field, value: string) =>
    field.type === 'markdown' ? plainText(value).length : value.length

const fieldError = (field: Field, value: unknown) => {
    if (field.required && isBlank(field, value)) return 'This field is required'
    if (
        'maxLength' in field &&
        field.maxLength &&
        typeof value === 'string' &&
        textLength(field, value) > field.maxLength
    ) {
        return `Use at most ${field.maxLength} characters`
    }
    if (
        field.type === 'options' &&
        field.maxOptions &&
        Array.isArray(value) &&
        value.length > field.maxOptions
    ) {
        return `Choose at most ${field.maxOptions} ${field.maxOptions === 1 ? 'option' : 'options'}`
    }
    return null
}

export const validateContent = (fields: Field[], content: StoryContent): FieldErrors =>
    Object.fromEntries(
        fields.flatMap((field) => {
            const error = fieldError(field, content[field.key])
            return error ? [[field.key, error]] : []
        })
    )
