const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'GNIDERTON ERP.json');
const f2 = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log("--- navHeader Position Inspection (Unpublished vs Published) ---");
f2.pageList.forEach(p => {
  const name = p.unpublishedPage.name;
  
  let unpubNav = null;
  const findUnpub = (dsl) => {
    if (!dsl) return;
    if (dsl.widgetName === 'navHeader') unpubNav = dsl;
    if (dsl.children) dsl.children.forEach(findUnpub);
  };
  if (p.unpublishedPage.layouts && p.unpublishedPage.layouts[0] && p.unpublishedPage.layouts[0].dsl) {
    findUnpub(p.unpublishedPage.layouts[0].dsl);
  }
  
  let pubNav = null;
  const findPub = (dsl) => {
    if (!dsl) return;
    if (dsl.widgetName === 'navHeader') pubNav = dsl;
    if (dsl.children) dsl.children.forEach(findPub);
  };
  if (p.publishedPage && p.publishedPage.layouts && p.publishedPage.layouts[0] && p.publishedPage.layouts[0].dsl) {
    findPub(p.publishedPage.layouts[0].dsl);
  }
  
  console.log(`Page: ${name}`);
  if (unpubNav) {
    console.log(`  Unpublished: topRow=${unpubNav.topRow}, bottomRow=${unpubNav.bottomRow}`);
  } else {
    console.log(`  Unpublished: NOT FOUND`);
  }
  if (pubNav) {
    console.log(`  Published:   topRow=${pubNav.topRow}, bottomRow=${pubNav.bottomRow}`);
  } else {
    console.log(`  Published:   NOT FOUND`);
  }
});
