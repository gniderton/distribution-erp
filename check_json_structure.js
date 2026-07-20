const fs = require('fs');
const app = JSON.parse(fs.readFileSync('c:\\Users\\user\\Downloads\\Backened\\GNIDERTON ERP.json', 'utf8'));

console.log('Keys of root JSON object:', Object.keys(app));

// Find details about the Sales Order page
const page = app.pageList.find(p => {
  const details = p.unpublishedPage || p.publishedPage || {};
  return details.name === 'Sales Order';
});

if (page) {
  const details = page.unpublishedPage || page.publishedPage || {};
  console.log('Sales Order page ID:', details.id);
}

// Let's search in app.actionList or if there are other keys
const actionList = app.actionList || [];
console.log('ActionList length:', actionList.length);
if (actionList.length > 0) {
  console.log('First action structure:', Object.keys(actionList[0]));
  const unpub = actionList[0].unpublishedAction || actionList[0].publishedAction || {};
  console.log('First action details:', {
    name: unpub.name,
    pageId: unpub.pageId,
    pluginType: unpub.pluginType
  });
}
