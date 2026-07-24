const fs = require('fs');
const data = JSON.parse(fs.readFileSync('cheque_page.json', 'utf8'));
const widgets = [];
function extract(node) {
    if (Array.isArray(node)) {
        node.forEach(extract);
    } else if (typeof node === 'object' && node !== null) {
        if (node.widgetName && node.type) {
            widgets.push({
                name: node.widgetName,
                type: node.type,
                text: node.text || '',
                label: node.label || ''
            });
        }
        for (const key in node) {
            extract(node[key]);
        }
    }
}
extract(data);
fs.writeFileSync('cheque_widgets.txt', widgets.map(w => `${w.name} (${w.type}) - text/label: ${w.text}${w.label}`).join('\n'));
