const fs = require('fs');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\Gniderton_Sales_Application.json';
const data = fs.readFileSync(filePath, 'utf8');

const term = 'Clear All \\"LocalStorage\\"';
const pos = data.indexOf(term);
if (pos !== -1) {
    const start = Math.max(0, pos - 2000);
    const end = Math.min(data.length, pos + 1000);
    console.log(data.substring(start, end));
} else {
    console.log("Not found");
}
