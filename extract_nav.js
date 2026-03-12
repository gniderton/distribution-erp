const fs = require('fs');
const path = require('path');

const appsDir = 'c:\\Users\\user\\Downloads\\Backened\\Apps';
const files = fs.readdirSync(appsDir).filter(f => f.endsWith('.json'));

const results = [];

files.forEach(file => {
    const filePath = path.join(appsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    try {
        const appName = file.replace('.json', '');
        const labels = new Set();

        const patterns = [
            /\\?"_labels\\?",\[(?:\\?"\^A\\?",)?\[(.*?)]]/g,
            /\\?"_viewKeys\\?",\[(?:\\?"\^A\\?",)?\[(.*?)]]/g,
            /\\?"_values\\?",\[(?:\\?"\^A\\?",)?\[(.*?)]]/g
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const inner = match[1];
                const items = inner.match(/\\?"(.*?)\\?"/g);
                if (items) {
                    items.forEach(i => {
                        const val = i.replace(/\\?"/g, '');
                        if (val && val !== '^A' && !val.includes('tabbedContainer') && !val.startsWith('var') && !val.startsWith('query')) {
                            if (val.length > 2 && !val.match(/^[a-z]+[0-9]+$/)) {
                                labels.add(val);
                            }
                        }
                    });
                }
            }
        });

        const filteredLabels = Array.from(labels).filter(val => {
            if (val.toLowerCase().includes('tab ') || val.toLowerCase().includes('view ')) return false;
            if (val.toLowerCase().includes('option ')) return false;
            if (val.includes('{{') || val.includes('\\') || val.includes('\n')) return false;
            if (val.length > 30) return false;
            // Filter out obviously internal keys
            if (val.startsWith('_') || val.includes('.')) return false;
            return true;
        });

        let uuid = null;
        try {
            const json = JSON.parse(content);
            if (json.uuid) uuid = json.uuid;
            else if (json.data && json.data.app && json.data.app.uuid) uuid = json.data.app.uuid;
            else if (json.data && json.data.uuid) uuid = json.data.uuid;
        } catch (e) {
            const uuidMatch = content.match(/"uuid"\s*:\s*"([^"]+)"/);
            if (uuidMatch) uuid = uuidMatch[1];
        }

        if (filteredLabels.length > 0) {
            results.push({
                app: appName.replace(/_/g, ' '),
                id: uuid || appName,
                tabs: filteredLabels
            });
        }
    } catch (e) {
        console.error(`Error processing ${file}: ${e.message}`);
    }
});

console.log(JSON.stringify(results, null, 2));
