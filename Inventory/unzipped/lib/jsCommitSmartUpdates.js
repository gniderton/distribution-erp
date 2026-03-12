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