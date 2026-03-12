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