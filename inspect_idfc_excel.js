const XLSX = require('xlsx');
const path = require('path');

const filePath = 'c:/Users/user/Downloads/Backened/IDFCFIRSTBankstatement_60123456706 (1).xlsx';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log("--- IDFC EXCEL INSPECTION ---");
// Print first 20 rows to find header
for (let i = 0; i < Math.min(data.length, 25); i++) {
    console.log(`Row ${i}:`, JSON.stringify(data[i]));
}
