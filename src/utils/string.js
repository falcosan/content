export function formatString(string) {
    return `${string.charAt(0).toUpperCase()}${string.slice(1).toLowerCase()}`.replace(/[_-]/g, ' ')
}

export function formatURL(url) {
    const patterns = {
        twitchLive: /https:\/\/www\.twitch\.tv\/(.*)/,
        vimeo: /(https:\/\/)?(www\.)?vimeo\.com\/(\d+)/,
        twitchClip: /^https:\/\/(?:www\.)?twitch\.tv\/\w+\/clip\/(\w+)-(\w+)/,
        dailymotion: /(https?:\/\/)(www\.)?(dailymotion\.com\/video\/)([a-zA-Z0-9]+)(.*)/,
        youtube:
            /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/)))([a-zA-Z0-9_-]+)(?:\S*)$/,
        url: /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/|ftp:\/\/|ftps:\/\/|blob:|localhost)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/,
    }
    const hosts = [import.meta.env.STORY_DOMAIN_PRO, import.meta.env.STORY_DOMAIN_EDITOR]
        .map((domain) => `parent=${domain.replace(/^(?:https?:\/\/)?([^\/]+)\/?$/, '$1')}`)
        .join('&')
    if (!patterns.url) return ''
    if (patterns.vimeo.test(url)) {
        return `https://player.vimeo.com/video/${url.replace(patterns.vimeo, '$3')}`
    } else if (patterns.dailymotion.test(url)) {
        return `https://www.dailymotion.com/embed/video/${url.replace(patterns.dailymotion, '$4')}`
    } else if (patterns.twitchClip.test(url)) {
        return `${url.replace(
            patterns.twitchClip,
            'https://clips.twitch.tv/embed?clip=$1-$2'
        )}&${hosts}`
    } else if (patterns.twitchLive.test(url)) {
        return `${url.replace(
            patterns.twitchLive,
            'https://player.twitch.tv/?channel=$1'
        )}&${hosts}`
    } else if (patterns.youtube.test(url)) {
        const time = url.match(/(?:t|start)=(\d+)/)
        let path = `https://www.youtube.com/embed/${url.replace(patterns.youtube, '$1')}`
        if (time) path = `${path}?start=${time[1]}`
        return path
    } else {
        return url
    }
}

export function formatHTML(data) {
    if (data != null) {
        if (Array.isArray(data)) {
            return data.map((elem) => formatHTML(elem))
        } else if (typeof data === 'object') {
            return Object.entries(data).reduce((acc, [k, v]) => {
                if (Array.isArray(v)) acc[k] = v.map((elem) => formatHTML(elem))
                else acc[k] = formatHTML(v)
                return acc
            }, {})
        } else {
            return data.toString().replace(/(<([^>]+)>|\n)/gi, ' ')
        }
    } else return ''
}

export function formatMarkdown(data) {
    const text = data
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        .replace(/_(.+?)_/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/\[(.+?)\]\((.+?)\)/g, '$1')
        .replace(/!\[(.+?)\]\((.+?)\)/g, '')
        .replace(/^#+\s+(.+?)\s*$/gm, '$1')
        .replace(/^\s*=+\s*$/gm, '')
        .replace(/^\s*-+\s*$/gm, '')
        .replace(/^\s*>\s+(.+?)\s*$/gm, '$1')
        .replace(/^\s*[\*\+-]\s+(.+?)\s*$/gm, '$1')
        .replace(/^\s*\d+\.\s+(.+?)\s*$/gm, '$1')
        .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    return text.trim()
}

export function formatPlainText(data) {
    return formatHTML(formatMarkdown(data))
}
