const fs = require('fs');
const app = JSON.parse(fs.readFileSync('c:\\Users\\user\\Downloads\\Backened\\GNIDERTON ERP.json', 'utf8'));

console.log('--- PAGES WITH CUSTOMER LEDGER ---');

app.pageList.forEach(p => {
  const details = p.unpublishedPage || p.publishedPage || {};
  if (details.name && (details.name.includes('Customer') || details.name.includes('Ledger') || details.name.includes('Report'))) {
    console.log(`Page: ${details.name}`);
  }
});

// Let's search inside actionCollectionList for Customer page ledger actions
if (app.actionCollectionList) {
  app.actionCollectionList.forEach(ac => {
    const coll = ac.unpublishedCollection || ac.publishedCollection || {};
    if (coll.pageId === 'Customer' && coll.body && (coll.body.includes('pdf') || coll.body.includes('ledger') || coll.body.includes('xlsx'))) {
      console.log(`\nJS Object: ${coll.name} on Page Customer:`);
      console.log(coll.body);
    }
  });
}
