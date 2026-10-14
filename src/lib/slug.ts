export const SLUG_PATTERN = '[a-z0-9]+(?:-[a-z0-9]+)*'

const SLUG = new RegExp(`^${SLUG_PATTERN}$`)

export const isSlug = (value: string) => SLUG.test(value)

export const slugify = (value: string) =>
    value
        .normalize('NFKD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
