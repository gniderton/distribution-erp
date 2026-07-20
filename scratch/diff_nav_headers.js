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

// Compare the properties of navInv and navLet
const diff = {};
const compareObjects = (o1, o2, pathStr = '') => {
  if (!o1 || !o2) {
    diff[pathStr] = { o1, o2 };
    return;
  }
  
  const allKeys = new Set([...Object.keys(o1), ...Object.keys(o2)]);
  allKeys.forEach(k => {
    // Ignore children array because their order or IDs might differ, we'll check children names/types instead
    if (k === 'children' || k === 'widgetId' || k === 'parentId') return;
    
    const v1 = o1[k];
    const v2 = o2[k];
    
    if (typeof v1 !== typeof v2) {
      diff[pathStr + '.' + k] = { v1, v2 };
    } else if (typeof v1 === 'object' && v1 !== null) {
      compareObjects(v1, v2, pathStr + '.' + k);
    } else if (v1 !== v2) {
      diff[pathStr + '.' + k] = { v1, v2 };
    }
  });
};

compareObjects(navInv, navLet);
console.log("Differences between Inventory and Letterhead Editor navHeader properties (ignoring widgetId, parentId, children array structure):");
console.log(JSON.stringify(diff, null, 2));

// Also compare the child widgets names and types
const getChildrenSummary = (nav) => {
  if (!nav || !nav.children || !nav.children[0] || !nav.children[0].children) return [];
  return nav.children[0].children.map(c => ({ name: c.widgetName, type: c.type, topRow: c.topRow, bottomRow: c.bottomRow, leftColumn: c.leftColumn, rightColumn: c.rightColumn }));
};

console.log("\nChildren of Inventory navHeader:");
console.log(getChildrenSummary(navInv));
console.log("\nChildren of Letterhead Editor navHeader:");
console.log(getChildrenSummary(navLet));
