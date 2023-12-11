import StoryblokClient from 'storyblok-js-client'

const Storyblok = {
    common: new StoryblokClient({
        accessToken: import.meta.env.STORY_PREVIEW_TOKEN,
    }),
    management: new StoryblokClient({
        oauthToken: import.meta.env.STORY_OAUTH_TOKEN,
        accessToken: import.meta.env.STORY_PREVIEW_TOKEN,
    }),
}
export async function getStoryblokStories(language, startsWith, query = 'cdn/stories/') {
    return await Storyblok.common
        .get(query, {
            language,
            version: 'draft',
            cv: 'CURRENT_TIMESTAMP',
            ...(startsWith && { starts_with: startsWith }),
        })
        .then(({ data }) => data)
        .catch((error) => console.error(error.message || error))
}

export async function getStoryblokStory(id) {
    return await Storyblok.management
        .get(`spaces/${import.meta.env.STORY_ID_SPACE}/stories/${id}`, {})
        .then(({ data }) => data)
        .catch((error) => console.error(error.message || error))
}

export async function editStoryblokStory(story, lang) {
    return await Storyblok.management
        .put(`spaces/${import.meta.env.STORY_ID_SPACE}/stories/${story.id}`, {
            lang,
            story,
            ...(story.published && { publish: '1' }),
        })
        .then(({ data }) => data)
        .catch((error) => console.error(error.message || error))
}

export async function getStoryblokComponents(name, properties) {
    const components = []
    await Storyblok.management
        .get(`spaces/${import.meta.env.STORY_ID_SPACE}/components`, {})
        .then((response) =>
            response.data.components.forEach((component) => {
                const singleKey = []
                const multipleKeys = {}
                const name = component.name
                const schema = component.schema
                const propsComposer = (prop, obj) => {
                    let name = prop
                    let value = !!prop
                    let control = obj[name] === value
                    if (typeof prop === 'object') {
                        const key = Object.keys(prop)[0]
                        const val = Object.values(prop)[0]
                        name = key
                        value = val
                        if (obj[name]) {
                            if (Array.isArray(val)) {
                                if (
                                    val.every(
                                        (constr) => typeof constr === 'function' && constr.prototype
                                    )
                                ) {
                                    value = []
                                    val.forEach((type) => {
                                        const constr = type.prototype.constructor
                                        if (constr === String) value.push('string')
                                        if (constr === Number) value.push('number')
                                    })
                                    control = typeof value.includes(obj[name])
                                } else if (val.every((type) => typeof type === 'string')) {
                                    control = val.includes(obj[name])
                                }
                            } else if (typeof val === 'function' && val.prototype) {
                                const constr = val.prototype.constructor
                                if (constr === String) value = 'string'
                                if (constr === Number) value = 'number'
                                control = typeof obj[name] === value
                            } else {
                                control = obj[name] === value
                            }
                        }
                    }
                    return { name, value, control }
                }
                Object.keys(schema).forEach((key) => {
                    if (Array.isArray(properties)) {
                        properties.forEach((prop) => {
                            const { name, control } = propsComposer(prop, schema[key])
                            if (control) {
                                multipleKeys[name] = multipleKeys[name] || []
                                multipleKeys[name].push([key, schema[key][name]])
                            }
                        })
                    } else {
                        const { control } = propsComposer(properties, schema[key])
                        if (control) singleKey.push([key, schema[key][name]])
                    }
                })
                components[name] = Array.isArray(properties) ? multipleKeys : singleKey
            })
        )
    return name === true ? components : components[name]
}

export async function toggleStoryblokStory(id, state) {
    return await Storyblok.management
        .get(`spaces/${import.meta.env.STORY_ID_SPACE}/stories/${id}/${state}`, {})
        .then(({ data }) => data)
        .catch((error) => console.error(error.message || error))
}
