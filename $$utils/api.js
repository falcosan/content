const StoryblokClient = require("storyblok-js-client");
require("dotenv").config();

const storyblok = new StoryblokClient({
  accessToken: process.env.STORY_PREVIEW_TOKEN,
  cache: {
    clear: "auto",
    type: "memory",
  },
});
module.exports.getBlog = async function () {
  return await storyblok
    .get(`cdn/spaces/${process.env.STORY_ID_SPACE}`)
    .then(({ data }) => {
      const ctx = "blog";
      const languages = data.space.language_codes;
      if (fs.existsSync(ctx)) fs.rmSync(ctx, { recursive: true });
      languages.unshift("en");
      languages.forEach(async (lang) => {
        const folder = `./${ctx}/${lang}`;
        fs.mkdir(folder, { recursive: true }, (err) => {
          if (err) throw err;
        });
        const { data } = await storyblok.get("cdn/stories", {
          version: "draft",
          starts_with: `${ctx}/`,
          language: lang === "en" ? "" : lang,
        });
        data.stories.forEach((story) => {
          const files =
            story.name.toLowerCase() !== ctx &&
            (() => {
              fs.writeFileSync(
                `${folder}/${story.content.title}.md`,
                story.content.long_text
              );
            })();
          return Boolean(files);
        });
      });
    });
};
