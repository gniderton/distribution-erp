const fs = require('fs');
const app = JSON.parse(fs.readFileSync('c:\\Users\\user\\Downloads\\Backened\\GNIDERTON ERP.json', 'utf8'));

console.log('--- SEARCHING FOR LEDGER PDF DOWNLOAD LOGIC ---');

if (app.actionCollectionList) {
  app.actionCollectionList.forEach(ac => {
    const coll = ac.unpublishedCollection || ac.publishedCollection || {};
    if (coll.body && (coll.body.includes('pdf') || coll.body.includes('Ledger') || coll.body.includes('PDF'))) {
      console.log(`JS Object: ${coll.name} (Page: ${coll.pageId})`);
      if (coll.body.includes('PDF') || coll.body.includes('pdf') || coll.body.includes('doc.text')) {
        console.log(coll.body.substring(0, 1000));
        console.log('====================================\n');
      }
    }
  });
}
