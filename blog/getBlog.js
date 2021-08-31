const field = 'long_text'

module.exports.getBlog = async function () { 
const storyblok = require('../utils/api');
const path = require('path');
require('dotenv').config();
  const languages = await storyblok.get(`cdn/spaces/${process.env.STORYBLOK_ID_SPACE}`)
  languages.data.space.language_codes.forEach( async function (lang){ 
      const { data } = await storyblok.get('cdn/stories', {
        starts_with: 'blog/',
        language: lang
      })
     data.stories.map(function(story) {
        const files = story.name.toLowerCase() !== 'blog' ? fs.writeFileSync(`${path.join(__dirname, `/articles/${lang}`)}/${story.name}.md`, story.content[field]) : ''
        return Boolean(files)
      })
    })
};

