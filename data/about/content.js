const content = require('../../functions/import');
const fs = require('fs');
if  (!fs.existsSync('./data')){
    content('about', 'it', 'md')
    }




