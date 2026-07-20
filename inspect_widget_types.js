const fs = require('fs');
const app = JSON.parse(fs.readFileSync('c:\\Users\\user\\Downloads\\Backened\\GNIDERTON ERP.json', 'utf8'));

const types = new Set();
app.pageList.forEach(p => {
  const pageDetails = p.unpublishedPage || p.publishedPage || {};
  const layouts = pageDetails.layouts || [];
  layouts.forEach(l => {
    function traverse(w) {
      if (!w) return;
      if (w.type) types.add(w.type);
      if (w.children) w.children.forEach(traverse);
    }
    traverse(l.widgetDsl);
  });
});

console.log('All widget types:', Array.from(types));
