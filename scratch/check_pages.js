const fs = require('fs');
const path = require('path');

const f1 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'GNIDERTON ERP Original.json'), 'utf8'));
const f2 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'GNIDERTON ERP.json'), 'utf8'));

const names1 = (f1.pageList || []).map(p => p.unpublishedPage.name);
const names2 = (f2.pageList || []).map(p => p.unpublishedPage.name);

console.log("Pages in Original:", names1);
console.log("Pages in Current:", names2);
