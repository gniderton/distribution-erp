const fs = require('fs');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\Gniderton_Sales_Application.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let appState = data.page.data.appState;

// If appState is a string, it might be escaped JSON or Transit.
// In newer Retool exports, it's often a stringified array/object.
if (typeof appState === 'string') {
    try {
        // Some Retool exports have a weird transit prefix like ["~#iR", ...]
        // We'll try to just parse it as JSON first.
        appState = JSON.parse(appState);
    } catch (e) {
        console.log("Could not parse appState as JSON directly.");
    }
}

const results = {};

function extractLogic(obj) {
    if (typeof obj === 'object' && obj !== null) {
        // Look for the "pluginTemplate" or "query" pattern
        // In the JSON I saw: "id","getBrands",...,"datasource",...,"template",...
        
        // Retool Mobile often uses "pluginTemplate"
        if (obj.n === 'pluginTemplate' && obj.v) {
            const v = obj.v;
            const id = v.id;
            const template = v.template || (v.template && v.template.v) || {};
            const query = template.query || template.funcBody;
            if (id && query) {
                results[id] = query;
            }
        }
        
        // General search for 'query' or 'funcBody'
        if (obj.query || obj.funcBody) {
             const id = obj.id || "unknown_" + Math.random();
             results[id] = obj.query || obj.funcBody;
        }

        for (const key in obj) {
            if (typeof obj[key] === 'object') {
                extractLogic(obj[key]);
            }
        }
    } else if (Array.isArray(obj)) {
        obj.forEach(extractLogic);
    }
}

extractLogic(appState);

const outputPath = 'c:\\Users\\user\\Downloads\\Backened\\extracted_retool_logic.txt';
let outputText = '';
for (const id in results) {
    outputText += `--- ${id} ---\n${typeof results[id] === 'string' ? results[id] : JSON.stringify(results[id], null, 2)}\n\n`;
}

fs.writeFileSync(outputPath, outputText);
console.log(`Extracted ${Object.keys(results).length} logic blocks.`);
