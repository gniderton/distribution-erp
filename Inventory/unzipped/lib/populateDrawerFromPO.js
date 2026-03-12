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