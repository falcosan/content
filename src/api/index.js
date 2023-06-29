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

export async function getStoryblokStory(story) {
    return await Storyblok.management
        .get(`spaces/${import.meta.env.STORY_ID_SPACE}/stories/${story}`, {})
        .then(({ data }) => data)
        .catch((error) => console.error(error));
}

export async function putStoryblok(story, lang) {
    return await Storyblok.management
        .put(`spaces/${import.meta.env.STORY_ID_SPACE}/stories/${story.id}`, {
            lang,
            story,
            publish: Number(story.published),
        })
        .then((res) => res)
        .catch((error) => console.error(error));
}
