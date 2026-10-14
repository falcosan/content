export const safeRedirect = (value: unknown) =>
    typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'

export const APP_TITLE = 'AP | Editor'
