const content = require('../../write');
const fs = require('fs');
if  (!fs.existsSync('./data')){
    content('about', 'it', 'md')
    }




