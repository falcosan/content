export function formatString(string) {
    return `${string.charAt(0).toUpperCase()}${string.slice(1).toLowerCase()}`.replace(/[_-]/g, ' ')
}
