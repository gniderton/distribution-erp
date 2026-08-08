const fs = require('fs');
const files = ['CreateEntityModal.tsx', 'CreateLoanModal.tsx', 'EmiEntryModal.tsx'];
const dir = 'C:/Users/user/Downloads/Backened/gniderton-erp-web/src/modules/loan/components/';

files.forEach(f => {
  let content = fs.readFileSync(dir + f, 'utf8');
  
  // For any <Input ... /> or <textarea ... /> that lacks a following </div> (accounting for whitespace/newlines)
  // we add </div>.
  // Actually, since all Inputs and textareas with <Label> preceding them were missing </div>, 
  // let's just do a regex replace on the closing of those tags.
  content = content.replace(/(<(Input|textarea)[\s\S]*?\/>)\s*(?!(<\/div>))/g, '$1</div>\n        ');

  fs.writeFileSync(dir + f, content);
});

console.log('Fixed div closures');
