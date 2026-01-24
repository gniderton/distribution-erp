const fileData = []; // Mock
const ref = { brands: [], categories: [], vendors: [], taxes: [], hsn: [] }; // Mock

// Helpers
// 1. Normalize Keys (Fixes header mismatch issues like "BrandName" vs "Brand Name")
const cleanKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');

const getVal = (row, key) => {
    const foundKey = Object.keys(row).find(k => cleanKey(k).includes(cleanKey(key)));
    return foundKey ? row[foundKey] : undefined;
};

const findId = (list, name, key) => {
    if (!list || !Array.isArray(list)) return null;
    if (!name) return null;
    const cleanName = String(name).toLowerCase().trim();
    const item = list.find(x => String(x[key]).toLowerCase().trim() === cleanName);
    return item ? item.id : null;
};

fileData.forEach((row, index) => {
    const rowErr = [];

    // Extract Values flexibly
    const brandName = getVal(row, "Brand Name") || getVal(row, "brand");
    const catName = getVal(row, "Category Name") || getVal(row, "category");
    const vendName = getVal(row, "Vendor Name") || getVal(row, "vendor");
    const taxName = getVal(row, "Tax Name") || getVal(row, "tax");
    const hsnCode = getVal(row, "HSN Code") || getVal(row, "hsn");

    const productName = getVal(row, "Product Name"); // Strict mapping
    const rowEan = getVal(row, "EAN") || getVal(row, "EAN Code"); // Matches "EAN" or "EAN Code"
    const rowMrp = getVal(row, "MRP");
    const rowRate = getVal(row, "Purchase Rate");

    // 1. Resolve IDs
    const bId = findId(ref.brands, brandName, 'brand_name');
    const cId = findId(ref.categories, catName, 'category_name');
    const tId = findId(ref.taxes, taxName, 'tax_name');
    const hId = findId(ref.hsn, hsnCode, 'hsn_code');

    // Vendor Logic
    let finalVId = 4;
    const vendID = getVal(row, "Vendor ID");

    if (vendName) {
        const foundV = findId(ref.vendors, vendName, 'vendor_name');
        if (!foundV) {
            rowErr.push(`Vendor '${vendName}' not found`);
        } else {
            finalVId = foundV;
        }
    }

    if (!bId) rowErr.push(`Brand '${brandName}' not found`);
    if (!cId) rowErr.push(`Category '${catName}' not found`);
    if (!tId) rowErr.push(`Tax '${taxName}' not found`);
    if (hsnCode && !hId) rowErr.push(`HSN '${hsnCode}' not found`);

    if (rowErr.length > 0) {
        // errors.push({ ...row, "Error": rowErr.join(", "), "Row": index + 2 });
    } else {
        // cleanData.push({
        // product_name: productName,
        // brand_id: bId,
        // category_id: cId,
        // vendor_id: vendID || finalVId, 
        // hsn_id: hId || null,
        // tax_id: tId || null,
        // ean_code: rowEan || null,
        // mrp: rowMrp,
        // purchase_rate: rowRate,
        // distributor_rate: getVal(row, "Distributor Rate") || 0,
        // wholesale_rate: getVal(row, "Wholesale Rate") || 0,
        // dealer_rate: getVal(row, "Dealer Rate") || 0,
        // retail_rate: getVal(row, "Retail Rate") || 0
        // });
    }
});
