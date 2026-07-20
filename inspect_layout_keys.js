const fs = require('fs');
const app = JSON.parse(fs.readFileSync('c:\\Users\\user\\Downloads\\Backened\\GNIDERTON ERP.json', 'utf8'));

const page = app.pageList[0];
const details = page.unpublishedPage || page.publishedPage || {};
const layouts = details.layouts || [];
console.log('Layouts count:', layouts.length);
if (layouts[0]) {
  console.log('Layout keys:', Object.keys(layouts[0]));
}
