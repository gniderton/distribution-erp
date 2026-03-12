const allBills = getGRNList.data; // This comes from the Transformer above
const vID = varSelectedVendor.value.id;
// Simple JS Filter
return allBills.filter(bill => 
    bill['Vendor ID'] === vID && 
    bill['Balance $'] > 0
);