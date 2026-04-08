const fs = require('fs');
const { parseAxisCSV } = require('./utils/bankParser');

const csvPath = 'c:/Users/user/Downloads/Backened/Account_Statement_Report_04-04-2026_1158hrs.CSV';
const content =fs.readFileSync(csvPath, 'utf8');

console.log("--- STARTING DEEP AXIS DEBUG ---");

function debugParseAxisCSV(content) {
    const lines = content.split('\n');
    const entries = [];
    let startParsing = false;
    let colMap = { date: 1, particulars: 3, debit: 4, credit: 5 }; 

    for (let line of lines) {
        const upperLine = line.toUpperCase();
        if (upperLine.includes('TRANSACTION DATE') && upperLine.includes('PARTICULARS')) {
            startParsing = true;
            colMap = {}; 
            const headers = line.split(',');
            console.log("HEADER FOUND AT LINE:", line);
            headers.forEach((h, idx) => {
                const name = h.toUpperCase().trim();
                console.log(`  Col ${idx}: [${name}]`);
                if (name.includes('TRANSACTION DATE')) colMap.date = idx;
                if (name.includes('PARTICULARS')) colMap.particulars = idx;
                if (name.includes('DEBIT')) colMap.debit = idx;
                if (name.includes('CREDIT')) colMap.credit = idx;
                if (name.includes('AMOUNT')) colMap.amount = idx;
                if (name.includes('TYPE') || name.includes('DEBIT/CREDIT')) colMap.type = idx;
            });
            console.log("FINAL COL MAP:", colMap);
            continue;
        }

        if (!startParsing || !line.trim()) continue;
        if (upperLine.includes('TRANSACTION TOTAL') || upperLine.includes('CLOSING BALANCE')) {
            console.log("STOPPING AT END MARKER:", line);
            break;
        }
        if (upperLine.includes('OPENING BALANCE')) continue;

        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        console.log(`\nRow Line: ${line.substring(0, 30)}...`);
        console.log(`  Parts Length: ${parts.length}`);
        
        const date = parts[colMap.date];
        const particulars = parts[colMap.particulars];
        
        console.log(`  Extracted: Date=[${date}], Partic=[${particulars?.substring(0,20)}]`);

        let debit = 0;
        let credit = 0;
        const cleanVal = (val) => parseFloat(String(val).replace(/"/g, '').replace(/[\t\s,]/g, '').trim()) || 0;

        if (colMap.debit !== undefined && colMap.credit !== undefined) {
            debit = cleanVal(parts[colMap.debit]);
            credit = cleanVal(parts[colMap.credit]);
            console.log(`  Two-Col Logic: Deb=${debit}, Cred=${credit}`);
        } else if (colMap.amount !== undefined && colMap.type !== undefined) {
            const val = cleanVal(parts[colMap.amount]);
            const type = parts[colMap.type]?.toUpperCase() || '';
            if (type.includes('CR')) credit = val;
            else if (type.includes('DR')) debit = val;
            console.log(`  Single-Col Logic: Val=${val}, Type=[${type}] -> Deb=${debit}, Cred=${credit}`);
        }

        if ((debit > 0 || credit > 0) && date && particulars) {
            console.log("  >>> SUCCESS: ENTRY ADDED!");
            entries.push({ date, debit, credit });
        } else {
            console.log(`  >>> FAILED: ${!date ? 'No Date' : !particulars ? 'No Particulars' : 'No Amount'}`);
        }
    }
    return entries;
}

debugParseAxisCSV(content);
