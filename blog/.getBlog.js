const storyblok = require('../utils/api');
const path = require('path');
require('dotenv').config();
module.exports.getBlog = async function () { 
  const languages = await storyblok.get(`cdn/spaces/${process.env.STORY_ID_SPACE}`)
  languages.data.space.language_codes.unshift('en')
  languages.data.space.language_codes.forEach( async function (lang){ 
      const { data } = await storyblok.get('cdn/stories', {
        starts_with: 'blog/',
        language: lang === 'en' ? '' : lang
      })
     data.stories.map(function(story) {
        const files = story.name.toLowerCase() !== 'blog' ? fs.writeFileSync(`${path.join(__dirname, `/${lang}`)}/${story.name}.md`, story.content.long_text) : ''
        return Boolean(files)
      })
    })
};

