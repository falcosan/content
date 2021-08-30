const storyblok = require('../functions/import');
const path = require('path');
const lang = 'it'

module.exports.getArticles = async function (type = 'md') { 
      const { data } = await storyblok.get('cdn/stories', {
        starts_with: 'blog/',
        language: lang
      })
     data.stories.map(function(story) {
        const files = story.name.toLowerCase() !== 'blog' ? fs.writeFileSync(`${path.join(__dirname, '/articles')}/${story.name}.${type}`, story.content.long_text) : ''
        return Boolean(files)
      })
};

