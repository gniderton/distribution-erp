const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const tempStr = execSync('git show HEAD:"GNIDERTON ERP.json"', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
const temp = JSON.parse(tempStr);

temp.pageList.forEach(p => {
  const name = p.unpublishedPage.name;
  let minTopRow = Infinity;
  
  const inspectWidget = (w) => {
    if (!w) return;
    if (w.widgetName !== 'MainContainer' && w.widgetName !== 'navHeader') {
      if (w.topRow !== undefined && w.topRow < minTopRow) {
        minTopRow = w.topRow;
      }
    }
    if (w.children) {
      w.children.forEach(inspectWidget);
    }
  };
  
  if (p.unpublishedPage.layouts && p.unpublishedPage.layouts[0] && p.unpublishedPage.layouts[0].dsl) {
    inspectWidget(p.unpublishedPage.layouts[0].dsl);
  }
  console.log(`Page: ${name}, Min topRow of non-MainContainer/navHeader widgets: ${minTopRow}`);
});
