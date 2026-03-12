const old = varCorrectionData.value;
if (!old) {
  utils.showNotification({title: "Error", description: "No correction data found.", notificationType: "error"});
  return;
}
// 1. Pre-fill Inputs (Using Your Confirmed Names)
// Vendor Dropdown
if (typeof vendorDropdownGRN !== 'undefined') {
   vendorDropdownGRN.setValue(old.vendor_id);
}
// Invoice Number
vendorInvoiceNo.setValue(old.vendor_invoice_number);
// Purchase Order (Restore Link)
if (old.purchase_order_id) {
   ChoosePo.setValue(old.purchase_order_id);
}
// Invoice Date
dateVendorInvoice.setValue(old.vendor_invoice_date);
// Receive Date
dateReceived.setValue(old.received_date);
// 2. Pre-fill Lines 
// We use 'piLines' because that is what the Save script uses.
if (old.lines || old.lines_json) {
   piLines.setValue(old.lines || old.lines_json);
}
utils.showNotification({title: "Data Loaded", description: "Edit the mistake and Click Save."});