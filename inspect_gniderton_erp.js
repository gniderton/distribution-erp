const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\GNIDERTON ERP.json';

console.log('Loading file...');
const content = fs.readFileSync(filePath, 'utf8');
console.log('Parsing JSON...');
const app = JSON.parse(content);

console.log('Top-level keys:', Object.keys(app));

// Check if appsmith structure
if (app.page || app.pages) {
    const pages = app.pages || [app.page];
    console.log(`Found ${pages.length} pages:`);
    pages.forEach((p, idx) => {
        console.log(`Page ${idx + 1}: ${p.name || p.id}`);
    });
} else if (app.unpublishedPage || app.publishedPage) {
    console.log('Appsmith single page structure detected');
} else if (app.applicationPages) {
    console.log(`Found ${app.applicationPages.length} application pages:`);
    app.applicationPages.forEach((p, idx) => {
        console.log(`Page ${idx + 1}: ${p.name || p.id}`);
    });
} else if (app.deletableEmail) {
    // maybe it is a different format?
} else {
    // print some nested keys of first few levels
    console.log('Root keys details:');
    for (const key of Object.keys(app)) {
        if (typeof app[key] === 'object' && app[key] !== null) {
            console.log(`  ${key}: keys = [${Object.keys(app[key]).slice(0, 10).join(', ')}] (isArray: ${Array.isArray(app[key])})`);
        } else {
            console.log(`  ${key}: ${app[key]}`);
        }
    }
}
