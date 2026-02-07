const XLSX = require('xlsx');

function inspectExcel() {
    try {
        const filePath = 'IDFCFIRSTBankstatement_60123456706 (1).xlsx';
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        console.log('--- ROWS 20-30 ---');
        data.slice(20, 30).forEach((row, i) => {
            console.log(`Row ${i + 20}:`, row);
        });
    } catch (err) {
        console.error('Error reading Excel:', err);
    }
}

inspectExcel();
