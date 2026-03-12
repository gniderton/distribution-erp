# Retool Logic Encyclopedia: Inventory Management

This document contains EVERY piece of logic extracted from the Retool JSON. Search by name or ID.

## Component_$appStyles (ID: $appStyles)
```javascript
._retool-drawer-content {
  width: 80vw !important;
  max-width: 1400px !important;
  left: 10vw !important;
}
```

---

## Component_$main (ID: $main)
```javascript
._retool-drawer-content {
  width: 80vw !important;
  max-width: 1400px !important;
  left: 10vw !important;
}
```

---

## Component_$main4 (ID: $main4)
```javascript
{{ self.values[0] }}
```

---

## varPOViewId (ID: 025059e3)
```javascript
/* --- UNIFIED VIEW SCRIPT (MATCHES CREATE KEYS) --- */
const data = getPOById.data;

if (!data || !data.header) {
  utils.showNotification({ title: "Error", description: "No Data", notificationType: "error" });
  return;
}

// 1. SET VIEW MODE (Safety)
varPOMode.setValue('VIEW'); // <--- ADDED THIS ✅

// 2. Map Header
vendorDropdown.setValue(data.header.vendor_id);
poNumber2.setValue(data.header.po_number);
date5.setValue(data.header.po_date);
date6.setValue(data.header.delivery_date);

// 3. Map Lines (Targeting EXACT Keys from Create Script)
const formattedLines = data.lines.map((row, index) => {
    // Inputs
    const qty = Number(row.ordered_qty);
    const rate = Number(row.rate);
    const discPct = Number(row.discount_percent || 0);
    const scheme = Number(row.scheme_amount || 0);
    
    // Math
    const gross = qty * rate;
    const discAmt = (gross - scheme) * (discPct / 100);
    const taxAmt = Number(row.tax_amount);
    const net = Number(row.amount);
    
    return {
        "S.No": index + 1,              
        "EAN Code": row.ean_code,       
        "Item Name": row.product_name,  
        "MRP": Number(row.mrp),         
        "Price": rate,
        "Qty": qty,
        "Sch": scheme,
        "Disc %": discPct,
        "GST %": 5,                     
        "Gross $": gross,               
        "Disc. $": discAmt,             
        "Taxable $": net - taxAmt,      
        "GST $": taxAmt,                
        "Net $": net,                   
        "_product_id": row.product_id
    };
});

// 4. Reset & Set
poLines.setValue([]); 
poLines.setValue(formattedLines);

// 5. Show Drawer
drawerCreatePO.show();
```

---

## Component_03c1217a (ID: 03c1217a)
```javascript
const fileData = fileBulkUpload.parsedValue[0];
// Helper to find column even if casing doesn't match
const get = (row, key) => {
    const found = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z]/g, '') === key.toLowerCase().replace(/[^a-z]/g, ''));
    return found ? row[found] : "";
};
const cleanRows = fileData.map(r => ({
    "Product ID":     get(r, "Product ID") || get(r, "ID"),
    "Product Name":   get(r, "Product Name"),
    "MRP":            get(r, "MRP"),
    "Purchase Rate":  get(r, "Purchase Rate"),
    "Distributor":    get(r, "Distributor Rate"),
    "Wholesale":      get(r, "Wholesale Rate"),
    "Dealer":         get(r, "Dealer Rate"),
    "Retail":         get(r, "Retail Rate"),
    "Case Qty":       get(r, "Case Qty"),
    "UOM":            get(r, "UOM"),
    "Model No":       get(r, "Model Number"),
    "Min Stock":      get(r, "Min Stock"),
    "Length":         get(r, "Length(cm)"),
    "Width":          get(r, "Width(cm)"),
    "Height":         get(r, "Height(cm)"),
    "Weight":         get(r, "Weight(kg)"),
    "Description":    get(r, "Description")
}));
varBulkData.setValue(cleanRows);
utils.showNotification({ title: "Loaded", description: `Review ${cleanRows.length} items below.` });
```

---

## jsGroupProducts (ID: 07c42d7d)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## varSelectedVendor (ID: 07e944b4)
```javascript
{{ self.values[0] }}
```

---

## table5 (ID: 0a421e23)
```javascript
api/stock/adjust/batches/{{ selAdjProduct.value }}?
```

---

## modalStockAdjust (ID: 0b32ad61)
```javascript
{{ varModalMode.value === 'bulk' ? 'Smart Bulk Update Manager' : 'New Product Import' }}
```

---

## addRestOfProducts (ID: 0d2f5ee6)
```javascript
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
```

---

## modalFrame1 (ID: 0d9fd925)
```javascript
create new vendor
```

---

## From (ID: 0e39b9fa)
```javascript
{{ new Date() }}
```

---

## triggerUpdatePO (ID: 12c3b750)
```javascript
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
```

---

## drawerVendorProfile (ID: 13381b9c)
```javascript
{{ currentSourceRow }}
```

---

## drawerCreatePO (ID: 15523a9f)
```javascript
Purchase Order
```

---

## modalAddAddress (ID: 1565b7c0)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## tblPendingBills (ID: 1bfcbac6)
```javascript
api/vendor-payments/ledger/{{ varSelectedVendor.value.id }}
```

---

## modalFrameDebitNote (ID: 1c799b0e)
```javascript
Create Debit Note
```

---

## table5 (ID: 1ca042bc)
```javascript
api/stock/adjust/batches/{{ selAdjProduct.value }}?
```

---

## varSelectedVendor (ID: 1d4637b5)
```javascript
{{ self.values[0] }}
```

---

## saveGRNJS (ID: 1d6afee0)
```javascript
/* --- UNIFIED GRN SAVE LOGIC --- */
// 1. Validate Lines
const rawLines = piLines.value || [];
const validLines = rawLines.filter(row => row.Qty && Number(row.Qty) > 0);
if (validLines.length === 0) {
  utils.showNotification({ title: "Error", description: "No items to save!", notificationType: "error" });
  return;
}
const vID = vendorDropdownGRN.value;
if (!vID) {
   utils.showNotification({ title: "Error", description: "Select a Vendor", notificationType: "error" });
   return;
}
// 2. Prepare Payload
const dbLines = validLines.map(row => ({
    // Ensure you map your Column IDs correctly here!
    product_id:         Number(row._product_id),
    ordered_qty:        0, 
    accepted_qty:       Number(row.Qty),
    rate:               Number(row.Price),
    discount_percent:   Number(row['Disc %'] || 0),
    scheme_amount:      Number(row.Sch || 0),
    tax_amount:         Number(row['GST $'] || 0),
    amount:             Number(row['Net $'] || 0),
    batch_number:       row["Batch No"] ? row["Batch No"].toString() : "",
    expiry_date:        row.Expiry ? moment(row.Expiry).format("YYYY-MM-DD") : null,
    mrp:                Number(row.MRP || 0)
}));
const totalNet = dbLines.reduce((acc, x) => acc + x.amount, 0); 
const totalTax = dbLines.reduce((acc, x) => acc + x.tax_amount, 0);
const finalPayload = {
    vendor_id:          Number(vID),
    purchase_order_id: Number(ChoosePo.value || 0),
    invoice_number:     vendorInvoiceNo.value,
    invoice_date:       dateVendorInvoice.value, // Ensure Moment/Date format matches
    received_date:      dateReceived.value,
    total_net:          totalNet,
    tax_amount:         totalTax,
    grand_total:        Math.round(totalNet + totalTax),
    lines:              dbLines,
    
    // --- TRACEABILITY MAGIC ---
    // If varCorrectionID has a value, we link this new GRN to the old one!
    parent_invoice_id:  varCorrectionID.value || null 
};
// 3. Save & Send
await varGRNPayload.setValue(finalPayload);
// Trigger Query
apiCreateGRN.trigger({
    onSuccess: function(data) {
        utils.showNotification({ title: "Success", description: "GRN Saved!", notificationType: "success" });
        
        // 4. CLEANUP (Critical)
        piLines.setValue([]);
        vendorDropdownGRN.clearValue();
        vendorInvoiceNo.setValue("");
        dateVendorInvoice.clearValue();
        varGRNPayload.setValue({});
        
        // Reset Correction Mode
        varCorrectionID.setValue(null);
        varCorrectionData.setValue({});
        
        modalFrameGRN.close();
    },
    onFailure: function(err) {
        console.error(err);
        utils.showNotification({ title: "Failed", description: err.message, notificationType: "error" });
    }
});
```

---

## Component_1d9a45da (ID: 1d9a45da)
```javascript
utils.showNotification({ title: "Success", description: `Imported ${varImportData.value.length} items`, notificationType: "success" });
varImportData.setValue([]); // Clear valid list
// Now the Modal will automatically reveal the Error Table (if any errors exist)
if (varImportErrors.value.length === 0) {
   modalFrameImport. hide(); // Close if no errors left
}
```

---

## Component_1dccc (ID: 1dccc)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## varSelectedVendor (ID: 1ddd3f8a)
```javascript
{{ self.values[0] }}
```

---

## getGRNList (ID: 205244ce)
```javascript
const allBills = getGRNList.data; // This comes from the Transformer above
const vID = varSelectedVendor.value.id;
// Simple JS Filter
return allBills.filter(bill => 
    bill['Vendor ID'] === vID && 
    bill['Balance $'] > 0
);
```

---

## getPOs (ID: 21afa3b5)
```javascript
api/products
```

---

## varPaymentAmount (ID: 225aa83a)
```javascript
api/vendor-payments/ledger/{{ varSelectedVendor.value.id }}
```

---

## drawerCreatePO (ID: 23f71d34)
```javascript
Purchase Order
```

---

## modalFrameGRN (ID: 24b15979)
```javascript
api/purchase-invoices?
```

---

## modalUpload (ID: 24c7cfe1)
```javascript
import
```

---

## Component_26b01 (ID: 26b01)
```javascript
Create Debit Note
```

---

## modalFrameDebitNote (ID: 26fb6eca)
```javascript
Create Debit Note
```

---

## varPOViewId (ID: 27de7ed4)
```javascript
/* --- UNIFIED VIEW SCRIPT (MATCHES CREATE KEYS) --- */
const data = getPOById.data;

if (!data || !data.header) {
  utils.showNotification({ title: "Error", description: "No Data", notificationType: "error" });
  return;
}

// 1. SET VIEW MODE (Safety)
varPOMode.setValue('VIEW'); // <--- ADDED THIS ✅

// 2. Map Header
vendorDropdown.setValue(data.header.vendor_id);
poNumber2.setValue(data.header.po_number);
date5.setValue(data.header.po_date);
date6.setValue(data.header.delivery_date);

// 3. Map Lines (Targeting EXACT Keys from Create Script)
const formattedLines = data.lines.map((row, index) => {
    // Inputs
    const qty = Number(row.ordered_qty);
    const rate = Number(row.rate);
    const discPct = Number(row.discount_percent || 0);
    const scheme = Number(row.scheme_amount || 0);
    
    // Math
    const gross = qty * rate;
    const discAmt = (gross - scheme) * (discPct / 100);
    const taxAmt = Number(row.tax_amount);
    const net = Number(row.amount);
    
    return {
        "S.No": index + 1,              
        "EAN Code": row.ean_code,       
        "Item Name": row.product_name,  
        "MRP": Number(row.mrp),         
        "Price": rate,
        "Qty": qty,
        "Sch": scheme,
        "Disc %": discPct,
        "GST %": 5,                     
        "Gross $": gross,               
        "Disc. $": discAmt,             
        "Taxable $": net - taxAmt,      
        "GST $": taxAmt,                
        "Net $": net,                   
        "_product_id": row.product_id
    };
});

// 4. Reset & Set
poLines.setValue([]); 
poLines.setValue(formattedLines);

// 5. Show Drawer
drawerCreatePO.show();
```

---

## apiAddAddress (ID: 2bb86968)
```javascript
api/master/banks
```

---

## modalViewGRN (ID: 2e5321bf)
```javascript
api/purchase-invoices
```

---

## populateDebitTableJS (ID: 2eaed529)
```javascript
Create Debit Note
```

---

## drawerProduct (ID: 317ce2a1)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## Component_345e7 (ID: 345e7)
```javascript
{{ currentSourceRow }}
```

---

## createDebitNoteJS (ID: 3834278b)
```javascript
const isItemMode = dnMode.value === "Item Return";
let amount = 0;
let lines = [];
if (isItemMode) {
    // Calculate from Table (Map to Backend Keys)
    const rawLines = tblDebitLines.data; 
    
    lines = rawLines.map(row => ({
        product_id: row._product_id, // Map from '_product_id'
        qty: Number(row.Qty),
        rate: Number(row.Price), // Map from 'Price'
        batch_number: row['Batch No'] || "", // Map from 'Batch No'
        return_type: row.Reason || "Damage",
        amount: Number(row['Net $']) || (Number(row.Qty) * Number(row.Price))
    })).filter(l => l.qty > 0);
    amount = _.sumBy(lines, 'amount');
} else {
    // Manual Amount
    amount = Number(dnAmount.value);
}
if (!amount || amount <= 0) {
   utils.showNotification({ title: "Error", description: "Invalid Amount", notificationType: "error" });
   return;
}
apiCreateDebitNote.trigger({
    additionalScope: {
        payload: {
            vendor_id: varSelectedVendor.value.id,
            amount: amount,
            debit_note_date: moment(dnDate.value).format("YYYY-MM-DD"),
            reason: dnReason.value,
            linked_invoice_id: selLinkedBill.value || null, // New field
            lines: isItemMode ? lines : [] 
        }
    },
    onSuccess: function(data) {
         // data contains { dn_number: 'GD-CLT-DN-26-1' }
        utils.showNotification({ title: "Debit Note Created", description: data.dn_number, notificationType: "success" });
        
        // Show the number in the box
        try { txtDNNumber.setValue(data.dn_number); } catch(e) {}
        modalDebitNote.close();
        getVendorLedger.trigger();
    }
});
```

---

## modalViewGRN (ID: 3882f0a1)
```javascript
api/purchase-invoices
```

---

## editPOHandler (ID: 390d2a27)
```javascript
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
```

---

## varSelectedVendor (ID: 3dfe3ee5)
```javascript
{{ self.values[0] }}
```

---

## getGRNList (ID: 3e04f9fa)
```javascript
const allBills = getGRNList.data; // This comes from the Transformer above
const vID = varSelectedVendor.value.id;
// Simple JS Filter
return allBills.filter(bill => 
    bill['Vendor ID'] === vID && 
    bill['Balance $'] > 0
);
```

---

## apiUpdateVendor (ID: 3ff8e71f)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## apiBulkImport (ID: 44423a9c)
```javascript
utils.showNotification({ title: "Success", description: `Imported ${varImportData.value.length} items`, notificationType: "success" });
varImportData.setValue([]); // Clear valid list
// Now the Modal will automatically reveal the Error Table (if any errors exist)
if (varImportErrors.value.length === 0) {
   modalFrameImport. hide(); // Close if no errors left
}
```

---

## Vendor (ID: 47d05770)
```javascript
**Total Gross:** {{ _.sum((poTable.data || []).map(r => Number(r["Gross $"] ?? 0))) }}
```

---

## modalFrameGRN (ID: 4a8977e7)
```javascript
api/purchase-invoices?
```

---

## varPaymentAmount (ID: 593fbfb3)
```javascript
api/vendor-payments/ledger/{{ varSelectedVendor.value.id }}
```

---

## varPaymentAmount (ID: 5d4f484e)
```javascript
api/vendor-payments/ledger/{{ varSelectedVendor.value.id }}
```

---

## modalFrameImport (ID: 5d79f963)
```javascript
add product in bulk
```

---

## savePOLine (ID: 625d8468)
```javascript
const all = Products.data.data || Products.data || []; 
// Group By Brand
const grouped = _.groupBy(all, 'brand_name');
// Return Array for ListView
return Object.keys(grouped).map((brandName, index) => {
    const products = grouped[brandName];
    // Grab the brand_id from the first product
    const brandId = products[0] ? products[0].brand_id : index; 
    // 1. Taxable Stock Value (Current Value of Goods on Hand - Taxable)
    const valStockTaxable = _.sumBy(products, p => Number(p.stock_value_cost || 0));
    // 2. Total Bought Value (Historical Value of All Goods Purchased - Taxable)
    const valTotalBought = _.sumBy(products, p => Number(p.stock_value_total_bought || 0));
    return {
        id: brandId,
        brand_name: brandName,
        product_count: products.length,
        val_stock_taxable: valStockTaxable.toFixed(2),
        val_total_bought: valTotalBought.toFixed(2),
        products: products.sort((a,b) => a.product_name.localeCompare(b.product_name))
    };
}).sort((a,b) => a.brand_name.localeCompare(b.brand_name));
```

---

## modalViewGRN (ID: 62977107)
```javascript
import
```

---

## Component_6b186525 (ID: 6b186525)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## Products (ID: 6bdcc412)
```javascript
utils.showNotification({ title: "Success", description: `Imported ${varImportData.value.length} items`, notificationType: "success" });
varImportData.setValue([]); // Clear valid list
// Now the Modal will automatically reveal the Error Table (if any errors exist)
if (varImportErrors.value.length === 0) {
   modalFrameImport. hide(); // Close if no errors left
}
```

---

## Component_6fdde6a9 (ID: 6fdde6a9)
```javascript
const isItemMode = dnMode.value === "Item Return";
let amount = 0;
let lines = [];
if (isItemMode) {
    // Calculate from Table (Map to Backend Keys)
    const rawLines = tblDebitLines.data; 
    
    lines = rawLines.map(row => ({
        product_id: row._product_id, // Map from '_product_id'
        qty: Number(row.Qty),
        rate: Number(row.Price), // Map from 'Price'
        batch_number: row['Batch No'] || "", // Map from 'Batch No'
        return_type: row.Reason || "Damage",
        amount: Number(row['Net $']) || (Number(row.Qty) * Number(row.Price))
    })).filter(l => l.qty > 0);
    amount = _.sumBy(lines, 'amount');
} else {
    // Manual Amount
    amount = Number(dnAmount.value);
}
if (!amount || amount <= 0) {
   utils.showNotification({ title: "Error", description: "Invalid Amount", notificationType: "error" });
   return;
}
apiCreateDebitNote.trigger({
    additionalScope: {
        payload: {
            vendor_id: varSelectedVendor.value.id,
            amount: amount,
            debit_note_date: moment(dnDate.value).format("YYYY-MM-DD"),
            reason: dnReason.value,
            linked_invoice_id: selLinkedBill.value || null, // New field
            lines: isItemMode ? lines : [] 
        }
    },
    onSuccess: function(data) {
         // data contains { dn_number: 'GD-CLT-DN-26-1' }
        utils.showNotification({ title: "Debit Note Created", description: data.dn_number, notificationType: "success" });
        
        // Show the number in the box
        try { txtDNNumber.setValue(data.dn_number); } catch(e) {}
        modalDebitNote.close();
        getVendorLedger.trigger();
    }
});
```

---

## Component_70360d30 (ID: 70360d30)
```javascript
****{{ item.brand_name }} | Count of Products:{{ item.product_count }}****
Taxable Stock Value: ₹{{ item.val_stock_taxable }} | Total Bought Value: ₹{{ item.val_total_bought }}
```

---

## varPOViewId (ID: 70a5182c)
```javascript
/* --- UNIFIED VIEW SCRIPT (MATCHES CREATE KEYS) --- */
const data = getPOById.data;

if (!data || !data.header) {
  utils.showNotification({ title: "Error", description: "No Data", notificationType: "error" });
  return;
}

// 1. SET VIEW MODE (Safety)
varPOMode.setValue('VIEW'); // <--- ADDED THIS ✅

// 2. Map Header
vendorDropdown.setValue(data.header.vendor_id);
poNumber2.setValue(data.header.po_number);
date5.setValue(data.header.po_date);
date6.setValue(data.header.delivery_date);

// 3. Map Lines (Targeting EXACT Keys from Create Script)
const formattedLines = data.lines.map((row, index) => {
    // Inputs
    const qty = Number(row.ordered_qty);
    const rate = Number(row.rate);
    const discPct = Number(row.discount_percent || 0);
    const scheme = Number(row.scheme_amount || 0);
    
    // Math
    const gross = qty * rate;
    const discAmt = (gross - scheme) * (discPct / 100);
    const taxAmt = Number(row.tax_amount);
    const net = Number(row.amount);
    
    return {
        "S.No": index + 1,              
        "EAN Code": row.ean_code,       
        "Item Name": row.product_name,  
        "MRP": Number(row.mrp),         
        "Price": rate,
        "Qty": qty,
        "Sch": scheme,
        "Disc %": discPct,
        "GST %": 5,                     
        "Gross $": gross,               
        "Disc. $": discAmt,             
        "Taxable $": net - taxAmt,      
        "GST $": taxAmt,                
        "Net $": net,                   
        "_product_id": row.product_id
    };
});

// 4. Reset & Set
poLines.setValue([]); 
poLines.setValue(formattedLines);

// 5. Show Drawer
drawerCreatePO.show();
```

---

## savePOLine (ID: 71a7f2e2)
```javascript
const all = Products.data.data || Products.data || []; 
// Group By Brand
const grouped = _.groupBy(all, 'brand_name');
// Return Array for ListView
return Object.keys(grouped).map((brandName, index) => {
    const products = grouped[brandName];
    // Grab the brand_id from the first product
    const brandId = products[0] ? products[0].brand_id : index; 
    // 1. Taxable Stock Value (Current Value of Goods on Hand - Taxable)
    const valStockTaxable = _.sumBy(products, p => Number(p.stock_value_cost || 0));
    // 2. Total Bought Value (Historical Value of All Goods Purchased - Taxable)
    const valTotalBought = _.sumBy(products, p => Number(p.stock_value_total_bought || 0));
    return {
        id: brandId,
        brand_name: brandName,
        product_count: products.length,
        val_stock_taxable: valStockTaxable.toFixed(2),
        val_total_bought: valTotalBought.toFixed(2),
        products: products.sort((a,b) => a.product_name.localeCompare(b.product_name))
    };
}).sort((a,b) => a.brand_name.localeCompare(b.brand_name));
```

---

## varSmartUpdateData (ID: 742c640b)
```javascript
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
```

---

## Component_7788f (ID: 7788f)
```javascript
api/vendor-payments/ledger/{{ varSelectedVendor.value.id }}
```

---

## modalFrameGRN (ID: 78b7135f)
```javascript
{{ ChoosePo.value }}
```

---

## poListTable (ID: 7a1efda6)
```javascript
{{ currentSourceRow.id }}
```

---

## drawerBrand (ID: 7ba1cfc8)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## modalAddAddress (ID: 7babc78d)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## modalMakePayment (ID: 7d367d48)
```javascript
api/vendor-payments/ledger/{{ varSelectedVendor.value.id }}
```

---

## varSelectedVendor (ID: 80f32b3a)
```javascript
{{ self.values[0] }}
```

---

## getGRNList (ID: 840edda7)
```javascript
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
```

---

## modalViewGRN (ID: 84d2e660)
```javascript
import
```

---

