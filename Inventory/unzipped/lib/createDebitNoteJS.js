/* --- CREATE DEBIT NOTE (LOGIC MATCHING TABLE) --- */
const isItemMode = dnMode.value === "Item Return";
let amount = 0;
let lines = [];

if (isItemMode) {
    // We replicate the table formula to be 100% safe independent of UI
    const rawLines = tblDebitLines.data; 
    
    lines = rawLines.map(row => {
        const qty = Number(row.Qty || 0);
        const price = Number(row.Price || 0); // Purchase Rate
        const scheme = Number(row.Sch || 0);
        const discPct = Number(row['Disc %'] || 0); // Discount Percent
        const taxPct = Number(row['GST %'] || row.tax_percent || 0);
        
        // 1. Calculate Gross
        const gross = qty * price;
        
        // 2. Calculate Discount Amount
        // Formula: (Gross - Scheme) * (Disc% / 100)
        // Note: Check if your table logic applies discount on (Gross - Scheme) or just Gross.
        // Assuming standard: Discount is on logic after Scheme
        const valForDisc = Math.max(0, gross - scheme);
        const discAmt = valForDisc * (discPct / 100);

        // 3. Calculate Taxable Amount (Matches 'Taxable $' Column)
        // Formula: Gross - Scheme - Discount
        const taxable = Math.max(0, gross - scheme - discAmt);

        // 4. Calculate GST
        const taxAmt = taxable * (taxPct / 100);

        // 5. Net Total
        const total = taxable + taxAmt;

        return {
            product_id: row._product_id,
            qty: qty,
            rate: price,
            batch_number: row['Batch No'] || "",
            return_type: row.Reason || "Damage",
            
            // Backend fields
            amount: Number(total.toFixed(2)),       // Net Total
            tax_amount: Number(taxAmt.toFixed(2))   // Tax Component
        };
    }).filter(l => l.qty > 0);
    
    // Grand Total
    amount = _.sumBy(lines, 'amount');
} else {
    // Manual Amount
    amount = Number(dnAmount.value);
}

if (!amount || amount <= 0) {
   utils.showNotification({ title: "Error", description: "Invalid Amount", notificationType: "error" });
   return;
}

apiCreateDebitNote.trigger({
    additionalScope: {
        payload: {
            vendor_id: varSelectedVendor.value.id,
            amount: amount,
            debit_note_date: moment(dnDate.value).format("YYYY-MM-DD"),
            reason: dnReason.value,
            linked_invoice_id: selLinkedBill.value || null,
            lines: isItemMode ? lines : [] 
        }
    },
    onSuccess: function(data) {
        utils.showNotification({ title: "Debit Note Created", description: data.dn_number, notificationType: "success" });
        try { txtDNNumber.setValue(data.dn_number); } catch(e) {}
        modalDebitNote.close();
        getVendorLedger.trigger();
    }
});