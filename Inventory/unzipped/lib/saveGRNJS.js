/* --- UNIFIED GRN SAVE LOGIC --- */
// 1. Validate Lines
const rawLines = piLines.value || [];
const validLines = rawLines.filter(row => row.Qty && Number(row.Qty) > 0);
if (validLines.length === 0) {
  utils.showNotification({ title: "Error", description: "No items to save!", notificationType: "error" });
  return;
}
const vID = vendorDropdownGRN.value;
if (!vID) {
   utils.showNotification({ title: "Error", description: "Select a Vendor", notificationType: "error" });
   return;
}
// 2. Prepare Payload
const dbLines = validLines.map(row => ({
    // Ensure you map your Column IDs correctly here!
    product_id:         Number(row._product_id),
    ordered_qty:        0, 
    accepted_qty:       Number(row.Qty),
    rate:               Number(row.Price),
    discount_percent:   Number(row['Disc %'] || 0),
    scheme_amount:      Number(row.Sch || 0),
    tax_amount:         Number(row['GST $'] || 0),
    amount:             Number(row['Net $'] || 0),
    batch_number:       row["Batch No"] ? row["Batch No"].toString() : "",
    expiry_date:        row.Expiry ? moment(row.Expiry).format("YYYY-MM-DD") : null,
    mrp:                Number(row.MRP || 0)
}));
const totalNet = dbLines.reduce((acc, x) => acc + x.amount, 0); 
const totalTax = dbLines.reduce((acc, x) => acc + x.tax_amount, 0);
const finalPayload = {
    vendor_id:          Number(vID),
    purchase_order_id: Number(ChoosePo.value || 0),
    invoice_number:     vendorInvoiceNo.value,
    invoice_date:       dateVendorInvoice.value, // Ensure Moment/Date format matches
    received_date:      dateReceived.value,
    total_net:          totalNet,
    tax_amount:         totalTax,
    grand_total:        Math.round(totalNet + totalTax),
    lines:              dbLines,
    
    // --- TRACEABILITY MAGIC ---
    // If varCorrectionID has a value, we link this new GRN to the old one!
    parent_invoice_id:  varCorrectionID.value || null 
};
// 3. Save & Send
await varGRNPayload.setValue(finalPayload);
// Trigger Query
apiCreateGRN.trigger({
    onSuccess: function(data) {
        utils.showNotification({ title: "Success", description: "GRN Saved!", notificationType: "success" });
        
        // 4. CLEANUP (Critical)
        piLines.setValue([]);
        vendorDropdownGRN.clearValue();
        vendorInvoiceNo.setValue("");
        dateVendorInvoice.clearValue();
        varGRNPayload.setValue({});
        
        // Reset Correction Mode
        varCorrectionID.setValue(null);
        varCorrectionData.setValue({});
        
        modalFrameGRN.close();
    },
    onFailure: function(err) {
        console.error(err);
        utils.showNotification({ title: "Failed", description: err.message, notificationType: "error" });
    }
});