const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\Apps\\Inventory.json';
const content = fs.readFileSync(filePath, 'utf8');

try {
    const data = JSON.parse(content);
    if (data.page && data.page.data && data.page.data.appState) {
        const appStateObj = data.page.data.appState;

        // Join all characters
        const keys = Object.keys(appStateObj).sort((a, b) => parseInt(a) - parseInt(b));
        const appStateString = keys.map(k => appStateObj[k]).join('');

        console.log('Total characters in appStateString:', appStateString.length);

        // Extract Queries using naming convention (q_...)
        const queries = new Set();
        const queryRegex = /"(q_[^"]+)"/g;
        let match;
        while ((match = queryRegex.exec(appStateString)) !== null) {
            queries.add(match[1]);
        }

        console.log('Detected Query Names:', Array.from(queries));

        // Extract widget names
        const widgets = new Set();
        const widgetTypeRegex = /"widgetType","([^"]+)"/g;
        while ((match = widgetTypeRegex.exec(appStateString)) !== null) {
            // Look backwards for the ID if possible, but simpler is to find common widgets
            widgets.add(match[1]);
        }
        console.log('Detected Widget Types:', Array.from(widgets));

        // Save a sample of the reconstructed string for manual inspection if needed
        fs.writeFileSync('reconstructed_appstate.txt', appStateString.substring(0, 10000));
    }
} catch (e) {
    console.error('Processing Error:', e.message);
}
