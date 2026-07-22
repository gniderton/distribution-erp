const fs = require('fs');
const layouts = JSON.parse(fs.readFileSync('items_layout.json', 'utf8'));

function printWidgets(widgets, depth = 0) {
  let list = [];
  widgets.forEach(w => {
    let extra = '';
    if (w.type === 'BUTTON_WIDGET') extra = ` [Text: ${w.text}]`;
    if (w.type === 'TEXT_WIDGET') extra = ` [Text: ${w.text}]`;
    list.push('  '.repeat(depth) + w.type + ': ' + w.widgetName + extra);
    if (w.children) {
      list = list.concat(printWidgets(w.children, depth + 1));
    }
  });
  return list;
}

if (layouts.length > 0 && layouts[0].dsl) {
  const dsl = layouts[0].dsl;
  const widgetList = printWidgets(dsl.children || []);
  console.log(widgetList.join('\n'));
}
