import StoryblokClient from "storyblok-js-client";

const Storyblok = {
    common: new StoryblokClient({
        accessToken: import.meta.env.STORY_PREVIEW_TOKEN,
    }),
    management: new StoryblokClient({
        oauthToken: import.meta.env.STORY_OAUTH_TOKEN,
        accessToken: import.meta.env.STORY_PREVIEW_TOKEN,
    }),
};
export async function getStoryblokStories(
    language,
    startsWith,
    query = "cdn/stories/"
) {
    return await Storyblok.common
        .get(query, {
            language,
            version: "draft",
            cv: "CURRENT_TIMESTAMP",
            ...(startsWith && { starts_with: startsWith }),
        })
        .then(({ data }) => data)
        .catch((error) => console.error(error));
}

export async function getStoryblokStory(id) {
    return await Storyblok.management
        .get(`spaces/${import.meta.env.STORY_ID_SPACE}/stories/${id}`, {})
        .then(({ data }) => data)
        .catch((error) => console.error(error));
}

export async function editStoryblokStory(story, lang) {
    return await Storyblok.management
        .put(`spaces/${import.meta.env.STORY_ID_SPACE}/stories/${story.id}`, {
            lang,
            story,
        })
        .then(({ data }) => data)
        .catch((error) => console.error(error));
}

export async function getStoryblokComponents(name, property) {
    const components = [];
    await Storyblok.management
        .get(`spaces/${import.meta.env.STORY_ID_SPACE}/components`, {})
        .then((response) =>
            response.data.components.forEach((component) => {
                const compName = component.name;
                const compSchema = component.schema;
                const compKeys = Object.keys(compSchema);
                const i18nKeys = [];
                compKeys.forEach((key) => {
                    if (compSchema[key][property]) i18nKeys.push(key);
                });
                components[compName] = i18nKeys;
            })
        );
    return name === true ? components : components[name];
}

export async function toggleStoryblokStory(id, state) {
    return await Storyblok.management
        .get(
            `spaces/${import.meta.env.STORY_ID_SPACE}/stories/${id}/${state}`,
            {}
        )
        .then(({ data }) => data)
        .catch((error) => console.error(error));
}
