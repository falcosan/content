export function dateWithoutHour(data) {
    const date = new Date(data)
    if (date instanceof Date && isFinite(date.getTime())) {
        const fullDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
        return fullDate.toISOString().split('T')[0]
    }
}
