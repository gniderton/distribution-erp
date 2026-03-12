/* --- GRN TABLE CELL CHANGE (RECALCULATE) --- */
console.log("=== DEBUG: GRN Update ===");

// 1. Get Changes
const changes = GRNTable.changesetArray || [];
if (changes.length === 0) return;

// 2. Safety Check (Ensure Variable is Ready)
if (!piLines.value || piLines.value.length === 0) {
  piLines.setValue(GRNTable.data || []);
  GRNTable.clearChangeset(); // Clear to prevent loops
  return;
}

const change = changes[0];
// Use _product_id to find the row (Fallback to product_id)
const targetProductId = change._product_id || change.product_id; 

// 3. Find Row Index
const targetIndex = piLines.value.findIndex((row) => 
    row._product_id === targetProductId || row.product_id === targetProductId
);

if (targetIndex === -1) {
    console.error("Product not found in piLines:", targetProductId);
    return;
}

// 4. Update & Recalculate Logic
const updatedData = piLines.value.map((row, index) => {
    if (index !== targetIndex) return row;

    console.log(`✅ Updating GRN Row ${index}`);

    // Merge changes (this keeps Batch No, Expiry, etc.)
    const mergedRow = { ...row, ...change };

    // Parse Numbers
    const Qty = Number(mergedRow.Qty) || 0;
    const Price = Number(mergedRow.Price) || 0;
    const Sch = Number(mergedRow.Sch) || 0;
    const DiscPct = Number(mergedRow["Disc %"]) || 0;
    const GstPct = Number(mergedRow["GST %"]) || 5;

    // Math (Standard ERP Logic)
    const Gross = Qty * Price;
    const DiscAmt = (Gross - Sch) * (DiscPct / 100);
    const Taxable = Gross - Sch - DiscAmt;
    const GstAmt = Taxable * (GstPct / 100);
    const Net = Taxable + GstAmt;

    return {
        ...mergedRow,
        "Qty": Qty,
        "Price": Price,
        "Sch": Sch,
        "Disc %": DiscPct,
        "GST %": GstPct,
        // Save rounded values
        "Gross $": parseFloat(Gross.toFixed(2)),
        "Disc. $": parseFloat(DiscAmt.toFixed(2)),
        "Taxable $": parseFloat(Taxable.toFixed(2)),
        "GST $": parseFloat(GstAmt.toFixed(2)),
        "Net $": parseFloat(Net.toFixed(2))
    };
});

// 5. Commit
piLines.setValue(updatedData);
GRNTable.clearChangeset();