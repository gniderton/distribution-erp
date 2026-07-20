const fs = require('fs');
const app = JSON.parse(fs.readFileSync('c:\\Users\\user\\Downloads\\Backened\\GNIDERTON ERP.json', 'utf8'));

console.log('--- ALL PAGES IN THE APPSMITH JSON ---');
app.pageList.forEach((p, idx) => {
  const details = p.unpublishedPage || p.publishedPage || {};
  console.log(`${idx + 1}. ${details.name}`);
});
