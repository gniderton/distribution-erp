const fs = require('fs');
const bp = JSON.parse(fs.readFileSync('invoice_blueprint.json', 'utf8'));
let out = '## PAGE: ' + bp.name + '\n\n';

out += '--- WIDGETS ---\n';
function parseWidget(w, depth=0) {
  const pad = '  '.repeat(depth);
  if (!w) return;
  out += pad + '- ' + w.type + ': ' + w.widgetName;
  if (w.text) out += ' (text: "' + w.text + '")';
  if (w.options) out += ' (options: ' + JSON.stringify(w.options) + ')';
  if (w.onClick) out += ' [onClick: ' + w.onClick + ']';
  out += '\n';
  
  if (w.type === 'TABLE_WIDGET_V2') {
     const cols = w.primaryColumns || {};
     Object.values(cols).forEach(col => {
        out += pad + '  * Column: ' + col.alias + ' (type: ' + col.columnType + ')\n';
        if (col.computedValue) out += pad + '    Value: ' + col.computedValue + '\n';
        if (col.onClick) out += pad + '    onClick: ' + col.onClick + '\n';
     });
  }
  
  if (w.children) {
    w.children.forEach(c => parseWidget(c, depth+1));
  }
}
parseWidget(bp.widgets);

out += '\n--- QUERIES ---\n';
bp.queries.forEach(q => {
  out += '- ' + q.name + ' [' + q.method + ' ' + q.path + ']\n';
  if (q.body) {
     const bodyStr = typeof q.body === 'string' ? q.body : JSON.stringify(q.body);
     out += '  Body: ' + bodyStr.replace(/\n/g, '\\n') + '\n';
  }
});

out += '\n--- JS OBJECTS ---\n';
bp.jsObjects.forEach(js => {
  out += '- ' + js.name + '\n';
  out += js.body + '\n\n';
});

fs.writeFileSync('invoice_blueprint.txt', out);
