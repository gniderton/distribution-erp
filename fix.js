const fs = require('fs');
const files = ['CreateEntityModal.tsx', 'CreateLoanModal.tsx', 'EmiEntryModal.tsx'];
const dir = 'C:/Users/user/Downloads/Backened/gniderton-erp-web/src/modules/loan/components/';

files.forEach(f => {
  let content = fs.readFileSync(dir + f, 'utf8');
  content = content.replace(/import \{ Input \} from '@\/components\/ui\/Input'/g, 'import { Input, Label } from \'@/components/ui/Input\'');
  
  // Replace opening tags
  content = content.replace(/<(Input|Select|Textarea)\s+label="([^"]+)"([^>]*)>/g, (match, tag, label, rest) => {
    return '<div><Label>' + label + '</Label><' + tag + ' ' + rest + '>';
  });
  
  // Replace closing tags
  content = content.replace(/<\/Select>/g, '</Select></div>');
  content = content.replace(/<Input([^>]*)\/>/g, (match) => {
    if(match.includes('<Label>')) return match; 
    return match + '</div>';
  });
  content = content.replace(/<Textarea([^>]*)\/>/g, (match) => {
    if(match.includes('<Label>')) return match; 
    return match + '</div>';
  });
  
  content = content.replace(/helpText="([^"]+)"/g, '');

  fs.writeFileSync(dir + f, content);
});

console.log('Fixed labels.');
