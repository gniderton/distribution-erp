/* --- PREPARE DATA FOR UPDATE --- */
const vendor = Number(vendorDropdown.value);
const allRows = poLines.value || [];

// 1. Filter: Get only rows with Qty > 0
const activeRows = allRows.filter(row => Number(row['Qty']) > 0);

// 2. Map: Convert to Backend Format
const cleanLines = activeRows.map(row => ({
  product_id: row._product_id,
  ordered_qty: Number(row.Qty),
  price: Number(row.Price),
  mrp: Number(row.MRP),
  discount_percent: Number(row['Disc %'] || 0),
  scheme_amount: Number(row.Sch || 0),
  tax_percent: Number(row['GST %'] || 5)
}));

// 3. Return the Final Object
return {
  vendor_id: vendor,
  remarks: "Updated via Retool Edit Mode",
  lines: cleanLines
};