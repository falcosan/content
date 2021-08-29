const content = require('../write');
const path = require('path');
const fs = require('fs');
content('about', 'it')
if  (fs.existsSync('./data.json')){
        const data = fs.readFileSync(path.extname('./data.json'));
        const parsed = JSON.parse(data);
        console.log(parsed)
    }




