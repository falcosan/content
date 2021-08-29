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
module.exports = async function content (path, story, lang, fileName, type = 'md') { 
      const { data } = await Storyblok.get('cdn/stories', {
        starts_with: `${story}/`,
        language: lang
      })
      const content = JSON.stringify(data)
      fs.writeFileSync(`./data/${path}/${fileName}.${type}`, content)
 }

