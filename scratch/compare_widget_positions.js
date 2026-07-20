const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const originalPath = path.join(__dirname, '..', 'GNIDERTON ERP Original.json');
const original = JSON.parse(fs.readFileSync(originalPath, 'utf8'));

const tempStr = execSync('git show HEAD:"GNIDERTON ERP.json"', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
const current = JSON.parse(tempStr);

original.pageList.forEach(op => {
  const name = op.unpublishedPage.name;
  const cp = current.pageList.find(x => x.unpublishedPage.name === name);
  if (!cp) return;
  
  // Find a widget that is in both (excluding navHeader)
  const getWidgetTops = (dsl) => {
    const map = {};
    const traverse = (w) => {
      if (!w) return;
      if (w.widgetName !== 'MainContainer' && w.widgetName !== 'navHeader') {
        if (w.topRow !== undefined) {
          map[w.widgetName] = w.topRow;
        }
      }
      if (w.children) w.children.forEach(traverse);
    };
    traverse(dsl);
    return map;
  };
  
  const oTops = getWidgetTops(op.unpublishedPage.layouts[0].dsl);
  const cTops = getWidgetTops(cp.unpublishedPage.layouts[0].dsl);
  
  // Compare tops of 3 widgets
  console.log(`Page: ${name}`);
  let count = 0;
  for (let key in oTops) {
    if (cTops[key] !== undefined) {
      console.log(`  Widget: ${key}, Original topRow: ${oTops[key]}, Current topRow: ${cTops[key]}, Diff: ${cTops[key] - oTops[key]}`);
      count++;
      if (count >= 3) break;
    }
  }
});
