const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\Apps\\Inventory.json';
const content = fs.readFileSync(filePath, 'utf8');

try {
    const data = JSON.parse(content);
    if (data.page && data.page.data && data.page.data.appState) {
        const appStateObj = data.page.data.appState;
        const keys = Object.keys(appStateObj).sort((a, b) => parseInt(a) - parseInt(b));
        const s = keys.map(k => appStateObj[k]).join('');

        console.log('Total characters:', s.length);

        // Find IDs: "id","name"
        const ids = new Set();
        const idRegex = /"id","([^"]+)"/g;
        let match;
        while ((match = idRegex.exec(s)) !== null) {
            ids.add(match[1]);
        }

        // Find Query types: "type","POST", "type","GET"
        const queryTypes = new Set();
        const typeRegex = /"type","(GET|POST|PUT|DELETE|PATCH)"/g;
        while ((match = typeRegex.exec(s)) !== null) {
            queryTypes.add(match[1]);
        }

        // Find SQL/JS snippets: look for keywords
        const snippets = [];
        const sqlRegex = /"query","(SELECT.*?|INSERT.*?|UPDATE.*?|DELETE.*?)"/gi;
        while ((match = sqlRegex.exec(s)) !== null) {
            snippets.push(match[1]);
        }

        console.log('Components/IDs Found:', Array.from(ids).filter(id => id.length > 2));
        console.log('Query Methods Found:', Array.from(queryTypes));
        console.log('SQL Snippets Found:', snippets.length);

        if (snippets.length > 0) {
            console.log('Sample SQL:', snippets[0].substring(0, 100));
        }

        // Look for JS snippets
        const jsRegex = /"query","([^"]*?return [^"]+?)"/g;
        const jsSnippets = [];
        while ((match = jsRegex.exec(s)) !== null) {
            jsSnippets.push(match[1]);
        }
        console.log('JS Snippets Found:', jsSnippets.length);

    }
} catch (e) {
    console.error('Error:', e.message);
}
