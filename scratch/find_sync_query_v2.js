const fs = require('fs');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\Gniderton_Sales_Application.json';
const data = fs.readFileSync(filePath, 'utf8');

const term = 'Day closed. All data transferred to office';
const pos = data.indexOf(term);
if (pos !== -1) {
    // Find the nearest "id":"..." to the left
    const leftPart = data.substring(0, pos);
    const idPos = leftPart.lastIndexOf('"id":"');
    const idEnd = leftPart.indexOf('"', idPos + 6);
    const id = leftPart.substring(idPos + 6, idEnd);
    
    console.log("ID:", id);
    const start = Math.max(0, pos - 3000);
    const end = Math.min(data.length, pos + 1000);
    console.log(data.substring(start, end));
} else {
    console.log("Not found");
}
