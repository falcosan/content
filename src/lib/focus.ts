export const roveFocus = (
    event: KeyboardEvent,
    items: HTMLElement[],
    [previous, next]: [string, string]
) => {
    const index = items.indexOf(document.activeElement as HTMLElement)
    if (index === -1) return
    const target = {
        [previous]: (index - 1 + items.length) % items.length,
        [next]: (index + 1) % items.length,
        Home: 0,
        End: items.length - 1,
    }[event.key]
    if (target === undefined) return
    items[target]?.focus()
    event.preventDefault()
}