## apiBulkImport (ID: 856ad1a7)
```javascript
const fileData = fileBulkUpload.parsedValue[0];
// Helper to find column even if casing doesn't match
const get = (row, key) => {
    const found = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z]/g, '') === key.toLowerCase().replace(/[^a-z]/g, ''));
    return found ? row[found] : "";
};
const cleanRows = fileData.map(r => ({
    "Product ID":     get(r, "Product ID") || get(r, "ID"),
    "Product Name":   get(r, "Product Name"),
    "MRP":            get(r, "MRP"),
    "Purchase Rate":  get(r, "Purchase Rate"),
    "Distributor":    get(r, "Distributor Rate"),
    "Wholesale":      get(r, "Wholesale Rate"),
    "Dealer":         get(r, "Dealer Rate"),
    "Retail":         get(r, "Retail Rate"),
    "Case Qty":       get(r, "Case Qty"),
    "UOM":            get(r, "UOM"),
    "Model No":       get(r, "Model Number"),
    "Min Stock":      get(r, "Min Stock"),
    "Length":         get(r, "Length(cm)"),
    "Width":          get(r, "Width(cm)"),
    "Height":         get(r, "Height(cm)"),
    "Weight":         get(r, "Weight(kg)"),
    "Description":    get(r, "Description")
}));
varBulkData.setValue(cleanRows);
utils.showNotification({ title: "Loaded", description: `Review ${cleanRows.length} items below.` });
```

---

## Products (ID: 8f815b1f)
```javascript
utils.showNotification({ title: "Success", description: `Imported ${varImportData.value.length} items`, notificationType: "success" });
varImportData.setValue([]); // Clear valid list
// Now the Modal will automatically reveal the Error Table (if any errors exist)
if (varImportErrors.value.length === 0) {
   modalFrameImport. hide(); // Close if no errors left
}
```

---

## table8 (ID: 939d2007)
```javascript
api/finance/reconciliation/bank/unconsumed-debits
```

---

## savePaymentJS (ID: 957f3106)
```javascript
const vendor = varSelectedVendor.value;
const totalAmount = payAmount.value;
const isRefund = payType.value === 'REFUND';

// Validate
if (!totalAmount || totalAmount <= 0) {
    utils.showNotification({ title: "Error", description: "Enter valid amount", notificationType: "error" });
    return;
}

let allocations = [];
// ONLY calculate allocations if it is a PAYMENT
if (!isRefund) {
    const selectedBills = tblPendingBills.selectedSourceRows || []; 
    if (selectedBills.length > 0) {
        // FIFO Logic
        let remainingPayment = Number(totalAmount);
        for (const bill of selectedBills) {
            if (remainingPayment <= 0) break;
            const billBalance = Number(bill['Balance $']);
            const allocAmount = Math.min(billBalance, remainingPayment);
            
            if (allocAmount > 0) {
                allocations.push({
                    invoice_id: bill.id,
                    amount: allocAmount
                });
                remainingPayment -= allocAmount;
            }
        }
    }
}

// Trigger API
apiMakePayment.trigger({
    additionalScope: {
        payload: {
            vendor_id: vendor.id,
            amount: totalAmount,
            payment_date: moment(payDate.value).format("YYYY-MM-DD"),
            mode: payMode.value,
            // [NEW] Unified Reference logic
            transaction_ref: payMode.value === 'Online' ? selBankRefVendor.selectedItem.bank_ref_id : (payMode.value === 'Cheque' ? payChqNo.value : payRef.value),
            bank_statement_entry_id: payMode.value === 'Online' ? selBankRefVendor.selectedItem.id : null,
            remarks: payRemarks.value,
            transaction_type: payType.value,
            allocations: isRefund ? [] : allocations,
            bank_account_id: selPaymentBank.value,
            // [NEW] Cheque Details
            cheque_no: payChqNo.value,
            cheque_date: payChqDate.value,
            bank_name: payChqBank.value
        }
    },
    onSuccess: function() {
        modalMakePayment.close();
        getVendorLedger.trigger();
        getVendorPendingBills.trigger();
        utils.showNotification({ title: "Success", description: "Transaction Recorded", notificationType: "success" });
    }
});

```

---

## apiUpdateVendor (ID: 9604814d)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## modalViewGRN (ID: 9778ef35)
```javascript
api/purchase-invoices/{{ tblGrn.selectedRow.id }}/reverse
```

---

## jsLoadCorrectionData (ID: 98df4e51)
```javascript
const old = varCorrectionData.value;
if (!old) {
  utils.showNotification({title: "Error", description: "No correction data found.", notificationType: "error"});
  return;
}
// 1. Pre-fill Inputs (Using Your Confirmed Names)
// Vendor Dropdown
if (typeof vendorDropdownGRN !== 'undefined') {
   vendorDropdownGRN.setValue(old.vendor_id);
}
// Invoice Number
vendorInvoiceNo.setValue(old.vendor_invoice_number);
// Purchase Order (Restore Link)
if (old.purchase_order_id) {
   ChoosePo.setValue(old.purchase_order_id);
}
// Invoice Date
dateVendorInvoice.setValue(old.vendor_invoice_date);
// Receive Date
dateReceived.setValue(old.received_date);
// 2. Pre-fill Lines 
// We use 'piLines' because that is what the Save script uses.
if (old.lines || old.lines_json) {
   piLines.setValue(old.lines || old.lines_json);
}
utils.showNotification({title: "Data Loaded", description: "Edit the mistake and Click Save."});
```

---

## tblPendingBills (ID: 99140d0d)
```javascript
{{ self.values[0] }}
```

---

## Component_9b6227d8 (ID: 9b6227d8)
```javascript
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
```

---

## jsGroupProducts (ID: 9bcd2b7d)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## table8 (ID: 9cfdfc85)
```javascript
api/finance/reconciliation/bank/unconsumed-debits
```

---

## jsGroupProducts (ID: 9d7965e8)
```javascript
{{ collapsibleContainer1.showBody }}
```

---

## getPOs (ID: 9df08f06)
```javascript
{{ Products.data }}
```

---

## drawerCreatePO (ID: 9e3c5b4f)
```javascript
Purchase Order
```

---

## varSmartUpdateData (ID: 9f80700f)
```javascript
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
```

---

## apiUpdateVendor (ID: CancelBtn)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## vendorSelectJS (ID: ChoosePo)
```javascript
{{ ChoosePo.value }}
```

---

## getGRNList (ID: EditGrnTable)
```javascript
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
```

---

## GRN No (ID: GrnNo)
```javascript
api/purchase-invoices
```

---

## Component_Inventory_Management (ID: Inventory_Management)
```javascript
{{ self.values[0] }}
```

---

## Component_PopulateProductsTablebyVendors (ID: PopulateProductsTablebyVendors)
```javascript
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
```

---

## getPOs (ID: Products)
```javascript
api/products
```

---

## Component_Tax (ID: Tax)
```javascript
api/master/taxes
```

---

## Component_Vendors (ID: Vendors)
```javascript
api/vendors
```

---

## Component_a84e0b65 (ID: a84e0b65)
```javascript
._retool-drawer-content {
  width: 80vw !important;
  max-width: 1400px !important;
  left: 10vw !important;
}
```

---

## apiBulkImport (ID: a8af40a4)
```javascript
utils.showNotification({ title: "Success", description: `Imported ${varImportData.value.length} items`, notificationType: "success" });
varImportData.setValue([]); // Clear valid list
// Now the Modal will automatically reveal the Error Table (if any errors exist)
if (varImportErrors.value.length === 0) {
   modalFrameImport. hide(); // Close if no errors left
}
```

---

## getGRNList (ID: a93a0ae7)
```javascript
/* --- UNIFIED GRN SAVE LOGIC --- */
// 1. Validate Lines
const rawLines = piLines.value || [];
const validLines = rawLines.filter(row => row.Qty && Number(row.Qty) > 0);
if (validLines.length === 0) {
  utils.showNotification({ title: "Error", description: "No items to save!", notificationType: "error" });
  return;
}
const vID = vendorDropdownGRN.value;
if (!vID) {
   utils.showNotification({ title: "Error", description: "Select a Vendor", notificationType: "error" });
   return;
}
// 2. Prepare Payload
const dbLines = validLines.map(row => ({
    // Ensure you map your Column IDs correctly here!
    product_id:         Number(row._product_id),
    ordered_qty:        0, 
    accepted_qty:       Number(row.Qty),
    rate:               Number(row.Price),
    discount_percent:   Number(row['Disc %'] || 0),
    scheme_amount:      Number(row.Sch || 0),
    tax_amount:         Number(row['GST $'] || 0),
    amount:             Number(row['Net $'] || 0),
    batch_number:       row["Batch No"] ? row["Batch No"].toString() : "",
    expiry_date:        row.Expiry ? moment(row.Expiry).format("YYYY-MM-DD") : null,
    mrp:                Number(row.MRP || 0)
}));
const totalNet = dbLines.reduce((acc, x) => acc + x.amount, 0); 
const totalTax = dbLines.reduce((acc, x) => acc + x.tax_amount, 0);
const finalPayload = {
    vendor_id:          Number(vID),
    purchase_order_id: Number(ChoosePo.value || 0),
    invoice_number:     vendorInvoiceNo.value,
    invoice_date:       dateVendorInvoice.value, // Ensure Moment/Date format matches
    received_date:      dateReceived.value,
    total_net:          totalNet,
    tax_amount:         totalTax,
    grand_total:        Math.round(totalNet + totalTax),
    lines:              dbLines,
    
    // --- TRACEABILITY MAGIC ---
    // If varCorrectionID has a value, we link this new GRN to the old one!
    parent_invoice_id:  varCorrectionID.value || null 
};
// 3. Save & Send
await varGRNPayload.setValue(finalPayload);
// Trigger Query
apiCreateGRN.trigger({
    onSuccess: function(data) {
        utils.showNotification({ title: "Success", description: "GRN Saved!", notificationType: "success" });
        
        // 4. CLEANUP (Critical)
        piLines.setValue([]);
        vendorDropdownGRN.clearValue();
        vendorInvoiceNo.setValue("");
        dateVendorInvoice.clearValue();
        varGRNPayload.setValue({});
        
        // Reset Correction Mode
        varCorrectionID.setValue(null);
        varCorrectionData.setValue({});
        
        modalFrameGRN.close();
    },
    onFailure: function(err) {
        console.error(err);
        utils.showNotification({ title: "Failed", description: err.message, notificationType: "error" });
    }
});
```

---

## EditGrnTable (ID: a9b3d51a)
```javascript
api/purchase-invoices?
```

---

## modalFrameDebitNote (ID: a9edee07)
```javascript
Create Debit Note
```

---

## apiCreateProduct (ID: adae4500)
```javascript
api/master/brands
```

---

## addRestOfProducts (ID: addRestOfProducts)
```javascript
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
```

---

## addRestOfProducts (ID: addRestOfProductsButton)
```javascript
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
```

---

## varGRNList (ID: ae2449fc)
```javascript
{{ ChoosePo.value }}
```

---

## jsParseSmartUpload (ID: ae6c93cb)
```javascript
const fileData = fileBulkUpload.parsedValue[0];
// Helper to find column even if casing doesn't match
const get = (row, key) => {
    const found = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z]/g, '') === key.toLowerCase().replace(/[^a-z]/g, ''));
    return found ? row[found] : "";
};
const cleanRows = fileData.map(r => ({
    "Product ID":     get(r, "Product ID") || get(r, "ID"),
    "Product Name":   get(r, "Product Name"),
    "MRP":            get(r, "MRP"),
    "Purchase Rate":  get(r, "Purchase Rate"),
    "Distributor":    get(r, "Distributor Rate"),
    "Wholesale":      get(r, "Wholesale Rate"),
    "Dealer":         get(r, "Dealer Rate"),
    "Retail":         get(r, "Retail Rate"),
    "Case Qty":       get(r, "Case Qty"),
    "UOM":            get(r, "UOM"),
    "Model No":       get(r, "Model Number"),
    "Min Stock":      get(r, "Min Stock"),
    "Length":         get(r, "Length(cm)"),
    "Width":          get(r, "Width(cm)"),
    "Height":         get(r, "Height(cm)"),
    "Weight":         get(r, "Weight(kg)"),
    "Description":    get(r, "Description")
}));
varBulkData.setValue(cleanRows);
utils.showNotification({ title: "Loaded", description: `Review ${cleanRows.length} items below.` });
```

---

## apiBulkImport (ID: ae792b4a)
```javascript
const fileData = fileBulkUpload.parsedValue[0];
// Helper to find column even if casing doesn't match
const get = (row, key) => {
    const found = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z]/g, '') === key.toLowerCase().replace(/[^a-z]/g, ''));
    return found ? row[found] : "";
};
const cleanRows = fileData.map(r => ({
    "Product ID":     get(r, "Product ID") || get(r, "ID"),
    "Product Name":   get(r, "Product Name"),
    "MRP":            get(r, "MRP"),
    "Purchase Rate":  get(r, "Purchase Rate"),
    "Distributor":    get(r, "Distributor Rate"),
    "Wholesale":      get(r, "Wholesale Rate"),
    "Dealer":         get(r, "Dealer Rate"),
    "Retail":         get(r, "Retail Rate"),
    "Case Qty":       get(r, "Case Qty"),
    "UOM":            get(r, "UOM"),
    "Model No":       get(r, "Model Number"),
    "Min Stock":      get(r, "Min Stock"),
    "Length":         get(r, "Length(cm)"),
    "Width":          get(r, "Width(cm)"),
    "Height":         get(r, "Height(cm)"),
    "Weight":         get(r, "Weight(kg)"),
    "Description":    get(r, "Description")
}));
varBulkData.setValue(cleanRows);
utils.showNotification({ title: "Loaded", description: `Review ${cleanRows.length} items below.` });
```

---

## Component_apiAddAddress (ID: apiAddAddress)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}/addresses
```

---

## Component_apiBaseUrl (ID: apiBaseUrl)
```javascript
"https://distribution-erp.onrender.com"
```

---

## Component_apiBulkImport (ID: apiBulkImport)
```javascript
api/products/import
```

---

## Component_apiBulkUpdate (ID: apiBulkUpdate)
```javascript
api/products/bulk-update
```

---

## Component_apiCreateDebitNote (ID: apiCreateDebitNote)
```javascript
api/debit-notes
```

---

## Component_apiCreateGRN (ID: apiCreateGRN)
```javascript
api/purchase-invoices
```

---

## Component_apiCreateProduct (ID: apiCreateProduct)
```javascript
api/products
```

---

## Component_apiCreateStockAdjustment (ID: apiCreateStockAdjustment)
```javascript
api/stock/adjust
```

---

## Component_apiCreateVendor (ID: apiCreateVendor)
```javascript
api/vendors
```

---

## Component_apiGetAddresses (ID: apiGetAddresses)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}/addresses
```

---

## Component_apiGetBank (ID: apiGetBank)
```javascript
api/master/banks
```

---

## Component_apiGetBatches (ID: apiGetBatches)
```javascript
api/stock/adjust/batches/{{ selAdjProduct.value }}?
```

---

## drawerProduct (ID: apiGetProductStats)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## modalAddAddress (ID: apiGetVendor)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## Component_apiMakePayment (ID: apiMakePayment)
```javascript
api/vendor-payments
```

---

## Component_apiReverseGRN (ID: apiReverseGRN)
```javascript
api/purchase-invoices/{{ tblGrn.selectedRow.id }}/reverse
```

---

## varIsEditing (ID: apiUpdateVendor)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## table5 (ID: b43076b1)
```javascript
api/stock/adjust/batches/{{ selAdjProduct.value }}?
```

---

## varPOViewId (ID: b59e20c5)
```javascript
/* --- UNIFIED VIEW SCRIPT (MATCHES CREATE KEYS) --- */
const data = getPOById.data;

if (!data || !data.header) {
  utils.showNotification({ title: "Error", description: "No Data", notificationType: "error" });
  return;
}

// 1. SET VIEW MODE (Safety)
varPOMode.setValue('VIEW'); // <--- ADDED THIS ✅

// 2. Map Header
vendorDropdown.setValue(data.header.vendor_id);
poNumber2.setValue(data.header.po_number);
date5.setValue(data.header.po_date);
date6.setValue(data.header.delivery_date);

// 3. Map Lines (Targeting EXACT Keys from Create Script)
const formattedLines = data.lines.map((row, index) => {
    // Inputs
    const qty = Number(row.ordered_qty);
    const rate = Number(row.rate);
    const discPct = Number(row.discount_percent || 0);
    const scheme = Number(row.scheme_amount || 0);
    
    // Math
    const gross = qty * rate;
    const discAmt = (gross - scheme) * (discPct / 100);
    const taxAmt = Number(row.tax_amount);
    const net = Number(row.amount);
    
    return {
        "S.No": index + 1,              
        "EAN Code": row.ean_code,       
        "Item Name": row.product_name,  
        "MRP": Number(row.mrp),         
        "Price": rate,
        "Qty": qty,
        "Sch": scheme,
        "Disc %": discPct,
        "GST %": 5,                     
        "Gross $": gross,               
        "Disc. $": discAmt,             
        "Taxable $": net - taxAmt,      
        "GST $": taxAmt,                
        "Net $": net,                   
        "_product_id": row.product_id
    };
});

// 4. Reset & Set
poLines.setValue([]); 
poLines.setValue(formattedLines);

// 5. Show Drawer
drawerCreatePO.show();
```

---

## modalUpload (ID: b7862f4a)
```javascript
Inventory Adjustment
```

---

## Component_bab39 (ID: bab39)
```javascript
/* --- UNIFIED VIEW SCRIPT (MATCHES CREATE KEYS) --- */
const data = getPOById.data;

if (!data || !data.header) {
  utils.showNotification({ title: "Error", description: "No Data", notificationType: "error" });
  return;
}

// 1. SET VIEW MODE (Safety)
varPOMode.setValue('VIEW'); // <--- ADDED THIS ✅

// 2. Map Header
vendorDropdown.setValue(data.header.vendor_id);
poNumber2.setValue(data.header.po_number);
date5.setValue(data.header.po_date);
date6.setValue(data.header.delivery_date);

// 3. Map Lines (Targeting EXACT Keys from Create Script)
const formattedLines = data.lines.map((row, index) => {
    // Inputs
    const qty = Number(row.ordered_qty);
    const rate = Number(row.rate);
    const discPct = Number(row.discount_percent || 0);
    const scheme = Number(row.scheme_amount || 0);
    
    // Math
    const gross = qty * rate;
    const discAmt = (gross - scheme) * (discPct / 100);
    const taxAmt = Number(row.tax_amount);
    const net = Number(row.amount);
    
    return {
        "S.No": index + 1,              
        "EAN Code": row.ean_code,       
        "Item Name": row.product_name,  
        "MRP": Number(row.mrp),         
        "Price": rate,
        "Qty": qty,
        "Sch": scheme,
        "Disc %": discPct,
        "GST %": 5,                     
        "Gross $": gross,               
        "Disc. $": discAmt,             
        "Taxable $": net - taxAmt,      
        "GST $": taxAmt,                
        "Net $": net,                   
        "_product_id": row.product_id
    };
});

// 4. Reset & Set
poLines.setValue([]); 
poLines.setValue(formattedLines);

// 5. Show Drawer
drawerCreatePO.show();
```

---

## varPaymentAmount (ID: bbec462a)
```javascript
api/vendor-payments/ledger/{{ varSelectedVendor.value.id }}
```

---

## drawerVendorProfile (ID: bd4aac4f)
```javascript
{{ currentSourceRow }}
```

---

## tblDebitLines (ID: bd9f5448)
```javascript
const isItemMode = dnMode.value === "Item Return";
let amount = 0;
let lines = [];
if (isItemMode) {
    // Calculate from Table (Map to Backend Keys)
    const rawLines = tblDebitLines.data; 
    
    lines = rawLines.map(row => ({
        product_id: row._product_id, // Map from '_product_id'
        qty: Number(row.Qty),
        rate: Number(row.Price), // Map from 'Price'
        batch_number: row['Batch No'] || "", // Map from 'Batch No'
        return_type: row.Reason || "Damage",
        amount: Number(row['Net $']) || (Number(row.Qty) * Number(row.Price))
    })).filter(l => l.qty > 0);
    amount = _.sumBy(lines, 'amount');
} else {
    // Manual Amount
    amount = Number(dnAmount.value);
}
if (!amount || amount <= 0) {
   utils.showNotification({ title: "Error", description: "Invalid Amount", notificationType: "error" });
   return;
}
apiCreateDebitNote.trigger({
    additionalScope: {
        payload: {
            vendor_id: varSelectedVendor.value.id,
            amount: amount,
            debit_note_date: moment(dnDate.value).format("YYYY-MM-DD"),
            reason: dnReason.value,
            linked_invoice_id: selLinkedBill.value || null, // New field
            lines: isItemMode ? lines : [] 
        }
    },
    onSuccess: function(data) {
         // data contains { dn_number: 'GD-CLT-DN-26-1' }
        utils.showNotification({ title: "Debit Note Created", description: data.dn_number, notificationType: "success" });
        
        // Show the number in the box
        try { txtDNNumber.setValue(data.dn_number); } catch(e) {}
        modalDebitNote.close();
        getVendorLedger.trigger();
    }
});
```

---

## tblDebitLines (ID: befeb109)
```javascript
const isItemMode = dnMode.value === "Item Return";
let amount = 0;
let lines = [];
if (isItemMode) {
    // Calculate from Table (Map to Backend Keys)
    const rawLines = tblDebitLines.data; 
    
    lines = rawLines.map(row => ({
        product_id: row._product_id, // Map from '_product_id'
        qty: Number(row.Qty),
        rate: Number(row.Price), // Map from 'Price'
        batch_number: row['Batch No'] || "", // Map from 'Batch No'
        return_type: row.Reason || "Damage",
        amount: Number(row['Net $']) || (Number(row.Qty) * Number(row.Price))
    })).filter(l => l.qty > 0);
    amount = _.sumBy(lines, 'amount');
} else {
    // Manual Amount
    amount = Number(dnAmount.value);
}
if (!amount || amount <= 0) {
   utils.showNotification({ title: "Error", description: "Invalid Amount", notificationType: "error" });
   return;
}
apiCreateDebitNote.trigger({
    additionalScope: {
        payload: {
            vendor_id: varSelectedVendor.value.id,
            amount: amount,
            debit_note_date: moment(dnDate.value).format("YYYY-MM-DD"),
            reason: dnReason.value,
            linked_invoice_id: selLinkedBill.value || null, // New field
            lines: isItemMode ? lines : [] 
        }
    },
    onSuccess: function(data) {
         // data contains { dn_number: 'GD-CLT-DN-26-1' }
        utils.showNotification({ title: "Debit Note Created", description: data.dn_number, notificationType: "success" });
        
        // Show the number in the box
        try { txtDNNumber.setValue(data.dn_number); } catch(e) {}
        modalDebitNote.close();
        getVendorLedger.trigger();
    }
});
```

---

## apiBulkImport (ID: btnConfirmImport)
```javascript
utils.showNotification({ title: "Success", description: `Imported ${varImportData.value.length} items`, notificationType: "success" });
varImportData.setValue([]); // Clear valid list
// Now the Modal will automatically reveal the Error Table (if any errors exist)
if (varImportErrors.value.length === 0) {
   modalFrameImport. hide(); // Close if no errors left
}
```

---

## Component_btnDownloadErrors (ID: btnDownloadErrors)
```javascript
utils.showNotification({ title: "Success", description: `Imported ${varImportData.value.length} items`, notificationType: "success" });
varImportData.setValue([]); // Clear valid list
// Now the Modal will automatically reveal the Error Table (if any errors exist)
if (varImportErrors.value.length === 0) {
   modalFrameImport. hide(); // Close if no errors left
}
```

