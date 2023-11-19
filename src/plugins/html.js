import enums from '../enums'

export const htmlPlugin = () => ({
    name: 'html-transform',
    transformIndexHtml: {
        order: 'pre',
        handler(html) {
            return html.replace(/.*/g, (match) => {
                if (new RegExp(enums.metaHtml.title.variable).test(match)) {
                    return match.replace(enums.metaHtml.title.variable, enums.metaHtml.title.value)
                }
                return match
            })
        },
    },
})
