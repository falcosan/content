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
module.exports.content = async function (path, lang, type = 'md', content) { 
      const { data } = await Storyblok.get(`cdn/stories/${path}`, {
        language: lang
      })
      const story = data.story.content
      fs.writeFileSync(`./data/${path}/_data.${type}`, JSON.stringify(content ? story[content] : story))
 }

