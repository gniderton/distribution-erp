const fs = require('fs');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\Gniderton_Sales_Application.json';
const data = fs.readFileSync(filePath, 'utf8');

// Search for any JS that mentions pendingOrders
// This might be inside a string like "body":"..." or "query":"..."
const term = 'pendingOrders';
const results = [];

let pos = data.indexOf(term);
while (pos !== -1) {
    const start = Math.max(0, pos - 500);
    const end = Math.min(data.length, pos + 2000);
    results.push(data.substring(start, end));
    pos = data.indexOf(term, pos + 1);
}

fs.writeFileSync('c:\\Users\\user\\Downloads\\Backened\\scratch\\pendingOrders_logic.txt', results.join('\n\n--- NEXT MATCH ---\n\n'));
console.log(`Found ${results.length} matches for pendingOrders.`);
