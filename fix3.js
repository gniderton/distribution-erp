const fs = require('fs');

// Fix routes.tsx
const routesPath = 'C:/Users/user/Downloads/Backened/gniderton-erp-web/src/app/routes.tsx';
let routes = fs.readFileSync(routesPath, 'utf8');
routes = routes.replace(/import LoanPage from '([^']+)'/, 'import { LoanPage } from \'$1\'');
fs.writeFileSync(routesPath, routes);

// Fix TS errors in components
const dir = 'C:/Users/user/Downloads/Backened/gniderton-erp-web/src/modules/loan/components/';
const files = ['LedgerModal.tsx', 'LoanEntitiesTable.tsx', 'LoansTable.tsx'];

files.forEach(f => {
  const file = dir + f;
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/import \{ ColumnDef \} from '@tanstack\/react-table'/g, 'import type { ColumnDef } from \'@tanstack/react-table\'');
  
  content = content.replace(/<Badge variant="success"/g, '<Badge tone="success"');
  content = content.replace(/<Badge variant="outline"/g, '<Badge tone="neutral"');
  content = content.replace(/<Badge variant="secondary"/g, '<Badge tone="neutral"');
  
  content = content.replace(/variant=\{isActive \? 'success' : 'secondary'\}/g, 'tone={isActive ? \'success\' : \'neutral\'}');
  content = content.replace(/variant=\{row\.original\.is_active \? 'success' : 'secondary'\}/g, 'tone={row.original.is_active ? \'success\' : \'neutral\'}');

  fs.writeFileSync(file, content);
});

console.log('Fixed typescript issues.');
