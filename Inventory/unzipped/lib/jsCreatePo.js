/* --- SAVE & PRINT SCRIPT --- */

// 1. FILTER INPUTS
const rawLines = poLines.value;
const validLines = rawLines.filter(row => Number(row.Qty) > 0);

if (validLines.length === 0) {
  utils.showNotification({ title: "Error", description: "No items to save!", notificationType: "error" });
  return;
}
if (!vendorDropdown.value) {
   utils.showNotification({ title: "Error", description: "Select a Vendor", notificationType: "error" });
   return;
}

// 2. PREPARE PAYLOAD
// Note: We use the local Component names directly
const dbPayloadLines = validLines.map(row => ({
    product_id:         row._product_id,
    ordered_qty:        Number(row.Qty),
    mrp:                Number(row.MRP),
    price:              Number(row.Price),
    scheme_amount:      Number(row.Sch || 0),
    discount_percent:   Number(row['Disc %'] || 0),
    tax_percent:        Number(row['GST %'] || 0)
}));

const dbPayload = {
    vendor_id:      vendorDropdown.value,
    remarks:        "", 
    lines:          dbPayloadLines
};

// 3. SEND TO SERVER
utils.showNotification({ title: "Saving...", description: "Please wait...", notificationType: "info" });
const result = await submitPO.trigger({ additionalScope: { payload: dbPayload } });

if (result?.success) {
  
  // 4. PREPARE PRINT DATA (For the Hidden Table)
  const formattedPrintLines = validLines.map((row, i) => ({
      "S.No": i+1,
      "EAN Code": row['EAN Code'] || "",
      "Item Name": row['Item Name'],
      "MRP": Number(row.MRP).toFixed(2),
      "Rate": Number(row.Price).toFixed(2),
      "Qty": Number(row.Qty),
      "Gross Amt": Number(row['Gross $'] || 0).toFixed(2),
      "Sch": Number(row.Sch || 0),
      "Disc %": Number(row['Disc %'] || 0),
      "Disc Amt": Number(row['Disc $'] || 0).toFixed(2),
      "Taxable": Number(row['Taxable $']).toFixed(2),
      "GST %": Number(row['GST %'] || 0),
      "GST Amt": Number(row['GST $']).toFixed(2),
      "Net Amount": Number(row['Net $']).toFixed(2)
  }));
  
  // Update Global Variable (Print State)
  await printState.setValue({
      poNumber: result.po_number,
      date: new Date().toLocaleDateString(),
      vendorName: vendorDropdown.selectedLabel, // Uses Label (Name) instead of ID
      lines: formattedPrintLines
  });
  
  // 5. PRINT (Magic Swap)
  isPrinting.setValue(true);
  utils.showNotification({ title: "Generating PDF...", description: "Please wait...", notificationType: "info" });
  await new Promise(r => setTimeout(r, 2500)); // Wait for render

  // 6. DOWNLOAD
  utils.downloadPage(result.po_number, { 
      componentsToInclude: ['poTablePrint'], // Make sure this Container/Table ID is correct!
      scale: 0.6 
  });
  
  // 7. CLEANUP
  await new Promise(r => setTimeout(r, 1000));
  isPrinting.setValue(false);
  poLines.setValue([]);
  vendorDropdown.setValue(null);
  getNextPO.trigger();
  
  // 8. CLOSE DRAWER (New Step for UI)
  drawerCreatePO.hide();
}