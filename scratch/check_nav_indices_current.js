const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'GNIDERTON ERP.json');
const f2 = JSON.parse(fs.readFileSync(filePath, 'utf8'));

f2.pageList.forEach(p => {
  const name = p.unpublishedPage.name;
  const dsl = p.unpublishedPage.layouts && p.unpublishedPage.layouts[0] && p.unpublishedPage.layouts[0].dsl;
  if (dsl && dsl.children) {
    const index = dsl.children.findIndex(c => c.widgetName === 'navHeader');
    console.log(`Page: ${name}, navHeader index in children: ${index} of ${dsl.children.length}`);
  }
});
