# Retool Integration Guide: Create Purchase Order

Based on your screenshot and our API, here is the script you need for the **"Create PO"** button in Retool.

## 1. The Logic
We need to:
1.  **Filter** your table to find rows where `Qty > 0`.
2.  **Format** the data to match the Backend API (`product_id`, `rate`, etc.).
3.  **Send** the request.

## 2. Create a "Resource" Query
1.  Create a new Resource Query (REST API).
2.  Action Type: `POST`
3.  URL: `http://localhost:3000/api/purchase-orders`
4.  Body: `Raw` (JSON)

## 3. The JavaScript Payload
Paste this into the **Body** field of your query. 
*(Replace `yourTable`, `vendorSelect`, etc. with your actual component names)*.

```javascript
{{
  (function() {
    // 1. Filter Grid Data (Only items with Qty > 0)
    // assuming 'table1.data' is your source
    const validItems = table1.data.filter(row => row.Qty && row.Qty > 0);

    // 2. Map field names from Frontend -> Backend
    const itemsPayload = validItems.map(row => ({
      product_id: row.id,           // Hidden ID column
      product_name: row['Item name'], 
      qty: parseFloat(row.Qty),
      rate: parseFloat(row.Price),  // Frontend 'Price' -> Backend 'rate'
      mrp: parseFloat(row.Mrp),
      discount_percent: parseFloat(row['Disc...'] || 0),
      // Backend calculates amounts, but you can send them if you want validation
      amount: parseFloat(row.Taxable) // or Gross depending on logic
    }));

    // 3. Construct Final JSON
    return {
      vendor_id: vendorSelect.value, // Dropdown ID
      po_date: poDate.value,         // Date picker
      
      // Header Totals 
      // (You likely have text inputs calculating these at the bottom)
      total_gross: parseFloat(textTotalGross.value || 0),
      total_taxable: parseFloat(textTotalTaxable.value || 0),
      gst: parseFloat(textTotalGST.value || 0),
      total_net: parseFloat(textTotalNet.value || 0),
      grand_total: parseFloat(textTotalNet.value || 0), // Usually Net is Grand Total
      
      items: itemsPayload
    };
  })()
}}
```

## 4. Success Handler
In the query's **Success** event handler:
1.  Show Notification: "PO {{ data.po_number }} Created!"
2.  Trigger: `table1.clearSelection()` or reset your variables.
