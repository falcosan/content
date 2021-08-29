const content = require('../../functions/import');
const path = "about"
const story = "about"
const fileName = 'ciao'
const lang = 'it'
const type = 'md'

module.exports.getContent = function () {
    content(path, story, lang, fileName, type)
  };





