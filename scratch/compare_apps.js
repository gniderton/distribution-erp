const fs = require('fs');
const path = require('path');

const file1Path = path.join(__dirname, '..', 'GNIDERTON ERP Original.json');
const file2Path = path.join(__dirname, '..', 'GNIDERTON ERP.json');

console.log("Reading Original file...");
const f1 = JSON.parse(fs.readFileSync(file1Path, 'utf8'));
console.log("Reading Current file...");
const f2 = JSON.parse(fs.readFileSync(file2Path, 'utf8'));

const getPagesInfo = (appData) => {
  const pages = appData.pageList || [];
  return pages.map(p => {
    const unpub = p.unpublishedPage || {};
    const pageName = unpub.name;
    const widgets = [];
    const collectWidgets = (dsl) => {
      if (!dsl) return;
      widgets.push({
        widgetName: dsl.widgetName,
        type: dsl.type,
        widgetId: dsl.widgetId
      });
      if (dsl.children) {
        dsl.children.forEach(collectWidgets);
      }
    };
    if (unpub.layouts && unpub.layouts[0] && unpub.layouts[0].dsl) {
      collectWidgets(unpub.layouts[0].dsl);
    }
    return { name: pageName, widgets };
  });
};

const pages1 = getPagesInfo(f1);
const pages2 = getPagesInfo(f2);

console.log(`Original version has ${pages1.length} pages.`);
console.log(`Current version has ${pages2.length} pages.`);

const p1Names = pages1.map(p => p.name);
const p2Names = pages2.map(p => p.name);

const missingPages = p1Names.filter(name => !p2Names.includes(name));
const extraPages = p2Names.filter(name => !p1Names.includes(name));

console.log("\n--- Page Level Comparison ---");
console.log("Missing pages in Current (present in Original):", missingPages);
console.log("Extra pages in Current (not in Original):", extraPages);

console.log("\n--- Widget Level Comparison for Common Pages ---");
pages1.forEach(p1 => {
  const p2 = pages2.find(p => p.name === p1.name);
  if (!p2) return;

  const w1Names = p1.widgets.map(w => w.widgetName);
  const w2Names = p2.widgets.map(w => w.widgetName);

  const missingWidgets = w1Names.filter(name => !w2Names.includes(name));
  const extraWidgets = w2Names.filter(name => !w1Names.includes(name));

  if (missingWidgets.length > 0 || extraWidgets.length > 0) {
    console.log(`\nPage: ${p1.name}`);
    if (missingWidgets.length > 0) {
      console.log(`  - Missing widgets (present in Original, missing in Current):`, missingWidgets.map(name => {
        const w = p1.widgets.find(x => x.widgetName === name);
        return `${name} (${w.type})`;
      }));
    }
    if (extraWidgets.length > 0) {
      console.log(`  - Extra widgets (present in Current, missing in Original):`, extraWidgets.map(name => {
        const w = p2.widgets.find(x => x.widgetName === name);
        return `${name} (${w.type})`;
      }));
    }
  }
});