---

## Component_btnDownloadTemplate (ID: btnDownloadTemplate)
```javascript
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
```

---

## jsLoadCorrectionData (ID: btnLoadCorrectionData)
```javascript
const old = varCorrectionData.value;
if (!old) {
  utils.showNotification({title: "Error", description: "No correction data found.", notificationType: "error"});
  return;
}
// 1. Pre-fill Inputs (Using Your Confirmed Names)
// Vendor Dropdown
if (typeof vendorDropdownGRN !== 'undefined') {
   vendorDropdownGRN.setValue(old.vendor_id);
}
// Invoice Number
vendorInvoiceNo.setValue(old.vendor_invoice_number);
// Purchase Order (Restore Link)
if (old.purchase_order_id) {
   ChoosePo.setValue(old.purchase_order_id);
}
// Invoice Date
dateVendorInvoice.setValue(old.vendor_invoice_date);
// Receive Date
dateReceived.setValue(old.received_date);
// 2. Pre-fill Lines 
// We use 'piLines' because that is what the Save script uses.
if (old.lines || old.lines_json) {
   piLines.setValue(old.lines || old.lines_json);
}
utils.showNotification({title: "Data Loaded", description: "Edit the mistake and Click Save."});
```

---

## Retail Price (ID: btnSaveProduct)
```javascript
api/master/brands
```

---

## Component_btnSmartExport (ID: btnSmartExport)
```javascript
const fileData = fileBulkUpload.parsedValue[0];
// Helper to find column even if casing doesn't match
const get = (row, key) => {
    const found = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z]/g, '') === key.toLowerCase().replace(/[^a-z]/g, ''));
    return found ? row[found] : "";
};
const cleanRows = fileData.map(r => ({
    "Product ID":     get(r, "Product ID") || get(r, "ID"),
    "Product Name":   get(r, "Product Name"),
    "MRP":            get(r, "MRP"),
    "Purchase Rate":  get(r, "Purchase Rate"),
    "Distributor":    get(r, "Distributor Rate"),
    "Wholesale":      get(r, "Wholesale Rate"),
    "Dealer":         get(r, "Dealer Rate"),
    "Retail":         get(r, "Retail Rate"),
    "Case Qty":       get(r, "Case Qty"),
    "UOM":            get(r, "UOM"),
    "Model No":       get(r, "Model Number"),
    "Min Stock":      get(r, "Min Stock"),
    "Length":         get(r, "Length(cm)"),
    "Width":          get(r, "Width(cm)"),
    "Height":         get(r, "Height(cm)"),
    "Weight":         get(r, "Weight(kg)"),
    "Description":    get(r, "Description")
}));
varBulkData.setValue(cleanRows);
utils.showNotification({ title: "Loaded", description: `Review ${cleanRows.length} items below.` });
```

---

## apiUpdateVendor (ID: btnUpdateInfo)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## Component_button1 (ID: button1)
```javascript
._retool-drawer-content {
  width: 80vw !important;
  max-width: 1400px !important;
  left: 10vw !important;
}
```

---

## populateDebitTableJS (ID: button10)
```javascript
Create Debit Note
```

---

## createDebitNoteJS (ID: button11)
```javascript
const isItemMode = dnMode.value === "Item Return";
let amount = 0;
let lines = [];
if (isItemMode) {
    // Calculate from Table (Map to Backend Keys)
    const rawLines = tblDebitLines.data; 
    
    lines = rawLines.map(row => ({
        product_id: row._product_id, // Map from '_product_id'
        qty: Number(row.Qty),
        rate: Number(row.Price), // Map from 'Price'
        batch_number: row['Batch No'] || "", // Map from 'Batch No'
        return_type: row.Reason || "Damage",
        amount: Number(row['Net $']) || (Number(row.Qty) * Number(row.Price))
    })).filter(l => l.qty > 0);
    amount = _.sumBy(lines, 'amount');
} else {
    // Manual Amount
    amount = Number(dnAmount.value);
}
if (!amount || amount <= 0) {
   utils.showNotification({ title: "Error", description: "Invalid Amount", notificationType: "error" });
   return;
}
apiCreateDebitNote.trigger({
    additionalScope: {
        payload: {
            vendor_id: varSelectedVendor.value.id,
            amount: amount,
            debit_note_date: moment(dnDate.value).format("YYYY-MM-DD"),
            reason: dnReason.value,
            linked_invoice_id: selLinkedBill.value || null, // New field
            lines: isItemMode ? lines : [] 
        }
    },
    onSuccess: function(data) {
         // data contains { dn_number: 'GD-CLT-DN-26-1' }
        utils.showNotification({ title: "Debit Note Created", description: data.dn_number, notificationType: "success" });
        
        // Show the number in the box
        try { txtDNNumber.setValue(data.dn_number); } catch(e) {}
        modalDebitNote.close();
        getVendorLedger.trigger();
    }
});
```

---

## varIsEditing (ID: button13)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## City (ID: button14)
```javascript
api/master/banks
```

---

## Component_button17 (ID: button17)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## jsGroupProducts (ID: button18)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## Component_button2 (ID: button2)
```javascript
{{ currentSourceRow.id }}
```

---

## editPOHandler (ID: button4)
```javascript
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
```

---

## editPOHandler (ID: button5)
```javascript
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
```

---

## modalFrameGRN (ID: button6)
```javascript
api/purchase-invoices?
```

---

## getGRNList (ID: button7)
```javascript
/* --- UNIFIED GRN SAVE LOGIC --- */
// 1. Validate Lines
const rawLines = piLines.value || [];
const validLines = rawLines.filter(row => row.Qty && Number(row.Qty) > 0);
if (validLines.length === 0) {
  utils.showNotification({ title: "Error", description: "No items to save!", notificationType: "error" });
  return;
}
const vID = vendorDropdownGRN.value;
if (!vID) {
   utils.showNotification({ title: "Error", description: "Select a Vendor", notificationType: "error" });
   return;
}
// 2. Prepare Payload
const dbLines = validLines.map(row => ({
    // Ensure you map your Column IDs correctly here!
    product_id:         Number(row._product_id),
    ordered_qty:        0, 
    accepted_qty:       Number(row.Qty),
    rate:               Number(row.Price),
    discount_percent:   Number(row['Disc %'] || 0),
    scheme_amount:      Number(row.Sch || 0),
    tax_amount:         Number(row['GST $'] || 0),
    amount:             Number(row['Net $'] || 0),
    batch_number:       row["Batch No"] ? row["Batch No"].toString() : "",
    expiry_date:        row.Expiry ? moment(row.Expiry).format("YYYY-MM-DD") : null,
    mrp:                Number(row.MRP || 0)
}));
const totalNet = dbLines.reduce((acc, x) => acc + x.amount, 0); 
const totalTax = dbLines.reduce((acc, x) => acc + x.tax_amount, 0);
const finalPayload = {
    vendor_id:          Number(vID),
    purchase_order_id: Number(ChoosePo.value || 0),
    invoice_number:     vendorInvoiceNo.value,
    invoice_date:       dateVendorInvoice.value, // Ensure Moment/Date format matches
    received_date:      dateReceived.value,
    total_net:          totalNet,
    tax_amount:         totalTax,
    grand_total:        Math.round(totalNet + totalTax),
    lines:              dbLines,
    
    // --- TRACEABILITY MAGIC ---
    // If varCorrectionID has a value, we link this new GRN to the old one!
    parent_invoice_id:  varCorrectionID.value || null 
};
// 3. Save & Send
await varGRNPayload.setValue(finalPayload);
// Trigger Query
apiCreateGRN.trigger({
    onSuccess: function(data) {
        utils.showNotification({ title: "Success", description: "GRN Saved!", notificationType: "success" });
        
        // 4. CLEANUP (Critical)
        piLines.setValue([]);
        vendorDropdownGRN.clearValue();
        vendorInvoiceNo.setValue("");
        dateVendorInvoice.clearValue();
        varGRNPayload.setValue({});
        
        // Reset Correction Mode
        varCorrectionID.setValue(null);
        varCorrectionData.setValue({});
        
        modalFrameGRN.close();
    },
    onFailure: function(err) {
        console.error(err);
        utils.showNotification({ title: "Failed", description: err.message, notificationType: "error" });
    }
});
```

---

## varPaymentAmount (ID: button8)
```javascript
api/vendor-payments/ledger/{{ varSelectedVendor.value.id }}
```

---

## Remarks (ID: button9)
```javascript
const vendor = varSelectedVendor.value;
const totalAmount = payAmount.value;
const isRefund = payType.value === 'REFUND';

// Validate
if (!totalAmount || totalAmount <= 0) {
    utils.showNotification({ title: "Error", description: "Enter valid amount", notificationType: "error" });
    return;
}

let allocations = [];
// ONLY calculate allocations if it is a PAYMENT
if (!isRefund) {
    const selectedBills = tblPendingBills.selectedSourceRows || []; 
    if (selectedBills.length > 0) {
        // FIFO Logic
        let remainingPayment = Number(totalAmount);
        for (const bill of selectedBills) {
            if (remainingPayment <= 0) break;
            const billBalance = Number(bill['Balance $']);
            const allocAmount = Math.min(billBalance, remainingPayment);
            
            if (allocAmount > 0) {
                allocations.push({
                    invoice_id: bill.id,
                    amount: allocAmount
                });
                remainingPayment -= allocAmount;
            }
        }
    }
}

// Trigger API
apiMakePayment.trigger({
    additionalScope: {
        payload: {
            vendor_id: vendor.id,
            amount: totalAmount,
            payment_date: moment(payDate.value).format("YYYY-MM-DD"),
            mode: payMode.value,
            // [NEW] Unified Reference logic
            transaction_ref: payMode.value === 'Online' ? selBankRefVendor.selectedItem.bank_ref_id : (payMode.value === 'Cheque' ? payChqNo.value : payRef.value),
            bank_statement_entry_id: payMode.value === 'Online' ? selBankRefVendor.selectedItem.id : null,
            remarks: payRemarks.value,
            transaction_type: payType.value,
            allocations: isRefund ? [] : allocations,
            bank_account_id: selPaymentBank.value,
            // [NEW] Cheque Details
            cheque_no: payChqNo.value,
            cheque_date: payChqDate.value,
            bank_name: payChqBank.value
        }
    },
    onSuccess: function() {
        modalMakePayment.close();
        getVendorLedger.trigger();
        getVendorPendingBills.trigger();
        utils.showNotification({ title: "Success", description: "Transaction Recorded", notificationType: "success" });
    }
});

```

---

## varIsEditing (ID: c0130446)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## createDebitNoteJS (ID: c11b8df0)
```javascript
const isItemMode = dnMode.value === "Item Return";
let amount = 0;
let lines = [];
if (isItemMode) {
    // Calculate from Table (Map to Backend Keys)
    const rawLines = tblDebitLines.data; 
    
    lines = rawLines.map(row => ({
        product_id: row._product_id, // Map from '_product_id'
        qty: Number(row.Qty),
        rate: Number(row.Price), // Map from 'Price'
        batch_number: row['Batch No'] || "", // Map from 'Batch No'
        return_type: row.Reason || "Damage",
        amount: Number(row['Net $']) || (Number(row.Qty) * Number(row.Price))
    })).filter(l => l.qty > 0);
    amount = _.sumBy(lines, 'amount');
} else {
    // Manual Amount
    amount = Number(dnAmount.value);
}
if (!amount || amount <= 0) {
   utils.showNotification({ title: "Error", description: "Invalid Amount", notificationType: "error" });
   return;
}
apiCreateDebitNote.trigger({
    additionalScope: {
        payload: {
            vendor_id: varSelectedVendor.value.id,
            amount: amount,
            debit_note_date: moment(dnDate.value).format("YYYY-MM-DD"),
            reason: dnReason.value,
            linked_invoice_id: selLinkedBill.value || null, // New field
            lines: isItemMode ? lines : [] 
        }
    },
    onSuccess: function(data) {
         // data contains { dn_number: 'GD-CLT-DN-26-1' }
        utils.showNotification({ title: "Debit Note Created", description: data.dn_number, notificationType: "success" });
        
        // Show the number in the box
        try { txtDNNumber.setValue(data.dn_number); } catch(e) {}
        modalDebitNote.close();
        getVendorLedger.trigger();
    }
});
```

---

## drawerVendorProfile (ID: c45d74c9)
```javascript
{{ self.values[0] }}
```

---

## tblDebitLines (ID: c57b78e1)
```javascript
const isItemMode = dnMode.value === "Item Return";
let amount = 0;
let lines = [];
if (isItemMode) {
    // Calculate from Table (Map to Backend Keys)
    const rawLines = tblDebitLines.data; 
    
    lines = rawLines.map(row => ({
        product_id: row._product_id, // Map from '_product_id'
        qty: Number(row.Qty),
        rate: Number(row.Price), // Map from 'Price'
        batch_number: row['Batch No'] || "", // Map from 'Batch No'
        return_type: row.Reason || "Damage",
        amount: Number(row['Net $']) || (Number(row.Qty) * Number(row.Price))
    })).filter(l => l.qty > 0);
    amount = _.sumBy(lines, 'amount');
} else {
    // Manual Amount
    amount = Number(dnAmount.value);
}
if (!amount || amount <= 0) {
   utils.showNotification({ title: "Error", description: "Invalid Amount", notificationType: "error" });
   return;
}
apiCreateDebitNote.trigger({
    additionalScope: {
        payload: {
            vendor_id: varSelectedVendor.value.id,
            amount: amount,
            debit_note_date: moment(dnDate.value).format("YYYY-MM-DD"),
            reason: dnReason.value,
            linked_invoice_id: selLinkedBill.value || null, // New field
            lines: isItemMode ? lines : [] 
        }
    },
    onSuccess: function(data) {
         // data contains { dn_number: 'GD-CLT-DN-26-1' }
        utils.showNotification({ title: "Debit Note Created", description: data.dn_number, notificationType: "success" });
        
        // Show the number in the box
        try { txtDNNumber.setValue(data.dn_number); } catch(e) {}
        modalDebitNote.close();
        getVendorLedger.trigger();
    }
});
```

---

## modalFrameGRN (ID: c7f67e36)
```javascript
api/purchase-invoices?
```

---

## populateDebitTableJS (ID: ca8cae19)
```javascript
Create Debit Note
```

---

## Pin Code (ID: chkNewDefault)
```javascript
return {
  "Andhra Pradesh": [
    "Anantapur", "Chittoor", "East Godavari", "Guntur", "Kadapa",
    "Krishna", "Kurnool", "Nellore", "Prakasam",
    "Srikakulam", "Visakhapatnam", "Vizianagaram",
    "West Godavari"
  ],

  "Arunachal Pradesh": [
    "Anjaw", "Changlang", "Dibang Valley", "East Kameng",
    "East Siang", "Kurung Kumey", "Lohit", "Lower Dibang Valley",
    "Lower Subansiri", "Papum Pare", "Tawang",
    "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"
  ],

  "Assam": [
    "Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar",
    "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri",
    "Dibrugarh", "Goalpara", "Golaghat", "Hailakandi",
    "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan",
    "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur",
    "Majuli", "Morigaon", "Nagaon", "Nalbari",
    "Sivasagar", "Sonitpur", "South Salmara",
    "Tinsukia", "Udalguri", "West Karbi Anglong"
  ],

  "Bihar": [
    "Araria", "Arwal", "Aurangabad", "Banka", "Begusarai",
    "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga",
    "East Champaran", "Gaya", "Gopalganj", "Jamui",
    "Jehanabad", "Kaimur", "Katihar", "Khagaria",
    "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani",
    "Munger", "Muzaffarpur", "Nalanda", "Nawada",
    "Patna", "Purnia", "Rohtas", "Saharsa",
    "Samastipur", "Saran", "Sheikhpura", "Sheohar",
    "Sitamarhi", "Siwan", "Supaul", "Vaishali",
    "West Champaran"
  ],

  "Chhattisgarh": [
    "Balod", "Baloda Bazar", "Balrampur", "Bastar",
    "Bemetara", "Bijapur", "Bilaspur", "Dantewada",
    "Dhamtari", "Durg", "Gariaband", "Gaurela-Pendra-Marwahi",
    "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker",
    "Kondagaon", "Korba", "Koriya", "Mahasamund",
    "Mungeli", "Narayanpur", "Raigarh", "Raipur",
    "Rajnandgaon", "Sukma", "Surajpur", "Surguja"
  ],

  "Goa": ["North Goa", "South Goa"],

  "Gujarat": [
    "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha",
    "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur",
    "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar",
    "Gir Somnath", "Jamnagar", "Junagadh", "Kheda",
    "Kutch", "Mahisagar", "Mehsana", "Morbi",
    "Narmada", "Navsari", "Panchmahal", "Patan",
    "Porbandar", "Rajkot", "Sabarkantha", "Surat",
    "Surendranagar", "Tapi", "Vadodara", "Valsad"
  ],

  "Haryana": [
    "Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad",
    "Fatehabad", "Gurugram", "Hisar", "Jhajjar",
    "Jind", "Kaithal", "Karnal", "Kurukshetra",
    "Mahendragarh", "Nuh", "Palwal", "Panchkula",
    "Panipat", "Rewari", "Rohtak", "Sirsa",
    "Sonipat", "Yamunanagar"
  ],

  "Himachal Pradesh": [
    "Bilaspur", "Chamba", "Hamirpur", "Kangra",
    "Kinnaur", "Kullu", "Lahaul and Spiti",
    "Mandi", "Shimla", "Sirmaur", "Solan", "Una"
  ],

  "Jharkhand": [
    "Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka",
    "East Singhbhum", "Garhwa", "Giridih", "Godda",
    "Gumla", "Hazaribagh", "Jamtara", "Khunti",
    "Koderma", "Latehar", "Lohardaga", "Pakur",
    "Palamu", "Ramgarh", "Ranchi", "Sahebganj",
    "Seraikela Kharsawan", "Simdega", "West Singhbhum"
  ],

  "Karnataka": [
    "Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural",
    "Bengaluru Urban", "Bidar", "Chamarajanagar",
    "Chikkaballapur", "Chikkamagaluru", "Chitradurga",
    "Dakshina Kannada", "Davangere", "Dharwad",
    "Gadag", "Hassan", "Haveri", "Kalaburagi",
    "Kodagu", "Kolar", "Koppal", "Mandya",
    "Mysuru", "Raichur", "Ramanagara", "Shivamogga",
    "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura",
    "Yadgir"
  ],

  "Kerala": [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur",
    "Kasaragod", "Kollam", "Kottayam", "Kozhikode",
    "Malappuram", "Palakkad", "Pathanamthitta",
    "Thiruvananthapuram", "Thrissur", "Wayanad"
  ],

  "Madhya Pradesh": [
    "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar",
    "Balaghat", "Barwani", "Betul", "Bhind",
    "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara",
    "Damoh", "Datia", "Dewas", "Dhar", "Dindori",
    "Guna", "Gwalior", "Harda", "Hoshangabad",
    "Indore", "Jabalpur", "Jhabua", "Katni",
    "Khandwa", "Khargone", "Mandla", "Mandsaur",
    "Morena", "Narsinghpur", "Neemuch", "Panna",
    "Raisen", "Rajgarh", "Ratlam", "Rewa",
    "Sagar", "Satna", "Sehore", "Seoni",
    "Shahdol", "Shajapur", "Sheopur", "Shivpuri",
    "Sidhi", "Singrauli", "Tikamgarh", "Ujjain",
    "Umaria", "Vidisha"
  ],

  "Maharashtra": [
    "Ahmednagar", "Akola", "Amravati", "Aurangabad",
    "Beed", "Bhandara", "Buldhana", "Chandrapur",
    "Dhule", "Gadchiroli", "Gondia", "Hingoli",
    "Jalgaon", "Jalna", "Kolhapur", "Latur",
    "Mumbai City", "Mumbai Suburban", "Nagpur",
    "Nanded", "Nandurbar", "Nashik", "Osmanabad",
    "Palghar", "Parbhani", "Pune", "Raigad",
    "Ratnagiri", "Sangli", "Satara", "Sindhudurg",
    "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
  ],

  "Tamil Nadu": [
    "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore",
    "Cuddalore", "Dharmapuri", "Dindigul", "Erode",
    "Kallakurichi", "Kanchipuram", "Kanyakumari",
    "Karur", "Krishnagiri", "Madurai", "Nagapattinam",
    "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
    "Ramanathapuram", "Ranipet", "Salem",
    "Sivaganga", "Tenkasi", "Thanjavur", "Theni",
    "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
    "Tirupathur", "Tiruppur", "Tiruvallur",
    "Tiruvannamalai", "Tiruvarur", "Vellore",
    "Viluppuram", "Virudhunagar"
  ],

  "Telangana": [
    "Adilabad", "Bhadradri Kothagudem", "Hyderabad",
    "Jagtial", "Jangaon", "Jayashankar Bhupalpally",
    "Jogulamba Gadwal", "Kamareddy", "Karimnagar",
    "Khammam", "Komaram Bheem", "Mahabubabad",
    "Mahbubnagar", "Mancherial", "Medak",
    "Medchal–Malkajgiri", "Mulugu", "Nagarkurnool",
    "Nalgonda", "Narayanpet", "Nirmal",
    "Nizamabad", "Peddapalli", "Rajanna Sircilla",
    "Ranga Reddy", "Sangareddy", "Siddipet",
    "Suryapet", "Vikarabad", "Wanaparthy",
    "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"
  ],

  "Uttar Pradesh": [
    "Agra", "Aligarh", "Allahabad", "Ambedkar Nagar",
    "Amethi", "Amroha", "Auraiya", "Azamgarh",
    "Baghpat", "Bahraich", "Ballia", "Balrampur",
    "Banda", "Barabanki", "Bareilly", "Basti",
    "Bhadohi", "Bijnor", "Budaun", "Bulandshahr",
    "Chandauli", "Chitrakoot", "Deoria", "Etah",
    "Etawah", "Faizabad", "Farrukhabad", "Fatehpur",
    "Firozabad", "Gautam Buddha Nagar", "Ghaziabad",
    "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur",
    "Hapur", "Hardoi", "Hathras", "Jalaun",
    "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat",
    "Kanpur Nagar", "Kasganj", "Kaushambi",
    "Kushinagar", "Lakhimpur Kheri", "Lalitpur",
    "Lucknow", "Maharajganj", "Mahoba", "Mainpuri",
    "Mathura", "Mau", "Meerut", "Mirzapur",
    "Moradabad", "Muzaffarnagar", "Pilibhit",
    "Pratapgarh", "Raebareli", "Rampur",
    "Saharanpur", "Sambhal", "Sant Kabir Nagar",
    "Shahjahanpur", "Shamli", "Shravasti",
    "Siddharthnagar", "Sitapur", "Sonbhadra",
    "Sultanpur", "Unnao", "Varanasi"
  ],

  "West Bengal": [
    "Alipurduar", "Bankura", "Birbhum", "Cooch Behar",
    "Dakshin Dinajpur", "Darjeeling", "Hooghly",
    "Howrah", "Jalpaiguri", "Jhargram",
    "Kalimpong", "Kolkata", "Malda",
    "Murshidabad", "Nadia", "North 24 Parganas",
    "Paschim Bardhaman", "Paschim Medinipur",
    "Purba Bardhaman", "Purba Medinipur",
    "Purulia", "South 24 Parganas",
    "Uttar Dinajpur"
  ]
};

```

