const fs = require('fs');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\Gniderton_Sales_Application.json';
const data = fs.readFileSync(filePath, 'utf8');

// Use regex to find block of "id":"somethingSync" and surrounding content
const regex = /"id":"[^"]*Sync[^"]*","[^"]*":/gi;
let match;
const matches = [];

while ((match = regex.exec(data)) !== null) {
    // Extract a bit of context around the match
    const start = Math.max(0, match.index - 200);
    const end = Math.min(data.length, match.index + 2000);
    matches.push(data.substring(start, end));
}

fs.writeFileSync('c:\\Users\\user\\Downloads\\Backened\\scratch\\sync_matches.txt', matches.join('\n\n--- NEXT MATCH ---\n\n'));
console.log(`Found ${matches.length} matches for Sync.`);
