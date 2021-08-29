const content = require('../write');
const fs = require('fs');
content('about', 'it', 'md')

if  (fs.existsSync('./data')){
        const data = fs.readFileSync(path.extname('./data'));
        const parsed = JSON.parse(data);
        console.log(parsed)
    }




