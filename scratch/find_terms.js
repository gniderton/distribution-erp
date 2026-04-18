const fs = require('fs');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\Gniderton_Sales_Application.json';
const data = fs.readFileSync(filePath, 'utf8');

const terms = ['Bulk', 'Post', 'Submit', 'jsSave', 'apiCreate', 'pendingOrders'];
const results = [];

terms.forEach(term => {
    const regex = new RegExp(`"id":"[^"]*${term}[^"]*"`, 'gi');
    let match;
    while ((match = regex.exec(data)) !== null) {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(data.length, match.index + 1000);
        results.push(data.substring(start, end));
    }
});

fs.writeFileSync('c:\\Users\\user\\Downloads\\Backened\\scratch\\term_matches.txt', results.join('\n\n--- NEXT MATCH ---\n\n'));
console.log(`Found ${results.length} matches.`);
