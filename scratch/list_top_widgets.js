const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const tempStr = execSync('git show HEAD:"GNIDERTON ERP.json"', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
const temp = JSON.parse(fb = tempStr);

const p = temp.pageList.find(x => x.unpublishedPage.name === 'Inventory');
const dsl = p.unpublishedPage.layouts[0].dsl;

const listTopRowWidgets = (w) => {
  if (!w) return;
  if (w.widgetName !== 'MainContainer' && w.widgetName !== 'navHeader') {
    if (w.topRow !== undefined && w.topRow < 10) {
      console.log(`Widget: ${w.widgetName} (${w.type}), topRow: ${w.topRow}, bottomRow: ${w.bottomRow}`);
    }
  }
  if (w.children) {
    w.children.forEach(listTopRowWidgets);
  }
};

listTopRowWidgets(dsl);
