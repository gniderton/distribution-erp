const XLSX = require('xlsx');

function parseAxisCSV(content) {
    const lines = content.split('\n');
    const entries = [];
    let startParsing = false;

    for (let line of lines) {
        if (line.includes('S.No,Transaction Date')) {
            startParsing = true;
            continue;
        }
        if (!startParsing || !line.trim()) continue;
        if (line.includes('TRANSACTION TOTAL')) break;

        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // Split by comma outside quotes
        if (parts.length < 7) continue;

        const date = parts[1];
        const particulars = parts[3].replace(/"/g, '').trim();
        const amountStr = parts[4].replace(/"/g, '').replace(/[	,]/g, '').trim();
        const type = parts[5].trim().toUpperCase(); // CR or DR
        const amount = parseFloat(amountStr);

        if (!isNaN(amount)) {
            const refId = extractReference(particulars);
            entries.push({
                transaction_date: formatDateAxis(date),
                particulars: particulars,
                bank_ref_id: refId, // Now optional
                debit_amount: type === 'DR' ? amount : 0,
                credit_amount: type === 'CR' ? amount : 0,
                amount: type === 'CR' ? amount : 0, // Legacy support
                bank_name: 'Axis'
            });
        }
    }
    return entries;
}

function parseIDFCText(content) {
    const lines = content.split('\n');
    const entries = [];
    let startParsing = false;

    for (let line of lines) {
        if (line.includes('Transaction Date') && line.includes('Particulars')) {
            startParsing = true;
            continue;
        }
        if (!startParsing || !line.trim()) continue;

        const parts = line.split('\t');
        if (parts.length < 6) continue;

        const date = parts[0];
        const particulars = parts[2].trim();
        const debit = parseFloat(parts[4].replace(/,/g, '').trim()) || 0;
        const credit = parseFloat(parts[5].replace(/,/g, '').trim()) || 0;

        if (debit > 0 || credit > 0) {
            const refId = extractReference(particulars);
            entries.push({
                transaction_date: formatDateIDFC(date),
                particulars: particulars,
                bank_ref_id: refId, // Now optional
                debit_amount: debit,
                credit_amount: credit,
                amount: credit, // Legacy support
                bank_name: 'IDFC'
            });
        }
    }
    return entries;
}

function parseExcel(buffer, bank_name) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const entries = [];

    // Find header row (usually contains 'Particulars')
    let headerIdx = -1;
    for (let i = 0; i < Math.min(data.length, 50); i++) {
        const row = data[i];
        if (row && row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('particulars'))) {
            headerIdx = i;
            break;
        }
    }

    if (headerIdx === -1) return [];

    // Map column indices
    const header = data[headerIdx];
    const colMap = {};
    header.forEach((cell, idx) => {
        if (!cell) return;
        const name = cell.toLowerCase().replace(/[\s\n\t]/g, '');
        if (name.includes('date')) colMap.date = idx;
        if (name.includes('particular')) colMap.particulars = idx;
        if (name.includes('debit')) colMap.debit = idx;
        if (name.includes('credit')) colMap.credit = idx;
        if (name.includes('amount')) colMap.amount = idx; // Some use 'Amount' and 'Type'
        if (name.includes('type')) colMap.type = idx;
    });

    // Fallback if generic labels fail (IDFC often has un-labelled headers)
    // Based on inspection: 0: Date, 2: Particulars, 4: Debit, 5: Credit
    if (Object.keys(colMap).length < 2) {
        colMap.date = 0;
        colMap.particulars = 2;
        colMap.debit = 4;
        colMap.credit = 5;
    }

    for (let i = headerIdx + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 3) continue;

        const dateStr = row[colMap.date];
        const particulars = row[colMap.particulars];

        let debit = 0;
        let credit = 0;

        if (colMap.debit !== undefined && colMap.credit !== undefined) {
            debit = parseFloat(row[colMap.debit]) || 0;
            credit = parseFloat(row[colMap.credit]) || 0;
        } else if (colMap.amount !== undefined && colMap.type !== undefined) {
            const type = String(row[colMap.type]).toUpperCase();
            const val = parseFloat(row[colMap.amount]);
            if (type.includes('CR')) credit = val;
            if (type.includes('DR')) debit = val;
        }

        if ((debit > 0 || credit > 0) && dateStr && particulars) {
            const refId = extractReference(particulars);
            entries.push({
                transaction_date: formatGenericDate(dateStr),
                particulars: String(particulars),
                bank_ref_id: refId,
                debit_amount: debit,
                credit_amount: credit,
                amount: credit, // Legacy support
                bank_name: bank_name
            });
        }
    }
    return entries;
}

function formatGenericDate(val) {
    if (val instanceof Date) {
        return val.toISOString().split('T')[0];
    }
    const str = String(val);
    if (str.includes('-')) {
        // Handle 09-Dec-2024
        const [d, mStr, y] = str.split('-');
        const months = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
        if (months[mStr]) return `${y}-${months[mStr]}-${d.padStart(2, '0')}`;
    }
    if (str.includes('/')) {
        // Handle 09/12/2024
        const parts = str.split('/');
        if (parts[2].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return str;
}

/**
 * Extracts reference ID (UTR, UPI ID, etc) from particulars
 */
function extractReference(particulars) {
    const text = String(particulars);
    // UPI Case: UPI/CR/123456789012/... or UPI/CR/600106971121/...
    const upiMatch = text.match(/UPI\/CR\/(\d+)\//);
    if (upiMatch) return upiMatch[1];

    // NEFT Case: NEFT/AXODH00456375599/... or NEFT/IDFB600158310008/...
    const neftMatch = text.match(/NEFT\/([A-Z0-9]+)\//);
    if (neftMatch) return neftMatch[1];

    // IMPS Case: IMPS-OPM/434920863879/
    const impsMatch = text.match(/IMPS[^\/]*\/(\d+)\//);
    if (impsMatch) return impsMatch[1];

    // General 12-digit search (often Ref IDs match this)
    const digitMatch = text.match(/(\d{12})/);
    if (digitMatch) return digitMatch[1];

    return null;
}

function formatDateAxis(str) {
    // dd/mm/yyyy -> yyyy-mm-dd
    const [d, m, y] = str.split('/');
    return `${y}-${m}-${d}`;
}

function formatDateIDFC(str) {
    // 01-Jan-2026 -> yyyy-mm-dd
    const months = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
    const [d, mStr, y] = str.split('-');
    return `${y}-${months[mStr]}-${d.padStart(2, '0')}`;
}

module.exports = { parseAxisCSV, parseIDFCText, parseExcel };
