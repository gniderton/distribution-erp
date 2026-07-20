const fs = require('fs');
const app = JSON.parse(fs.readFileSync('c:\\Users\\user\\Downloads\\Backened\\GNIDERTON ERP.json', 'utf8'));

const pages = app.pageList || [];
console.log('Page structure keys:', Object.keys(pages[0] || {}));
if (pages[0]) {
  console.log('Page subkeys:', Object.keys(pages[0].unpublishedPage || pages[0].publishedPage || {}));
  const details = pages[0].unpublishedPage || pages[0].publishedPage || {};
  console.log('ID:', details.id, 'pageId:', details.pageId);
}

const actions = app.actionList || [];
console.log('Action structure keys:', Object.keys(actions[0] || {}));
if (actions[0]) {
  const unpub = actions[0].unpublishedAction || actions[0].publishedAction || {};
  console.log('Action pageId:', unpub.pageId);
}

const actionCollections = app.actionCollectionList || [];
console.log('ActionCollection structure keys:', Object.keys(actionCollections[0] || {}));
if (actionCollections[0]) {
  const unpub = actionCollections[0].unpublishedCollection || actionCollections[0].publishedCollection || {};
  console.log('ActionCollection pageId:', unpub.pageId);
}
