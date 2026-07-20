const fs = require('fs');
const app = JSON.parse(fs.readFileSync('c:\\Users\\user\\Downloads\\Backened\\GNIDERTON ERP.json', 'utf8'));

const page = app.pageList.find(p => {
  const details = p.unpublishedPage || p.publishedPage || {};
  return details.name === 'Sales Order';
});

const details = page.unpublishedPage || page.publishedPage || {};
const dsl = details.layouts[0]?.dsl || {};

let allocationModal = null;

function findModal(w) {
  if (!w) return;
  if (w.widgetName === 'modalStockAllocation') {
    allocationModal = w;
    return;
  }
  if (w.children) {
    w.children.forEach(findModal);
  }
}

findModal(dsl);

if (!allocationModal) {
  console.log('modalStockAllocation not found.');
  process.exit(0);
}

console.log('--- ALL WIDGETS INSIDE modalStockAllocation ---');
function printChildren(w, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}- Name: ${w.widgetName}, Type: ${w.type}, Label/Text: "${w.text || w.label || ''}"`);
  if (w.children) {
    w.children.forEach(c => printChildren(c, depth + 1));
  }
}

printChildren(allocationModal);
