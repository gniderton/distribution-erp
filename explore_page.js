const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\Apps\\Inventory.json';
const content = fs.readFileSync(filePath, 'utf8');

try {
    const data = JSON.parse(content);
    if (data.page) {
        console.log('page keys:', Object.keys(data.page));
        if (data.page.data) {
            console.log('page.data keys:', Object.keys(data.page.data));
        }
    }
} catch (e) {
    console.error('JSON Parse Error:', e.message);
}
