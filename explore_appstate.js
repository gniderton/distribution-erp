const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\Apps\\Inventory.json';
const content = fs.readFileSync(filePath, 'utf8');

try {
    const data = JSON.parse(content);
    if (data.page && data.page.data && data.page.data.appState) {
        const appState = data.page.data.appState;
        console.log('appState keys:', Object.keys(appState));

        // Retool often has 'plugins' or 'components' here
        // But appState itself might be a large object with 'plugins' inside it
        // Let's check for plugins
        if (appState.plugins) {
            console.log('Found plugins:', Object.keys(appState.plugins).length);
        }
    }
} catch (e) {
    console.error('JSON Parse Error:', e.message);
}
