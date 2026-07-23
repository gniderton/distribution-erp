const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'gniderton-erp-web', 'src', 'modules', 'inventory', 'InventoryPage.tsx');

let content = fs.readFileSync(filePath, 'utf8');

// Replace >${ with >₹{ (for TSX children)
content = content.replace(/>\$\{/g, '>₹{');

// Replace "Net ($)" with "Net (₹)" etc
content = content.replace(/\(\$\)/g, '(₹)');

// Replace  ${Number  (sometimes there's whitespace)
content = content.replace(/>\s*\$\{Number/g, '>₹{Number');

// For the GRN and PO tables, remove w-full from table to prevent stretching
content = content.replace(/<table className="w-full text-left text-xs divide-y divide-border-subtle min-w-max">/g, '<table className="text-left text-xs divide-y divide-border-subtle min-w-max">');

// There might be another table for PO that doesn't have min-w-max yet
content = content.replace(/<table className="w-full text-left text-xs divide-y divide-border-subtle">/g, '<table className="text-left text-xs divide-y divide-border-subtle">');

// Reduce min-w values to smaller defaults to make it less bulky
content = content.replace(/min-w-\[180px\]/g, 'min-w-[140px]');
content = content.replace(/min-w-\[70px\]/g, 'min-w-[60px]');
content = content.replace(/min-w-\[80px\]/g, 'min-w-[60px]');
content = content.replace(/min-w-\[90px\]/g, 'min-w-[70px]');
content = content.replace(/min-w-\[100px\]/g, 'min-w-[80px]');
content = content.replace(/min-w-\[110px\]/g, 'min-w-[90px]');
content = content.replace(/min-w-\[120px\]/g, 'min-w-[100px]');

fs.writeFileSync(filePath, content, 'utf8');

console.log('Update successful!');
