const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'GNIDERTON ERP.json');
const f2 = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log("--- navHeader Position Inspection ---");
f2.pageList.forEach(p => {
  const name = p.unpublishedPage.name;
  let navHeaderWidget = null;
  const findWidgets = (dsl) => {
    if (!dsl) return;
    if (dsl.widgetName === 'navHeader') {
      navHeaderWidget = dsl;
    }
    if (dsl.children) {
      dsl.children.forEach(findWidgets);
    }
  };
  if (p.unpublishedPage.layouts && p.unpublishedPage.layouts[0] && p.unpublishedPage.layouts[0].dsl) {
    findWidgets(p.unpublishedPage.layouts[0].dsl);
  }
  if (navHeaderWidget) {
    console.log(`Page: ${name}, topRow: ${navHeaderWidget.topRow}, bottomRow: ${navHeaderWidget.bottomRow}`);
  } else {
    console.log(`Page: ${name}, navHeader NOT FOUND`);
  }
});
