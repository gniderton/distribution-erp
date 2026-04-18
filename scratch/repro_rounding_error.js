// Simulation of the drift reported by the user
let totalTaxable = 0;
let totalTax = 0;
let grandTotal = 0;

// Example items that might cause drift
const mockItems = [
    { qty: 10, unitNet: 153.456, taxPct: 5 },
    { qty: 5, unitNet: 23.99, taxPct: 5 }
];

// Logic from lines 803-806 and 870-872
for (const item of mockItems) {
    const qty = item.qty;
    const unitNet = item.unitNet;
    const taxPct = item.taxPct;

    const taxableAmount = Number((qty * unitNet).toFixed(2));
    const taxAmount = Number((taxableAmount * (taxPct / 100)).toFixed(2));
    const lineTotal = Number((taxableAmount + taxAmount).toFixed(2));

    totalTaxable += taxableAmount;
    totalTax += taxAmount;
    grandTotal += lineTotal;
}

console.log(`Total Taxable: ${totalTaxable}`);
console.log(`Total Tax: ${totalTax}`);
console.log(`Grand Total: ${grandTotal}`);
console.log(`Sum of Parts (Debit): ${totalTaxable + totalTax}`);
console.log(`Grand Total (Credit): ${grandTotal}`);

if ((totalTaxable + totalTax) !== grandTotal) {
    console.log("!!! DRIFT DETECTED !!!");
    console.log(`Difference: ${(totalTaxable + totalTax) - grandTotal}`);
} else {
    console.log("No drift detected with these values, but drift is mathematically possible.");
}

// Let's force a drift example
let t1 = 0.1, t2 = 0.2;
console.log(`\nSimple JS Drift Example (0.1 + 0.2): ${t1 + t2}`);
