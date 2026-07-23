const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'gniderton-erp-web', 'src', 'modules', 'inventory', 'InventoryPage.tsx');

let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/<table className="text-left text-xs divide-y divide-border-subtle">/g, '<table className="w-full text-left text-xs divide-y divide-border-subtle">');

fs.writeFileSync(filePath, content, 'utf8');

console.log('Update successful!');
