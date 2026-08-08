const fs = require('fs');

const uiDir = 'C:/Users/user/Downloads/Backened/gniderton-erp-web/src/modules/loan/components/';
const page = 'C:/Users/user/Downloads/Backened/gniderton-erp-web/src/modules/loan/LoanPage.tsx';

// Fix LoanPage.tsx
let pageContent = fs.readFileSync(page, 'utf8');
pageContent = pageContent.replace(/@\/components\/layout\/PageHeader/g, '@/components/shared/PageHeader');
fs.writeFileSync(page, pageContent);

// Fix UI components
const files = ['LoanEntitiesTable.tsx', 'LoansTable.tsx', 'LedgerModal.tsx', 'CreateEntityModal.tsx', 'CreateLoanModal.tsx', 'EmiEntryModal.tsx'];

files.forEach(f => {
  const file = uiDir + f;
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  
  // Fix DataTable import
  content = content.replace(/@\/components\/ui\/DataTable/g, '@/components/shared/DataTable');
  
  // Remove Textarea import
  content = content.replace(/import \{ Textarea \} from '@\/components\/ui\/Textarea'\n/g, '');
  
  // Replace <Textarea ... /> with <textarea className="..." ... />
  content = content.replace(/<Textarea([^>]*)\/>/g, '<textarea className="w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 outline-none" $1 />');

  // Fix Select import if it's missing (wait, I already put it in ui/Input)
  content = content.replace(/import \{ Select \} from '@\/components\/ui\/Select'/g, 'import { Select } from \'@/components/ui/Input\'');

  fs.writeFileSync(file, content);
});

console.log('Fixed imports and Textarea.');
