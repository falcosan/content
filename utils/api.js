
const StoryblokClient = require('storyblok-js-client')
require('dotenv').config();

const storyblok = new StoryblokClient({
    accessToken: process.env.STORY_PREVIEW_TOKEN,
    cache: {
      clear: 'auto',
      type: 'memory'
    }
  })
  module.exports.getBlog = async function () {
    const ctx = 'blog'
    const languages = await storyblok.get(`cdn/spaces/${process.env.STORY_ID_SPACE}`)
    languages.data.space.language_codes.unshift('en')
    languages.data.space.language_codes.forEach( async function (lang){ 
        const { data } = await storyblok.get('cdn/stories', {
          version: 'draft',
          starts_with: `${ctx}/`,
          language: lang === 'en' ? '' : lang
        })
       data.stories.map(function(story) {
          const files = story.name.toLowerCase() !== ctx ? fs.writeFileSync(`./${ctx}/${lang}/${story.content.title}.md`, story.content.long_text) : ''
          return Boolean(files)
        })
      })
  };



