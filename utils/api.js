
const StoryblokClient = require('storyblok-js-client')
require('dotenv').config();

module.exports = storyblok = new StoryblokClient({
    accessToken: process.env.STORY_PREVIEW_TOKEN,
    cache: {
      clear: 'auto',
      type: 'memory'
    }
  })



