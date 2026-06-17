const fs = require('fs');

const filePath = 'c:\\Users\\user\\Downloads\\Backened\\GNIDERTON ERP.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Search actionList for CN_Helper actions
const actions = data.actionList.filter(act => {
    const name = act.unpublishedAction.fullyQualifiedName || '';
    return name.startsWith('CN_Helper.');
});

console.log(`Found ${actions.length} actions for CN_Helper:`);
actions.forEach(act => {
    console.log(`Name: ${act.unpublishedAction.fullyQualifiedName}`);
    console.log(`Keys in unpublishedAction:`, Object.keys(act.unpublishedAction));
    if (act.unpublishedAction.actionConfiguration) {
        console.log(`actionConfiguration keys:`, Object.keys(act.unpublishedAction.actionConfiguration));
        console.log(`body:`, act.unpublishedAction.actionConfiguration.body);
    }
});
