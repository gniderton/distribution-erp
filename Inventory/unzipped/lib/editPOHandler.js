/* --- MASTER EDIT HANDLER --- */

// 1. Reset Memory (Fixes Stale Data)
poLines.setValue([]);
varPOMode.setValue('EDIT');

// 2. Get Data
const masterProducts = Products.data.data || [];
const savedLines = getPOById.data.lines || [];

// 3. MERGE LOGIC (With Strict "Create-Style" Keys)
const mergedLines = masterProducts
  .filter(p => Number(p.vendor_id) === Number(vendorDropdown.value))
  .map((p, index) => {
      const saved = savedLines.find(s => Number(s.product_id) === Number(p.id));
      
      const qty = saved ? Number(saved.ordered_qty) : 0;
      const rate = saved ? Number(saved.rate) : Number(p.purchase_rate);
      const disc = saved ? Number(saved.discount_percent) : 0;
      const scheme = saved ? Number(saved.scheme_amount) : 0;
      
      // Calculate
      const gross = qty * rate;
      const discAmt = (gross - scheme) * (disc / 100);
      const gstPct = 5; // Fixed 5% for now
      const taxAmt = (gross - scheme - discAmt) * (gstPct / 100);
      const net = (gross - scheme - discAmt) + taxAmt;

      return {
        "S.No": index + 1,
        "EAN Code": p.ean_code,
        "Item Name": p.product_name,
        "MRP": Number(p.mrp),
        "Price": rate,
        "Qty": qty,
        "Sch": scheme,
        "Disc %": disc,
        "GST %": gstPct,
        "Gross $": gross,
        "Disc. $": discAmt,
        "Taxable $": net - taxAmt,
        "GST $": taxAmt,
        "Net $": net,
        "_product_id": p.id
    };
});

// 4. Update UI
poLines.setValue(mergedLines);
utils.showNotification({ title: "Mode: Edit", description: "Loaded merged data.", notificationType: "info" });