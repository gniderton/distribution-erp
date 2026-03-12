const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\Apps\\Inventory.json';
const content = fs.readFileSync(filePath, 'utf8');

try {
    const data = JSON.parse(content);
    const appStateObj = data.page.data.appState;
    const keys = Object.keys(appStateObj).sort((a, b) => parseInt(a) - parseInt(b));
    const s = keys.map(k => appStateObj[k]).join('');

    const targetScripts = ['PopulateProductsTablebyVendors', 'saveGRNJS', 'saveGRN', 'submitPO', 'transformerPreparePO'];
    const results = {};

    targetScripts.forEach(name => {
        const index = s.indexOf(`"id","${name}"`);
        if (index !== -1) {
            // Find "query","..." pattern specifically for this ID
            const chunk = s.substring(index, index + 35000); // 35kb chunk to be safe for long scripts
            const match = chunk.match(/"query","((?:\\"|[^"])*?)"/);
            if (match) {
                let code = match[1]
                    .replace(/\\"/g, '"')
                    .replace(/\\\\n/g, '\n')
                    .replace(/\\n/g, '\n')
                    .replace(/\\r/g, '')
                    .replace(/\\\\/g, '\\');
                results[name] = code;
            }
        }
    });

    console.log(JSON.stringify(results, null, 2));

} catch (e) {
    console.error('Error:', e.message);
}
