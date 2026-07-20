const fs = require('fs');
const path = require('path');

const file1Path = path.join(__dirname, '..', 'GNIDERTON ERP Original.json');
const file2Path = path.join(__dirname, '..', 'GNIDERTON ERP.json');

console.log("Reading Original file...");
const f1 = JSON.parse(fs.readFileSync(file1Path, 'utf8'));
console.log("Reading Current file...");
const f2 = JSON.parse(fs.readFileSync(file2Path, 'utf8'));

// Actions comparison
const actions1 = f1.actionList || [];
const actions2 = f2.actionList || [];

const a1Names = actions1.map(a => a.unpublishedAction.name);
const a2Names = actions2.map(a => a.unpublishedAction.name);

const missingActions = a1Names.filter(name => !a2Names.includes(name));
console.log(`\nMissing Actions count: ${missingActions.length}`);
if (missingActions.length > 0) {
  console.log("Missing Actions list:", missingActions);
}

// Action Collections (JS Objects) comparison
const colls1 = f1.actionCollectionList || [];
const colls2 = f2.actionCollectionList || [];

const c1Names = colls1.map(c => c.unpublishedCollection.name);
const c2Names = colls2.map(c => c.unpublishedCollection.name);

const missingColls = c1Names.filter(name => !c2Names.includes(name));
console.log(`\nMissing Action Collections (JS Objects) count: ${missingColls.length}`);
if (missingColls.length > 0) {
  console.log("Missing Action Collections list:", missingColls);
}
