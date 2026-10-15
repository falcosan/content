import { SLUG } from '../../shared/validation'

export const isSlug = (value: string) => SLUG.test(value)

export const slugify = (value: string) =>
    value
        .normalize('NFKD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