---

## Component_collapsibleContainer1 (ID: collapsibleContainer1)
```javascript
{{ collapsibleContainer1.showBody }}
```

---

## jsGroupProducts (ID: collapsibleToggle1)
```javascript
{{ collapsibleContainer1.showBody }}
```

---

## Label (ID: container10)
```javascript
#### Container title
```

---

## drawerCreatePO (ID: container6)
```javascript
Purchase Order
```

---

## Component_container7 (ID: container7)
```javascript
**Total Gross:** {{ _.sum((poTable.data || []).map(r => Number(r["Gross $"] ?? 0))) }}
```

---

## modalFrameGRN (ID: container9)
```javascript
{{ ChoosePo.value }}
```

---

## Component_containerTitle4 (ID: containerTitle4)
```javascript
Purchase Order
```

---

## Component_containerTitle5 (ID: containerTitle5)
```javascript
#### Container title
```

---

## Component_containerTitle6 (ID: containerTitle6)
```javascript
#### Container title
```

---

## Component_createDebitNoteJS (ID: createDebitNoteJS)
```javascript
/* --- CREATE DEBIT NOTE (LOGIC MATCHING TABLE) --- */
const isItemMode = dnMode.value === "Item Return";
let amount = 0;
let lines = [];

if (isItemMode) {
    // We replicate the table formula to be 100% safe independent of UI
    const rawLines = tblDebitLines.data; 
    
    lines = rawLines.map(row => {
        const qty = Number(row.Qty || 0);
        const price = Number(row.Price || 0); // Purchase Rate
        const scheme = Number(row.Sch || 0);
        const discPct = Number(row['Disc %'] || 0); // Discount Percent
        const taxPct = Number(row['GST %'] || row.tax_percent || 0);
        
        // 1. Calculate Gross
        const gross = qty * price;
        
        // 2. Calculate Discount Amount
        // Formula: (Gross - Scheme) * (Disc% / 100)
        // Note: Check if your table logic applies discount on (Gross - Scheme) or just Gross.
        // Assuming standard: Discount is on logic after Scheme
        const valForDisc = Math.max(0, gross - scheme);
        const discAmt = valForDisc * (discPct / 100);

        // 3. Calculate Taxable Amount (Matches 'Taxable $' Column)
        // Formula: Gross - Scheme - Discount
        const taxable = Math.max(0, gross - scheme - discAmt);

        // 4. Calculate GST
        const taxAmt = taxable * (taxPct / 100);

        // 5. Net Total
        const total = taxable + taxAmt;

        return {
            product_id: row._product_id,
            qty: qty,
            rate: price,
            batch_number: row['Batch No'] || "",
            return_type: row.Reason || "Damage",
            
            // Backend fields
            amount: Number(total.toFixed(2)),       // Net Total
            tax_amount: Number(taxAmt.toFixed(2))   // Tax Component
        };
    }).filter(l => l.qty > 0);
    
    // Grand Total
    amount = _.sumBy(lines, 'amount');
} else {
    // Manual Amount
    amount = Number(dnAmount.value);
}

if (!amount || amount <= 0) {
   utils.showNotification({ title: "Error", description: "Invalid Amount", notificationType: "error" });
   return;
}

apiCreateDebitNote.trigger({
    additionalScope: {
        payload: {
            vendor_id: varSelectedVendor.value.id,
            amount: amount,
            debit_note_date: moment(dnDate.value).format("YYYY-MM-DD"),
            reason: dnReason.value,
            linked_invoice_id: selLinkedBill.value || null,
            lines: isItemMode ? lines : [] 
        }
    },
    onSuccess: function(data) {
        utils.showNotification({ title: "Debit Note Created", description: data.dn_number, notificationType: "success" });
        try { txtDNNumber.setValue(data.dn_number); } catch(e) {}
        modalDebitNote.close();
        getVendorLedger.trigger();
    }
});
```

---

## modalDebitNote (ID: d0b62753)
```javascript
{{ new Date() }}
```

---

## piLines (ID: d215de06)
```javascript
api/purchase-orders/{{ poListTable.selectedRow.id }}
```

---

## Choose Vendor (ID: d57c7942)
```javascript
{{ ChoosePo.value }}
```

---

## Component_d6ca7 (ID: d6ca7)
```javascript
****{{ item.brand_name }} | Count of Products:{{ item.product_count }}****
Taxable Stock Value: ₹{{ item.val_stock_taxable }} | Total Bought Value: ₹{{ item.val_total_bought }}
```

---

## validateImportJS (ID: d6d7b147)
```javascript
Inventory Adjustment
```

---

## jsGroupProducts (ID: d8a86e1f)
```javascript
{{ self.values[0] }}
```

---

## savePOLine (ID: daa47826)
```javascript
const all = Products.data.data || Products.data || []; 
// Group By Brand
const grouped = _.groupBy(all, 'brand_name');
// Return Array for ListView
return Object.keys(grouped).map((brandName, index) => {
    const products = grouped[brandName];
    // Grab the brand_id from the first product
    const brandId = products[0] ? products[0].brand_id : index; 
    // 1. Taxable Stock Value (Current Value of Goods on Hand - Taxable)
    const valStockTaxable = _.sumBy(products, p => Number(p.stock_value_cost || 0));
    // 2. Total Bought Value (Historical Value of All Goods Purchased - Taxable)
    const valTotalBought = _.sumBy(products, p => Number(p.stock_value_total_bought || 0));
    return {
        id: brandId,
        brand_name: brandName,
        product_count: products.length,
        val_stock_taxable: valStockTaxable.toFixed(2),
        val_total_bought: valTotalBought.toFixed(2),
        products: products.sort((a,b) => a.product_name.localeCompare(b.product_name))
    };
}).sort((a,b) => a.brand_name.localeCompare(b.brand_name));
```

---

## modalFrame1 (ID: dae6dea0)
```javascript
create new vendor
```

---

## PO Date (ID: date5)
```javascript
{{ new Date() }}
```

---

## PO Date (ID: date6)
```javascript
{{ new Date() }}
```

---

## From (ID: dateEnd)
```javascript
{{ new Date() }}
```

---

## Bill Date (ID: dateReceived)
```javascript
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
```

---

## From (ID: dateStart)
```javascript
{{ new Date() }}
```

---

## Vendor Bill No (ID: dateVendorInvoice)
```javascript
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
```

---

## tblPendingBills (ID: de9340e6)
```javascript
api/vendor-payments/ledger/{{ varSelectedVendor.value.id }}
```

---

## populateDebitTableJS (ID: debiteNotetbl)
```javascript
Create Debit Note
```

---

## drawerVendorProfile (ID: df1ff84d)
```javascript
{{ self.values[0] }}
```

---

## Date (ID: dnDate)
```javascript
{{ new Date() }}
```

---

## Reason (ID: dnReason)
```javascript
api/debit-notes/vendor/{{ varSelectedVendor.value.id }}
```

---

## Component_dnReason1 (ID: dnReason1)
```javascript
#### Container title
```

---

## jsGroupProducts (ID: drawerBrand)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## drawerCreatePO (ID: drawerCloseButton1)
```javascript
Purchase Order
```

---

## drawerVendorProfile (ID: drawerCloseButton2)
```javascript
{{ currentSourceRow }}
```

---

## drawerBrand (ID: drawerCloseButton3)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## drawerProduct (ID: drawerCloseButton4)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## Component_drawerCreatePO (ID: drawerCreatePO)
```javascript
### {{ varPOMode.value === 'CREATE' ? 'New Purchase Order' : (varPOMode.value === 'EDIT' ? 'Edit PO ' + (poNumber2.value || '') : 'View PO ' + (poNumber2.value || '')) }}
```

---

## Component_drawerProduct (ID: drawerProduct)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## Component_drawerTitle1 (ID: drawerTitle1)
```javascript
### {{ varPOMode.value === 'CREATE' ? 'New Purchase Order' : (varPOMode.value === 'EDIT' ? 'Edit PO ' + (poNumber2.value || '') : 'View PO ' + (poNumber2.value || '')) }}
```

---

## Component_drawerTitle2 (ID: drawerTitle2)
```javascript
{{ varSelectedVendor.value.vendor_name }}
```

---

## Component_drawerTitle3 (ID: drawerTitle3)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## Component_drawerTitle4 (ID: drawerTitle4)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## Component_drawerVendorProfile (ID: drawerVendorProfile)
```javascript
{{ varSelectedVendor.value.vendor_name }}
```

---

## Component_dropdownButton1 (ID: dropdownButton1)
```javascript
import
```

---

## Component_dropdownButton2 (ID: dropdownButton2)
```javascript
import
```

---

## Products (ID: e3fe0022)
```javascript
utils.showNotification({ title: "Success", description: `Imported ${varImportData.value.length} items`, notificationType: "success" });
varImportData.setValue([]); // Clear valid list
// Now the Modal will automatically reveal the Error Table (if any errors exist)
if (varImportErrors.value.length === 0) {
   modalFrameImport. hide(); // Close if no errors left
}
```

---

## saveGRNJS (ID: e6943529)
```javascript
/* --- UNIFIED GRN SAVE LOGIC --- */
// 1. Validate Lines
const rawLines = piLines.value || [];
const validLines = rawLines.filter(row => row.Qty && Number(row.Qty) > 0);
if (validLines.length === 0) {
  utils.showNotification({ title: "Error", description: "No items to save!", notificationType: "error" });
  return;
}
const vID = vendorDropdownGRN.value;
if (!vID) {
   utils.showNotification({ title: "Error", description: "Select a Vendor", notificationType: "error" });
   return;
}
// 2. Prepare Payload
const dbLines = validLines.map(row => ({
    // Ensure you map your Column IDs correctly here!
    product_id:         Number(row._product_id),
    ordered_qty:        0, 
    accepted_qty:       Number(row.Qty),
    rate:               Number(row.Price),
    discount_percent:   Number(row['Disc %'] || 0),
    scheme_amount:      Number(row.Sch || 0),
    tax_amount:         Number(row['GST $'] || 0),
    amount:             Number(row['Net $'] || 0),
    batch_number:       row["Batch No"] ? row["Batch No"].toString() : "",
    expiry_date:        row.Expiry ? moment(row.Expiry).format("YYYY-MM-DD") : null,
    mrp:                Number(row.MRP || 0)
}));
const totalNet = dbLines.reduce((acc, x) => acc + x.amount, 0); 
const totalTax = dbLines.reduce((acc, x) => acc + x.tax_amount, 0);
const finalPayload = {
    vendor_id:          Number(vID),
    purchase_order_id: Number(ChoosePo.value || 0),
    invoice_number:     vendorInvoiceNo.value,
    invoice_date:       dateVendorInvoice.value, // Ensure Moment/Date format matches
    received_date:      dateReceived.value,
    total_net:          totalNet,
    tax_amount:         totalTax,
    grand_total:        Math.round(totalNet + totalTax),
    lines:              dbLines,
    
    // --- TRACEABILITY MAGIC ---
    // If varCorrectionID has a value, we link this new GRN to the old one!
    parent_invoice_id:  varCorrectionID.value || null 
};
// 3. Save & Send
await varGRNPayload.setValue(finalPayload);
// Trigger Query
apiCreateGRN.trigger({
    onSuccess: function(data) {
        utils.showNotification({ title: "Success", description: "GRN Saved!", notificationType: "success" });
        
        // 4. CLEANUP (Critical)
        piLines.setValue([]);
        vendorDropdownGRN.clearValue();
        vendorInvoiceNo.setValue("");
        dateVendorInvoice.clearValue();
        varGRNPayload.setValue({});
        
        // Reset Correction Mode
        varCorrectionID.setValue(null);
        varCorrectionData.setValue({});
        
        modalFrameGRN.close();
    },
    onFailure: function(err) {
        console.error(err);
        utils.showNotification({ title: "Failed", description: err.message, notificationType: "error" });
    }
});
```

---

## modalViewGRN (ID: e83cb7fa)
```javascript
import
```

---

## modalAddAddress (ID: ea54c85e)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## varPOViewId (ID: eb440ab0)
```javascript
/* --- UNIFIED VIEW SCRIPT (MATCHES CREATE KEYS) --- */
const data = getPOById.data;

if (!data || !data.header) {
  utils.showNotification({ title: "Error", description: "No Data", notificationType: "error" });
  return;
}

// 1. SET VIEW MODE (Safety)
varPOMode.setValue('VIEW'); // <--- ADDED THIS ✅

// 2. Map Header
vendorDropdown.setValue(data.header.vendor_id);
poNumber2.setValue(data.header.po_number);
date5.setValue(data.header.po_date);
date6.setValue(data.header.delivery_date);

// 3. Map Lines (Targeting EXACT Keys from Create Script)
const formattedLines = data.lines.map((row, index) => {
    // Inputs
    const qty = Number(row.ordered_qty);
    const rate = Number(row.rate);
    const discPct = Number(row.discount_percent || 0);
    const scheme = Number(row.scheme_amount || 0);
    
    // Math
    const gross = qty * rate;
    const discAmt = (gross - scheme) * (discPct / 100);
    const taxAmt = Number(row.tax_amount);
    const net = Number(row.amount);
    
    return {
        "S.No": index + 1,              
        "EAN Code": row.ean_code,       
        "Item Name": row.product_name,  
        "MRP": Number(row.mrp),         
        "Price": rate,
        "Qty": qty,
        "Sch": scheme,
        "Disc %": discPct,
        "GST %": 5,                     
        "Gross $": gross,               
        "Disc. $": discAmt,             
        "Taxable $": net - taxAmt,      
        "GST $": taxAmt,                
        "Net $": net,                   
        "_product_id": row.product_id
    };
});

// 4. Reset & Set
poLines.setValue([]); 
poLines.setValue(formattedLines);

// 5. Show Drawer
drawerCreatePO.show();
```

---

## poListTable (ID: ed2ff3f3)
```javascript
{{ currentSourceRow.id }}
```

---

## Component_editPOHandler (ID: editPOHandler)
```javascript
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
```

---

## modalViewGRN (ID: eec44d99)
```javascript
api/purchase-invoices
```

---

## modalViewGRN (ID: ef1f938e)
```javascript
import
```

---

## modalUpload (ID: f0b24600)
```javascript
api/products/template-data
```

---

## apiBulkImport (ID: f0c2139b)
```javascript
const fileData = fileBulkUpload.parsedValue[0];
// Helper to find column even if casing doesn't match
const get = (row, key) => {
    const found = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z]/g, '') === key.toLowerCase().replace(/[^a-z]/g, ''));
    return found ? row[found] : "";
};
const cleanRows = fileData.map(r => ({
    "Product ID":     get(r, "Product ID") || get(r, "ID"),
    "Product Name":   get(r, "Product Name"),
    "MRP":            get(r, "MRP"),
    "Purchase Rate":  get(r, "Purchase Rate"),
    "Distributor":    get(r, "Distributor Rate"),
    "Wholesale":      get(r, "Wholesale Rate"),
    "Dealer":         get(r, "Dealer Rate"),
    "Retail":         get(r, "Retail Rate"),
    "Case Qty":       get(r, "Case Qty"),
    "UOM":            get(r, "UOM"),
    "Model No":       get(r, "Model Number"),
    "Min Stock":      get(r, "Min Stock"),
    "Length":         get(r, "Length(cm)"),
    "Width":          get(r, "Width(cm)"),
    "Height":         get(r, "Height(cm)"),
    "Weight":         get(r, "Weight(kg)"),
    "Description":    get(r, "Description")
}));
varBulkData.setValue(cleanRows);
utils.showNotification({ title: "Loaded", description: `Review ${cleanRows.length} items below.` });
```

---

## modalAddAddress (ID: f1c01b48)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## savePOLine (ID: f2afda6c)
```javascript
const all = Products.data.data || Products.data || []; 
// Group By Brand
const grouped = _.groupBy(all, 'brand_name');
// Return Array for ListView
return Object.keys(grouped).map((brandName, index) => {
    const products = grouped[brandName];
    // Grab the brand_id from the first product
    const brandId = products[0] ? products[0].brand_id : index; 
    // 1. Taxable Stock Value (Current Value of Goods on Hand - Taxable)
    const valStockTaxable = _.sumBy(products, p => Number(p.stock_value_cost || 0));
    // 2. Total Bought Value (Historical Value of All Goods Purchased - Taxable)
    const valTotalBought = _.sumBy(products, p => Number(p.stock_value_total_bought || 0));
    return {
        id: brandId,
        brand_name: brandName,
        product_count: products.length,
        val_stock_taxable: valStockTaxable.toFixed(2),
        val_total_bought: valTotalBought.toFixed(2),
        products: products.sort((a,b) => a.product_name.localeCompare(b.product_name))
    };
}).sort((a,b) => a.brand_name.localeCompare(b.brand_name));
```

---

## savePaymentJS (ID: f5898050)
```javascript
const vendor = varSelectedVendor.value;
const totalAmount = payAmount.value;
const isRefund = payType.value === 'REFUND';

// Validate
if (!totalAmount || totalAmount <= 0) {
    utils.showNotification({ title: "Error", description: "Enter valid amount", notificationType: "error" });
    return;
}

let allocations = [];
// ONLY calculate allocations if it is a PAYMENT
if (!isRefund) {
    const selectedBills = tblPendingBills.selectedSourceRows || []; 
    if (selectedBills.length > 0) {
        // FIFO Logic
        let remainingPayment = Number(totalAmount);
        for (const bill of selectedBills) {
            if (remainingPayment <= 0) break;
            const billBalance = Number(bill['Balance $']);
            const allocAmount = Math.min(billBalance, remainingPayment);
            
            if (allocAmount > 0) {
                allocations.push({
                    invoice_id: bill.id,
                    amount: allocAmount
                });
                remainingPayment -= allocAmount;
            }
        }
    }
}

// Trigger API
apiMakePayment.trigger({
    additionalScope: {
        payload: {
            vendor_id: vendor.id,
            amount: totalAmount,
            payment_date: moment(payDate.value).format("YYYY-MM-DD"),
            mode: payMode.value,
            // [NEW] Unified Reference logic
            transaction_ref: payMode.value === 'Online' ? selBankRefVendor.selectedItem.bank_ref_id : (payMode.value === 'Cheque' ? payChqNo.value : payRef.value),
            bank_statement_entry_id: payMode.value === 'Online' ? selBankRefVendor.selectedItem.id : null,
            remarks: payRemarks.value,
            transaction_type: payType.value,
            allocations: isRefund ? [] : allocations,
            bank_account_id: selPaymentBank.value,
            // [NEW] Cheque Details
            cheque_no: payChqNo.value,
            cheque_date: payChqDate.value,
            bank_name: payChqBank.value
        }
    },
    onSuccess: function() {
        modalMakePayment.close();
        getVendorLedger.trigger();
        getVendorPendingBills.trigger();
        utils.showNotification({ title: "Success", description: "Transaction Recorded", notificationType: "success" });
    }
});

```

---

## varIsEditing (ID: f692552e)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## Component_false (ID: false)
```javascript
api/vendors
```

---

## createDebitNoteJS (ID: fcb5ed65)
```javascript
const isItemMode = dnMode.value === "Item Return";
let amount = 0;
let lines = [];
if (isItemMode) {
    // Calculate from Table (Map to Backend Keys)
    const rawLines = tblDebitLines.data; 
    
    lines = rawLines.map(row => ({
        product_id: row._product_id, // Map from '_product_id'
        qty: Number(row.Qty),
        rate: Number(row.Price), // Map from 'Price'
        batch_number: row['Batch No'] || "", // Map from 'Batch No'
        return_type: row.Reason || "Damage",
        amount: Number(row['Net $']) || (Number(row.Qty) * Number(row.Price))
    })).filter(l => l.qty > 0);
    amount = _.sumBy(lines, 'amount');
} else {
    // Manual Amount
    amount = Number(dnAmount.value);
}
if (!amount || amount <= 0) {
   utils.showNotification({ title: "Error", description: "Invalid Amount", notificationType: "error" });
   return;
}
apiCreateDebitNote.trigger({
    additionalScope: {
        payload: {
            vendor_id: varSelectedVendor.value.id,
            amount: amount,
            debit_note_date: moment(dnDate.value).format("YYYY-MM-DD"),
            reason: dnReason.value,
            linked_invoice_id: selLinkedBill.value || null, // New field
            lines: isItemMode ? lines : [] 
        }
    },
    onSuccess: function(data) {
         // data contains { dn_number: 'GD-CLT-DN-26-1' }
        utils.showNotification({ title: "Debit Note Created", description: data.dn_number, notificationType: "success" });
        
        // Show the number in the box
        try { txtDNNumber.setValue(data.dn_number); } catch(e) {}
        modalDebitNote.close();
        getVendorLedger.trigger();
    }
});
```

---

## EditGrnTable (ID: feb77ded)
```javascript
api/purchase-invoices?
```

---

## varModalMode (ID: fileProductImport)
```javascript
Inventory Adjustment
```

---

## jsParseSmartUpload (ID: fileSmartUpload)
```javascript
const fileData = fileBulkUpload.parsedValue[0];
// Helper to find column even if casing doesn't match
const get = (row, key) => {
    const found = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z]/g, '') === key.toLowerCase().replace(/[^a-z]/g, ''));
    return found ? row[found] : "";
};
const cleanRows = fileData.map(r => ({
    "Product ID":     get(r, "Product ID") || get(r, "ID"),
    "Product Name":   get(r, "Product Name"),
    "MRP":            get(r, "MRP"),
    "Purchase Rate":  get(r, "Purchase Rate"),
    "Distributor":    get(r, "Distributor Rate"),
    "Wholesale":      get(r, "Wholesale Rate"),
    "Dealer":         get(r, "Dealer Rate"),
    "Retail":         get(r, "Retail Rate"),
    "Case Qty":       get(r, "Case Qty"),
    "UOM":            get(r, "UOM"),
    "Model No":       get(r, "Model Number"),
    "Min Stock":      get(r, "Min Stock"),
    "Length":         get(r, "Length(cm)"),
    "Width":          get(r, "Width(cm)"),
    "Height":         get(r, "Height(cm)"),
    "Weight":         get(r, "Weight(kg)"),
    "Description":    get(r, "Description")
}));
varBulkData.setValue(cleanRows);
utils.showNotification({ title: "Loaded", description: `Review ${cleanRows.length} items below.` });
```

---

## Component_getBankAccounts (ID: getBankAccounts)
```javascript
api/bank-accounts
```

---

## EAN Code (ID: getBrands)
```javascript
api/master/brands
```

---

## Component_getCategories (ID: getCategories)
```javascript
api/master/categories
```

---

## Component_getDebitNoteLines (ID: getDebitNoteLines)
```javascript
api/debit-notes/{{debiteNotetbl.selectedRow.id}}/items
```

---

## Component_getGRNList (ID: getGRNList)
```javascript
api/purchase-invoices
```

---

## Component_getHSN (ID: getHSN)
```javascript
api/master/hsn
```

---

## Component_getNextPO (ID: getNextPO)
```javascript
api/documents/next/PO
```

---

## piLines (ID: getPOById)
```javascript
api/purchase-orders/{{ poListTable.selectedRow.id }}
```

