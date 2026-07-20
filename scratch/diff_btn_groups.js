const fs = require('fs');
const path = require('path');

const f2 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'GNIDERTON ERP.json'), 'utf8'));

const getBtnGroupPageNav = (pageName) => {
  const p = (f2.pageList || []).find(x => x.unpublishedPage.name === pageName);
  if (!p) return null;
  
  let btnGroupWidget = null;
  const findWidgets = (dsl) => {
    if (!dsl) return;
    if (dsl.widgetName === 'btnGroupPageNav') {
      btnGroupWidget = JSON.parse(JSON.stringify(dsl));
      return;
    }
    if (dsl.children) {
      dsl.children.forEach(findWidgets);
    }
  };
  
  if (p.unpublishedPage.layouts && p.unpublishedPage.layouts[0] && p.unpublishedPage.layouts[0].dsl) {
    findWidgets(p.unpublishedPage.layouts[0].dsl);
  }
  return btnGroupWidget;
};

const btnInv = getBtnGroupPageNav('Inventory');
const btnLet = getBtnGroupPageNav('Letterhead Editor');

const diff = {};
const compareObjects = (o1, o2, pathStr = '') => {
  if (!o1 || !o2) {
    diff[pathStr] = { o1, o2 };
    return;
  }
  
  const allKeys = new Set([...Object.keys(o1), ...Object.keys(o2)]);
  allKeys.forEach(k => {
    if (k === 'widgetId' || k === 'parentId') return;
    
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

compareObjects(btnInv, btnLet);
console.log("Differences in btnGroupPageNav properties:");
console.log(JSON.stringify(diff, null, 2));
