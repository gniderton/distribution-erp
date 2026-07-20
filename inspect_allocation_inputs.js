const fs = require('fs');
const app = JSON.parse(fs.readFileSync('c:\\Users\\user\\Downloads\\Backened\\GNIDERTON ERP.json', 'utf8'));

const page = app.pageList.find(p => p.unpublishedPage?.name === 'Sales Order' || p.publishedPage?.name === 'Sales Order');
const details = page.unpublishedPage || page.publishedPage || {};
const dsl = details.layouts[0]?.dsl || {};

function findWidget(w, name) {
  if (!w) return null;
  if (w.widgetName === name) return w;
  if (w.children) {
    for (const c of w.children) {
      const found = findWidget(c, name);
      if (found) return found;
    }
  }
  return null;
}

const input1 = findWidget(dsl, 'Input1');
const input2 = findWidget(dsl, 'Input2');

console.log('--- INPUT 1 DETAILS ---');
console.log(JSON.stringify(input1, null, 2));

console.log('\n--- INPUT 2 DETAILS ---');
console.log(JSON.stringify(input2, null, 2));
