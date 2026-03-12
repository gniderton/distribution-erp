const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\Apps\\Inventory.json';
const content = fs.readFileSync(filePath, 'utf8');

try {
    const data = JSON.parse(content);
    console.log('Top level keys:', Object.keys(data));

    // Check common Retool export locations
    if (data.data) {
        console.log('data keys:', Object.keys(data.data));
        if (data.data.app) {
            console.log('data.app keys:', Object.keys(data.data.app));
        }
    }

} catch (e) {
    console.error('JSON Parse Error:', e.message);
}
