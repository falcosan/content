const storyblok = require('../utils/api');
const path = require('path');

const field = 'long_text'
const lang = 'en'
const type = 'md'

module.exports.getArticles = async function () { 
      const { data } = await storyblok.get('cdn/stories', {
        starts_with: 'blog/',
        language: lang === 'en' ? '' : lang
      })
     data.stories.map(function(story) {
        const files = story.name.toLowerCase() !== 'blog' ? fs.writeFileSync(`${path.join(__dirname, `/articles/${lang}`)}/${story.name}.${type}`, story.content[field]) : ''
        return Boolean(files)
      })
};

