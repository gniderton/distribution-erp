const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\GNIDERTON ERP.json';

console.log('Loading GNIDERTON ERP.json...');
const app = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const pages = app.pageList || [];
const actions = app.actionList || [];
const actionCollections = app.actionCollectionList || [];

let out = '';
function log(msg) {
    out += msg + '\n';
}

log(`Summary:`);
log(`- Pages: ${pages.length}`);
log(`- Actions (Queries/APIs): ${actions.length}`);
log(`- Action Collections (JS Objects): ${actionCollections.length}`);

// Map pages by ID
const pageMap = {};
pages.forEach(p => {
    const pageDetails = p.unpublishedPage || p.publishedPage || {};
    pageMap[pageDetails.id || p.id] = pageDetails.name || p.name;
});

log('\n--- PAGES ---');
pages.forEach((p, idx) => {
    const pageDetails = p.unpublishedPage || p.publishedPage || {};
    log(`${idx + 1}. Page: ${pageDetails.name} (ID: ${pageDetails.id})`);
});

log('\n--- JS OBJECTS (ACTION COLLECTIONS) ---');
const jsMap = {};
actionCollections.forEach(ac => {
    const unpublished = ac.unpublishedCollection || ac.publishedCollection || {};
    const pageName = pageMap[unpublished.pageId] || unpublished.pageId;
    if (!jsMap[pageName]) jsMap[pageName] = [];
    
    const actionsInColl = unpublished.actions || [];
    const funcs = actionsInColl.map(a => a.name);
    
    jsMap[pageName].push({
        name: unpublished.name,
        funcs: funcs
    });
});

for (const [page, objs] of Object.entries(jsMap)) {
    log(`Page: ${page}`);
    objs.forEach(o => {
        log(`  JS Object: ${o.name}`);
        log(`    Functions: ${o.funcs.join(', ')}`);
    });
}

log('\n--- QUERIES / APIS (ACTIONS) GROUPED BY PAGE ---');
const queryMap = {};
actions.forEach(a => {
    const unpublished = a.unpublishedAction || a.publishedAction || {};
    const pageName = pageMap[unpublished.pageId] || unpublished.pageId;
    if (!queryMap[pageName]) queryMap[pageName] = [];
    
    const ds = unpublished.datasource || {};
    const dsName = ds.name || (ds.datasourceConfiguration ? 'Inline Config' : 'No Datasource');
    
    queryMap[pageName].push({
        name: unpublished.name,
        pluginType: unpublished.pluginType,
        datasource: dsName,
        method: unpublished.actionConfiguration?.httpMethod || '',
        path: unpublished.actionConfiguration?.path || ''
    });
});

for (const [page, qList] of Object.entries(queryMap)) {
    log(`Page: ${page}`);
    qList.forEach(q => {
        log(`  - ${q.name} [Type: ${q.pluginType}] [Datasource: ${q.datasource}] ${q.method ? '[' + q.method + ' ' + q.path + ']' : ''}`);
    });
}

log('\n--- PAGE WIDGETS SUMMARY ---');
pages.forEach(p => {
    const pageDetails = p.unpublishedPage || p.publishedPage || {};
    const layouts = pageDetails.layouts || [];
    log(`Page: ${pageDetails.name}`);
    layouts.forEach(l => {
        const rootWidget = l.widgetDsl || {};
        const widgetSummary = [];
        
        function traverseWidgets(w) {
            if (!w) return;
            if (w.type && w.type !== 'CANVAS_WIDGET') {
                widgetSummary.push({
                    name: w.widgetName,
                    type: w.type
                });
            }
            if (w.children) {
                w.children.forEach(traverseWidgets);
            }
        }
        
        traverseWidgets(rootWidget);
        
        const typeCount = {};
        widgetSummary.forEach(w => {
            typeCount[w.type] = (typeCount[w.type] || 0) + 1;
        });
        
        log(`  Widgets counts: ${JSON.stringify(typeCount, null, 2)}`);
    });
});

fs.writeFileSync('appsmith_analysis.txt', out, 'utf8');
console.log('Analysis written successfully.');
