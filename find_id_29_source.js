const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const TARGET_UTR = 'AXNGG09305396269';

function searchInFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    try {
        if (ext === '.csv' || ext === '.txt') {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes(TARGET_UTR)) {
                console.log(`FOUND in TEXT: ${filePath}`);
                const lines = content.split('\n');
                lines.forEach(line => {
                    if (line.includes(TARGET_UTR)) console.log(`  Line: ${line}`);
                });
            }
        } else if (ext === '.xlsx' || ext === '.xls') {
            const workbook = xlsx.readFile(filePath);
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
                data.forEach((row, idx) => {
                    const rowStr = JSON.stringify(row);
                    if (rowStr.includes(TARGET_UTR)) {
                        console.log(`FOUND in EXCEL: ${filePath} (Sheet: ${sheetName}, Row: ${idx + 1})`);
                        console.log(`  Data: ${rowStr}`);
                    }
                });
            });
        }
    } catch (e) {
        // Skip files that can't be read
    }
}

function traverse(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                traverse(fullPath);
            }
        } else {
            searchInFile(fullPath);
        }
    });
}

console.log(`--- SCANNING FOR UTR: ${TARGET_UTR} ---`);
traverse('.');
console.log("--- SCAN COMPLETED ---");
