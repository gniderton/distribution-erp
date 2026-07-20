const fs = require('fs');
const path = require('path');

const file2Path = path.join(__dirname, '..', 'GNIDERTON ERP.json');
const f2 = JSON.parse(fs.readFileSync(file2Path, 'utf8'));

console.log("exportedApplication.pages:");
console.log(JSON.stringify(f2.exportedApplication.pages, null, 2));
