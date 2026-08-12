const fs = require('fs');

let content = fs.readFileSync('gniderton-erp-web/src/modules/credit-note/components/CreateCreditNoteModal.tsx', 'utf8');

// 1. Update modal width
content = content.replace('widthClass="max-w-6xl"', 'widthClass="max-w-[95vw] 2xl:max-w-[1600px]"');

// 2. Update table minimum width
content = content.replace('min-w-[1200px]', 'min-w-[1400px]');

// 3. Update column widths
content = content.replace('<th className="px-3 py-3 font-medium w-[80px] text-right">Qty</th>', '<th className="px-3 py-3 font-medium w-[100px] text-right">Qty</th>');
content = content.replace('<th className="px-3 py-3 font-medium w-[80px] text-right">MRP</th>', '<th className="px-3 py-3 font-medium w-[110px] text-right">MRP</th>');
content = content.replace('<th className="px-3 py-3 font-medium w-[90px] text-right">Rate</th>', '<th className="px-3 py-3 font-medium w-[120px] text-right">Rate</th>');
content = content.replace('<th className="px-3 py-3 font-medium w-[90px] text-right">Gross</th>', '<th className="px-3 py-3 font-medium w-[120px] text-right">Gross</th>');
content = content.replace('<th className="px-3 py-3 font-medium w-[80px] text-right">Scheme</th>', '<th className="px-3 py-3 font-medium w-[110px] text-right">Scheme</th>');
content = content.replace('<th className="px-3 py-3 font-medium w-[70px] text-right">Disc %</th>', '<th className="px-3 py-3 font-medium w-[90px] text-right">Disc %</th>');
content = content.replace('<th className="px-3 py-3 font-medium w-[80px] text-right">Disc Amt</th>', '<th className="px-3 py-3 font-medium w-[110px] text-right">Disc Amt</th>');
content = content.replace('<th className="px-3 py-3 font-medium w-[90px] text-right">Taxable</th>', '<th className="px-3 py-3 font-medium w-[120px] text-right">Taxable</th>');
content = content.replace('<th className="px-3 py-3 font-medium w-[60px] text-right">Tax %</th>', '<th className="px-3 py-3 font-medium w-[80px] text-right">Tax %</th>');
content = content.replace('<th className="px-3 py-3 font-medium w-[80px] text-right">Tax Amt</th>', '<th className="px-3 py-3 font-medium w-[110px] text-right">Tax Amt</th>');
content = content.replace('<th className="px-3 py-3 font-medium w-[100px] text-right">Net</th>', '<th className="px-3 py-3 font-medium w-[120px] text-right">Net</th>');

fs.writeFileSync('gniderton-erp-web/src/modules/credit-note/components/CreateCreditNoteModal.tsx', content);
