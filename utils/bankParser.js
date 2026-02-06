/**
 * Utility to parse bank statement files (IDFC Excel/Text and Axis CSV)
 */

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
        const type = parts[5].trim(); // CR or DR
        const amount = parseFloat(amountStr);

        if (type === 'CR' && !isNaN(amount)) {
            const refId = extractReference(particulars);
            if (refId) {
                entries.push({
                    transaction_date: formatDateAxis(date),
                    particulars: particulars,
                    bank_ref_id: refId,
                    amount: amount,
                    bank_name: 'Axis'
                });
            }
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
        const credit = parseFloat(parts[5].replace(/,/g, '').trim());

        if (!isNaN(credit) && credit > 0) {
            const refId = extractReference(particulars);
            if (refId) {
                entries.push({
                    transaction_date: formatDateIDFC(date),
                    particulars: particulars,
                    bank_ref_id: refId,
                    amount: credit,
                    bank_name: 'IDFC'
                });
            }
        }
    }
    return entries;
}

/**
 * Extracts reference ID (UTR, UPI ID, etc) from particulars
 */
function extractReference(particulars) {
    // UPI Case: UPI/CR/123456789012/... or UPI/CR/600106971121/...
    const upiMatch = particulars.match(/UPI\/CR\/(\d+)\//);
    if (upiMatch) return upiMatch[1];

    // NEFT Case: NEFT/AXODH00456375599/... or NEFT/IDFB600158310008/...
    const neftMatch = particulars.match(/NEFT\/([A-Z0-9]+)\//);
    if (neftMatch) return neftMatch[1];

    // IMPS Case: IMPS-OPM/600113318190/...
    const impsMatch = particulars.match(/IMPS[^\/]*\/(\d+)\//);
    if (impsMatch) return impsMatch[1];

    // General 12-digit search (often Ref IDs match this)
    const digitMatch = particulars.match(/(\d{12})/);
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

module.exports = { parseAxisCSV, parseIDFCText };
