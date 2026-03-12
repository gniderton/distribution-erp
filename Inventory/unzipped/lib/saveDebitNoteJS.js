const isItemMode = dnMode.value === "Item Return";
let amount = 0;
let lines = [];
if (isItemMode) {
    // Calculate from Table (Map to Backend Keys)
    const rawLines = tblDebitLines.data; 
    
    lines = rawLines.map(row => ({
        product_id: row._product_id, // Map from '_product_id'
        qty: Number(row.Qty),
        rate: Number(row.Price), // Map from 'Price'
        batch_number: row['Batch No'] || "", // Map from 'Batch No'
        return_type: row.Reason || "Damage",
        amount: Number(row['Net $']) || (Number(row.Qty) * Number(row.Price))
    })).filter(l => l.qty > 0);
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
            linked_invoice_id: selLinkedBill.value || null, // New field
            lines: isItemMode ? lines : [] 
        }
    },
    onSuccess: function(data) {
         // data contains { dn_number: 'GD-CLT-DN-26-1' }
        utils.showNotification({ title: "Debit Note Created", description: data.dn_number, notificationType: "success" });
        
        // Show the number in the box
        try { txtDNNumber.setValue(data.dn_number); } catch(e) {}
        modalDebitNote.close();
        getVendorLedger.trigger();
    }
});