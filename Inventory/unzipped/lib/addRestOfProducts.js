/* --- SCENARIO B: ADD MISSING PRODUCTS --- */
const currentRows = piLines.value || [];
const allProducts = Products.data.data || Products.data; // Check structure
const vID = vendorDropdownGRN.value;
if (!allProducts || !vID) return;
// Filter for Vendor + NOT in current table
const missingProds = allProducts.filter(p => 
    Number(p.vendor_id) === Number(vID) &&
    !currentRows.find(row => Number(row._product_id) === Number(p.id))
);
const newRows = missingProds.map((p, i) => {
  // 1. Initial Values (Qty 0)
  const qty = 0;
  const price = Number(p.purchase_rate);
  const mrp = Number(p.mrp);
  const taxPct = Number(p.tax_percent || 5);
  
  // 2. Calculations (All 0 since Qty is 0)
  const gross = 0;
  const discAmt = 0;
  const taxable = 0;
  const taxAmt = 0;
  const net = 0;
  return {
      "S.No": currentRows.length + i + 1,
      "EAN Code": p.ean_code || "",
      "Item Name": p.product_name,
      "MRP": mrp,
      "Price": price,
      "Qty": qty,
      "Sch": 0,
      "Disc %": 0,
      "GST %": taxPct,
      "Gross $": gross,
      "Disc. $": discAmt,
      "Taxable $": taxable,
      "GST $": taxAmt,
      "Net $": net,
      "Batch No": "",
      "Expiry": null,
      "_product_id": p.id
  };
});
// Append to table
piLines.setValue([...currentRows, ...newRows]);
utils.showNotification({ title: "Items Added", description: `Added ${newRows.length} other products.`, notificationType: "success" });