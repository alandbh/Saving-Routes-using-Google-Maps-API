const fs = require('fs');
fs.writeFileSync('./js/config.js', `API_KEY=${process.env.API_KEY}\n`);