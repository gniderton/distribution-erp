const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const tempStr = execSync('git show HEAD:"GNIDERTON ERP.json"', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
const temp = JSON.parse(tempStr);

temp.pageList.forEach(p => {
  const name = p.unpublishedPage.name;
  const dsl = p.unpublishedPage.layouts && p.unpublishedPage.layouts[0] && p.unpublishedPage.layouts[0].dsl;
  if (dsl && dsl.children) {
    const index = dsl.children.findIndex(c => c.widgetName === 'navHeader');
    console.log(`Page: ${name}, navHeader index in children: ${index} of ${dsl.children.length}`);
  }
});
