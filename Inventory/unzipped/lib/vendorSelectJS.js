/* --- VENDOR SELECTION (GRN) --- */
const vID = vendorDropdownGRN.value;
piLines.setValue([]); // Clear table
if (!Products.data || !vID) { return; }
// 1. Populate Table with ALL Vendor Products (Direct Purchase Mode)
// Note: Adjust 'getProducts.data' if your data is nested (e.g. getProducts.data.data)
const productList = Products.data.data || Products.data; 
// UNIFIED KEYS (Matching Create PO + GRN Fields)
const newLines = productList
    .filter(p => Number(p.vendor_id) === Number(vID))
    .map((p, index) => ({
      "S.No": index + 1,
      "EAN Code": p.ean_code || "",
      "Item Name": p.product_name,
      "MRP": Number(p.mrp),
      "Price": Number(p.purchase_rate),
      "Qty": 0,
      "Sch": 0,
      "Disc %": 0,
      "GST %": Number(p.tax_percent || 5), // Default 5 if missing
      "Gross $": 0,
      "Disc. $": 0,
      "Taxable $": 0,
      "GST $": 0,
      "Net $": 0,
      "Batch No": "",       // [GRN ONLY]
      "Expiry": null,       // [GRN ONLY]
      "_product_id": p.id
    }));
piLines.setValue(newLines);
// 2. Reset PO Dropdown logic will happen automatically via the Dropdown's "Data Source" filter.
// (We don't need to manually push to varVendorPOs if we filter ChoosePo by vendor_id directly).