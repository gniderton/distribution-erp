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