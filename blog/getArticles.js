const storyblok = require('../functions/import');
const path = require('path');
const filter = ''
const lang = 'it'

module.exports.getArticles = async function (type = 'md') { 
      const { data } = await storyblok.get('cdn/stories', {
        starts_with: 'blog/',
        filter_query: {
          title: {
            like: `*${filter}*`
          }
        },
        language: lang
      })
      const content = data.stories[0].content.long_text
      fs.writeFileSync(`${path.join(__dirname, '/articles')}/${data.stories[0].name}.${type}`, content)
};