---

## Component_getPOForGRN (ID: getPOForGRN)
```javascript
api/purchase-orders/{{ varPOViewId.value }}?
```

---

## Component_getPOs (ID: getPOs)
```javascript
api/purchase-orders
```

---

## Component_getPurchaseInvoices (ID: getPurchaseInvoices)
```javascript
api/purchase-invoices
```

---

## modalUpload (ID: getTemplateData)
```javascript
api/products/template-data
```

---

## Reason (ID: getVendorDebitNotes)
```javascript
api/debit-notes/vendor/{{ varSelectedVendor.value.id }}
```

---

## modalMakePayment (ID: getVendorLedger)
```javascript
api/vendor-payments/ledger/{{ varSelectedVendor.value.id }}
```

---

## getGRNList (ID: getVendorPendingBills)
```javascript
const allBills = getGRNList.data; // This comes from the Transformer above
const vID = varSelectedVendor.value.id;
// Simple JS Filter
return allBills.filter(bill => 
    bill['Vendor ID'] === vID && 
    bill['Balance $'] > 0
);
```

---

## Component_getvendoraddress (ID: getvendoraddress)
```javascript
api/master/vendor-addresses
```

---

## Enter Quantity (ID: inpAdjQty)
```javascript
api/stock/adjust/batches/{{ selAdjProduct.value }}?
```

---

## Wholesale Price (ID: inpNewProductDealerRate)
```javascript
api/master/brands
```

---

## Purchase Rate (ID: inpNewProductDistRate)
```javascript
api/master/brands
```

---

## EAN Code (ID: inpNewProductEan)
```javascript
api/master/brands
```

---

## MRP (ID: inpNewProductMRP)
```javascript
api/master/brands
```

---

## MRP (ID: inpNewProductPurchaseRate)
```javascript
api/master/brands
```

---

## Dealer Price (ID: inpNewProductRetailRate)
```javascript
api/master/brands
```

---

## Dist Price (ID: inpNewProductWholesaleRate)
```javascript
api/master/brands
```

---

## apiAddAddress (ID: inpNewVendorBankName)
```javascript
api/master/banks
```

---

## Component_inpNewVendorDistrict (ID: inpNewVendorDistrict)
```javascript
api/purchase-invoices/{{ tblGrn.selectedRow.id }}/reverse
```

---

## Pin Code (ID: inpNewVendorPin)
```javascript
api/purchase-invoices/{{ tblGrn.selectedRow.id }}/reverse
```

---

## Pin Code (ID: inpNewVendorState)
```javascript
api/purchase-invoices/{{ tblGrn.selectedRow.id }}/reverse
```

---

## Component_isPrinting (ID: isPrinting)
```javascript
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
```

---

## Component_jsCommitSmartUpdates (ID: jsCommitSmartUpdates)
```javascript
const rows = tblBulkReview.data; 
// Safety Check
if (!rows || rows.length === 0) {
    utils.showNotification({ title: "Empty", description: "Nothing to save.", notificationType: "warning" });
    return;
}
// Formatter
const num = (v) => v ? Number(v).toFixed(2) : null;
const payload = rows.map(r => ({
    id:               r['Product ID'],
    mrp:              num(r['MRP']),
    purchase_rate:    num(r['Purchase Rate']),
    distributor_rate: num(r['Distributor']),
    wholesale_rate:   num(r['Wholesale']),
    dealer_rate:      num(r['Dealer']),
    retail_rate:      num(r['Retail']),
    case_quantity:    Number(r['Case Qty'] || 1),
    uom:              r['UOM'],
    model_number:     r['Model No'],
    min_stock_level:  Number(r['Min Stock'] || 0),
    box_length_cm:    num(r['Length']),
    box_width_cm:     num(r['Width']),
    box_height_cm:    num(r['Height']),
    weight_kg:        num(r['Weight']),
    description:      r['Description']
}));
// Trigger API
apiBulkUpdate.trigger({
    additionalScope: { items: payload },
    onSuccess: () => {
         utils.showNotification({ title: "Success", description: "All products updated!", notificationType: "success" });
         varBulkData.setValue([]); // Clear table
         // Close modal if you want: modalName.close()
    },
    onFailure: (e) => utils.showNotification({ title: "Error", description: e.message, notificationType: "error" })
});
```

---

## Component_jsCreatePo (ID: jsCreatePo)
```javascript
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
```

---

## Component_jsGroupProducts (ID: jsGroupProducts)
```javascript
const all = Products.data.data || Products.data || []; 
// Group By Brand
const grouped = _.groupBy(all, 'brand_name');
// Return Array for ListView
return Object.keys(grouped).map((brandName, index) => {
    const products = grouped[brandName];
    // Grab the brand_id from the first product
    const brandId = products[0] ? products[0].brand_id : index; 
    // 1. Taxable Stock Value (Current Value of Goods on Hand - Taxable)
    const valStockTaxable = _.sumBy(products, p => Number(p.stock_value_cost || 0));
    // 2. Total Bought Value (Historical Value of All Goods Purchased - Taxable)
    const valTotalBought = _.sumBy(products, p => Number(p.stock_value_total_bought || 0));
    return {
        id: brandId,
        brand_name: brandName,
        product_count: products.length,
        val_stock_taxable: valStockTaxable.toFixed(2),
        val_total_bought: valTotalBought.toFixed(2),
        products: products.sort((a,b) => a.product_name.localeCompare(b.product_name))
    };
}).sort((a,b) => a.brand_name.localeCompare(b.brand_name));
```

---

## jsLoadCorrectionData (ID: jsLoadCorrectionData)
```javascript
const old = varCorrectionData.value;
if (!old) {
  utils.showNotification({title: "Error", description: "No correction data found.", notificationType: "error"});
  return;
}
// 1. Pre-fill Inputs (Using Your Confirmed Names)
// Vendor Dropdown
if (typeof vendorDropdownGRN !== 'undefined') {
   vendorDropdownGRN.setValue(old.vendor_id);
}
// Invoice Number
vendorInvoiceNo.setValue(old.vendor_invoice_number);
// Purchase Order (Restore Link)
if (old.purchase_order_id) {
   ChoosePo.setValue(old.purchase_order_id);
}
// Invoice Date
dateVendorInvoice.setValue(old.vendor_invoice_date);
// Receive Date
dateReceived.setValue(old.received_date);
// 2. Pre-fill Lines 
// We use 'piLines' because that is what the Save script uses.
if (old.lines || old.lines_json) {
   piLines.setValue(old.lines || old.lines_json);
}
utils.showNotification({title: "Data Loaded", description: "Edit the mistake and Click Save."});
```

---

## jsParseSmartUpload (ID: jsParseSmartUpload)
```javascript
const fileData = fileBulkUpload.parsedValue[0];
// Helper to find column even if casing doesn't match
const get = (row, key) => {
    const found = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z]/g, '') === key.toLowerCase().replace(/[^a-z]/g, ''));
    return found ? row[found] : "";
};
const cleanRows = fileData.map(r => ({
    "Product ID":     get(r, "Product ID") || get(r, "ID"),
    "Product Name":   get(r, "Product Name"),
    "MRP":            get(r, "MRP"),
    "Purchase Rate":  get(r, "Purchase Rate"),
    "Distributor":    get(r, "Distributor Rate"),
    "Wholesale":      get(r, "Wholesale Rate"),
    "Dealer":         get(r, "Dealer Rate"),
    "Retail":         get(r, "Retail Rate"),
    "Case Qty":       get(r, "Case Qty"),
    "UOM":            get(r, "UOM"),
    "Model No":       get(r, "Model Number"),
    "Min Stock":      get(r, "Min Stock"),
    "Length":         get(r, "Length(cm)"),
    "Width":          get(r, "Width(cm)"),
    "Height":         get(r, "Height(cm)"),
    "Weight":         get(r, "Weight(kg)"),
    "Description":    get(r, "Description")
}));
varBulkData.setValue(cleanRows);
utils.showNotification({ title: "Loaded", description: `Review ${cleanRows.length} items below.` });
```

---

## Make it Default Address (ID: jsStatesData)
```javascript
return {
  "Andhra Pradesh": [
    "Anantapur", "Chittoor", "East Godavari", "Guntur", "Kadapa",
    "Krishna", "Kurnool", "Nellore", "Prakasam",
    "Srikakulam", "Visakhapatnam", "Vizianagaram",
    "West Godavari"
  ],

  "Arunachal Pradesh": [
    "Anjaw", "Changlang", "Dibang Valley", "East Kameng",
    "East Siang", "Kurung Kumey", "Lohit", "Lower Dibang Valley",
    "Lower Subansiri", "Papum Pare", "Tawang",
    "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"
  ],

  "Assam": [
    "Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar",
    "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri",
    "Dibrugarh", "Goalpara", "Golaghat", "Hailakandi",
    "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan",
    "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur",
    "Majuli", "Morigaon", "Nagaon", "Nalbari",
    "Sivasagar", "Sonitpur", "South Salmara",
    "Tinsukia", "Udalguri", "West Karbi Anglong"
  ],

  "Bihar": [
    "Araria", "Arwal", "Aurangabad", "Banka", "Begusarai",
    "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga",
    "East Champaran", "Gaya", "Gopalganj", "Jamui",
    "Jehanabad", "Kaimur", "Katihar", "Khagaria",
    "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani",
    "Munger", "Muzaffarpur", "Nalanda", "Nawada",
    "Patna", "Purnia", "Rohtas", "Saharsa",
    "Samastipur", "Saran", "Sheikhpura", "Sheohar",
    "Sitamarhi", "Siwan", "Supaul", "Vaishali",
    "West Champaran"
  ],

  "Chhattisgarh": [
    "Balod", "Baloda Bazar", "Balrampur", "Bastar",
    "Bemetara", "Bijapur", "Bilaspur", "Dantewada",
    "Dhamtari", "Durg", "Gariaband", "Gaurela-Pendra-Marwahi",
    "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker",
    "Kondagaon", "Korba", "Koriya", "Mahasamund",
    "Mungeli", "Narayanpur", "Raigarh", "Raipur",
    "Rajnandgaon", "Sukma", "Surajpur", "Surguja"
  ],

  "Goa": ["North Goa", "South Goa"],

  "Gujarat": [
    "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha",
    "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur",
    "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar",
    "Gir Somnath", "Jamnagar", "Junagadh", "Kheda",
    "Kutch", "Mahisagar", "Mehsana", "Morbi",
    "Narmada", "Navsari", "Panchmahal", "Patan",
    "Porbandar", "Rajkot", "Sabarkantha", "Surat",
    "Surendranagar", "Tapi", "Vadodara", "Valsad"
  ],

  "Haryana": [
    "Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad",
    "Fatehabad", "Gurugram", "Hisar", "Jhajjar",
    "Jind", "Kaithal", "Karnal", "Kurukshetra",
    "Mahendragarh", "Nuh", "Palwal", "Panchkula",
    "Panipat", "Rewari", "Rohtak", "Sirsa",
    "Sonipat", "Yamunanagar"
  ],

  "Himachal Pradesh": [
    "Bilaspur", "Chamba", "Hamirpur", "Kangra",
    "Kinnaur", "Kullu", "Lahaul and Spiti",
    "Mandi", "Shimla", "Sirmaur", "Solan", "Una"
  ],

  "Jharkhand": [
    "Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka",
    "East Singhbhum", "Garhwa", "Giridih", "Godda",
    "Gumla", "Hazaribagh", "Jamtara", "Khunti",
    "Koderma", "Latehar", "Lohardaga", "Pakur",
    "Palamu", "Ramgarh", "Ranchi", "Sahebganj",
    "Seraikela Kharsawan", "Simdega", "West Singhbhum"
  ],

  "Karnataka": [
    "Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural",
    "Bengaluru Urban", "Bidar", "Chamarajanagar",
    "Chikkaballapur", "Chikkamagaluru", "Chitradurga",
    "Dakshina Kannada", "Davangere", "Dharwad",
    "Gadag", "Hassan", "Haveri", "Kalaburagi",
    "Kodagu", "Kolar", "Koppal", "Mandya",
    "Mysuru", "Raichur", "Ramanagara", "Shivamogga",
    "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura",
    "Yadgir"
  ],

  "Kerala": [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur",
    "Kasaragod", "Kollam", "Kottayam", "Kozhikode",
    "Malappuram", "Palakkad", "Pathanamthitta",
    "Thiruvananthapuram", "Thrissur", "Wayanad"
  ],

  "Madhya Pradesh": [
    "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar",
    "Balaghat", "Barwani", "Betul", "Bhind",
    "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara",
    "Damoh", "Datia", "Dewas", "Dhar", "Dindori",
    "Guna", "Gwalior", "Harda", "Hoshangabad",
    "Indore", "Jabalpur", "Jhabua", "Katni",
    "Khandwa", "Khargone", "Mandla", "Mandsaur",
    "Morena", "Narsinghpur", "Neemuch", "Panna",
    "Raisen", "Rajgarh", "Ratlam", "Rewa",
    "Sagar", "Satna", "Sehore", "Seoni",
    "Shahdol", "Shajapur", "Sheopur", "Shivpuri",
    "Sidhi", "Singrauli", "Tikamgarh", "Ujjain",
    "Umaria", "Vidisha"
  ],

  "Maharashtra": [
    "Ahmednagar", "Akola", "Amravati", "Aurangabad",
    "Beed", "Bhandara", "Buldhana", "Chandrapur",
    "Dhule", "Gadchiroli", "Gondia", "Hingoli",
    "Jalgaon", "Jalna", "Kolhapur", "Latur",
    "Mumbai City", "Mumbai Suburban", "Nagpur",
    "Nanded", "Nandurbar", "Nashik", "Osmanabad",
    "Palghar", "Parbhani", "Pune", "Raigad",
    "Ratnagiri", "Sangli", "Satara", "Sindhudurg",
    "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
  ],

  "Tamil Nadu": [
    "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore",
    "Cuddalore", "Dharmapuri", "Dindigul", "Erode",
    "Kallakurichi", "Kanchipuram", "Kanyakumari",
    "Karur", "Krishnagiri", "Madurai", "Nagapattinam",
    "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
    "Ramanathapuram", "Ranipet", "Salem",
    "Sivaganga", "Tenkasi", "Thanjavur", "Theni",
    "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
    "Tirupathur", "Tiruppur", "Tiruvallur",
    "Tiruvannamalai", "Tiruvarur", "Vellore",
    "Viluppuram", "Virudhunagar"
  ],

  "Telangana": [
    "Adilabad", "Bhadradri Kothagudem", "Hyderabad",
    "Jagtial", "Jangaon", "Jayashankar Bhupalpally",
    "Jogulamba Gadwal", "Kamareddy", "Karimnagar",
    "Khammam", "Komaram Bheem", "Mahabubabad",
    "Mahbubnagar", "Mancherial", "Medak",
    "Medchal–Malkajgiri", "Mulugu", "Nagarkurnool",
    "Nalgonda", "Narayanpet", "Nirmal",
    "Nizamabad", "Peddapalli", "Rajanna Sircilla",
    "Ranga Reddy", "Sangareddy", "Siddipet",
    "Suryapet", "Vikarabad", "Wanaparthy",
    "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"
  ],

  "Uttar Pradesh": [
    "Agra", "Aligarh", "Allahabad", "Ambedkar Nagar",
    "Amethi", "Amroha", "Auraiya", "Azamgarh",
    "Baghpat", "Bahraich", "Ballia", "Balrampur",
    "Banda", "Barabanki", "Bareilly", "Basti",
    "Bhadohi", "Bijnor", "Budaun", "Bulandshahr",
    "Chandauli", "Chitrakoot", "Deoria", "Etah",
    "Etawah", "Faizabad", "Farrukhabad", "Fatehpur",
    "Firozabad", "Gautam Buddha Nagar", "Ghaziabad",
    "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur",
    "Hapur", "Hardoi", "Hathras", "Jalaun",
    "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat",
    "Kanpur Nagar", "Kasganj", "Kaushambi",
    "Kushinagar", "Lakhimpur Kheri", "Lalitpur",
    "Lucknow", "Maharajganj", "Mahoba", "Mainpuri",
    "Mathura", "Mau", "Meerut", "Mirzapur",
    "Moradabad", "Muzaffarnagar", "Pilibhit",
    "Pratapgarh", "Raebareli", "Rampur",
    "Saharanpur", "Sambhal", "Sant Kabir Nagar",
    "Shahjahanpur", "Shamli", "Shravasti",
    "Siddharthnagar", "Sitapur", "Sonbhadra",
    "Sultanpur", "Unnao", "Varanasi"
  ],

  "West Bengal": [
    "Alipurduar", "Bankura", "Birbhum", "Cooch Behar",
    "Dakshin Dinajpur", "Darjeeling", "Hooghly",
    "Howrah", "Jalpaiguri", "Jhargram",
    "Kalimpong", "Kolkata", "Malda",
    "Murshidabad", "Nadia", "North 24 Parganas",
    "Paschim Bardhaman", "Paschim Medinipur",
    "Purba Bardhaman", "Purba Medinipur",
    "Purulia", "South 24 Parganas",
    "Uttar Dinajpur"
  ]
};

```

---

## Component_keyValue3 (ID: keyValue3)
```javascript
{{ new Date() }}
```

---

## Component_keyValue5 (ID: keyValue5)
```javascript
api/debit-notes/{{debiteNotetbl.selectedRow.id}}/items
```

---

## Component_listView1 (ID: listView1)
```javascript
{{ collapsibleContainer1.showBody }}
```

---

## varIsEditing (ID: modalAddAddress)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## Component_modalAddProduct (ID: modalAddProduct)
```javascript
add product
```

---

## modalFrame1 (ID: modalAddVendor)
```javascript
create new vendor
```

---

## modalFrameGRN (ID: modalCloseButton1)
```javascript
{{ ChoosePo.value }}
```

---

## modalMakePayment (ID: modalCloseButton2)
```javascript
api/vendor-payments/ledger/{{ varSelectedVendor.value.id }}
```

---

## modalDebitNote (ID: modalCloseButton3)
```javascript
{{ new Date() }}
```

---

## modalAddAddress (ID: modalCloseButton7)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## modalViewGRN (ID: modalCloseButton8)
```javascript
api/purchase-invoices/{{ tblGrn.selectedRow.id }}/reverse
```

---

## Component_modalDebitNote (ID: modalDebitNote)
```javascript
Create Debit Note
```

---

## Component_modalDebitNoteHeader (ID: modalDebitNoteHeader)
```javascript
Create Debit Note
```

---

## modalFrame1 (ID: modalFrame1)
```javascript
create new vendor
```

---

## Component_modalFrameDebitNote (ID: modalFrameDebitNote)
```javascript
{{ debiteNotetbl.selectedRow.debit_note_number }}
```

---

## varGRNList (ID: modalFrameGRN)
```javascript
{{ ChoosePo.value }}
```

---

## modalFrameImport (ID: modalFrameImport)
```javascript
add product in bulk
```

---

## getBankAccounts (ID: modalMakePayment)
```javascript
api/vendor-payments/ledger/{{ varSelectedVendor.value.id }}
```

---

## validateImportJS (ID: modalStockAdjust)
```javascript
Inventory Adjustment
```

---

## Component_modalTitle2 (ID: modalTitle2)
```javascript
api/vendor-payments/ledger/{{ varSelectedVendor.value.id }}
```

---

## Component_modalTitle3 (ID: modalTitle3)
```javascript
create new vendor
```

---

## Component_modalTitle4 (ID: modalTitle4)
```javascript
add product
```

---

## Component_modalTitle5 (ID: modalTitle5)
```javascript
add product in bulk
```

---

## Component_modalTitle6 (ID: modalTitle6)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## Component_modalTitle7 (ID: modalTitle7)
```javascript
api/purchase-invoices/{{ tblGrn.selectedRow.id }}/reverse
```

---

## Component_modalTitle8 (ID: modalTitle8)
```javascript
Inventory Adjustment
```

---

## Component_modalTitle9 (ID: modalTitle9)
```javascript
{{ debiteNotetbl.selectedRow.debit_note_number }}
```

---

## Component_modalViewGRN (ID: modalViewGRN)
```javascript
api/purchase-invoices/{{ tblGrn.selectedRow.id }}/reverse
```

---

## Reference No (ID: payAmount)
```javascript
const vendor = varSelectedVendor.value;
const totalAmount = payAmount.value;
const isRefund = payType.value === 'REFUND';

// Validate
if (!totalAmount || totalAmount <= 0) {
    utils.showNotification({ title: "Error", description: "Enter valid amount", notificationType: "error" });
    return;
}

let allocations = [];
// ONLY calculate allocations if it is a PAYMENT
if (!isRefund) {
    const selectedBills = tblPendingBills.selectedSourceRows || []; 
    if (selectedBills.length > 0) {
        // FIFO Logic
        let remainingPayment = Number(totalAmount);
        for (const bill of selectedBills) {
            if (remainingPayment <= 0) break;
            const billBalance = Number(bill['Balance $']);
            const allocAmount = Math.min(billBalance, remainingPayment);
            
            if (allocAmount > 0) {
                allocations.push({
                    invoice_id: bill.id,
                    amount: allocAmount
                });
                remainingPayment -= allocAmount;
            }
        }
    }
}

// Trigger API
apiMakePayment.trigger({
    additionalScope: {
        payload: {
            vendor_id: vendor.id,
            amount: totalAmount,
            payment_date: moment(payDate.value).format("YYYY-MM-DD"),
            mode: payMode.value,
            // [NEW] Unified Reference logic
            transaction_ref: payMode.value === 'Online' ? selBankRefVendor.selectedItem.bank_ref_id : (payMode.value === 'Cheque' ? payChqNo.value : payRef.value),
            bank_statement_entry_id: payMode.value === 'Online' ? selBankRefVendor.selectedItem.id : null,
            remarks: payRemarks.value,
            transaction_type: payType.value,
            allocations: isRefund ? [] : allocations,
            bank_account_id: selPaymentBank.value,
            // [NEW] Cheque Details
            cheque_no: payChqNo.value,
            cheque_date: payChqDate.value,
            bank_name: payChqBank.value
        }
    },
    onSuccess: function() {
        modalMakePayment.close();
        getVendorLedger.trigger();
        getVendorPendingBills.trigger();
        utils.showNotification({ title: "Success", description: "Transaction Recorded", notificationType: "success" });
    }
});

```

---

## Cheque Date (ID: payChqBank)
```javascript
api/finance/reconciliation/bank/unconsumed-debits
```

---

## Cheque No (ID: payChqDate)
```javascript
api/finance/reconciliation/bank/unconsumed-debits
```

---

## Cheque No (ID: payChqNo)
```javascript
api/finance/reconciliation/bank/unconsumed-debits
```

---

