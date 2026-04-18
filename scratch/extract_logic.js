const fs = require('fs');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\Gniderton_Sales_Application.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const results = {};

function extractLogic(obj) {
    if (typeof obj === 'object' && obj !== null) {
        if (obj.id && (obj.query || obj.funcBody)) {
            const name = obj.id;
            const logic = obj.query || obj.funcBody;
            results[name] = logic;
        }
        for (const key in obj) {
            extractLogic(obj[key]);
        }
    } else if (Array.isArray(obj)) {
        obj.forEach(extractLogic);
    }
}

extractLogic(data);

const outputPath = 'c:\\Users\\user\\Downloads\\Backened\\extracted_retool_logic.txt';
let outputText = '';
for (const name in results) {
    outputText += `--- ${name} ---\n${results[name]}\n\n`;
}

fs.writeFileSync(outputPath, outputText);
console.log(`Extracted ${Object.keys(results).length} logic blocks.`);
