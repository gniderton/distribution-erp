const fs = require('fs');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\GNIDERTON ERP.json';
const app = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const pages = app.pageList || [];
const actions = app.actionList || [];
const actionCollections = app.actionCollectionList || [];

// Find "Debit Notes" page
const dnPage = pages.find(p => {
    const details = p.unpublishedPage || p.publishedPage || {};
    return (details.name === 'Debit Notes' || details.name === 'Debit Note');
});

if (!dnPage) {
    console.log("Could not find Debit Notes page!");
    process.exit(1);
}

const pageName = (dnPage.unpublishedPage || dnPage.publishedPage).name;

console.log('=== DEBIT NOTES APPSMITH DETAILS ===\n');

// Extract Action Collections (JS)
console.log('--- JS OBJECTS (ACTION COLLECTIONS) ---');
actionCollections.forEach(ac => {
    const unpublished = ac.unpublishedCollection || ac.publishedCollection || {};
    if (unpublished.pageId === pageName) {
        console.log(`\nJS Object: ${unpublished.name}`);
        const variables = unpublished.variables || [];
        if (variables.length > 0) {
            console.log(`  Variables: ${JSON.stringify(variables)}`);
        }
        
        console.log(`  Body (Logic):`);
        console.log(`----------------------------------------`);
        console.log(unpublished.body);
        console.log(`----------------------------------------`);
    }
});

// Extract Queries / APIs
console.log('\n--- QUERIES / APIS ---');
actions.forEach(a => {
    const unpublished = a.unpublishedAction || a.publishedAction || {};
    if (unpublished.pageId === pageName) {
        console.log(`\nQuery: ${unpublished.name}`);
        console.log(`  Plugin Type: ${unpublished.pluginType}`);
        const conf = unpublished.actionConfiguration || {};
        if (conf.body) {
            console.log(`  Body / SQL:`);
            console.log(`----------------------------------------`);
            console.log(conf.body);
            console.log(`----------------------------------------`);
        }
        if (conf.path) {
            console.log(`  Path: ${conf.path}`);
        }
    }
});

// Extract Widgets
console.log('\n--- WIDGETS ---');
const layouts = (dnPage.unpublishedPage || dnPage.publishedPage).layouts || [];
layouts.forEach(l => {
    const rootWidget = l.widgetDsl || {};
    
    function traverseWidgets(w, indent) {
        if (!w) return;
        if (w.type && w.type !== 'CANVAS_WIDGET') {
            console.log(`${indent}- [${w.type}] ${w.widgetName}`);
            if (w.type === 'SELECT_WIDGET' || w.type === 'DROP_DOWN_WIDGET') {
                console.log(`${indent}  Options:`, w.options || w.sourceData);
                if (w.onOptionChange) console.log(`${indent}  onOptionChange:`, w.onOptionChange);
            }
            if (w.type === 'BUTTON_WIDGET' || w.type === 'ICON_BUTTON_WIDGET') {
                if (w.onClick) console.log(`${indent}  onClick:`, w.onClick);
            }
            if (w.type === 'TABLE_WIDGET' || w.type === 'TABLE_WIDGET_V2') {
                if (w.tableData) console.log(`${indent}  tableData (snippet):`, w.tableData.substring(0, 50) + '...');
                if (w.onRowSelected) console.log(`${indent}  onRowSelected:`, w.onRowSelected);
            }
            if (w.type === 'INPUT_WIDGET' || w.type === 'INPUT_WIDGET_V2' || w.type === 'CURRENCY_INPUT_WIDGET') {
                if (w.onTextChanged) console.log(`${indent}  onTextChanged:`, w.onTextChanged);
            }
        }
        if (w.children) {
            w.children.forEach(c => traverseWidgets(c, indent + '  '));
        }
    }
    
    traverseWidgets(rootWidget, '');
});