## Date of Payment (ID: payDate)
```javascript
const vendor = varSelectedVendor.value;
const totalAmount = payAmount.value;
const isRefund = payType.value === 'REFUND';

// Validate
if (!totalAmount || totalAmount <= 0) {
    utils.showNotification({ title: "Error", description: "Enter valid amount", notificationType: "error" });
    return;
}

let allocations = [];
// ONLY calculate allocations if it is a PAYMENT
if (!isRefund) {
    const selectedBills = tblPendingBills.selectedSourceRows || []; 
    if (selectedBills.length > 0) {
        // FIFO Logic
        let remainingPayment = Number(totalAmount);
        for (const bill of selectedBills) {
            if (remainingPayment <= 0) break;
            const billBalance = Number(bill['Balance $']);
            const allocAmount = Math.min(billBalance, remainingPayment);
            
            if (allocAmount > 0) {
                allocations.push({
                    invoice_id: bill.id,
                    amount: allocAmount
                });
                remainingPayment -= allocAmount;
            }
        }
    }
}

// Trigger API
apiMakePayment.trigger({
    additionalScope: {
        payload: {
            vendor_id: vendor.id,
            amount: totalAmount,
            payment_date: moment(payDate.value).format("YYYY-MM-DD"),
            mode: payMode.value,
            // [NEW] Unified Reference logic
            transaction_ref: payMode.value === 'Online' ? selBankRefVendor.selectedItem.bank_ref_id : (payMode.value === 'Cheque' ? payChqNo.value : payRef.value),
            bank_statement_entry_id: payMode.value === 'Online' ? selBankRefVendor.selectedItem.id : null,
            remarks: payRemarks.value,
            transaction_type: payType.value,
            allocations: isRefund ? [] : allocations,
            bank_account_id: selPaymentBank.value,
            // [NEW] Cheque Details
            cheque_no: payChqNo.value,
            cheque_date: payChqDate.value,
            bank_name: payChqBank.value
        }
    },
    onSuccess: function() {
        modalMakePayment.close();
        getVendorLedger.trigger();
        getVendorPendingBills.trigger();
        utils.showNotification({ title: "Success", description: "Transaction Recorded", notificationType: "success" });
    }
});

```

---

## Date of Payment (ID: payMode)
```javascript
const vendor = varSelectedVendor.value;
const totalAmount = payAmount.value;
const isRefund = payType.value === 'REFUND';

// Validate
if (!totalAmount || totalAmount <= 0) {
    utils.showNotification({ title: "Error", description: "Enter valid amount", notificationType: "error" });
    return;
}

let allocations = [];
// ONLY calculate allocations if it is a PAYMENT
if (!isRefund) {
    const selectedBills = tblPendingBills.selectedSourceRows || []; 
    if (selectedBills.length > 0) {
        // FIFO Logic
        let remainingPayment = Number(totalAmount);
        for (const bill of selectedBills) {
            if (remainingPayment <= 0) break;
            const billBalance = Number(bill['Balance $']);
            const allocAmount = Math.min(billBalance, remainingPayment);
            
            if (allocAmount > 0) {
                allocations.push({
                    invoice_id: bill.id,
                    amount: allocAmount
                });
                remainingPayment -= allocAmount;
            }
        }
    }
}

// Trigger API
apiMakePayment.trigger({
    additionalScope: {
        payload: {
            vendor_id: vendor.id,
            amount: totalAmount,
            payment_date: moment(payDate.value).format("YYYY-MM-DD"),
            mode: payMode.value,
            // [NEW] Unified Reference logic
            transaction_ref: payMode.value === 'Online' ? selBankRefVendor.selectedItem.bank_ref_id : (payMode.value === 'Cheque' ? payChqNo.value : payRef.value),
            bank_statement_entry_id: payMode.value === 'Online' ? selBankRefVendor.selectedItem.id : null,
            remarks: payRemarks.value,
            transaction_type: payType.value,
            allocations: isRefund ? [] : allocations,
            bank_account_id: selPaymentBank.value,
            // [NEW] Cheque Details
            cheque_no: payChqNo.value,
            cheque_date: payChqDate.value,
            bank_name: payChqBank.value
        }
    },
    onSuccess: function() {
        modalMakePayment.close();
        getVendorLedger.trigger();
        getVendorPendingBills.trigger();
        utils.showNotification({ title: "Success", description: "Transaction Recorded", notificationType: "success" });
    }
});

```

---

## Reference No (ID: payRef)
```javascript
const vendor = varSelectedVendor.value;
const totalAmount = payAmount.value;
const isRefund = payType.value === 'REFUND';

// Validate
if (!totalAmount || totalAmount <= 0) {
    utils.showNotification({ title: "Error", description: "Enter valid amount", notificationType: "error" });
    return;
}

let allocations = [];
// ONLY calculate allocations if it is a PAYMENT
if (!isRefund) {
    const selectedBills = tblPendingBills.selectedSourceRows || []; 
    if (selectedBills.length > 0) {
        // FIFO Logic
        let remainingPayment = Number(totalAmount);
        for (const bill of selectedBills) {
            if (remainingPayment <= 0) break;
            const billBalance = Number(bill['Balance $']);
            const allocAmount = Math.min(billBalance, remainingPayment);
            
            if (allocAmount > 0) {
                allocations.push({
                    invoice_id: bill.id,
                    amount: allocAmount
                });
                remainingPayment -= allocAmount;
            }
        }
    }
}

// Trigger API
apiMakePayment.trigger({
    additionalScope: {
        payload: {
            vendor_id: vendor.id,
            amount: totalAmount,
            payment_date: moment(payDate.value).format("YYYY-MM-DD"),
            mode: payMode.value,
            // [NEW] Unified Reference logic
            transaction_ref: payMode.value === 'Online' ? selBankRefVendor.selectedItem.bank_ref_id : (payMode.value === 'Cheque' ? payChqNo.value : payRef.value),
            bank_statement_entry_id: payMode.value === 'Online' ? selBankRefVendor.selectedItem.id : null,
            remarks: payRemarks.value,
            transaction_type: payType.value,
            allocations: isRefund ? [] : allocations,
            bank_account_id: selPaymentBank.value,
            // [NEW] Cheque Details
            cheque_no: payChqNo.value,
            cheque_date: payChqDate.value,
            bank_name: payChqBank.value
        }
    },
    onSuccess: function() {
        modalMakePayment.close();
        getVendorLedger.trigger();
        getVendorPendingBills.trigger();
        utils.showNotification({ title: "Success", description: "Transaction Recorded", notificationType: "success" });
    }
});

```

---

## Amount (ID: payRemarks)
```javascript
const vendor = varSelectedVendor.value;
const totalAmount = payAmount.value;
const isRefund = payType.value === 'REFUND';

// Validate
if (!totalAmount || totalAmount <= 0) {
    utils.showNotification({ title: "Error", description: "Enter valid amount", notificationType: "error" });
    return;
}

let allocations = [];
// ONLY calculate allocations if it is a PAYMENT
if (!isRefund) {
    const selectedBills = tblPendingBills.selectedSourceRows || []; 
    if (selectedBills.length > 0) {
        // FIFO Logic
        let remainingPayment = Number(totalAmount);
        for (const bill of selectedBills) {
            if (remainingPayment <= 0) break;
            const billBalance = Number(bill['Balance $']);
            const allocAmount = Math.min(billBalance, remainingPayment);
            
            if (allocAmount > 0) {
                allocations.push({
                    invoice_id: bill.id,
                    amount: allocAmount
                });
                remainingPayment -= allocAmount;
            }
        }
    }
}

// Trigger API
apiMakePayment.trigger({
    additionalScope: {
        payload: {
            vendor_id: vendor.id,
            amount: totalAmount,
            payment_date: moment(payDate.value).format("YYYY-MM-DD"),
            mode: payMode.value,
            // [NEW] Unified Reference logic
            transaction_ref: payMode.value === 'Online' ? selBankRefVendor.selectedItem.bank_ref_id : (payMode.value === 'Cheque' ? payChqNo.value : payRef.value),
            bank_statement_entry_id: payMode.value === 'Online' ? selBankRefVendor.selectedItem.id : null,
            remarks: payRemarks.value,
            transaction_type: payType.value,
            allocations: isRefund ? [] : allocations,
            bank_account_id: selPaymentBank.value,
            // [NEW] Cheque Details
            cheque_no: payChqNo.value,
            cheque_date: payChqDate.value,
            bank_name: payChqBank.value
        }
    },
    onSuccess: function() {
        modalMakePayment.close();
        getVendorLedger.trigger();
        getVendorPendingBills.trigger();
        utils.showNotification({ title: "Success", description: "Transaction Recorded", notificationType: "success" });
    }
});

```

---

## Component_payType (ID: payType)
```javascript
PAYMENT
```

---

## modalFrameGRN (ID: piLines)
```javascript
api/purchase-invoices?
```

---

## Component_poCounter (ID: poCounter)
```javascript
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
```

---

## Component_poLines (ID: poLines)
```javascript
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
```

---

## poListTable (ID: poListTable)
```javascript
{{ currentSourceRow.id }}
```

---

## Component_poNumber2 (ID: poNumber2)
```javascript
**PO Number      :** GD-CLT-PO-26-{{ getNextPO.data.next_num }}
```

---

## getPOs (ID: poTable)
```javascript
const all = Products.data.data || Products.data || []; 
// Group By Brand
const grouped = _.groupBy(all, 'brand_name');
// Return Array for ListView
return Object.keys(grouped).map((brandName, index) => {
    const products = grouped[brandName];
    // Grab the brand_id from the first product
    const brandId = products[0] ? products[0].brand_id : index; 
    // 1. Taxable Stock Value (Current Value of Goods on Hand - Taxable)
    const valStockTaxable = _.sumBy(products, p => Number(p.stock_value_cost || 0));
    // 2. Total Bought Value (Historical Value of All Goods Purchased - Taxable)
    const valTotalBought = _.sumBy(products, p => Number(p.stock_value_total_bought || 0));
    return {
        id: brandId,
        brand_name: brandName,
        product_count: products.length,
        val_stock_taxable: valStockTaxable.toFixed(2),
        val_total_bought: valTotalBought.toFixed(2),
        products: products.sort((a,b) => a.product_name.localeCompare(b.product_name))
    };
}).sort((a,b) => a.brand_name.localeCompare(b.brand_name));
```

---

## Component_poTablePrint (ID: poTablePrint)
```javascript
api/vendors
```

---

## Component_populateDebitTableJS (ID: populateDebitTableJS)
```javascript
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
```

---

## Component_populateDrawerFromPO (ID: populateDrawerFromPO)
```javascript
/* --- UNIFIED VIEW SCRIPT (MATCHES CREATE KEYS) --- */
const data = getPOById.data;

if (!data || !data.header) {
  utils.showNotification({ title: "Error", description: "No Data", notificationType: "error" });
  return;
}

// 1. SET VIEW MODE (Safety)
varPOMode.setValue('VIEW'); // <--- ADDED THIS ✅

// 2. Map Header
vendorDropdown.setValue(data.header.vendor_id);
poNumber2.setValue(data.header.po_number);
date5.setValue(data.header.po_date);
date6.setValue(data.header.delivery_date);

// 3. Map Lines (Targeting EXACT Keys from Create Script)
const formattedLines = data.lines.map((row, index) => {
    // Inputs
    const qty = Number(row.ordered_qty);
    const rate = Number(row.rate);
    const discPct = Number(row.discount_percent || 0);
    const scheme = Number(row.scheme_amount || 0);
    
    // Math
    const gross = qty * rate;
    const discAmt = (gross - scheme) * (discPct / 100);
    const taxAmt = Number(row.tax_amount);
    const net = Number(row.amount);
    
    return {
        "S.No": index + 1,              
        "EAN Code": row.ean_code,       
        "Item Name": row.product_name,  
        "MRP": Number(row.mrp),         
        "Price": rate,
        "Qty": qty,
        "Sch": scheme,
        "Disc %": discPct,
        "GST %": 5,                     
        "Gross $": gross,               
        "Disc. $": discAmt,             
        "Taxable $": net - taxAmt,      
        "GST $": taxAmt,                
        "Net $": net,                   
        "_product_id": row.product_id
    };
});

// 4. Reset & Set
poLines.setValue([]); 
poLines.setValue(formattedLines);

// 5. Show Drawer
drawerCreatePO.show();
```

---

## Component_postImportCleanupJS (ID: postImportCleanupJS)
```javascript
utils.showNotification({ title: "Success", description: `Imported ${varImportData.value.length} items`, notificationType: "success" });
varImportData.setValue([]); // Clear valid list
// Now the Modal will automatically reveal the Error Table (if any errors exist)
if (varImportErrors.value.length === 0) {
   modalFrameImport. hide(); // Close if no errors left
}
```

---

## Component_printState (ID: printState)
```javascript
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
```

---

## Component_q_getUnconsumedDebits (ID: q_getUnconsumedDebits)
```javascript
api/finance/reconciliation/bank/unconsumed-debits
```

---

## createDebitNoteJS (ID: saveDebitNoteJS)
```javascript
const isItemMode = dnMode.value === "Item Return";
let amount = 0;
let lines = [];
if (isItemMode) {
    // Calculate from Table (Map to Backend Keys)
    const rawLines = tblDebitLines.data; 
    
    lines = rawLines.map(row => ({
        product_id: row._product_id, // Map from '_product_id'
        qty: Number(row.Qty),
        rate: Number(row.Price), // Map from 'Price'
        batch_number: row['Batch No'] || "", // Map from 'Batch No'
        return_type: row.Reason || "Damage",
        amount: Number(row['Net $']) || (Number(row.Qty) * Number(row.Price))
    })).filter(l => l.qty > 0);
    amount = _.sumBy(lines, 'amount');
} else {
    // Manual Amount
    amount = Number(dnAmount.value);
}
if (!amount || amount <= 0) {
   utils.showNotification({ title: "Error", description: "Invalid Amount", notificationType: "error" });
   return;
}
apiCreateDebitNote.trigger({
    additionalScope: {
        payload: {
            vendor_id: varSelectedVendor.value.id,
            amount: amount,
            debit_note_date: moment(dnDate.value).format("YYYY-MM-DD"),
            reason: dnReason.value,
            linked_invoice_id: selLinkedBill.value || null, // New field
            lines: isItemMode ? lines : [] 
        }
    },
    onSuccess: function(data) {
         // data contains { dn_number: 'GD-CLT-DN-26-1' }
        utils.showNotification({ title: "Debit Note Created", description: data.dn_number, notificationType: "success" });
        
        // Show the number in the box
        try { txtDNNumber.setValue(data.dn_number); } catch(e) {}
        modalDebitNote.close();
        getVendorLedger.trigger();
    }
});
```

---

## poListTable (ID: saveGRN)
```javascript
api/purchase-invoices?
```

---

## saveGRNJS (ID: saveGRNJS)
```javascript
/* --- UNIFIED GRN SAVE LOGIC --- */
// 1. Validate Lines
const rawLines = piLines.value || [];
const validLines = rawLines.filter(row => row.Qty && Number(row.Qty) > 0);
if (validLines.length === 0) {
  utils.showNotification({ title: "Error", description: "No items to save!", notificationType: "error" });
  return;
}
const vID = vendorDropdownGRN.value;
if (!vID) {
   utils.showNotification({ title: "Error", description: "Select a Vendor", notificationType: "error" });
   return;
}
// 2. Prepare Payload
const dbLines = validLines.map(row => ({
    // Ensure you map your Column IDs correctly here!
    product_id:         Number(row._product_id),
    ordered_qty:        0, 
    accepted_qty:       Number(row.Qty),
    rate:               Number(row.Price),
    discount_percent:   Number(row['Disc %'] || 0),
    scheme_amount:      Number(row.Sch || 0),
    tax_amount:         Number(row['GST $'] || 0),
    amount:             Number(row['Net $'] || 0),
    batch_number:       row["Batch No"] ? row["Batch No"].toString() : "",
    expiry_date:        row.Expiry ? moment(row.Expiry).format("YYYY-MM-DD") : null,
    mrp:                Number(row.MRP || 0)
}));
const totalNet = dbLines.reduce((acc, x) => acc + x.amount, 0); 
const totalTax = dbLines.reduce((acc, x) => acc + x.tax_amount, 0);
const finalPayload = {
    vendor_id:          Number(vID),
    purchase_order_id: Number(ChoosePo.value || 0),
    invoice_number:     vendorInvoiceNo.value,
    invoice_date:       dateVendorInvoice.value, // Ensure Moment/Date format matches
    received_date:      dateReceived.value,
    total_net:          totalNet,
    tax_amount:         totalTax,
    grand_total:        Math.round(totalNet + totalTax),
    lines:              dbLines,
    
    // --- TRACEABILITY MAGIC ---
    // If varCorrectionID has a value, we link this new GRN to the old one!
    parent_invoice_id:  varCorrectionID.value || null 
};
// 3. Save & Send
await varGRNPayload.setValue(finalPayload);
// Trigger Query
apiCreateGRN.trigger({
    onSuccess: function(data) {
        utils.showNotification({ title: "Success", description: "GRN Saved!", notificationType: "success" });
        
        // 4. CLEANUP (Critical)
        piLines.setValue([]);
        vendorDropdownGRN.clearValue();
        vendorInvoiceNo.setValue("");
        dateVendorInvoice.clearValue();
        varGRNPayload.setValue({});
        
        // Reset Correction Mode
        varCorrectionID.setValue(null);
        varCorrectionData.setValue({});
        
        modalFrameGRN.close();
    },
    onFailure: function(err) {
        console.error(err);
        utils.showNotification({ title: "Failed", description: err.message, notificationType: "error" });
    }
});
```

---

## Component_savePOLine (ID: savePOLine)
```javascript
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
```

---

## savePaymentJS (ID: savePaymentJS)
```javascript
const vendor = varSelectedVendor.value;
const totalAmount = payAmount.value;
const isRefund = payType.value === 'REFUND';

// Validate
if (!totalAmount || totalAmount <= 0) {
    utils.showNotification({ title: "Error", description: "Enter valid amount", notificationType: "error" });
    return;
}

let allocations = [];
// ONLY calculate allocations if it is a PAYMENT
if (!isRefund) {
    const selectedBills = tblPendingBills.selectedSourceRows || []; 
    if (selectedBills.length > 0) {
        // FIFO Logic
        let remainingPayment = Number(totalAmount);
        for (const bill of selectedBills) {
            if (remainingPayment <= 0) break;
            const billBalance = Number(bill['Balance $']);
            const allocAmount = Math.min(billBalance, remainingPayment);
            
            if (allocAmount > 0) {
                allocations.push({
                    invoice_id: bill.id,
                    amount: allocAmount
                });
                remainingPayment -= allocAmount;
            }
        }
    }
}

// Trigger API
apiMakePayment.trigger({
    additionalScope: {
        payload: {
            vendor_id: vendor.id,
            amount: totalAmount,
            payment_date: moment(payDate.value).format("YYYY-MM-DD"),
            mode: payMode.value,
            // [NEW] Unified Reference logic
            transaction_ref: payMode.value === 'Online' ? selBankRefVendor.selectedItem.bank_ref_id : (payMode.value === 'Cheque' ? payChqNo.value : payRef.value),
            bank_statement_entry_id: payMode.value === 'Online' ? selBankRefVendor.selectedItem.id : null,
            remarks: payRemarks.value,
            transaction_type: payType.value,
            allocations: isRefund ? [] : allocations,
            bank_account_id: selPaymentBank.value,
            // [NEW] Cheque Details
            cheque_no: payChqNo.value,
            cheque_date: payChqDate.value,
            bank_name: payChqBank.value
        }
    },
    onSuccess: function() {
        modalMakePayment.close();
        getVendorLedger.trigger();
        getVendorPendingBills.trigger();
        utils.showNotification({ title: "Success", description: "Transaction Recorded", notificationType: "success" });
    }
});

```

---

## apiGetBatches (ID: selAdjBatch)
```javascript
api/stock/adjust/batches/{{ selAdjProduct.value }}?
```

---

## Enter Quantity (ID: selAdjReason)
```javascript
api/stock/adjust/batches/{{ selAdjProduct.value }}?
```

---

## Component_selBankRefVendor (ID: selBankRefVendor)
```javascript
api/finance/reconciliation/bank/unconsumed-debits
```

---

## Component_selExportBrand (ID: selExportBrand)
```javascript
const fileData = fileBulkUpload.parsedValue[0];
// Helper to find column even if casing doesn't match
const get = (row, key) => {
    const found = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z]/g, '') === key.toLowerCase().replace(/[^a-z]/g, ''));
    return found ? row[found] : "";
};
const cleanRows = fileData.map(r => ({
    "Product ID":     get(r, "Product ID") || get(r, "ID"),
    "Product Name":   get(r, "Product Name"),
    "MRP":            get(r, "MRP"),
    "Purchase Rate":  get(r, "Purchase Rate"),
    "Distributor":    get(r, "Distributor Rate"),
    "Wholesale":      get(r, "Wholesale Rate"),
    "Dealer":         get(r, "Dealer Rate"),
    "Retail":         get(r, "Retail Rate"),
    "Case Qty":       get(r, "Case Qty"),
    "UOM":            get(r, "UOM"),
    "Model No":       get(r, "Model Number"),
    "Min Stock":      get(r, "Min Stock"),
    "Length":         get(r, "Length(cm)"),
    "Width":          get(r, "Width(cm)"),
    "Height":         get(r, "Height(cm)"),
    "Weight":         get(r, "Weight(kg)"),
    "Description":    get(r, "Description")
}));
varBulkData.setValue(cleanRows);
utils.showNotification({ title: "Loaded", description: `Review ${cleanRows.length} items below.` });
```

---

## Component_selLinkedBill (ID: selLinkedBill)
```javascript
PAYMENT
```

---

