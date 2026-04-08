const fs = require('fs');
const { parseAxisCSV } = require('./utils/bankParser');

const csvPath = 'c:/Users/user/Downloads/Backened/Account_Statement_Report_04-04-2026_1158hrs.CSV';
const content = fs.readFileSync(csvPath, 'utf8');

console.log("--- TESTING AXIS PARSER ---");
console.log("File Length:", content.length);

try {
    const entries = parseAxisCSV(content);
    console.log("Found Entries:", entries.length);
    if (entries.length > 0) {
        console.log("First Entry Sample:", JSON.stringify(entries[0], null, 2));
    } else {
        console.log("ERROR: No entries found. Checking logic...");
        // Debugging loop
        const lines = content.split('\n');
        let headerFound = false;
        lines.forEach((line, i) => {
            const upper = line.toUpperCase();
            if (upper.includes('TRANSACTION DATE') && upper.includes('PARTICULARS')) {
                headerFound = true;
                console.log(`Line ${i+1} identified as HEADER:`, line);
            }
        });
        if (!headerFound) console.log("CRITICAL: Header was NEVER found!");
    }
} catch (e) {
    console.error("Parser Crashed:", e);
}
