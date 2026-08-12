const fs = require('fs');

let c = fs.readFileSync('gniderton-erp-web/src/modules/credit-note/utils/pdfGenerator.ts', 'utf8');

c = c.replace(/\\`/g, '`');
c = c.replace(/\\\$/g, '$');
c = c.replace(/\\\\n/g, '\\n');

fs.writeFileSync('gniderton-erp-web/src/modules/credit-note/utils/pdfGenerator.ts', c);
