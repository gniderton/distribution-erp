const fs = require('fs');
const data = fs.readFileSync('Gniderton_Sales_Application.json', 'utf8');
const ids = [...data.matchAll(/\\\\\"id\\\\\"\,\\\\\"([A-Za-z0-9_]+)\\\\\"/g)].map(m => m[1]);
console.log([...new Set(ids)].slice(0, 50));
