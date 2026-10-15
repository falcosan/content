export const SLUG_PATTERN = '[a-z0-9]+(?:-[a-z0-9]+)*'

export const SLUG = new RegExp(`^${SLUG_PATTERN}$`)

export const BULK_LIMIT = 100

export const MAX_LENGTH = {
    storyName: 255,
    slug: 255,
    optionName: 100,
    folderName: 100,
    assetText: 1000,
} as const
