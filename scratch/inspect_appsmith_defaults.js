const fs = require('fs');
const path = require('path');

const file2Path = path.join(__dirname, '..', 'GNIDERTON ERP.json');
const f2 = JSON.parse(fs.readFileSync(file2Path, 'utf8'));

console.log("--- Default Pages in pageList ---");
f2.pageList.forEach(p => {
  const name = p.unpublishedPage.name;
  const unpubDefault = p.unpublishedPage.isDefault;
  const pubDefault = p.publishedPage ? p.publishedPage.isDefault : undefined;
  if (unpubDefault || pubDefault) {
    console.log(`Page: ${name}, unpublishedPage.isDefault: ${unpubDefault}, publishedPage.isDefault: ${pubDefault}`);
  }
});

console.log("\n--- Default Pages in exportedApplication.pages ---");
if (f2.exportedApplication && f2.exportedApplication.pages) {
  f2.exportedApplication.pages.forEach(p => {
    if (p.isDefault) {
      console.log(`Page in exportedApplication.pages: id=${p.id}, isDefault=${p.isDefault}`);
    }
  });
}

console.log("\n--- navHeader Visibility Check ---");
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
    console.log(`Page: ${name}, navHeader.isVisible: "${navHeaderWidget.isVisible}"`);
  } else {
    console.log(`Page: ${name}, navHeader NOT FOUND`);
  }
});
