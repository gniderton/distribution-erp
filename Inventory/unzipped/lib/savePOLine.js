console.log("=== DEBUG: Save by _product_id ===");
console.log("1. Table changeset:", poTable.changesetArray);
console.log("2. Full changeset details:", JSON.stringify(poTable.changesetArray, null, 2));

// Get all changes from the table
const changes = poTable.changesetArray || [];

if (changes.length === 0) {
  console.log("❌ No changes to save");
  return { success: true, message: "No changes" };
}

// Check if poLines has data, if not initialize it from table
if (!poLines.value || poLines.value.length === 0) {
  console.log("⚠️ Initializing poLines from table data...");
  poLines.setValue(poTable.data || []);
  poTable.clearChangeset();
  return { success: false, message: "poLines initialized" };
}

// The changeset contains _product_id 
const change = changes[0];
const targetProductId = change._product_id;

console.log(`Looking for _product_id=${targetProductId}`);
console.log(`Change keys:`, Object.keys(change));

// Find which row in poLines has this _product_id
const targetIndex = poLines.value.findIndex((row) =>
row._product_id === targetProductId || row.product_id === targetProductId);


console.log(`Found at index=${targetIndex}`);

if (targetIndex === -1) {
  console.error("Could not find product in poLines!");
  console.log("First 3 poLines rows:", poLines.value.slice(0, 3).map((r) => ({ _product_id: r._product_id, product_id: r.product_id })));
  return { success: false, error: "Product not found" };
}

// Update ONLY that row in poLines
const updated = poLines.value.map((row, index) => {
  if (index !== targetIndex) {
    return row;
  }

  console.log(`✅ MATCH! Updating row at index ${index}`);
  console.log("   Row before:", { Qty: row.Qty, Sch: row.Sch, "Disc %": row["Disc %"] });
  console.log("   Change object:", change);

  // Merge the edited fields - this preserves ALL changed fields
  const mergedRow = { ...row, ...change };

  console.log("   Merged row:", { Qty: mergedRow.Qty, Sch: mergedRow.Sch, "Disc %": mergedRow["Disc %"], "Disc": mergedRow["Disc"] });

  // Recalculate - get values from mergedRow (which has the change applied)
  const Qty = Number(mergedRow.Qty) || 0;
  const Sch = Number(mergedRow.Sch) || 0;
  const DiscPct = Number(mergedRow["Disc %"] || mergedRow.Disc) || 0; // Try both field names
  const Price = Number(mergedRow.Price) || 0;

  console.log("   Values for calculation:", { Qty, Sch, DiscPct, Price });

  const Gross = Qty * Price;
  const DiscAmt = (Gross - Sch) * (DiscPct / 100);
  const Taxable = Gross - Sch - DiscAmt;
  const GstPct = Number(mergedRow["GST %"]) || 0;
  const GstAmt = Taxable * (GstPct / 100);
  const Net = Taxable + GstAmt;

  console.log("   Calculated:", { Qty, Sch, DiscPct, Gross, Taxable, Net });

return {
  ...mergedRow,
  Qty,
  Sch,
  "Disc %": DiscPct,

  "Gross $": _.round(Gross, 2),
  "Disc. $": _.round(DiscAmt, 2),
  "Taxable $": _.round(Taxable, 2),
  "GST $": _.round(GstAmt, 2),
  "Net $": _.round(Net, 2)
};


});

// Save
poLines.setValue(updated);
poTable.clearChangeset();

console.log(`✅ Updated row at index ${targetIndex}!`);

return { success: true, updatedIndex: targetIndex };