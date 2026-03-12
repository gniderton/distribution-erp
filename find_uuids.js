const fs = require('fs');
const path = require('path');

const appsDir = 'c:\\Users\\user\\Downloads\\Backened\\Apps';
const files = fs.readdirSync(appsDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
    const filePath = path.join(appsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    try {
        const json = JSON.parse(content);
        let uuid = null;
        if (json.uuid) uuid = json.uuid;
        else if (json.data && json.data.app && json.data.app.uuid) uuid = json.data.app.uuid;
        else if (json.data && json.data.uuid) uuid = json.data.uuid;

        console.log(`${file}: ${uuid}`);
    } catch (e) {
        // Fallback for non-standard JSON or large files
        const uuidMatch = content.match(/"uuid"\s*:\s*"([^"]+)"/);
        if (uuidMatch) {
            console.log(`${file}: ${uuidMatch[1]}`);
        } else {
            console.log(`${file}: Not found`);
        }
    }
});
