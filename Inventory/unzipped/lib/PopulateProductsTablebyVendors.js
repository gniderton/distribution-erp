/* --- 3. CREATE SCRIPT (Unified Keys) --- */

// 0. Scope Check (Safety)
let vID = null;
try { vID = selected_vendor_id; } catch (e) { return; } 

// 1. Reset Table
poLines.setValue([]);
varPOMode.setValue('CREATE');

if (!Products.data || !vID) { return; }

// 2. Map Clean List
const newLines = Products.data.data
    .filter(p => Number(p.vendor_id) === Number(vID))
    .map((p, index) => ({
      "S.No": index + 1,
      "EAN Code": p.ean_code,
      "Item Name": p.product_name,
      "MRP": Number(p.mrp),
      "Price": Number(p.purchase_rate),
      "Qty": 0,
      "Sch": 0,
      "Disc %": 0,
      "GST %": 5,
      "Gross $": 0,
      "Disc. $": 0,
      "Taxable $": 0,
      "GST $": 0,
      "Net $": 0,
      "_product_id": p.id
    }));

poLines.setValue(newLines);