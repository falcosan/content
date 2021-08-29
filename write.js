const fs = require('fs');
require('dotenv').config();

const StoryblokClient = require('storyblok-js-client')
const Storyblok = new StoryblokClient({
    accessToken: process.env.NUXT_ENV_PREVIEW_TOKEN,
    cache: {
      clear: 'auto',
      type: 'memory'
    }
  })
module.exports = 
async function content(path, lang, content, type = 'json') { 
      const { data } = await Storyblok.get(`cdn/stories/${path}`, {
        language: lang
      })
      const story = data.story.content
      fs.writeFileSync(`./${path}/data.${type}`, JSON.stringify(content ? story[content] : story))
 }

