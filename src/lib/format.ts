const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
})

const utcDateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' })

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 24 * 60 * 60],
    ['month', 30 * 24 * 60 * 60],
    ['week', 7 * 24 * 60 * 60],
    ['day', 24 * 60 * 60],
    ['hour', 60 * 60],
    ['minute', 60],
]

export const formatDate = (value: string) => {
    const date = new Date(DATE_ONLY.test(value) ? `${value}T00:00:00Z` : value)
    if (Number.isNaN(date.getTime())) return value
    return (DATE_ONLY.test(value) ? utcDateFormat : dateFormat).format(date)
}

export const formatDateTime = (value: string) => dateTimeFormat.format(new Date(value))

export const formatRelative = (value: string, now = Date.now()) => {
    const seconds = (new Date(value).getTime() - now) / 1000
    for (const [unit, size] of UNITS) {
        if (Math.abs(seconds) >= size)
            return relativeFormat.format(Math.round(seconds / size), unit)
    }
    return relativeFormat.format(0, 'minute')
}

const BYTE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const

export const formatBytes = (bytes: number) => {
    const exponent = Math.min(
        Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)),
        BYTE_UNITS.length - 1
    )
    return new Intl.NumberFormat(undefined, {
        style: 'unit',
        unit: BYTE_UNITS[exponent],
        unitDisplay: 'short',
        maximumFractionDigits: exponent === 0 ? 0 : 1,
    }).format(bytes / 1024 ** exponent)
}
