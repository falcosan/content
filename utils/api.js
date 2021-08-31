
const StoryblokClient = require('storyblok-js-client')
require('dotenv').config();

module.exports = storyblok = new StoryblokClient({
    accessToken: process.env.NUXT_ENV_PREVIEW_TOKEN,
    cache: {
      clear: 'auto',
      type: 'memory'
    }
  })