## Component_selNewDistrict (ID: selNewDistrict)
```javascript
return {
  "Andhra Pradesh": [
    "Anantapur", "Chittoor", "East Godavari", "Guntur", "Kadapa",
    "Krishna", "Kurnool", "Nellore", "Prakasam",
    "Srikakulam", "Visakhapatnam", "Vizianagaram",
    "West Godavari"
  ],

  "Arunachal Pradesh": [
    "Anjaw", "Changlang", "Dibang Valley", "East Kameng",
    "East Siang", "Kurung Kumey", "Lohit", "Lower Dibang Valley",
    "Lower Subansiri", "Papum Pare", "Tawang",
    "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"
  ],

  "Assam": [
    "Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar",
    "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri",
    "Dibrugarh", "Goalpara", "Golaghat", "Hailakandi",
    "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan",
    "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur",
    "Majuli", "Morigaon", "Nagaon", "Nalbari",
    "Sivasagar", "Sonitpur", "South Salmara",
    "Tinsukia", "Udalguri", "West Karbi Anglong"
  ],

  "Bihar": [
    "Araria", "Arwal", "Aurangabad", "Banka", "Begusarai",
    "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga",
    "East Champaran", "Gaya", "Gopalganj", "Jamui",
    "Jehanabad", "Kaimur", "Katihar", "Khagaria",
    "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani",
    "Munger", "Muzaffarpur", "Nalanda", "Nawada",
    "Patna", "Purnia", "Rohtas", "Saharsa",
    "Samastipur", "Saran", "Sheikhpura", "Sheohar",
    "Sitamarhi", "Siwan", "Supaul", "Vaishali",
    "West Champaran"
  ],

  "Chhattisgarh": [
    "Balod", "Baloda Bazar", "Balrampur", "Bastar",
    "Bemetara", "Bijapur", "Bilaspur", "Dantewada",
    "Dhamtari", "Durg", "Gariaband", "Gaurela-Pendra-Marwahi",
    "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker",
    "Kondagaon", "Korba", "Koriya", "Mahasamund",
    "Mungeli", "Narayanpur", "Raigarh", "Raipur",
    "Rajnandgaon", "Sukma", "Surajpur", "Surguja"
  ],

  "Goa": ["North Goa", "South Goa"],

  "Gujarat": [
    "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha",
    "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur",
    "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar",
    "Gir Somnath", "Jamnagar", "Junagadh", "Kheda",
    "Kutch", "Mahisagar", "Mehsana", "Morbi",
    "Narmada", "Navsari", "Panchmahal", "Patan",
    "Porbandar", "Rajkot", "Sabarkantha", "Surat",
    "Surendranagar", "Tapi", "Vadodara", "Valsad"
  ],

  "Haryana": [
    "Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad",
    "Fatehabad", "Gurugram", "Hisar", "Jhajjar",
    "Jind", "Kaithal", "Karnal", "Kurukshetra",
    "Mahendragarh", "Nuh", "Palwal", "Panchkula",
    "Panipat", "Rewari", "Rohtak", "Sirsa",
    "Sonipat", "Yamunanagar"
  ],

  "Himachal Pradesh": [
    "Bilaspur", "Chamba", "Hamirpur", "Kangra",
    "Kinnaur", "Kullu", "Lahaul and Spiti",
    "Mandi", "Shimla", "Sirmaur", "Solan", "Una"
  ],

  "Jharkhand": [
    "Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka",
    "East Singhbhum", "Garhwa", "Giridih", "Godda",
    "Gumla", "Hazaribagh", "Jamtara", "Khunti",
    "Koderma", "Latehar", "Lohardaga", "Pakur",
    "Palamu", "Ramgarh", "Ranchi", "Sahebganj",
    "Seraikela Kharsawan", "Simdega", "West Singhbhum"
  ],

  "Karnataka": [
    "Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural",
    "Bengaluru Urban", "Bidar", "Chamarajanagar",
    "Chikkaballapur", "Chikkamagaluru", "Chitradurga",
    "Dakshina Kannada", "Davangere", "Dharwad",
    "Gadag", "Hassan", "Haveri", "Kalaburagi",
    "Kodagu", "Kolar", "Koppal", "Mandya",
    "Mysuru", "Raichur", "Ramanagara", "Shivamogga",
    "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura",
    "Yadgir"
  ],

  "Kerala": [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur",
    "Kasaragod", "Kollam", "Kottayam", "Kozhikode",
    "Malappuram", "Palakkad", "Pathanamthitta",
    "Thiruvananthapuram", "Thrissur", "Wayanad"
  ],

  "Madhya Pradesh": [
    "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar",
    "Balaghat", "Barwani", "Betul", "Bhind",
    "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara",
    "Damoh", "Datia", "Dewas", "Dhar", "Dindori",
    "Guna", "Gwalior", "Harda", "Hoshangabad",
    "Indore", "Jabalpur", "Jhabua", "Katni",
    "Khandwa", "Khargone", "Mandla", "Mandsaur",
    "Morena", "Narsinghpur", "Neemuch", "Panna",
    "Raisen", "Rajgarh", "Ratlam", "Rewa",
    "Sagar", "Satna", "Sehore", "Seoni",
    "Shahdol", "Shajapur", "Sheopur", "Shivpuri",
    "Sidhi", "Singrauli", "Tikamgarh", "Ujjain",
    "Umaria", "Vidisha"
  ],

  "Maharashtra": [
    "Ahmednagar", "Akola", "Amravati", "Aurangabad",
    "Beed", "Bhandara", "Buldhana", "Chandrapur",
    "Dhule", "Gadchiroli", "Gondia", "Hingoli",
    "Jalgaon", "Jalna", "Kolhapur", "Latur",
    "Mumbai City", "Mumbai Suburban", "Nagpur",
    "Nanded", "Nandurbar", "Nashik", "Osmanabad",
    "Palghar", "Parbhani", "Pune", "Raigad",
    "Ratnagiri", "Sangli", "Satara", "Sindhudurg",
    "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
  ],

  "Tamil Nadu": [
    "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore",
    "Cuddalore", "Dharmapuri", "Dindigul", "Erode",
    "Kallakurichi", "Kanchipuram", "Kanyakumari",
    "Karur", "Krishnagiri", "Madurai", "Nagapattinam",
    "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
    "Ramanathapuram", "Ranipet", "Salem",
    "Sivaganga", "Tenkasi", "Thanjavur", "Theni",
    "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
    "Tirupathur", "Tiruppur", "Tiruvallur",
    "Tiruvannamalai", "Tiruvarur", "Vellore",
    "Viluppuram", "Virudhunagar"
  ],

  "Telangana": [
    "Adilabad", "Bhadradri Kothagudem", "Hyderabad",
    "Jagtial", "Jangaon", "Jayashankar Bhupalpally",
    "Jogulamba Gadwal", "Kamareddy", "Karimnagar",
    "Khammam", "Komaram Bheem", "Mahabubabad",
    "Mahbubnagar", "Mancherial", "Medak",
    "Medchal–Malkajgiri", "Mulugu", "Nagarkurnool",
    "Nalgonda", "Narayanpet", "Nirmal",
    "Nizamabad", "Peddapalli", "Rajanna Sircilla",
    "Ranga Reddy", "Sangareddy", "Siddipet",
    "Suryapet", "Vikarabad", "Wanaparthy",
    "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"
  ],

  "Uttar Pradesh": [
    "Agra", "Aligarh", "Allahabad", "Ambedkar Nagar",
    "Amethi", "Amroha", "Auraiya", "Azamgarh",
    "Baghpat", "Bahraich", "Ballia", "Balrampur",
    "Banda", "Barabanki", "Bareilly", "Basti",
    "Bhadohi", "Bijnor", "Budaun", "Bulandshahr",
    "Chandauli", "Chitrakoot", "Deoria", "Etah",
    "Etawah", "Faizabad", "Farrukhabad", "Fatehpur",
    "Firozabad", "Gautam Buddha Nagar", "Ghaziabad",
    "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur",
    "Hapur", "Hardoi", "Hathras", "Jalaun",
    "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat",
    "Kanpur Nagar", "Kasganj", "Kaushambi",
    "Kushinagar", "Lakhimpur Kheri", "Lalitpur",
    "Lucknow", "Maharajganj", "Mahoba", "Mainpuri",
    "Mathura", "Mau", "Meerut", "Mirzapur",
    "Moradabad", "Muzaffarnagar", "Pilibhit",
    "Pratapgarh", "Raebareli", "Rampur",
    "Saharanpur", "Sambhal", "Sant Kabir Nagar",
    "Shahjahanpur", "Shamli", "Shravasti",
    "Siddharthnagar", "Sitapur", "Sonbhadra",
    "Sultanpur", "Unnao", "Varanasi"
  ],

  "West Bengal": [
    "Alipurduar", "Bankura", "Birbhum", "Cooch Behar",
    "Dakshin Dinajpur", "Darjeeling", "Hooghly",
    "Howrah", "Jalpaiguri", "Jhargram",
    "Kalimpong", "Kolkata", "Malda",
    "Murshidabad", "Nadia", "North 24 Parganas",
    "Paschim Bardhaman", "Paschim Medinipur",
    "Purba Bardhaman", "Purba Medinipur",
    "Purulia", "South 24 Parganas",
    "Uttar Dinajpur"
  ]
};

```

---

## Component_selNewProductHSN (ID: selNewProductHSN)
```javascript
api/master/brands
```

---

## Component_selNewState (ID: selNewState)
```javascript
return {
  "Andhra Pradesh": [
    "Anantapur", "Chittoor", "East Godavari", "Guntur", "Kadapa",
    "Krishna", "Kurnool", "Nellore", "Prakasam",
    "Srikakulam", "Visakhapatnam", "Vizianagaram",
    "West Godavari"
  ],

  "Arunachal Pradesh": [
    "Anjaw", "Changlang", "Dibang Valley", "East Kameng",
    "East Siang", "Kurung Kumey", "Lohit", "Lower Dibang Valley",
    "Lower Subansiri", "Papum Pare", "Tawang",
    "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"
  ],

  "Assam": [
    "Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar",
    "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri",
    "Dibrugarh", "Goalpara", "Golaghat", "Hailakandi",
    "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan",
    "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur",
    "Majuli", "Morigaon", "Nagaon", "Nalbari",
    "Sivasagar", "Sonitpur", "South Salmara",
    "Tinsukia", "Udalguri", "West Karbi Anglong"
  ],

  "Bihar": [
    "Araria", "Arwal", "Aurangabad", "Banka", "Begusarai",
    "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga",
    "East Champaran", "Gaya", "Gopalganj", "Jamui",
    "Jehanabad", "Kaimur", "Katihar", "Khagaria",
    "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani",
    "Munger", "Muzaffarpur", "Nalanda", "Nawada",
    "Patna", "Purnia", "Rohtas", "Saharsa",
    "Samastipur", "Saran", "Sheikhpura", "Sheohar",
    "Sitamarhi", "Siwan", "Supaul", "Vaishali",
    "West Champaran"
  ],

  "Chhattisgarh": [
    "Balod", "Baloda Bazar", "Balrampur", "Bastar",
    "Bemetara", "Bijapur", "Bilaspur", "Dantewada",
    "Dhamtari", "Durg", "Gariaband", "Gaurela-Pendra-Marwahi",
    "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker",
    "Kondagaon", "Korba", "Koriya", "Mahasamund",
    "Mungeli", "Narayanpur", "Raigarh", "Raipur",
    "Rajnandgaon", "Sukma", "Surajpur", "Surguja"
  ],

  "Goa": ["North Goa", "South Goa"],

  "Gujarat": [
    "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha",
    "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur",
    "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar",
    "Gir Somnath", "Jamnagar", "Junagadh", "Kheda",
    "Kutch", "Mahisagar", "Mehsana", "Morbi",
    "Narmada", "Navsari", "Panchmahal", "Patan",
    "Porbandar", "Rajkot", "Sabarkantha", "Surat",
    "Surendranagar", "Tapi", "Vadodara", "Valsad"
  ],

  "Haryana": [
    "Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad",
    "Fatehabad", "Gurugram", "Hisar", "Jhajjar",
    "Jind", "Kaithal", "Karnal", "Kurukshetra",
    "Mahendragarh", "Nuh", "Palwal", "Panchkula",
    "Panipat", "Rewari", "Rohtak", "Sirsa",
    "Sonipat", "Yamunanagar"
  ],

  "Himachal Pradesh": [
    "Bilaspur", "Chamba", "Hamirpur", "Kangra",
    "Kinnaur", "Kullu", "Lahaul and Spiti",
    "Mandi", "Shimla", "Sirmaur", "Solan", "Una"
  ],

  "Jharkhand": [
    "Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka",
    "East Singhbhum", "Garhwa", "Giridih", "Godda",
    "Gumla", "Hazaribagh", "Jamtara", "Khunti",
    "Koderma", "Latehar", "Lohardaga", "Pakur",
    "Palamu", "Ramgarh", "Ranchi", "Sahebganj",
    "Seraikela Kharsawan", "Simdega", "West Singhbhum"
  ],

  "Karnataka": [
    "Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural",
    "Bengaluru Urban", "Bidar", "Chamarajanagar",
    "Chikkaballapur", "Chikkamagaluru", "Chitradurga",
    "Dakshina Kannada", "Davangere", "Dharwad",
    "Gadag", "Hassan", "Haveri", "Kalaburagi",
    "Kodagu", "Kolar", "Koppal", "Mandya",
    "Mysuru", "Raichur", "Ramanagara", "Shivamogga",
    "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura",
    "Yadgir"
  ],

  "Kerala": [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur",
    "Kasaragod", "Kollam", "Kottayam", "Kozhikode",
    "Malappuram", "Palakkad", "Pathanamthitta",
    "Thiruvananthapuram", "Thrissur", "Wayanad"
  ],

  "Madhya Pradesh": [
    "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar",
    "Balaghat", "Barwani", "Betul", "Bhind",
    "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara",
    "Damoh", "Datia", "Dewas", "Dhar", "Dindori",
    "Guna", "Gwalior", "Harda", "Hoshangabad",
    "Indore", "Jabalpur", "Jhabua", "Katni",
    "Khandwa", "Khargone", "Mandla", "Mandsaur",
    "Morena", "Narsinghpur", "Neemuch", "Panna",
    "Raisen", "Rajgarh", "Ratlam", "Rewa",
    "Sagar", "Satna", "Sehore", "Seoni",
    "Shahdol", "Shajapur", "Sheopur", "Shivpuri",
    "Sidhi", "Singrauli", "Tikamgarh", "Ujjain",
    "Umaria", "Vidisha"
  ],

  "Maharashtra": [
    "Ahmednagar", "Akola", "Amravati", "Aurangabad",
    "Beed", "Bhandara", "Buldhana", "Chandrapur",
    "Dhule", "Gadchiroli", "Gondia", "Hingoli",
    "Jalgaon", "Jalna", "Kolhapur", "Latur",
    "Mumbai City", "Mumbai Suburban", "Nagpur",
    "Nanded", "Nandurbar", "Nashik", "Osmanabad",
    "Palghar", "Parbhani", "Pune", "Raigad",
    "Ratnagiri", "Sangli", "Satara", "Sindhudurg",
    "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
  ],

  "Tamil Nadu": [
    "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore",
    "Cuddalore", "Dharmapuri", "Dindigul", "Erode",
    "Kallakurichi", "Kanchipuram", "Kanyakumari",
    "Karur", "Krishnagiri", "Madurai", "Nagapattinam",
    "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
    "Ramanathapuram", "Ranipet", "Salem",
    "Sivaganga", "Tenkasi", "Thanjavur", "Theni",
    "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
    "Tirupathur", "Tiruppur", "Tiruvallur",
    "Tiruvannamalai", "Tiruvarur", "Vellore",
    "Viluppuram", "Virudhunagar"
  ],

  "Telangana": [
    "Adilabad", "Bhadradri Kothagudem", "Hyderabad",
    "Jagtial", "Jangaon", "Jayashankar Bhupalpally",
    "Jogulamba Gadwal", "Kamareddy", "Karimnagar",
    "Khammam", "Komaram Bheem", "Mahabubabad",
    "Mahbubnagar", "Mancherial", "Medak",
    "Medchal–Malkajgiri", "Mulugu", "Nagarkurnool",
    "Nalgonda", "Narayanpet", "Nirmal",
    "Nizamabad", "Peddapalli", "Rajanna Sircilla",
    "Ranga Reddy", "Sangareddy", "Siddipet",
    "Suryapet", "Vikarabad", "Wanaparthy",
    "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"
  ],

  "Uttar Pradesh": [
    "Agra", "Aligarh", "Allahabad", "Ambedkar Nagar",
    "Amethi", "Amroha", "Auraiya", "Azamgarh",
    "Baghpat", "Bahraich", "Ballia", "Balrampur",
    "Banda", "Barabanki", "Bareilly", "Basti",
    "Bhadohi", "Bijnor", "Budaun", "Bulandshahr",
    "Chandauli", "Chitrakoot", "Deoria", "Etah",
    "Etawah", "Faizabad", "Farrukhabad", "Fatehpur",
    "Firozabad", "Gautam Buddha Nagar", "Ghaziabad",
    "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur",
    "Hapur", "Hardoi", "Hathras", "Jalaun",
    "Jaunpur", "Jhansi", \
```

---

## Enter value (ID: selPaymentBank)
```javascript
api/vendors
```

---

## Enter value (ID: stmtHeader)
```javascript
api/vendors
```

---

## Component_stmtTransformer (ID: stmtTransformer)
```javascript
api/vendors
```

---

## Component_submitPO (ID: submitPO)
```javascript
api/purchase-orders?
```

---

## Component_tabbedContainer1 (ID: tabbedContainer1)
```javascript
{{ self.values[0] }}
```

---

## Component_tabbedContainer2 (ID: tabbedContainer2)
```javascript
{{ self.values[0] }}
```

---

## Component_table4 (ID: table4)
```javascript
import
```

---

## Component_table5 (ID: table5)
```javascript
api/stock/adjust/batches/{{ selAdjProduct.value }}?
```

---

## Component_table9 (ID: table9)
```javascript
api/debit-notes/{{debiteNotetbl.selectedRow.id}}/items
```

---

## Component_tabs1 (ID: tabs1)
```javascript
{{ self.values[0] }}
```

---

## Component_tabs2 (ID: tabs2)
```javascript
{{ self.values[0] }}
```

---

## drawerBrand (ID: tabs3)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## apiReverseGRN (ID: tags1)
```javascript
import
```

---

## GRN No (ID: tblGrn)
```javascript
api/purchase-invoices
```

---

## Component_tblImportErrors (ID: tblImportErrors)
```javascript
api/products/import
```

---

## Component_tblPendingBills (ID: tblPendingBills)
```javascript
{{ _.sumBy(tblPendingBills.selectedSourceRows, 'Balance $') }}
```

---

## drawerVendorProfile (ID: tblVendors)
```javascript
{{ currentSourceRow }}
```

---

## Vendor (ID: text10)
```javascript
official
```

---

## Component_text11 (ID: text11)
```javascript
address
```

---

## Component_text12 (ID: text12)
```javascript
contact information
```

---

## Component_text13 (ID: text13)
```javascript
bank details
```

---

## postImportCleanupJS (ID: text14)
```javascript
utils.showNotification({ title: "Success", description: `Imported ${varImportData.value.length} items`, notificationType: "success" });
varImportData.setValue([]); // Clear valid list
// Now the Modal will automatically reveal the Error Table (if any errors exist)
if (varImportErrors.value.length === 0) {
   modalFrameImport. hide(); // Close if no errors left
}
```

---

## apiBulkImport (ID: text15)
```javascript
utils.showNotification({ title: "Success", description: `Imported ${varImportData.value.length} items`, notificationType: "success" });
varImportData.setValue([]); // Clear valid list
// Now the Modal will automatically reveal the Error Table (if any errors exist)
if (varImportErrors.value.length === 0) {
   modalFrameImport. hide(); // Close if no errors left
}
```

---

## varAdjustmentList (ID: text16)
```javascript
{{ varModalMode.value === 'bulk' ? 'Smart Bulk Update Manager' : 'New Product Import' }}
```

---

## Component_text17 (ID: text17)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## Component_text6 (ID: text6)
```javascript
**Total Gross:** {{ _.sum((poTable.data || []).map(r => Number(r["Gross $"] ?? 0))) }}
```

---

## Component_text7 (ID: text7)
```javascript
**Total Taxable:** {{ _.sum((poTable.data || []).map(r => Number(r["Taxable $"] ?? 0))) }}
```

---

## Component_text8 (ID: text8)
```javascript
**Total GST**: {{ (_.sum((poTable.data || []).map(r => Number(r["GST $"] ?? 0)))).toFixed(2) }}
```

---

## Component_text9 (ID: text9)
```javascript
**Total Net:** {{ Math.round(_.sum((poTable.data || []).map(r => Number(r["Net $"] ?? 0)))) }}
```

---

## Enter value (ID: textInput1)
```javascript
api/vendors
```

---

## triggerUpdatePO (ID: transformerPreparePO)
```javascript
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
```

---

## Component_triggerUpdatePO (ID: triggerUpdatePO)
```javascript
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
```

---

## Component_trnGrnEditSummary (ID: trnGrnEditSummary)
```javascript
api/debit-notes/{{debiteNotetbl.selectedRow.id}}/items
```

---

## Component_true (ID: true)
```javascript
api/vendors
```

---

## Bank Name (ID: txtAccountNo)
```javascript
{{ apiGetVendor.data.bank_account_no }}
```

---

## Pan (ID: txtBankName)
```javascript
{{ apiGetVendor.data.bank_name }}
```

---

## Contact Person (ID: txtContactNo)
```javascript
{{ apiGetVendor.data.contact_no }}
```

---

## GST (ID: txtContactPerson)
```javascript
{{ apiGetVendor.data.contact_person }}
```

---

## Date (ID: txtDNNumber)
```javascript
{{ varLastDN.value }}
```

---

## Contact No (ID: txtEmail)
```javascript
{{ apiGetVendor.data.email }}
```

---

## Name (ID: txtGST)
```javascript
{{ apiGetVendor.data.gst }}
```

---

## Account No (ID: txtIFSC)
```javascript
{{ apiGetVendor.data.bank_ifsc }}
```

---

## Address (ID: txtNewAddress)
```javascript
api/master/banks
```

---

## Address (ID: txtNewCity)
```javascript
api/master/banks
```

---

