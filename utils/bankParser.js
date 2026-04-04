const XLSX = require('xlsx');

function parseAxisCSV(content) {
    const lines = content.split('\n');
    const entries = [];
    let startParsing = false;
    let colMap = { date: 1, particulars: 3, debit: 4, credit: 5 }; // Default for the report format

    for (let line of lines) {
        const upperLine = line.toUpperCase();
        // 1. Detect Header
        if (upperLine.includes('TRANSACTION DATE') && upperLine.includes('PARTICULARS')) {
            startParsing = true;
            colMap = {}; // Reset default map to use discovered columns only
            const headers = line.split(',');
            headers.forEach((h, idx) => {
                const name = h.toUpperCase();
                if (name === 'DEBIT') colMap.debit = idx;
                else if (name === 'CREDIT') colMap.credit = idx;
                else if (name.includes('DEBIT') && name.includes('CREDIT')) colMap.type = idx;
                
                if (name.includes('TRANSACTION DATE')) colMap.date = idx;
                if (name.includes('PARTICULARS')) colMap.particulars = idx;
                if (name.includes('AMOUNT')) colMap.amount = idx;
                if (name.includes('TYPE')) colMap.type = idx;
            });
            continue;
        }

        if (!startParsing || !line.trim()) continue;
        if (upperLine.includes('TRANSACTION TOTAL') || upperLine.includes('CLOSING BALANCE')) break;
        if (upperLine.includes('OPENING BALANCE')) continue;

        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // Split by comma outside quotes
        if (parts.length < 5) continue;

        const date = parts[colMap.date];
        const particulars = parts[colMap.particulars]?.replace(/"/g, '').trim();
        
        let debit = 0;
        let credit = 0;

        // Clean amount strings of quotes, tabs, and commas
        const cleanVal = (val) => parseFloat(String(val).replace(/"/g, '').replace(/[\t\s,]/g, '').trim()) || 0;

        if (colMap.debit !== undefined && colMap.credit !== undefined) {
            debit = cleanVal(parts[colMap.debit]);
            credit = cleanVal(parts[colMap.credit]);
        } else if (colMap.amount !== undefined && colMap.type !== undefined) {
            const val = cleanVal(parts[colMap.amount]);
            const type = parts[colMap.type]?.toUpperCase() || '';
            if (type.includes('CR')) credit = val;
            else if (type.includes('DR')) debit = val;
        }

        if ((debit > 0 || credit > 0) && date && particulars) {
            const refId = extractReference(particulars);
            const amount = Math.max(debit, credit);
            entries.push({
                transaction_date: formatDateAxis(date.replace(/"/g, '').trim()),
                particulars: particulars,
                bank_ref_id: refId,
                debit_amount: debit,
                credit_amount: credit,
                amount: amount, 
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
            const amount = Math.max(debit, credit);
            entries.push({
                transaction_date: formatDateIDFC(date),
                particulars: particulars,
                bank_ref_id: refId,
                debit_amount: debit,
                credit_amount: credit,
                amount: amount,
                bank_name: 'IDFC First Bank (Calicut)'
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
        const name = String(cell).toLowerCase().replace(/[\s\n\t\(\)\/]/g, ''); 
        if ((name.includes('transactiondate') || name.includes('date')) && !name.includes('value')) colMap.date = idx;
        if (name.includes('particular')) colMap.particulars = idx;
        
        // Strict mapping: Ignore 'Balance' for debit/credit
        if (name.includes('debit') && !name.includes('balance')) colMap.debit = idx;
        if (name.includes('credit') && !name.includes('balance')) colMap.credit = idx;
        
        if (name === 'amount') colMap.amount = idx; // Pure amount column
        if (name.includes('type')) colMap.type = idx;
    });

    for (let i = headerIdx + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 3) continue;

        const dateStr = row[colMap.date];
        const particulars = row[colMap.particulars];

        if (!dateStr || !particulars || String(particulars).toUpperCase().includes('TOTAL')) continue;

        let debit = 0;
        let credit = 0;

        const cleanVal = (val) => {
            if (typeof val === 'number') return val;
            return parseFloat(String(val).replace(/[\t\s,]/g, '').trim()) || 0;
        };

        if (colMap.debit !== undefined && colMap.credit !== undefined) {
            debit = cleanVal(row[colMap.debit]);
            credit = cleanVal(row[colMap.credit]);
        } else if (colMap.amount !== undefined && colMap.type !== undefined) {
            const type = String(row[colMap.type]).toUpperCase();
            const val = cleanVal(row[colMap.amount]);
            if (type.includes('CR')) credit = val;
            else if (type.includes('DR')) debit = val;
        }

        if ((debit > 0 || credit > 0) && dateStr && particulars) {
            const refId = extractReference(particulars);
            const amount = Math.max(debit, credit);
            entries.push({
                transaction_date: formatGenericDate(dateStr),
                particulars: String(particulars),
                bank_ref_id: refId,
                debit_amount: debit,
                credit_amount: credit,
                amount: amount,
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
