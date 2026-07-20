const fs = require('fs');
const app = JSON.parse(fs.readFileSync('c:\\Users\\user\\Downloads\\Backened\\GNIDERTON ERP.json', 'utf8'));

const inventoryPage = app.pageList.find(p => {
  const details = p.unpublishedPage || p.publishedPage || {};
  return details.name === 'Inventory';
});

if (!inventoryPage) {
  console.log('Inventory page not found.');
  process.exit(1);
}

const details = inventoryPage.unpublishedPage || inventoryPage.publishedPage || {};
const layouts = details.layouts || [];
const dsl = layouts[0]?.dsl || {};

let out = '--- WIDGET TREE FOR INVENTORY PAGE ---\n';

function traverse(w, depth = 0) {
  if (!w) return;
  
  const indent = '  '.repeat(depth);
  const info = {
    name: w.widgetName,
    type: w.type,
    text: w.text || w.label || '',
    events: []
  };

  for (const k of Object.keys(w)) {
    if (k.startsWith('on') && w[k]) {
      info.events.push(`${k}: ${JSON.stringify(w[k]).slice(0, 150)}`);
    }
  }

  out += `${indent}- ${w.name} [Type: ${w.type}] ${w.text ? '(Label: "' + w.text + '")' : ''}\n`;
  info.events.forEach(e => {
    out += `${indent}    * Event -> ${e}\n`;
  });

  if (w.children) {
    w.children.forEach(c => traverse(c, depth + 1));
  }
}

traverse(dsl);
fs.writeFileSync('inventory_widgets_list.txt', out, 'utf8');
console.log('Done writing.');
