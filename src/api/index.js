import StoryblokClient from "storyblok-js-client";

export async function getStoryblok(
    language = "en",
    startsWith,
    query = "cdn/stories/"
) {
    const Storyblok = new StoryblokClient({
        accessToken: import.meta.env.STORY_PREVIEW_TOKEN,
    });
    return await Storyblok.get(query, {
        language,
        version: "draft",
        cv: "CURRENT_TIMESTAMP",
        ...(startsWith && { starts_with: startsWith }),
    })
        .then(({ data }) => data)
        .catch((error) => console.error(error));
}

export async function putStoryblok(story, publish = false) {
    const Storyblok = new StoryblokClient({
        oauthToken: import.meta.env.STORY_OAUTH_TOKEN,
        accessToken: import.meta.env.STORY_PREVIEW_TOKEN,
    });
    return await Storyblok.put(
        `spaces/${import.meta.env.STORY_ID_SPACE}/stories/${story.id}`,
        {
            lang: story.lang,
            publish,
            story: { content: story.content },
        }
    )
        .then((res) => res)
        .catch((error) => console.error(error));
}
