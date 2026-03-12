const vID = varSelectedVendor.value.id;
if (!vID) { return; }
// CORRECTION: User's query is named 'Products'
// Safe Array Access
const rawData = Products.data; 
// Handle response wrappers e.g. { data: [...] } or direct array
const allProducts = Array.isArray(rawData) ? rawData : (rawData.data || []);
// Filter for Vendor
const vendorProducts = allProducts.filter(p => Number(p.vendor_id) === Number(vID));
// Map to Table Format (Exact Match to GRN Logic)
const tableData = vendorProducts.map((p, index) => ({
  "S.No": index + 1,
  "EAN Code": p.ean_code || "",
  "Item Name": p.product_name,
  "MRP": Number(p.mrp || 0),
  "Price": Number(p.purchase_rate || 0),
  "Qty": 0,
  "Sch": 0,
  "Disc %": 0,
  "GST %": Number(p.tax_percent || 5),
  "Gross $": 0,
  "Disc. $": 0,
  "Taxable $": 0,
  "GST $": 0,
  "Net $": 0, // This is the Amount
  "Batch No": "", 
  "Expiry": null,
  "Reason": "Damage", // Default for DN
  "_product_id": p.id
}));
// UPDATE THE VARIABLE (Robust Way)
varDebitLinesData.setValue(tableData);