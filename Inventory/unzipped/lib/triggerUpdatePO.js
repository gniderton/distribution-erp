/* --- FINAL UPDATE LOGIC V3 --- */
console.log("=== STARTING UPDATE ===");

// 1. GET SOURCE (Handles View & Edit Modes)
const sourceData = poTable.data || poLines.value || [];

// 2. FILTER & MAP (Bulletproof Keys)
const validLines = sourceData
  .filter(r => Number(r['Qty'] || r['qty'] || r['ordered_qty'] || 0) > 0)
  .map(r => ({
      product_id:         r._product_id || r.product_id,
      ordered_qty:        Number(r['Qty'] || r['qty'] || r['ordered_qty']),
      mrp:                Number(r['MRP'] || r['mrp']),
      price:              Number(r['Price'] || r['price'] || r['purchase_rate']),
      scheme_amount:      Number(r['Sch'] || r['scheme_amount'] || 0),
      discount_percent:   Number(r['Disc %'] || r['Disc'] || r['discount_percent'] || 0),
      tax_percent:        Number(r['GST %'] || r['tax_percent'] || 5)
  }));

if (validLines.length === 0) {
  utils.showNotification({ title: "Error", description: "No items to save!", notificationType: "error" });
  return;
}

const vID = Number(vendorDropdown.value) || Number(selected_vendor_id) || 0;
if (vID === 0) {
   utils.showNotification({ title: "Error", description: "Invalid Vendor", notificationType: "error" });
   return;
}

// 3. PREPARE PAYLOAD
const dbPayload = {
    vendor_id:      vID,
    remarks:        "Updated via Retool Manager", 
    lines:          validLines
};

// 4. SEND TO SERVER (Trigger the REST Query)
utils.showNotification({ title: "Updating...", description: "Please wait...", notificationType: "info" });
const result = await updatePOQuery.trigger({ additionalScope: { payload: dbPayload } });

// 5. SUCCESS & CLEANUP
if (result?.success !== false) {
  utils.showNotification({ title: "Success", description: "PO Updated!", notificationType: "success" });
  
  // --- IMPORTANT: REPLACE WITH YOUR QUERY NAME ---
  // If your dashboard query is named 'getPOs', write getPOs.trigger()
  // If you don't know it, you can comment this line out for now.
  try {
     getPOList.trigger(); 
  } catch(e) { console.warn("List refresh failed (Check Query Name)"); }
  
  drawerCreatePO.hide();
  poLines.setValue([]);
}