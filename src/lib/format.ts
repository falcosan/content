const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

const LOCALE = 'en-US'

const DAY_MONTH_YEAR = { day: '2-digit', month: 'short', year: 'numeric' } as const

const dateFormat = new Intl.DateTimeFormat(LOCALE, DAY_MONTH_YEAR)

const utcDateFormat = new Intl.DateTimeFormat(LOCALE, { ...DAY_MONTH_YEAR, timeZone: 'UTC' })

const timeFormat = new Intl.DateTimeFormat(LOCALE, { timeStyle: 'short', hourCycle: 'h23' })

const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 24 * 60 * 60],
    ['month', 30 * 24 * 60 * 60],
    ['week', 7 * 24 * 60 * 60],
    ['day', 24 * 60 * 60],
    ['hour', 60 * 60],
    ['minute', 60],
]

const dayMonthYear = (format: Intl.DateTimeFormat, date: Date) => {
    const { day, month, year } = Object.fromEntries(
        format.formatToParts(date).map(({ type, value }) => [type, value])
    )
    return `${day} ${month} ${year}`
}

export const formatDate = (value: string) => {
    const date = new Date(DATE_ONLY.test(value) ? `${value}T00:00:00Z` : value)
    if (Number.isNaN(date.getTime())) return value
    return dayMonthYear(DATE_ONLY.test(value) ? utcDateFormat : dateFormat, date)
}

export const formatDateTime = (value: string) => {
    const date = new Date(value)
    return `${dayMonthYear(dateFormat, date)}, ${timeFormat.format(date)}`
}

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
