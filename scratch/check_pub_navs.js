const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const tempStr = execSync('git show HEAD:"GNIDERTON ERP.json"', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
const temp = JSON.parse(tempStr);

console.log("--- navHeader in Published Pages of original current ---");
temp.pageList.forEach(p => {
  const name = p.unpublishedPage.name;
  let pubNav = null;
  const findPub = (dsl) => {
    if (!dsl) return;
    if (dsl.widgetName === 'navHeader') pubNav = dsl;
    if (dsl.children) dsl.children.forEach(findPub);
  };
  if (p.publishedPage && p.publishedPage.layouts && p.publishedPage.layouts[0] && p.publishedPage.layouts[0].dsl) {
    findPub(p.publishedPage.layouts[0].dsl);
  }
  console.log(`Page: ${name}, Published navHeader: ${pubNav ? 'FOUND' : 'NOT FOUND'}`);
});
