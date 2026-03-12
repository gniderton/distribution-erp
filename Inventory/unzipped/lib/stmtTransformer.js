const allTxns = {{ getVendorLedger.data }} || [];
const start = moment({{ dateStart.value }}).startOf('day');
const end = moment({{ dateEnd.value }}).endOf('day');
let openingBalance = 0;
const filteredTxns = [];
// Sort Ascending (Oldest First) for calculation
const sorted = _.sortBy(allTxns, ['date', 'created_at']);
sorted.forEach(txn => {
    const txnDate = moment(txn.date);
    
    // Net Effect: Credit (We owe) - Debit (We paid)
    // Adjust this sign based on your preference. Usually Vendor Balance is Credit Positive.
    const netChange = Number(txn.credit_amount) - Number(txn.debit_amount);
    if (txnDate.isBefore(start)) {
        openingBalance += netChange;
    } else if (txnDate.isSameOrBefore(end) && txnDate.isSameOrAfter(start)) {
        filteredTxns.push({
            ...txn,
            net_change: netChange
        });
    }
});
// Calculate Running Balance
let running = openingBalance;
const finalData = filteredTxns.map(t => {
    running += t.net_change;
    return { ...t, running_balance: running };
});
return {
    opening_balance: openingBalance,
    transactions: finalData,
    closing_balance: running
};