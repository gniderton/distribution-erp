const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\Apps\\Inventory.json';
const content = fs.readFileSync(filePath, 'utf8');

try {
    const data = JSON.parse(content);
    const appStateObj = data.page.data.appState;
    const keys = Object.keys(appStateObj).sort((a, b) => parseInt(a) - parseInt(b));
    const s = keys.map(k => appStateObj[k]).join('');

    const migrationSummary = {
        restQueries: [],
        jsQueries: [],
        importantWidgets: []
    };

    // Find Query blocks
    // In Retool, queries are often objects with "pluginTemplate"
    // Since we joined chars, we look for "id","NAME" and then the following properties
    const queryNames = ['saveGRN', 'submitPO', 'getNextPO', 'PopulateProductsTablebyVendors', 'getBankAccounts', 'getPOs', 'saveGRNJS'];

    queryNames.forEach(name => {
        const index = s.indexOf(`"id","${name}"`);
        if (index !== -1) {
            // Extract a large chunk after the ID to find the query/code
            const chunk = s.substring(index, index + 5000);

            // Try to find the query or code
            const queryMatch = chunk.match(/"query","(.*?)"/);
            const typeMatch = chunk.match(/"type","(.*?)"/);

            migrationSummary.restQueries.push({
                name: name,
                type: typeMatch ? typeMatch[1] : 'Unknown',
                code: queryMatch ? queryMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : 'Code not found in chunk'
            });
        }
    });

    console.log(JSON.stringify(migrationSummary, null, 2));

} catch (e) {
    console.error('Error:', e.message);
}
