const samples = [
    { from: "IDFCFB", content: "Your A/C XXXXX456706 is credited with INR 1,000.00 on 03/04/26 12:00. Your new balance is INR 15,644.63. Team IDFC FIRST Bank" },
    { from: "IDFCFB", content: "Your beneficiary Saleem P M has received Rs. 20,000.00 transferred via NEFT UTR IDFB609074986401. Team IDFC First Bank." },
    { from: "IDFCFB", content: "Dear Customer, Chq No. 350806 for Rs. 52,239.00 from GNIDERTON PRIVATE LIMITED deposited in A/c XXXXX456706 is returned due to 01:Funds insufficient. IDFC FIRST Bank" },
    { from: "AXISBK", content: "Debit INR 10000.00\nAxis Bank A/c XX9157\n19-03-26 17:13:34\nINB/NEFT/AXODH07898923976/" },
    { from: "AXISBK", content: "INR 8500.00 credited to Axis Bank A/c no. XX929157 on 12-03-2026 07:48:17. Info- BNA-DEPOSIT/AXIS BANK LIMITED/AXPR/5787. Avl Bal INR 9083.04." }
];

function testRegex(sample) {
    const { content, from } = sample;
    console.log(`\n--- Testing ${from} ---`);
    console.log("Content:", content.substring(0, 50));

    let amount = 0;
    let bank_ref_id = null;
    let isCredit = false;

    if (/IDFC/i.test(from)) {
        const amtMatch = content.match(/(?:credited|debited|received|Rs\.|INR)\s+(?:with|by|Rs\.?|INR)?\s?([\d,]+\.\d{2})/i);
        if (amtMatch) amount = parseFloat(amtMatch[1].replace(/,/g, ''));

        const refMatch = content.match(/Ref(?: No\.)?[:\s]+(\d+)/i) || 
                         content.match(/UTR\s?ID?([A-Z0-9]+)/i) ||
                         content.match(/IMPS Ref no\s?(\d+)/i) ||
                         content.match(/Chq No\.\s?(\d+)/i);
        if (refMatch) bank_ref_id = refMatch[1];

        isCredit = /credited|received/i.test(content) && !/returned/i.test(content);
        if (/returned/i.test(content)) isCredit = false;
    } else if (/AXIS/i.test(from)) {
        if (/Debit/i.test(content)) {
            const amtMatch = content.match(/Debit\s+(?:INR|Rs\.?)\s?([\d,]+\.\d{2})/i);
            if (amtMatch) amount = parseFloat(amtMatch[1].replace(/,/g, ''));
            isCredit = false;
        } else if (/credited/i.test(content)) {
            const amtMatch = content.match(/(?:INR|Rs\.?)\s?([\d,]+\.\d{2})\s+credited/i);
            if (amtMatch) amount = parseFloat(amtMatch[1].replace(/,/g, ''));
            isCredit = true;
        }
        const refMatch = content.match(/NEFT\/([A-Z0-9]+)\//i) || content.match(/Info-\s?([A-Z0-9\/-]+)/i);
        if (refMatch) bank_ref_id = refMatch[1];
    }

    console.log("Result: ", { amount, bank_ref_id, isCredit });
}

samples.forEach(testRegex);
