const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const tempStr = execSync('git show HEAD:"GNIDERTON ERP.json"', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
const temp = JSON.parse(tempStr);

temp.pageList.forEach(p => {
  const name = p.unpublishedPage.name;
  let navHeader = null;
  const findNav = (dsl) => {
    if (!dsl) return;
    if (dsl.widgetName === 'navHeader') navHeader = dsl;
    if (dsl.children) dsl.children.forEach(findNav);
  };
  if (p.unpublishedPage.layouts && p.unpublishedPage.layouts[0] && p.unpublishedPage.layouts[0].dsl) {
    findNav(p.unpublishedPage.layouts[0].dsl);
  }
  if (navHeader) {
    console.log(`Page: ${name}, navHeader parentId: "${navHeader.parentId}"`);
  }
});
