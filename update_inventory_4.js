const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'gniderton-erp-web', 'src', 'modules', 'inventory', 'InventoryPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update the GRN table to table-fixed to respect widths
content = content.replace(
  /<table className="text-left text-xs divide-y divide-border-subtle min-w-max">/,
  '<table className="text-left text-xs divide-y divide-border-subtle table-fixed w-[1200px]">'
);

// Freeze Item Name TH and set explicit widths
content = content.replace(
  /<th className="px-4 py-2 min-w-\[140px\]">Item Name<\/th>/,
  '<th className="px-4 py-2 w-[200px] sticky left-0 bg-surface z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Item Name</th>'
);
content = content.replace(/<th className="px-4 py-2 min-w-\[60px\]">MRP<\/th>/, '<th className="px-4 py-2 w-[70px]">MRP</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[60px\]">Rate<\/th>/, '<th className="px-4 py-2 w-[80px]">Rate</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[60px\]">Inward Qty<\/th>/, '<th className="px-4 py-2 w-[80px]">Inward Qty</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[60px\]">Gross ₹<\/th>/, '<th className="px-4 py-2 w-[80px]">Gross ₹</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[60px\]">Scheme<\/th>/, '<th className="px-4 py-2 w-[70px]">Scheme</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[60px\]">Disc %<\/th>/, '<th className="px-4 py-2 w-[70px]">Disc %</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[60px\]">Disc\. ₹<\/th>/, '<th className="px-4 py-2 w-[70px]">Disc. ₹</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[70px\]">Taxable ₹<\/th>/, '<th className="px-4 py-2 w-[90px]">Taxable ₹</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[60px\]">Tax %<\/th>/, '<th className="px-4 py-2 w-[60px]">Tax %</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[60px\]">Tax ₹<\/th>/, '<th className="px-4 py-2 w-[70px]">Tax ₹</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[80px\]">Batch No<\/th>/, '<th className="px-4 py-2 w-[110px]">Batch No</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[100px\]">Expiry<\/th>/, '<th className="px-4 py-2 w-[110px]">Expiry</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[70px\] text-right">Net ₹<\/th>/, '<th className="px-4 py-2 w-[90px] text-right">Net ₹</th>');

// Freeze Item Name TD
content = content.replace(
  /<td className="px-4 py-2">\s*<span className="font-semibold block">\{line\.product_name\}<\/span>\s*<span className="text-\[10px\] text-ink-500 font-mono">\{line\.ean_code\}<\/span>\s*<\/td>/g,
  '<td className="px-4 py-2 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">\n                            <span className="font-semibold block truncate">{line.product_name}</span>\n                            <span className="text-[10px] text-ink-500 font-mono truncate">{line.ean_code}</span>\n                          </td>'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