## Pin Code (ID: txtNewPin)
```javascript
return {
  "Andhra Pradesh": [
    "Anantapur", "Chittoor", "East Godavari", "Guntur", "Kadapa",
    "Krishna", "Kurnool", "Nellore", "Prakasam",
    "Srikakulam", "Visakhapatnam", "Vizianagaram",
    "West Godavari"
  ],

  "Arunachal Pradesh": [
    "Anjaw", "Changlang", "Dibang Valley", "East Kameng",
    "East Siang", "Kurung Kumey", "Lohit", "Lower Dibang Valley",
    "Lower Subansiri", "Papum Pare", "Tawang",
    "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"
  ],

  "Assam": [
    "Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar",
    "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri",
    "Dibrugarh", "Goalpara", "Golaghat", "Hailakandi",
    "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan",
    "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur",
    "Majuli", "Morigaon", "Nagaon", "Nalbari",
    "Sivasagar", "Sonitpur", "South Salmara",
    "Tinsukia", "Udalguri", "West Karbi Anglong"
  ],

  "Bihar": [
    "Araria", "Arwal", "Aurangabad", "Banka", "Begusarai",
    "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga",
    "East Champaran", "Gaya", "Gopalganj", "Jamui",
    "Jehanabad", "Kaimur", "Katihar", "Khagaria",
    "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani",
    "Munger", "Muzaffarpur", "Nalanda", "Nawada",
    "Patna", "Purnia", "Rohtas", "Saharsa",
    "Samastipur", "Saran", "Sheikhpura", "Sheohar",
    "Sitamarhi", "Siwan", "Supaul", "Vaishali",
    "West Champaran"
  ],

  "Chhattisgarh": [
    "Balod", "Baloda Bazar", "Balrampur", "Bastar",
    "Bemetara", "Bijapur", "Bilaspur", "Dantewada",
    "Dhamtari", "Durg", "Gariaband", "Gaurela-Pendra-Marwahi",
    "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker",
    "Kondagaon", "Korba", "Koriya", "Mahasamund",
    "Mungeli", "Narayanpur", "Raigarh", "Raipur",
    "Rajnandgaon", "Sukma", "Surajpur", "Surguja"
  ],

  "Goa": ["North Goa", "South Goa"],

  "Gujarat": [
    "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha",
    "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur",
    "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar",
    "Gir Somnath", "Jamnagar", "Junagadh", "Kheda",
    "Kutch", "Mahisagar", "Mehsana", "Morbi",
    "Narmada", "Navsari", "Panchmahal", "Patan",
    "Porbandar", "Rajkot", "Sabarkantha", "Surat",
    "Surendranagar", "Tapi", "Vadodara", "Valsad"
  ],

  "Haryana": [
    "Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad",
    "Fatehabad", "Gurugram", "Hisar", "Jhajjar",
    "Jind", "Kaithal", "Karnal", "Kurukshetra",
    "Mahendragarh", "Nuh", "Palwal", "Panchkula",
    "Panipat", "Rewari", "Rohtak", "Sirsa",
    "Sonipat", "Yamunanagar"
  ],

  "Himachal Pradesh": [
    "Bilaspur", "Chamba", "Hamirpur", "Kangra",
    "Kinnaur", "Kullu", "Lahaul and Spiti",
    "Mandi", "Shimla", "Sirmaur", "Solan", "Una"
  ],

  "Jharkhand": [
    "Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka",
    "East Singhbhum", "Garhwa", "Giridih", "Godda",
    "Gumla", "Hazaribagh", "Jamtara", "Khunti",
    "Koderma", "Latehar", "Lohardaga", "Pakur",
    "Palamu", "Ramgarh", "Ranchi", "Sahebganj",
    "Seraikela Kharsawan", "Simdega", "West Singhbhum"
  ],

  "Karnataka": [
    "Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural",
    "Bengaluru Urban", "Bidar", "Chamarajanagar",
    "Chikkaballapur", "Chikkamagaluru", "Chitradurga",
    "Dakshina Kannada", "Davangere", "Dharwad",
    "Gadag", "Hassan", "Haveri", "Kalaburagi",
    "Kodagu", "Kolar", "Koppal", "Mandya",
    "Mysuru", "Raichur", "Ramanagara", "Shivamogga",
    "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura",
    "Yadgir"
  ],

  "Kerala": [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur",
    "Kasaragod", "Kollam", "Kottayam", "Kozhikode",
    "Malappuram", "Palakkad", "Pathanamthitta",
    "Thiruvananthapuram", "Thrissur", "Wayanad"
  ],

  "Madhya Pradesh": [
    "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar",
    "Balaghat", "Barwani", "Betul", "Bhind",
    "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara",
    "Damoh", "Datia", "Dewas", "Dhar", "Dindori",
    "Guna", "Gwalior", "Harda", "Hoshangabad",
    "Indore", "Jabalpur", "Jhabua", "Katni",
    "Khandwa", "Khargone", "Mandla", "Mandsaur",
    "Morena", "Narsinghpur", "Neemuch", "Panna",
    "Raisen", "Rajgarh", "Ratlam", "Rewa",
    "Sagar", "Satna", "Sehore", "Seoni",
    "Shahdol", "Shajapur", "Sheopur", "Shivpuri",
    "Sidhi", "Singrauli", "Tikamgarh", "Ujjain",
    "Umaria", "Vidisha"
  ],

  "Maharashtra": [
    "Ahmednagar", "Akola", "Amravati", "Aurangabad",
    "Beed", "Bhandara", "Buldhana", "Chandrapur",
    "Dhule", "Gadchiroli", "Gondia", "Hingoli",
    "Jalgaon", "Jalna", "Kolhapur", "Latur",
    "Mumbai City", "Mumbai Suburban", "Nagpur",
    "Nanded", "Nandurbar", "Nashik", "Osmanabad",
    "Palghar", "Parbhani", "Pune", "Raigad",
    "Ratnagiri", "Sangli", "Satara", "Sindhudurg",
    "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
  ],

  "Tamil Nadu": [
    "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore",
    "Cuddalore", "Dharmapuri", "Dindigul", "Erode",
    "Kallakurichi", "Kanchipuram", "Kanyakumari",
    "Karur", "Krishnagiri", "Madurai", "Nagapattinam",
    "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
    "Ramanathapuram", "Ranipet", "Salem",
    "Sivaganga", "Tenkasi", "Thanjavur", "Theni",
    "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
    "Tirupathur", "Tiruppur", "Tiruvallur",
    "Tiruvannamalai", "Tiruvarur", "Vellore",
    "Viluppuram", "Virudhunagar"
  ],

  "Telangana": [
    "Adilabad", "Bhadradri Kothagudem", "Hyderabad",
    "Jagtial", "Jangaon", "Jayashankar Bhupalpally",
    "Jogulamba Gadwal", "Kamareddy", "Karimnagar",
    "Khammam", "Komaram Bheem", "Mahabubabad",
    "Mahbubnagar", "Mancherial", "Medak",
    "Medchal–Malkajgiri", "Mulugu", "Nagarkurnool",
    "Nalgonda", "Narayanpet", "Nirmal",
    "Nizamabad", "Peddapalli", "Rajanna Sircilla",
    "Ranga Reddy", "Sangareddy", "Siddipet",
    "Suryapet", "Vikarabad", "Wanaparthy",
    "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"
  ],

  "Uttar Pradesh": [
    "Agra", "Aligarh", "Allahabad", "Ambedkar Nagar",
    "Amethi", "Amroha", "Auraiya", "Azamgarh",
    "Baghpat", "Bahraich", "Ballia", "Balrampur",
    "Banda", "Barabanki", "Bareilly", "Basti",
    "Bhadohi", "Bijnor", "Budaun", "Bulandshahr",
    "Chandauli", "Chitrakoot", "Deoria", "Etah",
    "Etawah", "Faizabad", "Farrukhabad", "Fatehpur",
    "Firozabad", "Gautam Buddha Nagar", "Ghaziabad",
    "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur",
    "Hapur", "Hardoi", "Hathras", "Jalaun",
    "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat",
    "Kanpur Nagar", "Kasganj", "Kaushambi",
    "Kushinagar", "Lakhimpur Kheri", "Lalitpur",
    "Lucknow", "Maharajganj", "Mahoba", "Mainpuri",
    "Mathura", "Mau", "Meerut", "Mirzapur",
    "Moradabad", "Muzaffarnagar", "Pilibhit",
    "Pratapgarh", "Raebareli", "Rampur",
    "Saharanpur", "Sambhal", "Sant Kabir Nagar",
    "Shahjahanpur", "Shamli", "Shravasti",
    "Siddharthnagar", "Sitapur", "Sonbhadra",
    "Sultanpur", "Unnao", "Varanasi"
  ],

  "West Bengal": [
    "Alipurduar", "Bankura", "Birbhum", "Cooch Behar",
    "Dakshin Dinajpur", "Darjeeling", "Hooghly",
    "Howrah", "Jalpaiguri", "Jhargram",
    "Kalimpong", "Kolkata", "Malda",
    "Murshidabad", "Nadia", "North 24 Parganas",
    "Paschim Bardhaman", "Paschim Medinipur",
    "Purba Bardhaman", "Purba Medinipur",
    "Purulia", "South 24 Parganas",
    "Uttar Dinajpur"
  ]
};

```

---

## Email (ID: txtPAN)
```javascript
{{ apiGetVendor.data.pan }}
```

---

## Name (ID: txtVendorName)
```javascript
{{ apiGetVendor.data.vendor_name }}
```

---

## Component_updatePOQuery (ID: updatePOQuery)
```javascript
api/purchase-orders/{{ varPOViewId.value }}
```

---

## Component_validateImportJS (ID: validateImportJS)
```javascript
const fileData = fileProductImport.parsedValue[0];
const ref = getTemplateData.data;
// Safety Check: If reference data is missing, stop
if (!fileData || !ref) {
    utils.showNotification({ title: "Error", description: "Missing Reference Data. Did you create 'getTemplateData'?", notificationType: "error" });
    return;
}
let cleanData = [];
let errors = [];
// Helper 1: Clean keys (remove bad chars/spaces)
const cleanKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
// Helper 2: Flexible Getter
const getVal = (row, key) => {
    const foundKey = Object.keys(row).find(k => cleanKey(k).includes(cleanKey(key)));
    return foundKey ? row[foundKey] : undefined;
};
// Helper 3: Find ID by Name
const findId = (list, name, key) => {
    if (!list || !Array.isArray(list) || !name) return null;
    const cleanName = String(name).toLowerCase().trim();
    const item = list.find(x => String(x[key]).toLowerCase().trim() === cleanName);
    return item ? item.id : null;
};
// Helper 4: Safe Float (2 Decimals)
const safeFloat = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : Number(num.toFixed(2));
};
fileData.forEach((row, index) => {
    const rowErr = [];
    // 1. flexible Extraction
    const brandName = getVal(row, "Brand Name") || getVal(row, "brand");
    const catName   = getVal(row, "Category Name") || getVal(row, "category");
    const vendName  = getVal(row, "Vendor Name") || getVal(row, "vendor");
    const taxName   = getVal(row, "Tax Name") || getVal(row, "tax");
    const hsnCode   = getVal(row, "HSN Code") || getVal(row, "hsn");
    const pName   = getVal(row, "Product Name"); 
    const rowEan  = getVal(row, "EAN") || getVal(row, "EAN Code"); 
    const rowMrp  = getVal(row, "MRP");
    const rowRate = getVal(row, "Purchase Rate");
    // 2. Resolve IDs
    const bId = findId(ref.brands, brandName, 'brand_name');
    const cId = findId(ref.categories, catName, 'category_name');
    const tId = findId(ref.taxes, taxName, 'tax_name');
    const hId = findId(ref.hsn, hsnCode, 'hsn_code');
    // 3. Vendor Logic
    let finalVId = 4; // Default
    const explicitVId = getVal(row, "Vendor ID"); 
    if (explicitVId) {
         finalVId = explicitVId;
    } else if (vendName) {
         const foundV = findId(ref.vendors, vendName, 'vendor_name');
         if (!foundV) {
             rowErr.push(`Vendor '${vendName}' not found`);
         } else {
             finalVId = foundV;
         }
    }
    // 4. Validate
    if (!bId) rowErr.push(`Brand '${brandName}' not found`);
    if (!cId) rowErr.push(`Category '${catName}' not found`);
    if (!tId) rowErr.push(`Tax '${taxName}' not found`);
    if (hsnCode && !hId) rowErr.push(`HSN '${hsnCode}' not found`);
    if (rowErr.length > 0) {
        errors.push({ ...row, "Error": rowErr.join(", "), "Row": index + 2 });
    } else {
        cleanData.push({
            product_name: pName,
            brand_id: bId,
            category_id: cId,
            vendor_id: finalVId, 
            hsn_id: hId || null,
            tax_id: tId || null,
            ean_code: rowEan || null,
            mrp: safeFloat(rowMrp),
            purchase_rate: safeFloat(rowRate),
            distributor_rate: safeFloat(getVal(row, "Distributor Rate")),
            wholesale_rate: safeFloat(getVal(row, "Wholesale Rate")),
            dealer_rate: safeFloat(getVal(row, "Dealer Rate")),
            retail_rate: safeFloat(getVal(row, "Retail Rate"))
        });
    }
});
varImportData.setValue(cleanData);
varImportErrors.setValue(errors);
// Notifications moved to Success Event
if (errors.length > 0) {
   utils.showNotification({ title: "Validation Failed", description: `Found ${errors.length} errors.`, notificationType: "warning" });
} else {
   utils.showNotification({ title: "Validation Success", description: `Ready to import ${cleanData.length} items.`, notificationType: "success" });
}
```

---

## modalViewGRN (ID: varCorrectionData)
```javascript
api/purchase-invoices/{{ tblGrn.selectedRow.id }}/reverse
```

---

## modalViewGRN (ID: varCorrectionID)
```javascript
api/purchase-invoices/{{ tblGrn.selectedRow.id }}/reverse
```

---

## Component_varDebitAmount (ID: varDebitAmount)
```javascript
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
```

---

## createDebitNoteJS (ID: varDebitLinesData)
```javascript
const isItemMode = dnMode.value === "Item Return";
let amount = 0;
let lines = [];
if (isItemMode) {
    // Calculate from Table (Map to Backend Keys)
    const rawLines = tblDebitLines.data; 
    
    lines = rawLines.map(row => ({
        product_id: row._product_id, // Map from '_product_id'
        qty: Number(row.Qty),
        rate: Number(row.Price), // Map from 'Price'
        batch_number: row['Batch No'] || "", // Map from 'Batch No'
        return_type: row.Reason || "Damage",
        amount: Number(row['Net $']) || (Number(row.Qty) * Number(row.Price))
    })).filter(l => l.qty > 0);
    amount = _.sumBy(lines, 'amount');
} else {
    // Manual Amount
    amount = Number(dnAmount.value);
}
if (!amount || amount <= 0) {
   utils.showNotification({ title: "Error", description: "Invalid Amount", notificationType: "error" });
   return;
}
apiCreateDebitNote.trigger({
    additionalScope: {
        payload: {
            vendor_id: varSelectedVendor.value.id,
            amount: amount,
            debit_note_date: moment(dnDate.value).format("YYYY-MM-DD"),
            reason: dnReason.value,
            linked_invoice_id: selLinkedBill.value || null, // New field
            lines: isItemMode ? lines : [] 
        }
    },
    onSuccess: function(data) {
         // data contains { dn_number: 'GD-CLT-DN-26-1' }
        utils.showNotification({ title: "Debit Note Created", description: data.dn_number, notificationType: "success" });
        
        // Show the number in the box
        try { txtDNNumber.setValue(data.dn_number); } catch(e) {}
        modalDebitNote.close();
        getVendorLedger.trigger();
    }
});
```

---

## Component_varGRNPayload (ID: varGRNPayload)
```javascript
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
```

---

## Component_varImportData (ID: varImportData)
```javascript
const fileData = fileProductImport.parsedValue[0];
const ref = getTemplateData.data;
// Safety Check: If reference data is missing, stop
if (!fileData || !ref) {
    utils.showNotification({ title: "Error", description: "Missing Reference Data. Did you create 'getTemplateData'?", notificationType: "error" });
    return;
}
let cleanData = [];
let errors = [];
// Helper 1: Clean keys (remove bad chars/spaces)
const cleanKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
// Helper 2: Flexible Getter
const getVal = (row, key) => {
    const foundKey = Object.keys(row).find(k => cleanKey(k).includes(cleanKey(key)));
    return foundKey ? row[foundKey] : undefined;
};
// Helper 3: Find ID by Name
const findId = (list, name, key) => {
    if (!list || !Array.isArray(list) || !name) return null;
    const cleanName = String(name).toLowerCase().trim();
    const item = list.find(x => String(x[key]).toLowerCase().trim() === cleanName);
    return item ? item.id : null;
};
// Helper 4: Safe Float (2 Decimals)
const safeFloat = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : Number(num.toFixed(2));
};
fileData.forEach((row, index) => {
    const rowErr = [];
    // 1. flexible Extraction
    const brandName = getVal(row, "Brand Name") || getVal(row, "brand");
    const catName   = getVal(row, "Category Name") || getVal(row, "category");
    const vendName  = getVal(row, "Vendor Name") || getVal(row, "vendor");
    const taxName   = getVal(row, "Tax Name") || getVal(row, "tax");
    const hsnCode   = getVal(row, "HSN Code") || getVal(row, "hsn");
    const pName   = getVal(row, "Product Name"); 
    const rowEan  = getVal(row, "EAN") || getVal(row, "EAN Code"); 
    const rowMrp  = getVal(row, "MRP");
    const rowRate = getVal(row, "Purchase Rate");
    // 2. Resolve IDs
    const bId = findId(ref.brands, brandName, 'brand_name');
    const cId = findId(ref.categories, catName, 'category_name');
    const tId = findId(ref.taxes, taxName, 'tax_name');
    const hId = findId(ref.hsn, hsnCode, 'hsn_code');
    // 3. Vendor Logic
    let finalVId = 4; // Default
    const explicitVId = getVal(row, "Vendor ID"); 
    if (explicitVId) {
         finalVId = explicitVId;
    } else if (vendName) {
         const foundV = findId(ref.vendors, vendName, 'vendor_name');
         if (!foundV) {
             rowErr.push(`Vendor '${vendName}' not found`);
         } else {
             finalVId = foundV;
         }
    }
    // 4. Validate
    if (!bId) rowErr.push(`Brand '${brandName}' not found`);
    if (!cId) rowErr.push(`Category '${catName}' not found`);
    if (!tId) rowErr.push(`Tax '${taxName}' not found`);
    if (hsnCode && !hId) rowErr.push(`HSN '${hsnCode}' not found`);
    if (rowErr.length > 0) {
        errors.push({ ...row, "Error": rowErr.join(", "), "Row": index + 2 });
    } else {
        cleanData.push({
            product_name: pName,
            brand_id: bId,
            category_id: cId,
            vendor_id: finalVId, 
            hsn_id: hId || null,
            tax_id: tId || null,
            ean_code: rowEan || null,
            mrp: safeFloat(rowMrp),
            purchase_rate: safeFloat(rowRate),
            distributor_rate: safeFloat(getVal(row, "Distributor Rate")),
            wholesale_rate: safeFloat(getVal(row, "Wholesale Rate")),
            dealer_rate: safeFloat(getVal(row, "Dealer Rate")),
            retail_rate: safeFloat(getVal(row, "Retail Rate"))
        });
    }
});
varImportData.setValue(cleanData);
varImportErrors.setValue(errors);
// Notifications moved to Success Event
if (errors.length > 0) {
   utils.showNotification({ title: "Validation Failed", description: `Found ${errors.length} errors.`, notificationType: "warning" });
} else {
   utils.showNotification({ title: "Validation Success", description: `Ready to import ${cleanData.length} items.`, notificationType: "success" });
}
```

---

## Component_varImportErrors (ID: varImportErrors)
```javascript
const fileData = fileProductImport.parsedValue[0];
const ref = getTemplateData.data;
// Safety Check: If reference data is missing, stop
if (!fileData || !ref) {
    utils.showNotification({ title: "Error", description: "Missing Reference Data. Did you create 'getTemplateData'?", notificationType: "error" });
    return;
}
let cleanData = [];
let errors = [];
// Helper 1: Clean keys (remove bad chars/spaces)
const cleanKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
// Helper 2: Flexible Getter
const getVal = (row, key) => {
    const foundKey = Object.keys(row).find(k => cleanKey(k).includes(cleanKey(key)));
    return foundKey ? row[foundKey] : undefined;
};
// Helper 3: Find ID by Name
const findId = (list, name, key) => {
    if (!list || !Array.isArray(list) || !name) return null;
    const cleanName = String(name).toLowerCase().trim();
    const item = list.find(x => String(x[key]).toLowerCase().trim() === cleanName);
    return item ? item.id : null;
};
// Helper 4: Safe Float (2 Decimals)
const safeFloat = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : Number(num.toFixed(2));
};
fileData.forEach((row, index) => {
    const rowErr = [];
    // 1. flexible Extraction
    const brandName = getVal(row, "Brand Name") || getVal(row, "brand");
    const catName   = getVal(row, "Category Name") || getVal(row, "category");
    const vendName  = getVal(row, "Vendor Name") || getVal(row, "vendor");
    const taxName   = getVal(row, "Tax Name") || getVal(row, "tax");
    const hsnCode   = getVal(row, "HSN Code") || getVal(row, "hsn");
    const pName   = getVal(row, "Product Name"); 
    const rowEan  = getVal(row, "EAN") || getVal(row, "EAN Code"); 
    const rowMrp  = getVal(row, "MRP");
    const rowRate = getVal(row, "Purchase Rate");
    // 2. Resolve IDs
    const bId = findId(ref.brands, brandName, 'brand_name');
    const cId = findId(ref.categories, catName, 'category_name');
    const tId = findId(ref.taxes, taxName, 'tax_name');
    const hId = findId(ref.hsn, hsnCode, 'hsn_code');
    // 3. Vendor Logic
    let finalVId = 4; // Default
    const explicitVId = getVal(row, "Vendor ID"); 
    if (explicitVId) {
         finalVId = explicitVId;
    } else if (vendName) {
         const foundV = findId(ref.vendors, vendName, 'vendor_name');
         if (!foundV) {
             rowErr.push(`Vendor '${vendName}' not found`);
         } else {
             finalVId = foundV;
         }
    }
    // 4. Validate
    if (!bId) rowErr.push(`Brand '${brandName}' not found`);
    if (!cId) rowErr.push(`Category '${catName}' not found`);
    if (!tId) rowErr.push(`Tax '${taxName}' not found`);
    if (hsnCode && !hId) rowErr.push(`HSN '${hsnCode}' not found`);
    if (rowErr.length > 0) {
        errors.push({ ...row, "Error": rowErr.join(", "), "Row": index + 2 });
    } else {
        cleanData.push({
            product_name: pName,
            brand_id: bId,
            category_id: cId,
            vendor_id: finalVId, 
            hsn_id: hId || null,
            tax_id: tId || null,
            ean_code: rowEan || null,
            mrp: safeFloat(rowMrp),
            purchase_rate: safeFloat(rowRate),
            distributor_rate: safeFloat(getVal(row, "Distributor Rate")),
            wholesale_rate: safeFloat(getVal(row, "Wholesale Rate")),
            dealer_rate: safeFloat(getVal(row, "Dealer Rate")),
            retail_rate: safeFloat(getVal(row, "Retail Rate"))
        });
    }
});
varImportData.setValue(cleanData);
varImportErrors.setValue(errors);
// Notifications moved to Success Event
if (errors.length > 0) {
   utils.showNotification({ title: "Validation Failed", description: `Found ${errors.length} errors.`, notificationType: "warning" });
} else {
   utils.showNotification({ title: "Validation Success", description: `Ready to import ${cleanData.length} items.`, notificationType: "success" });
}
```

---

## varIsEditing (ID: varIsEditing)
```javascript
api/vendors/{{ tblVendors.selectedRow.id }}
```

---

## modalStockAdjust (ID: varModalMode)
```javascript
{{ varModalMode.value === 'bulk' ? 'Smart Bulk Update Manager' : 'New Product Import' }}
```

---

## Component_varPOMode (ID: varPOMode)
```javascript
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
```

---

## Component_varPOViewId (ID: varPOViewId)
```javascript
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
```

---

## Component_varPOViewLines (ID: varPOViewLines)
```javascript
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
```

---

## Component_varProductViewId (ID: varProductViewId)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## Component_varProductsCache (ID: varProductsCache)
```javascript
const all = Products.data.data || Products.data || []; 
// Group By Brand
const grouped = _.groupBy(all, 'brand_name');
// Return Array for ListView
return Object.keys(grouped).map((brandName, index) => {
    const products = grouped[brandName];
    // Grab the brand_id from the first product
    const brandId = products[0] ? products[0].brand_id : index; 
    // 1. Taxable Stock Value (Current Value of Goods on Hand - Taxable)
    const valStockTaxable = _.sumBy(products, p => Number(p.stock_value_cost || 0));
    // 2. Total Bought Value (Historical Value of All Goods Purchased - Taxable)
    const valTotalBought = _.sumBy(products, p => Number(p.stock_value_total_bought || 0));
    return {
        id: brandId,
        brand_name: brandName,
        product_count: products.length,
        val_stock_taxable: valStockTaxable.toFixed(2),
        val_total_bought: valTotalBought.toFixed(2),
        products: products.sort((a,b) => a.product_name.localeCompare(b.product_name))
    };
}).sort((a,b) => a.brand_name.localeCompare(b.brand_name));
```

---

## Component_varSelectedBrand (ID: varSelectedBrand)
```javascript
api/products/{{ varProductViewId.value }}/stats
```

---

## varSmartUpdateData (ID: varSmartUpdateData)
```javascript
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
```

---

## Component_vendorDropdown (ID: vendorDropdown)
```javascript
Choose a Vendor
```

---

## Component_vendorDropdownGRN (ID: vendorDropdownGRN)
```javascript
{{ ChoosePo.value }}
```

---

## Vendor Bill No (ID: vendorInvoiceNo)
```javascript
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
```

---

## Received Date (ID: vendorSelectJS)
```javascript
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
```

---
