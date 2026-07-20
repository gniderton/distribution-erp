const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const originalPath = path.join(__dirname, '..', 'GNIDERTON ERP Original.json');
const currentPath = path.join(__dirname, '..', 'GNIDERTON ERP.json');

const countThemeBindings = (appData) => {
  let count = 0;
  const inspectWidget = (w) => {
    if (!w) return;
    const props = ['buttonColor', 'borderRadius', 'boxShadow', 'backgroundColor', 'borderColor', 'textColor', 'accentColor'];
    props.forEach(p => {
      if (typeof w[p] === 'string' && w[p].includes('appsmith.store.theme')) {
        count++;
      }
    });
    if (w.children) {
      w.children.forEach(inspectWidget);
    }
  };
  
  (appData.pageList || []).forEach(p => {
    if (p.unpublishedPage.layouts && p.unpublishedPage.layouts[0] && p.unpublishedPage.layouts[0].dsl) {
      inspectWidget(p.unpublishedPage.layouts[0].dsl);
    }
  });
  return count;
};

const original = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'));

// Fetch temp via git show in node directly from git database
const tempStr = execSync('git show HEAD:"GNIDERTON ERP.json"', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
const temp = JSON.parse(tempStr);

console.log("Number of theme bindings in Original:", countThemeBindings(original));
console.log("Number of theme bindings in Merged Current:", countThemeBindings(current));
console.log("Number of theme bindings in Original Current (before merge):", countThemeBindings(temp));
