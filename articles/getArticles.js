const storyblok = require('../functions/import');
const filter = 'Storyblok webhooks'
const lang = 'it'

module.exports.getArticles = async function (path, type = 'md') { 
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
      fs.writeFileSync(`./${path}/${data.stories[0].name}.${type}`, content)
};

