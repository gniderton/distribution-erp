const fs = require('fs');
const { parseAxisCSV } = require('./utils/bankParser');

const csvPath = 'c:/Users/user/Downloads/Backened/Account_Statement_Report_04-04-2026_1158hrs.CSV';
const content =fs.readFileSync(csvPath, 'utf8');

console.log("--- FINAL PRODUCTION TEST ---");
try {
    const entries = parseAxisCSV(content);
    console.log("Found Entries:", entries.length);
    if (entries.length >= 2) {
        console.log("SUCCESS: Found all Axis entries!");
        console.log("First Entry Sample:", JSON.stringify(entries[0], null, 2));
    } else {
        console.log("FAILED: Still not finding entries. something else is wrong.");
    }
} catch (e) {
    console.error("CRITICAL ERROR:", e);
}
