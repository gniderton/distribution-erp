const fs = require('fs');
const path = require('path');

const f2 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'GNIDERTON ERP.json'), 'utf8'));

const getNavHeaderDetails = (pageName) => {
  const p = (f2.pageList || []).find(x => x.unpublishedPage.name === pageName);
  if (!p) return null;
  
  let navHeaderWidget = null;
  const findWidgets = (dsl) => {
    if (!dsl) return;
    if (dsl.widgetName === 'navHeader') {
      navHeaderWidget = JSON.parse(JSON.stringify(dsl));
      return;
    }
    if (dsl.children) {
      dsl.children.forEach(findWidgets);
    }
  };
  
  if (p.unpublishedPage.layouts && p.unpublishedPage.layouts[0] && p.unpublishedPage.layouts[0].dsl) {
    findWidgets(p.unpublishedPage.layouts[0].dsl);
  }
  return navHeaderWidget;
};

const navInv = getNavHeaderDetails('Inventory');
const navLet = getNavHeaderDetails('Letterhead Editor');

console.log("=== INVENTORY NAVHEADER ===");
console.log(JSON.stringify(navInv, null, 2));

console.log("\n=== LETTERHEAD EDITOR NAVHEADER ===");
console.log(JSON.stringify(navLet, null, 2));
