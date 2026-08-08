const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:/Users/user/Downloads/New folder (8)/TRIP-26-07-18-0521/GNIDERTON ERP.json', 'utf8'));
const loanPage = data.pageList.find(p => p.unpublishedPage?.name === 'Loan');

if (!loanPage) {
  console.log("Loan page not found");
  process.exit(1);
}

const pageId = loanPage.unpublishedPage.id;
console.log("Loan Page ID:", pageId);

const widgets = [];
function traverse(node) {
  if (!node) return;
  widgets.push({ type: node.type, name: node.widgetName, text: node.text, label: node.label });
  if (node.children) {
    node.children.forEach(traverse);
  }
}
const dsl = loanPage.unpublishedPage.layouts[0].dsl;
traverse(dsl);

console.log("\n--- Widgets ---");
widgets.filter(w => ['TABS_WIDGET', 'TABLE_WIDGET', 'TABLE_WIDGET_V2', 'MODAL_WIDGET', 'BUTTON_WIDGET', 'FORM_WIDGET', 'TEXT_WIDGET'].includes(w.type) || w.name.toLowerCase().includes('loan') || w.name.toLowerCase().includes('entity')).forEach(w => console.log(`${w.type}: ${w.name} - ${w.text || w.label || ''}`));

console.log("\n--- Actions ---");
const actions = data.actionList.filter(a => a.unpublishedAction?.pageId === pageId);
actions.forEach(a => {
  const act = a.unpublishedAction;
  console.log(`Action: ${act.name}`);
  console.log(`Plugin: ${act.pluginType}`);
  if (act.actionConfiguration) {
    console.log(`Method: ${act.actionConfiguration.httpMethod || ''}`);
    console.log(`Path: ${act.actionConfiguration.path || act.actionConfiguration.body || ''}`);
  }
  console.log('---');
});
