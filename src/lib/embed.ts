type Provider = [pattern: RegExp, toEmbed: (match: RegExpExecArray, url: URL) => string]

const providers = (parents: string): Provider[] => [
    [/^(?:www\.)?vimeo\.com\/(\d+)/, ([, id]) => `https://player.vimeo.com/video/${id}`],
    [
        /^(?:www\.)?dailymotion\.com\/video\/([a-zA-Z0-9]+)/,
        ([, id]) => `https://www.dailymotion.com/embed/video/${id}`,
    ],
    [
        /^(?:www\.)?twitch\.tv\/\w+\/clip\/([\w-]+)/,
        ([, clip]) => `https://clips.twitch.tv/embed?clip=${clip}&${parents}`,
    ],
    [
        /^(?:www\.)?twitch\.tv\/(\w+)\/?$/,
        ([, channel]) => `https://player.twitch.tv/?channel=${channel}&${parents}`,
    ],
    [
        /^(?:www\.|m\.)?(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/))([\w-]{11})/,
        ([, id], url) => {
            const start = /^(\d+)/.exec(
                url.searchParams.get('start') ?? url.searchParams.get('t') ?? ''
            )
            return `https://www.youtube.com/embed/${id}${start ? `?start=${start[1]}` : ''}`
        },
    ],
]

export const parseHttpUrl = (value: string) => {
    if (!URL.canParse(value.trim())) return null
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
}

export const toEmbedUrl = (value: string, hosts: string[]) => {
    const url = parseHttpUrl(value)
    if (!url) return null
    const parents = [...new Set(hosts)].map((host) => `parent=${host}`).join('&')
    const target = `${url.host}${url.pathname}${url.search}`
    for (const [pattern, toEmbed] of providers(parents)) {
        const match = pattern.exec(target)
        if (match) return toEmbed(match, url)
    }
    return url.href
}
