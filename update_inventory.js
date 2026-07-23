const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'gniderton-erp-web', 'src', 'modules', 'inventory', 'InventoryPage.tsx');

let content = fs.readFileSync(filePath, 'utf8');

// Replace $ with ₹, but ignore ${
content = content.replace(/\$(?!\{)/g, '₹');

// Also update the GRN table widths to make it a bit tighter
content = content.replace(/<th className="px-4 py-2 min-w-\[200px\]">Item Name<\/th>/, '<th className="px-4 py-2 min-w-[180px]">Item Name</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[80px\]">MRP<\/th>/, '<th className="px-4 py-2 min-w-[70px]">MRP</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[100px\]">Rate<\/th>/, '<th className="px-4 py-2 min-w-[80px]">Rate</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[100px\]">Inward Qty<\/th>/, '<th className="px-4 py-2 min-w-[80px]">Inward Qty</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[100px\]">Gross ₹<\/th>/, '<th className="px-4 py-2 min-w-[80px]">Gross ₹</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[100px\]">Scheme<\/th>/, '<th className="px-4 py-2 min-w-[80px]">Scheme</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[80px\]">Disc %<\/th>/, '<th className="px-4 py-2 min-w-[60px]">Disc %</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[100px\]">Disc\. ₹<\/th>/, '<th className="px-4 py-2 min-w-[80px]">Disc. ₹</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[120px\]">Taxable ₹<\/th>/, '<th className="px-4 py-2 min-w-[90px]">Taxable ₹</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[80px\]">Tax %<\/th>/, '<th className="px-4 py-2 min-w-[60px]">Tax %</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[100px\]">Tax ₹<\/th>/, '<th className="px-4 py-2 min-w-[80px]">Tax ₹</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[150px\]">Batch No<\/th>/, '<th className="px-4 py-2 min-w-[100px]">Batch No</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[150px\]">Expiry<\/th>/, '<th className="px-4 py-2 min-w-[120px]">Expiry</th>');
content = content.replace(/<th className="px-4 py-2 min-w-\[120px\] text-right">Net ₹<\/th>/, '<th className="px-4 py-2 min-w-[90px] text-right">Net ₹</th>');

fs.writeFileSync(filePath, content, 'utf8');

console.log('Update successful!');
