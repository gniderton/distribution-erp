const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\Apps\\Inventory.json';
const content = fs.readFileSync(filePath, 'utf8');

try {
    const data = JSON.parse(content);
    if (data.page && data.page.data && data.page.data.appState) {
        const appState = data.page.data.appState;
        console.log('appState[0]:', appState['0']);
        console.log('appState[1]:', appState['1']);
        console.log('appState[2]:', appState['2']);
        console.log('appState[3]:', appState['3']);
        console.log('appState[4]:', appState['4']);
    }
} catch (e) {
    console.error('JSON Parse Error:', e.message);
}
