const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'GNIDERTON ERP.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let tableWidgets = [];

function searchDSL(node, pageName) {
    if (!node) return;
    if (node.type === 'TABLE_WIDGET_V2') {
        tableWidgets.push({ pageName, widgetName: node.widgetName, node });
    }
    if (node.children) {
        node.children.forEach(child => searchDSL(child, pageName));
    }
}

if (data.pageList) {
    data.pageList.forEach(p => {
        if (p.unpublishedPage.layouts) {
            p.unpublishedPage.layouts.forEach(l => searchDSL(l.dsl, p.unpublishedPage.name));
        }
    });
}

console.log(`Found ${tableWidgets.length} Table widgets.`);

tableWidgets.forEach(t => {
    console.log(`\nTable: "${t.widgetName}" on Page: "${t.pageName}"`);
    if (t.node.primaryColumns) {
        Object.keys(t.node.primaryColumns).forEach(colKey => {
            const col = t.node.primaryColumns[colKey];
            const hasStaticBg = col.cellBackground && !col.cellBackground.includes('appsmith.store');
            const hasStaticText = col.textColor && !col.textColor.includes('appsmith.store');
            if (hasStaticBg || hasStaticText) {
                console.log(`  Column: "${col.id}" (Type: ${col.columnType})`);
                if (hasStaticBg) console.log(`    cellBackground: "${col.cellBackground}"`);
                if (hasStaticText) console.log(`    textColor: "${col.textColor}"`);
            }
        });
    }
});
