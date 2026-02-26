# Complete Retool GRN Setup Guide

Follow this guide **exactly**. Do not skip any property settings.
We are checking (or creating) components from Top to Bottom.

---

## Phase 0: Cleanup (Do this First)
**Delete** the following (if they exist) to avoid confusion:
*   [ ] `varGRNList` (Old variable)
*   [ ] `varLegacyPO` (If you have it)
*   [ ] Any queries named `debug...` or `test...`

**Keep** these (Do NOT delete):
*   [ ] `getVendors` (Required for dropdown)
*   [ ] `getPOs` (Required for dropdown)
*   [ ] `getProducts` (Required for table lookups)

**Reset** these (Select them and clear `Initial Value` or Delete/Re-create):
*   [ ] `varGRNPayload`
*   [ ] `varPOViewId`

---

## Phase 1: Create Variables (Temporary State)
*Look at the Left Panel -> "Temporary State". Create these if missing.*

### 1. `varGRNPayload`
*   **Initial Value**: `{}`

### 2. `varPOViewId`
*   **Initial Value**: `null`

### 3. `apiBaseUrl`
*   **Initial Value**: `"https://distribution-erp.onrender.com"` (Double quotes required for string)
*   *Note*: If developing locally, use `"http://localhost:3000"`.

---

## Phase 2: UI Components (Inputs)

### 1. Vendor Dropdown
*   **Component Type**: Select
*   **Name**: `vendorDropdownGRN`
*   **Label**: "Choose Vendor"
*   **Data Source**: `{{ getVendors.data }}` (Or whatever your vendor query is)
*   **Value** (Mapped Option): `{{ item.id }}`  <-- **CRITICAL**: Must be ID.
*   **Label** (Mapped Option): `{{ item.vendor_name }}`
*   **Event Handler**:
    *   **Event**: Change
    *   **Action**: Trigger Query
    *   **Query**: `vendorSelectJS` (See Phase 2.5 below)

### 15.2 The Upload Component (`fileProductImport`)
*   **Component Type**: File Button (or "File Input")
*   **Name**: `fileProductImport`
*   **Label**: "Upload CSV"
*   **Properties** (Right Panel):
    *   **Accept file types**: `.csv`
    *   **Parse files**: **Enable / True** (Toggle ON) <--- *CRITICAL*
    *   **Parse Options**: Leave default (Headers: True).
*   **Event Handlers**:
    *   **Event**: **Parse** (Not "Change" or "Click")
    *   **Action**: Trigger Query
    *   **Query**: `validateImportJS`

### 2. PO Dropdown
*   **Component Type**: Select
*   **Name**: `ChoosePo`
*   **Label**: "Select PO"
*   **Data Source**: `{{ getPOs.data.filter(x => x.vendor_id === vendorDropdownGRN.value) }}`
*   **Value** (Mapped Option): `{{ item.id }}`
*   **Label** (Mapped Option): `{{ item.po_number }}`
*   **Event Handler**:
    *   **Action**: Set Variable
    *   **Variable**: `varPOViewId`
    *   **Value**: `{{ ChoosePo.value }}`
    *   *(Do NOT trigger the query here anymore. We use a button now.)*
    *   **Event**: Focus (Optional, fixes "Lag")
    *   **Action**: Trigger Query
    *   **Query**: `getPOs` (Ensures list is fresh)

### 2.5 "Apply PO" Button (New!)
*   **Component Type**: Button
*   **Name**: `btnApplyPO`
*   **Label**: "Apply PO / Edit"
*   **Event Handler**:
    *   **Event**: Click
    *   **Action**: Trigger Query
    *   **Query**: `getPOForGRN`

### 3. Invoice Number
*   **Component Type**: Text Input
*   **Name**: `vendorInvoiceNo`
*   **Label**: "Vendor Bill No"

### 4. Invoice Date
*   **Component Type**: Date
*   **Name**: `dateVendorInvoice`
*   **Label**: "Bill Date"
*   **Format**: `MMM d, yyyy` (Retool Default)
*   **FormData Key**: `invoice_date` (Optional help)

### 5. Received Date
*   **Component Type**: Date
*   **Name**: `dateReceived`
*   **Label**: "Received Date"
*   **Format**: `MMM d, yyyy`
*   **Default Value**: `{{ moment() }}`

---

## Phase 2.5: The Vendor Script (`vendorSelectJS`)
*   **Type**: JavaScript Query
*   **Name**: `vendorSelectJS`
*   **Code**:
    ```javascript
    /* --- VENDOR SELECTION (GRN) --- */
    const vID = vendorDropdownGRN.value;
    piLines.setValue([]); // Clear table

    if (!getProducts.data || !vID) { return; }

    // 1. Populate Table with ALL Vendor Products (Direct Purchase Mode)
    // Note: Adjust 'getProducts.data' if your data is nested (e.g. getProducts.data.data)
    const productList = getProducts.data.data || getProducts.data; 

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

## Phase 3: The Table

### 1. Lines Table
*   **Component Type**: Table (Legacy or New)
*   **Name**: `piLines`
*   **Data**: `[]` (Initially empty, populated by scripts)
*   **Columns to Enable/add**:
    *   `EAN Code` (Text, Editable: False)
    *   `Item Name` (Text, Editable: False)
    *   `Qty` (Number, **Editable: True**)
    *   `Price` (Number, **Editable: True**)
    *   `MRP` (Number, **Editable: True**)
    *   `Sch` (Number, **Editable: True**)
    *   `Disc %` (Number, **Editable: True**)
    *   `GST %` (Number, Editable: False)
    *   `Batch No` (Text, **Editable: True**)  <-- **CRITICAL**
    *   `Expiry` (Date, **Editable: True**)
    *   `Gross $` (Number, derived)
    *   `Disc. $` (Number, derived)
    *   `Taxable $` (Number, derived)
    *   `GST $` (Number, derived)
    *   `Net $` (Number, derived)
    *   `_product_id` (Hidden, stores the ID)

---

## Phase 4: The Queries (Bottom Panel)

### 1. `getPOForGRN`
*   **Resource**: `CloudSupabaseRender` (Your REST API)
*   **Action Type**: `GET`
*   **URL**: `api/purchase-orders/{{ varPOViewId.value }}`
    *   *(Note: The 'api/' part is required!)*
*   **Transformer** (Enable "Transform Results"):
    ```javascript
    // API returns { header: {...}, lines: [...] }
    const lines = data.lines || [];
    
    return lines.map(row => {
      // 1. Calculations
      // USE MASTER DATA if available (per user request), fallback to PO logic
      const qty = Number(row.ordered_qty || 0);
      const price = Number(row.purchase_rate || row.price || 0); // Prefer Master Price
      const mrp = Number(row.product_mrp || row.mrp || 0);        // Prefer Master MRP
      const sch = Number(row.scheme_amount || 0);
      const discPct = Number(row.discount_percent || 0);
      const taxPct = Number(row.tax_percent || 5); // From Master (Products table)

      const gross = qty * price;
      // Discount is typically on (Gross - Scheme)
      const discAmt = (gross - sch) * (discPct / 100);
      const taxable = gross - sch - discAmt;
      const taxAmt = taxable * (taxPct / 100);
      const net = taxable + taxAmt;

      // 2. Return Unified Row
      return {
        "S.No": 0, // Will be re-indexed later
        "EAN Code": row.ean_code || "",
        "Item Name": row.product_name,
        "MRP": mrp,
        "Price": price,
        "Qty": qty,
        "Sch": sch,
        "Disc %": discPct,
        "GST %": taxPct,
        "Gross $": Number(gross.toFixed(2)),
        "Disc. $": Number(discAmt.toFixed(2)),
        "Taxable $": Number(taxable.toFixed(2)),
        "GST $": Number(taxAmt.toFixed(2)),
        "Net $": Number(net.toFixed(2)),
        "Batch No": "",       // GRN Specific
        "Expiry": null,       // GRN Specific
        "_product_id": row.product_id
      };
    });
    ```
---

## Phase 4.5: The "Apply PO" Script (`mergePOToGRN`)
*   **Type**: JavaScript Query
*   **Name**: `mergePOToGRN`
*   **Code**:
    ```javascript
    /* --- PO MODE: REPLACE TABLE WITH PO LINES --- */
    const poLines = getPOForGRN.data;
    
    if (!poLines) return;
    
    // 1. Map PO Lines to Table Format
    // Since getPOForGRN Transformer ALREADY gives us the correct structure,
    // we just need to add the "from_po" flag and fix S.No.
    const newTableData = poLines.map((row, i) => ({
      ...row,             // Keep all calculated fields (Taxable, Net, etc)
      "S.No": i + 1,      // Clean Index
      "from_po": true     // Color Flag
    }));

    piLines.setValue(newTableData);
    utils.showNotification({ title: "PO Applied", description: "Table updated to PO items only.", notificationType: "success" });
    ```

## Phase 4.7: "Add Remaining Items" Button (`addRestOfProducts`)
1.  **Create Button**: Label "Add Other items".
2.  **Create Script**: `addRestOfProducts`
    ```javascript
    /* --- SCENARIO B: ADD MISSING PRODUCTS --- */
    const currentRows = piLines.value || [];
    const allProducts = getProducts.data.data || getProducts.data; // Check structure
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

## Phase 4.8: Delete Line (Scenario C)
1.  **Select Table** (`piLines`).
2.  **Go to "Actions"** (Right Panel).
3.  **Add Action**:
    *   **Label**: Delete (Icon: Trash)
    *   **Event**: Click
    *   **Action**: Run Script
    *   **Script**:
        ```javascript
        const i = i; // Retool provides the index 'i'
        const newRows = piLines.value.filter((_, index) => index !== i);
        piLines.setValue(newRows);
        ```

### 2. `saveGRN` (The API Call)
### 2. `saveGRN` (The API Call)
*   **Resource**: REST API (Your Backend)
*   **Action Type**: `POST`
*   **URL**: `api/purchase-invoices`
    *   *(Make sure to include `api/`)*
*   **Headers** (Crucial!):
    *   Key: `Content-Type`
    *   Value: `application/json`
*   **Body**: **Raw**
    *   **Content**: `{{ varGRNPayload.value }}`

---

## Phase 5: The Logic Script

### 1. `saveGRNJS`
*   **Type**: JavaScript Query
*   **Run Behavior**: Application code (manual trigger)
*   **Code**: (Copy this EXACTLY)

```javascript
/* --- COMPLETE GRN SAVE LOGIC --- */

// 1. Validation
const rawLines = piLines.value || [];
// Filter rows where Qty > 0
const validLines = rawLines.filter(row => row.Qty && Number(row.Qty) > 0);

if (validLines.length === 0) {
  utils.showNotification({ title: "Error", description: "No items to save! Enter Quantity.", notificationType: "error" });
  return;
}

const vID = vendorDropdownGRN.value;
if (!vID || typeof vID === 'object') {
   // If this hits, your Dropdown Phase 2 Step 1 is wrong
   utils.showNotification({ title: "Error", description: "Vendor ID is invalid (Check Dropdown settings).", notificationType: "error" });
   return;
}

// 2. Prepare Data
const invDate = dateVendorInvoice.value ? moment(dateVendorInvoice.value).format("YYYY-MM-DD") : null;
const recvDate = dateReceived.value ? moment(dateReceived.value).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD");

// Calculate Payload Lines
const dbLines = validLines.map(row => {
    return {
        product_id:         Number(row._product_id), // Must handle hidden ID column
        ordered_qty:        0, // We don't track this strictly here
        accepted_qty:       Number(row.Qty),
        rejected_qty:       0,
        rate:               Number(row.Price),
        discount_percent:   Number(row['Disc %'] || 0),
        scheme_amount:      Number(row.Sch || 0),
        tax_amount:         Number(row['GST $'] || 0),
        amount:             Number(row['Net $'] || 0),
        batch_number:       row["Batch No"] ? row["Batch No"].toString() : "",
        expiry_date:        row.Expiry ? moment(row.Expiry).format("YYYY-MM-DD") : null,
        mrp:                Number(row.MRP || 0),
        sale_rate:          0
    };
});

// Calculate Headers
const totalNet = dbLines.reduce((acc, x) => acc + x.amount, 0); // Approx sum
const totalTax = dbLines.reduce((acc, x) => acc + x.tax_amount, 0);

// Fix Null PO ID
let finalPO = null;
if (varPOViewId.value && varPOViewId.value != 0 && varPOViewId.value != "0") {
    finalPO = Number(varPOViewId.value);
}

const finalPayload = {
    vendor_id:          Number(vID),
    purchase_order_id:  finalPO,
    invoice_number:     vendorInvoiceNo.value || "",
    invoice_date:       invDate,
    received_date:      recvDate,
    total_net:          totalNet, // Backend will recalculate, but send anyway
    tax_amount:         totalTax,
    grand_total:        totalNet, // Backend recalculates
    lines:              dbLines
};

// 3. Save to Variable & Trigger
await varGRNPayload.setValue(finalPayload);
saveGRN.trigger({
    onSuccess: function(data) {
        utils.showNotification({ title: "Success", description: "GRN Saved!", notificationType: "success" });
        
        // 4. CLEANUP (Reset Form)
        piLines.setValue([]);
        vendorInvoiceNo.setValue("");
        vendorDropdownGRN.clearValue();
        ChoosePo.clearValue();
        dateVendorInvoice.clearValue();
        dateReceived.setValue(moment()); // Reset to Today
        varGRNPayload.setValue({});
        
        // 5. Close Modal
        // Ensure your modal is actually named 'modalFrameGRN'
        try { modalFrameGRN.close(); } catch(e) { console.log("Modal close error", e); }
    },
    onFailure: function(err) {
        console.error(err);
        utils.showNotification({ title: "Failed", description: err, notificationType: "error" });
    }
});
```

---

## Phase 6: The Save Button

### 1. Save Button
*   **Component Type**: Button
*   **Label**: "Save GRN"
*   **Event Handler**:
    *   **Event**: Click
    *   **Action**: Trigger Query
    *   **Query**: `saveGRNJS`

---

## Final Check
1.  Reload Page.
2.  Select Vendor.
3.  Fill 1 row in table (Qty 10, Price 100, Batch B1).
4.  Open Console.
5.  Click Save Button.

---

## Phase 7: GRN History (Dashboard Table)
*Create a new Table component to view saved GRNs.*

### 1. The Query (`getGRNList`)
*   **Resource**: REST API
*   **Action Type**: `GET`
*   **URL**: `api/purchase-invoices`
*   **Transformer**:
    ```javascript
    return data.map(row => ({
      "id": row.id, // Needed for linking!
      "Internal ID": row.invoice_number,
      "Bill No": row.vendor_invoice_number,
      "Vendor": row.vendor_name,
      "Vendor ID": row.vendor_id, // <--- CRITICAL: Map the new backend field
      "PO No": row.po_number || "-",
      "Date": row.received_date,
      "Total $": Number(row.grand_total || 0),
      "Status": row.status,
      "Paid $": Number(row.paid_amount || 0),
      "Balance $": Number(row.balance || 0) // <--- CRITICAL: Force Number to fix math
    }));
    ```
*   **Run this query on page load?**: YES.

### 2. The Table (`tblGRNHistory`)
*   **Component Type**: Table
*   **Data Source**: `{{ getGRNList.data }}`
*   **Columns**:
    *   `Internal ID` (Hidden/Small)
    *   `Bill No` (Primary Key visual)
    *   `Vendor` (Text)
    *   `PO No` (Tag/Text)
    *   `Date` (Date Format: `MMM d, yyyy`)
    *   `Total $` (Currency)
    *   `Balance $` (Currency)
    *   `Status` (Tag: Green for Verified)

---

## Phase 8: Finance Module (Vendor Profile & Payments)
*This module builds the "Heavily Detailed" Vendor Profile.*

### 1. Variables
*   **Name**: `varSelectedVendor` (Initial: `null`)
*   **Name**: `varPaymentAmount` (Initial: `0`)

### 1.5 The Vendor Query (`getVendors`)
*   **Resource**: REST API
*   **Action Type**: `GET`
*   **URL**: `api/vendors`
*   **Transformer**: `return data;` (Optional, usually works as-is)
*   **Run on page load?**: YES
*   **Transformer**: `return data;`

### 1.6 Bank Accounts Query (`getBankAccounts`)
*   **Resource**: REST API (`GET`)
*   **URL**: `api/bank-accounts`
*   **Transformer**: `return data;`
*   **Run on page load?**: YES

### 2. The Vendor Directory (Update your Vendor Table)
*   **Table**: `tblVendors`
*   **Data Source**: `{{ getVendors.data }}`
*   **Columns**: Vendor Name, Balance (You will need to fetch this from Ledger later or compute it), Contact.
*   **Action**: Add Action "View Profile"
    *   **Icon**: User/Eye
    *   **Handler**:
        1. Set `varSelectedVendor` to `{{ currentSourceRow }}`
        2. Trigger Query: `getVendorPendingBills` (Fixes "Stale Data" lag)
        3. Open `drawerVendorProfile`

### 3. The Profile Drawer (`drawerVendorProfile`)
*   **Component**: DrawerFrame
*   **Title**: `{{ varSelectedVendor.vendor_name }} Profile`

#### Tab A: Pending Bills (The "Pay Me" Tab)
*   **Query**: `getGRNList` (Update Transformer!)
    *   **Updated Transformer**:
        ```javascript
        return data.map(row => ({
          "id": row.id, // Needed for linking!
          "Internal ID": row.invoice_number,
          "Bill No": row.vendor_invoice_number,
          "Vendor": row.vendor_name,
          "Vendor ID": row.vendor_id, // Needed for filter
          "PO No": row.po_number || "-",
          "Date": row.received_date,
          "Total $": row.grand_total,
          "Status": row.status,
          "Paid $": row.paid_amount,
          "Balance $": row.balance // From Backend
        }));
        ```
*   **Query**: `getVendorPendingBills`
    *   **Type**: **JavaScript Query** (Or Transformer)
    *   **Code**:
        ```javascript
        const allBills = getGRNList.data; // This comes from the Transformer above
        const vID = varSelectedVendor.value.id;
        
        // Simple JS Filter (Robust Type Checking)
        if (!allBills || !vID) return [];

        return allBills.filter(bill => 
            Number(bill['Vendor ID']) === Number(vID) && 
            Number(bill['Balance $']) > 0
        );
        ```
    *   **Container (Allocations)**
        *   **Hidden**: `{{ payType.value === 'REFUND' }}` (Refunds don't need bill selection)
        *   **Table**: `tblPendingBills`
            *   **Data**: `{{ getVendorPendingBills.data }}`
            *   **Selection**: Multiple Row Selection **Enabled**
            *   **Columns**: Bill No, Date, Total $, **Balance $**, Status
        *   **Button**: "Pay Selected"
            *   **Handler**:
                1. Set `varPaymentAmount` = `{{ _.sumBy(tblPendingBills.selectedSourceRows, 'Balance $') }}`
                2. Open `modalMakePayment` (Method: `show`)

#### Tab B: Ledger (History)
*   **Query**: `getVendorLedger`
    *   **Resource**: REST API
    *   **URL**: `api/vendor-payments/ledger/{{ varSelectedVendor.id }}`
*   **Table**: `tblLedger`
    *   **Data**: `{{ getVendorLedger.data }}`
    *   **Columns**: Date, Type (Invoice/Payment), Description, Debit (Paid), Credit (Billed), Running Balance (Optional)

### 4. The Payment Modal (`modalMakePayment`)
*   **Component**: Modal
*   **Inputs**:
    *   `payDate` (Date, Default Today)
    
    *   `payType` (Segmented Control)
        *   **Options**: `['PAYMENT', 'REFUND']`
        *   **Labels**: `['Payment (Money Out)', 'Refund (Money In)']`
        *   **Default**: `"PAYMENT"`
        *   **Color**: `{{ payType.value == 'REFUND' ? 'green' : 'blue' }}`

    *   `selBankAccount` (Select)
        *   **Label**: "Source Account"
        *   **Data Source**: `{{ getBankAccounts.data }}`
             > **Important**: Make sure you select **"Mapped"** (not Manual) for the Data Source mode.
        *   **Value** (to submit): `{{ item.id }}` (or just choose `id` from dropdown)
        *   **Label** (to display): `{{ item.bank_name }}` (or with Balance: `{{ item.bank_name }} (₹{{ item.current_balance }})`)
        *   **Default Value**: `1` (for Cash)

    *   `payAmount` (Currency: Default `{{ varPaymentAmount }}`)
    
    *   `payMode` (Select: Cash, Cheque, UPI, Bank Transfer)
    *   `payRef` (Text: UTR / Cheque No)
    *   `payRemarks` (Text)
*   **Button**: "Confirm Payment" -> Triggers `savePaymentJS`

### 5. The Payment Script (`savePaymentJS`)
*   **Code**:
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
        if (!selectedBills || selectedBills.length === 0) {
             // Optional: Allow Unallocated Payments (On Account)
             // For now, if no bills are selected, allocations will remain empty.
        } else {
             // FIFO Logic (Already implemented...)
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

    apiCreateVendorPayment.trigger({
        additionalScope: {
            payload: {
                vendor_id: vendor.id,
                amount: totalAmount,
                payment_date: moment(payDate.value).format("YYYY-MM-DD"),
                mode: payMode.value,
                transaction_ref: payRef.value,
                remarks: payRemarks.value,
                remarks: payRemarks.value,
                transaction_type: payType.value,
                bank_account_id: selBankAccount.value, // New Field
                allocations: isRefund ? [] : allocations
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

### 6. The API Query (`apiMakePayment`)
*   **Resource**: REST API
*   **Action**: POST
*   **URL**: `api/vendor-payments`
*   **Headers**: `Content-Type: application/json`
*   **Body**: `{{ payload }}`

---

## Phase 9: Update PO (The Missing Piece)
*If your Update PO Logic isn't working, check this query setup.*

### 1. The Query (`updatePOQuery`)
*   **Resource**: REST API
*   **Action Type**: `PUT`
*   **URL**: `api/purchase-orders/{{ varPOViewId.value }}`
    *   *(Crucial: It needs the ID to update!)*
*   **Headers**: `Content-Type: application/json`
*   **Body**: **Raw**
    *   **Content**: `{{ payload }}`

---

## Phase 10: Debit Notes / Purchase Returns
*For when goods are returned, or you need to adjust a balance down.*

### 1. Variables
*   **Name**: `varDebitAmount` (Initial: `0`)

### 1.5 The Population Script (`populateDebitTableJS`)
*   **Code**:
    ```javascript
### 1.5 The Population Script (`populateDebitTableJS`)
*   **Code**:
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
    
    modalDebitNote.open();
    ```

### 2. The Link (In Vendor Profile Drawer)
*   **Component**: Button
*   **Label**: "Create Debit Note"
*   **Handler**: Trigger Query `populateDebitTableJS` (This opens the modal after populating)

### 3. The Modal (`modalDebitNote`)
*   **Component**: Modal
*   **Title**: "Create Debit Note"
*   **Inputs**:
    *   `dnDate` (Date)
    *   **Text Input**: `txtDNNumber` (Label: "Debit Note #")
        *   **Read Only**: `true`
        *   **Placeholder**: "Auto-Generated after Save"
        *   **Value**: `{{ varLastDN.value }}` (See Script below)
    
    *   **Select**: `selLinkedBill` (Label: "Link Bill #", Optional)
        *   **Data Source**: `{{ getVendorPendingBills.data }}`
        *   **Value**: `id`
        *   **Label**: `{{ item['Internal ID'] }} (Ref: {{ item['Bill No'] }} | Bal: {{ item['Balance $'] }})`

    *   `dnMode` (Segmented Control: "Flat Amount", "Item Return")
    
    *   **Container A (Visible if Mode="Flat Amount")**:
        *   `dnAmount` (Number)
    
    *   **Container B (Visible if Mode="Item Return")**:
        *   **Table**: `tblDebitLines`
        *   **Data Source**: `{{ varDebitLinesData.value }}` (Must be bound to the variable!)
        *   **Columns**:
        *   **Columns**:
            *   `_product_id` (Dropdown/Select): 
                *   **Label**: "Product"
                *   **Source**: `{{ Products.data.filter(p => p.vendor_id === varSelectedVendor.value.id) }}`
                *   **Value**: `id` | **Label**: `product_name`
                *   **Event (Change)**: Script `tblDebitLines.updateCell(i, {'Price': currentSourceRow._product_id.purchase_rate, 'MRP': currentSourceRow._product_id.mrp, 'GST %': currentSourceRow._product_id.tax_percent })`
            *   `Batch No` (Text): Manual Entry.
            *   `Qty` (Number): How many.
            *   `MRP` (Number): From Product.
            *   `Price` (Number): Purchase Rate.
            *   `Sch` (Number): Scheme deduction.
            *   `Disc %` (Number): Discount %.
            *   `GST %` (Number): Tax Rate.
            *   `Reason` (Dropdown): `['Damage', 'Expiry', 'Good Stock']`
            *   `Net $` (Number - Calc): `{{ currentSourceRow.Qty * currentSourceRow.Price }}` (Simplified) OR Full logic if you replicate the GRN Transformer.
        *   **Total**: Text identifying sum of table `{{ _.sum(tblDebitLines.data.map(r => r['Net $'])) }}`

    *   `dnReason` (Text)

### 4. The Script (`saveDebitNoteJS`)
*   **Updated Code**:
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

### 5. The Query (`apiCreateDebitNote`)
*   **Resource**: REST API
*   **Action Type**: `POST`
*   **URL**: `api/debit-notes`
*   **Headers**: `Content-Type: application/json`
*   **Body**: **Raw**
    *   **Content**: `{{ payload }}`

---

## Phase 10.5: Viewing Debit Note History
*Display the list of previous Debit Notes in the Vendor Profile.*

### 1. The Query (`getVendorDebitNotes`)
*   **Resource**: REST API
*   **Action Type**: `GET`
*   **URL**: `api/debit-notes/vendor/{{ varSelectedVendor.value.id }}`
*   **Automatic Run**: Checked (Run when params change).

### 2. The Table (`debiteNotetbl`)
*   **Place this**: In your Vendor Profile Drawer.
*   **Data Source**: `{{ getVendorDebitNotes.data }}`
*   **Columns**:
    1.  `debit_note_number` (Label: "DN #")
    2.  `debit_note_date` (Label: "Date", Format: Date)
    3.  `reason` (Label: "Reason")
    4.  `linked_invoice_number` (Label: "Linked Bill", Mapped Value: `{{ item }}`)
    5.  `amount` (Label: "Amount", Format: Currency)
    6.  `status` (Label: "Status")

### 3. Triggering it
*   **Auto**: It should auto-fetch when `varSelectedVendor` changes.
*   **Manual Refresh**: 
    *   Add `getVendorDebitNotes.trigger()` to the `onSuccess` of `saveDebitNoteJS`.

---

## Phase 11: Vendor Transaction Statement (Ledger Report)
*Generate a Statement of Account with Opening Balance and Date Filtering.*

### 1. UI Components
*   **Place this**: In `Container Ledger` (Tab B).
*   **Components**:
    *   `dateStart` (Date Picker, Label: "From")
    *   `dateEnd` (Date Picker, Label: "To")
    *   `btnGenerateStmt` (Button, Label: "Get Statement")
    *   `stmtHeader` (Text) -> Value: `Statement for {{ varSelectedVendor.value.vendor_name }} ({{ start }} to {{ end }})`
    *   `tblStatement` (Table)

### 2. The Logic (`stmtTransformer`)
*   **Type**: **JavaScript Value** (Wait, no, Transformer is better).
*   **Create a Transformer** named `stmtTransformer`.
*   **Code**:
    ```javascript
    const allTxns = {{ getVendorLedger.data }} || [];
    const start = moment({{ dateStart.value }}).startOf('day');
    const end = moment({{ dateEnd.value }}).endOf('day');

    let openingBalance = 0;
    const filteredTxns = [];

    // Sort Ascending (Oldest First) for calculation
    const sorted = _.sortBy(allTxns, ['date', 'created_at']);

    sorted.forEach(txn => {
        const txnDate = moment(txn.date);
        
        // Net Effect: Credit (We owe) - Debit (We paid)
        // Adjust this sign based on your preference. Usually Vendor Balance is Credit Positive.
        const netChange = Number(txn.credit_amount) - Number(txn.debit_amount);

        if (txnDate.isBefore(start)) {
            openingBalance += netChange;
        } else if (txnDate.isSameOrBefore(end) && txnDate.isSameOrAfter(start)) {
            filteredTxns.push({
                ...txn,
                net_change: netChange
            });
        }
    });

    // Calculate Running Balance
    let running = openingBalance;
    const finalData = filteredTxns.map(t => {
        running += t.net_change;
        return { ...t, running_balance: running };
    });

    return {
        opening_balance: openingBalance,
        transactions: finalData,
        closing_balance: running
    };
    ```

### 3. Displaying it
*   **Text Component**: `Opening Balance: {{ stmtTransformer.value.opening_balance }}`
*   **Table**: `tblStatement`
    *   **Data**: `{{ stmtTransformer.value.transactions }}`
    *   **Columns**:
        1. `date` (Date)
        2. `reference_number` (Ref)
        3. `type` (Tag)
        4. `description` (Description)
        5. `credit_amount` (Billed)
        6. `debit_amount` (Paid)
        7. `running_balance` (Running Bal)

### 4. Triggering
It will auto-calculate whenever `dateStart`, `dateEnd`, or `getVendorLedger.data` changes. No manual trigger needed if referencing values directly.

---



## Phase 13: Master Data Management (Part 1: Vendors)

### 13.1 Add Vendor API (`apiCreateVendor`)
*   **Resource**: REST API (`POST`)
*   **URL**: `api/vendors`
*   **Body**: JSON
    ```json
    {
      "vendor_code": "", // Leave empty for Auto-Generation
      "vendor_name": "{{ inpNewVendorName.value }}",
      "gst": "{{ inpNewVendorGST.value }}",
      "pan": "{{ inpNewVendorPan.value }}",
      "contact_no": "{{ inpNewVendorPhone.value }}",
      "email": "{{ inpNewVendorEmail.value }}",
      "contact_person": "{{ inpNewVendorPerson.value }}",
      "address_line1": "{{ inpNewVendorAddress1.value }}",
      "state": "{{ inpNewVendorState.value }}",
      "district": "{{ inpNewVendorDistrict.value }}",
      "pin_code": "{{ inpNewVendorPin.value }}",
      "bank_name": "{{ inpNewVendorBankName.value }}",
      "bank_account_no": "{{ inpNewVendorBankAcc.value }}",
      "bank_ifsc": "{{ inpNewVendorIFSC.value }}"
    }
    ```

### 13.2 Add Vendor Modal (`modalAddVendor`)
*   **Button**: Place an "Add New Vendor" button above your Vendor Table.
*   **Event**: On Click -> Open `modalAddVendor`.
*   **Components**:
    *   **Basic Info**:
        *   `inpNewVendorName` (Text, Required)
        *   `inpNewVendorPhone` (Text)
        *   `inpNewVendorEmail` (Text)
    *   **Tax & Address**:
        *   `inpNewVendorGST` (Text)
        *   `inpNewVendorPan` (Text, New)
        *   `inpNewVendorAddress1` (Text Area)
        *   `inpNewVendorState` (Text)
        *   `inpNewVendorDistrict` (Text)
    *   **Bank Details**:
        *   `inpNewVendorBankName` (Text)
        *   `inpNewVendorBankAcc` (Text)
        *   `inpNewVendorIFSC` (Text)
    *   `btnSaveVendor`: Event -> Trigger `apiCreateVendor`

### 13.3 Success Workflow
*   **Select `apiCreateVendor`**:
    *   **Success Event 1**: Trigger Query -> `getVendors` (Refresh list)
    *   **Success Event 2**: Control Component -> `modalAddVendor` -> Close
    *   **Success Event 3**: Show Notification -> "Vendor Created!"

---

## Phase 14: Master Data Management (Part 2: Products)

### 14.1 Dropdown Data APIs
Ensure you have the following queries to populate your dropdowns:
*   `getBrands` -> `GET /api/master/brands`
*   `getCategories` -> `GET /api/master/categories`
*   `getTaxes` -> `GET /api/master/taxes`
*   `getHSN` -> `GET /api/master/hsn`
*   `getVendors` -> `GET /api/vendors` (Already exists)

### 14.2 Add Product API (`apiCreateProduct`)
*   **Resource**: REST API (`POST`)
*   **URL**: `api/products`
*   **Headers**: `Content-Type: application/json`
*   **Body**: JSON
    ```json
    {
      "product_name": "{{ inpNewProductName.value }}",
      "ean_code": "{{ inpNewProductEan.value }}",
      "brand_id": "{{ selNewProductBrand.value }}",
      "category_id": "{{ selNewProductCategory.value }}",
      "vendor_id": "{{ selNewProductVendor.value }}",
      "hsn_id": "{{ selNewProductHSN.value }}",
      "tax_id": "{{ selNewProductTax.value }}",
      "mrp": "{{ inpNewProductMRP.value }}",
      "purchase_rate": "{{ inpNewProductPurchaseRate.value }}",
      "distributor_rate": "{{ inpNewProductDistRate.value }}",
      "wholesale_rate": "{{ inpNewProductWholesaleRate.value }}",
      "dealer_rate": "{{ inpNewProductDealerRate.value }}",
      "retail_rate": "{{ inpNewProductRetailRate.value }}"
    }
    ```
    *(Note: `product_code` is Auto-Generated by Backend: BRAND-CAT-001)*

### 14.3 Add Product Modal (`modalAddProduct`)
*   **UI Components**:
    *   `inpNewProductName` (Text, Required)
    *   `inpNewProductEan` (Text)
    *   `selNewProductBrand` (Select, Mapped -> `getBrands.data`, Value=`id`, Label=`brand_name`)
    *   `selNewProductCategory` (Select, Mapped -> `getCategories.data`, Value=`id`, Label=`category_name`)
    *   `selNewProductVendor` (Select, Mapped -> `getVendors.data.data` (check nesting), Value=`id`, Label=`vendor_name`)
    *   `selNewProductHSN` (Select, Mapped -> `getHSN.data`, Value=`id`, Label=`hsn_code`)
    *   `selNewProductTax` (Select, Mapped -> `getTaxes.data`, Value=`id`, Label=`tax_name`)
    *   **Rates (Number Inputs)**:
        *   `inpNewProductMRP`
        *   `inpNewProductPurchaseRate`
        *   `inpNewProductDistRate`
        *   `inpNewProductWholesaleRate`
        *   `inpNewProductDealerRate`
        *   `inpNewProductRetailRate`
    *   `btnSaveProduct`: Event -> Trigger `apiCreateProduct`

### 14.4 Success Workflow
*   **Select `apiCreateProduct`**:
    *   **Success Event 1**: Trigger Query -> `getProducts`
    *   **Success Event 2**: Control Component -> `modalAddProduct` -> Close
    *   **Success Event 3**: Show Notification -> "Product Created!"

---

## Phase 15: Bulk Product Import (Smart Wizard)

### 15.1 The Reference Data (Crucial)
You MUST create this query first. The import fails without it.

*   **Query Name**: `getTemplateData`
*   **Resource**: REST API
*   **Method**: `GET`
*   **URL**: `api/products/template-data`
*   **Run on Page Load**: **Yes** (Enable)

### 15.1.2 Variables
*   `varImportData`: Initial `[]`. Stores the clean, ID-mapped data.
*   `varImportErrors`: Initial `[]`. Stores rows with bad names.

### 15.1.5 Download Template Button (New!)
*   **Component Type**: Button
*   **Name**: `btnDownloadTemplate`
*   **Label**: "Download Template"
*   **Icon**: `bold/interface-download-button-2`
*   **Event Handler**:
    *   **Event**: Click
    *   **Action**: Run Script
    *   **Code**:
        ```javascript
        const headers = [{
          "Brand Name": "ExampleBrand",
          "Category Name": "ExampleCategory",
          "Vendor Name": "ExampleVendor", // Optional (Default: 4)
          "Product Name": "New Product Name",
          "Tax Name": "GST 5%", // Must match Tax Master
          "HSN Code": "1234",
          "EAN": "",
          "MRP": 100,
          "Purchase Rate": 80,
          "Distributor Rate": 0,
          "Wholesale Rate": 0,
          "Dealer Rate": 0,
          "Retail Rate": 0
        }];
        utils.downloadFile({ data: headers, fileName: "product_import_template", fileType: "csv" });
        ```

### 15.2 The Upload Component (`fileProductImport`)
*   **Component Type**: File Button (or "File Input")
*   **Name**: `fileProductImport`
*   **Label**: "Upload CSV"
*   **Properties** (Right Panel):
    *   **Accept file types**: `.csv`
    *   **Parse files**: **Enable / True** (Toggle ON) <--- *CRITICAL*
    *   **Parse Options**: Leave default (Headers: True).
*   **Event Handlers**:
    *   **Event**: **Parse** (Not "Change" or "Click")
    *   **Action**: Trigger Query
    *   **Query**: `validateImportJS`

### 15.2 The Validation Script (`validateImportJS`)
*   **Type**: JavaScript Query
*   **Code**:
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
*   **Success Event Handler**:
    *   **Action**: Control Component -> `modalFrameImport` -> **Open**
    ```

### 15.3 The UI (`modalFrameImport`)
*   **Container**: `modalFrameImport`.
*   **Title**: "Import Result"

#### View A: Valid Rows (Ready to Import)
*   **Table**: `tblImportPreview`
    *   **Data**: `{{ varImportData.value }}`
    *   **Hidden**: `{{ varImportData.value.length === 0 }}`
    *   **Columns**: Product Name, Brand Name (Mapped), MRP, Rate.
*   **Text/Alert**: "Found {{ varImportData.value.length }} valid products." (Green)
*   **Button**: `btnConfirmImport`
    *   **Label**: "Import {{ varImportData.value.length }} Items"
    *   **Hidden**: `{{ varImportData.value.length === 0 }}`
    *   **Action**: Trigger `apiBulkImport`.

#### View B: Invalid Rows (Needs Fixing)
*   **Table**: `tblImportErrors`
    *   **Data**: `{{ varImportErrors.value }}`
    *   **Hidden**: `{{ varImportErrors.value.length === 0 }}`
    *   **Columns**: Row Number, Product Name, **Error Reason** (Red).
*   **Text/Alert**: "Found {{ varImportErrors.value.length }} errors. Please fix and re-upload." (Red)
    *   **Hidden**: `{{ varImportErrors.value.length === 0 }}`
*   **Button**: `btnDownloadErrors`
    *   **Label**: "Download Errors (CSV)"
    *   **Hidden**: `{{ varImportErrors.value.length === 0 }}`
    *   **Event**: Click -> **Export Data**
        *   **Data**: `{{ varImportErrors.value }}`
        *   **Filename**: `import_errors`
        *   **Type**: CSV

### 15.4 The API Call (`apiBulkImport`)
*   **Resource**: REST API (**POST**) <--- *CRITICAL: Check this!*
*   **URL**: `api/products/import`
*   **Headers**: `Content-Type: application/json`
*   **Body**: **Raw**
    ```json
    { "items": {{ varImportData.value }} }
    ```
*   **Event Handlers**:
    *   **Success**:
        1. Trigger `getProducts` (Refresh Master)
        2. **Script**: `postImportCleanupJS`
           ```javascript
           utils.showNotification({ title: "Success", description: `Imported ${varImportData.value.length} items`, notificationType: "success" });
           varImportData.setValue([]); // Clear valid list
           // Now the Modal will automatically reveal the Error Table (if any errors exist)
           if (varImportErrors.value.length === 0) {
              modalFrameImport.close(); // Close if no errors left
           }
           ```
    *   **Failure**:
        1. Show Notification: "{{ error }}"

## Phase 17: Bulk Product Update Flow
This allows users to download current products, edit prices/names in Excel, and re-upload to update.

### 17.1 Export Button
*   **Component**: Button (`btnExportProducts`)
*   **Label**: "Export / Bulk Edit"
*   **Action**: "Go to URL"
*   **URL**: `{{ apiBaseUrl.value }}/api/products/export`
*   **New Tab**: Yes (Downloads CSV)

### 17.2 Update Wizard (Similar to Import)
*   **Concept**: Use a separate Modal + File Button or reuse the existing Import Modal with a "Mode" toggle.
*   **Recommendation**: Separate Button "Bulk Update" triggering a simplified flow.
*   **File Button**: `fileBulkUpdate`
*   **Event**: On Parse -> Trigger `validateUpdateJS`.

### 17.3 Update Script (`validateUpdateJS`)
*   **Logic**: Same as Import, but ensures `Product ID` is preserved.
    ```javascript
    const fileData = fileBulkUpdate.parsedValue[0];
    const ref = getTemplateData.data; 
    let updates = [];
    
    // ... lookup logic (copy from validateImportJS) ...

    fileData.forEach(row => {
        // ... find IDs ...
        updates.push({
            id: row['Product ID'], // CRITICAL
            product_name: row['Product Name'],
            // ... map other fields ...
        });
    });
    
    apiBulkUpdate.trigger({ additionalScope: { items: updates } });
    ```

### 17.4 Update API (`apiBulkUpdate`)
*   **Resource**: REST API (**POST**)
*   **URL**: `api/products/bulk-update`
*   **Headers**: `Content-Type: application/json`
*   **Body Type**: **Raw**
*   **Body**: 
    ```json
    { "items": {{ items }} }
    ```

### 18.2 UI Logic

#### Step 1: Initialization (`populateDebitLinesJS`)
**Trigger**: `varSelectedVendor` -> **Change** (or "Create Debit Note" Button)
**Purpose**: Loads all products for this vendor into the table with `Qty = 0`.
**Script**:
```javascript
const vID = varSelectedVendor.value.id;
if (!vID) { return; }

// Safe Array Access (Handle response wrappers)
const rawData = Products.data; 
const allProducts = Array.isArray(rawData) ? rawData : (rawData.data || []);

// Filter for Vendor
const vendorProducts = allProducts.filter(p => Number(p.vendor_id) === Number(vID));

// Map to Table Format (Qty starts at 0)
const tableData = vendorProducts.map((p, index) => ({
  "S.No": index + 1,
  "EAN Code": p.ean_code || "",
  "Item Name": p.product_name,
  "_product_id": p.id,
  
  // Pricing/Tax Info
  "MRP": Number(p.mrp || 0),
  "Price": Number(p.purchase_rate || 0),
  "GST %": Number(p.tax_percent || 5), // Default to 5 if missing?
  
  // User Inputs (Initialize to 0)
  "Qty": 0,
  "Sch": 0,
  "Disc %": 0,
  "Reason": "Damage", 

  // Calculated Columns (Initialize to 0)
  "Gross $": 0,
  "Disc. $": 0,
  "Taxable $": 0,
  "GST $": 0,
  "Net $": 0 
}));

varDebitLinesData.setValue(tableData);
```

#### Step 2: Live Calculation (`calculateDebitRowJS`)
**Trigger**: `tblDebitLines` -> **Event Handler** -> **Save Changes**
**Script**:

```javascript
// 1. Get Changes (Retool New Table Approach)
const changes = tblDebitLines.changesetArray || []; 
if (changes.length === 0) return;

const currentData = varDebitLinesData.value;
const change = changes[0];

// Use _product_id to find the row
const targetIndex = currentData.findIndex(row => row._product_id === (change._product_id || change.product_id));

if (targetIndex === -1) {
    console.error("Row not found for update");
    return;
}

// 2. Clone Full Data
let newData = _.cloneDeep(currentData);

// 3. Update & Recalculate Logic
// Merge: Existing + Change
let row = { ...newData[targetIndex], ...change };

// Parse Numbers (Safety first!)
const Qty = Number(row['Qty'] || 0);
const Price = Number(row['Price'] || 0);    
const Sch = Number(row['Sch'] || 0);
const DiscPct = Number(row['Disc %'] || 0);
const GstPct = Number(row['GST %'] || 0);

// Math (Standard ERP Logic - Matches GRN)
const Gross = Qty * Price;
const DiscAmt = (Gross - Sch) * (DiscPct / 100);
const Taxable = Math.max(0, Gross - Sch - DiscAmt);
const GstAmt = Taxable * (GstPct / 100);
const Net = Taxable + GstAmt;

// Update Row Columns
row['Qty'] = Qty;
row['Price'] = Price;
row['Sch'] = Sch;
row['Disc %'] = DiscPct;
row['GST %'] = GstPct;
row['Gross $'] = Number(Gross.toFixed(2));
row['Disc. $'] = Number(DiscAmt.toFixed(2));
row['Taxable $'] = Number(Taxable.toFixed(2));
row['GST $'] = Number(GstAmt.toFixed(2));
row['Net $'] = Number(Net.toFixed(2));

newData[targetIndex] = row;

// 4. Save Back & Clear Changeset
varDebitLinesData.setValue(newData);
tblDebitLines.clearChangeset();
```

---

## Phase 19: Master Data Manager (UI Forms)

**Goal**: Create a dashboard to manage Brands, Categories, Taxes, HSN Codes, and Banks.

### 19.1 UI Layout (The "Context-Aware Modal" Pattern)
**User Goal**: Main page shows data. A generic "Add" button opens a modal that creates data for the *current* tab.

1.  **Main Screen**:
    *   **Tabs**: Labels [Banks, Brands, Categories, Tax, HSN].
    *   **View Tables**: 5 stackable tables to *display* data (Read-Only).
    *   **Action Button**: Place one "Add Data" button near the tabs (or one inside each tab container).
    *   **Event**: On Click -> `modalMasterEntry.open()`.

2.  **The Modal (`modalMasterEntry`)**:
    *   **Components**: 
        *   **Header (Text)**: Value `### Add New {{ tabs1.value }}` (Changes automatically).
        *   **Tables**: Drag 5 **Editable Tables** inside this one modal.
    *   **Stacking**: Place them exactly on top of each other.
    *   **Visibility Logic**: Use the **Hidden** property on each editable table:
        *   Banks Input Table: `{{ tabs1.value !== 'Banks' }}`
        *   Brands Input Table: `{{ tabs1.value !== 'Brands' }}`
    *   **Result**: When you open the modal, Retool checks "What Tab is active?" and automatically shows the matching Input Table.

3.  **Saving**: Each Editable Table inside the modal has its own "Save changes" event handler linked to its specific Bulk Save script.

### 19.2 Queries (Resource: `ERP_Backend`)
For *each* tab, create a `GET` and `POST` query.
(See generic Setup tips)

| Entity | GET Query | POST Query | POST Body (Use Dynamic Vars) |
| :--- | :--- | :--- | :--- |
| **Banks** | **Name**: `apiGetBanks`<br>**URL**: `/api/master/banks` | **Name**: `apiCreateBank`<br>**URL**: `/api/master/banks` | `{"name": {{name}} }` |
| **Brands** | **Name**: `apiGetBrands`<br>**URL**: `/api/master/brands` | **Name**: `apiCreateBrand`<br>**URL**: `/api/master/brands` | `{"name": {{name}} }` |
| **Categories** | **Name**: `apiGetCats`<br>**URL**: `/api/master/categories` | **Name**: `apiCreateCat`<br>**URL**: `/api/master/categories` | `{"name": {{name}} }` |
| **Tax** | **Name**: `apiGetTax`<br>**URL**: `/api/master/taxes` | **Name**: `apiCreateTax`<br>**URL**: `/api/master/taxes` | `{"name": {{name}}, "percent": {{percent}}, "type": "GST" }` |
| **HSN** | **Name**: `apiGetHSN`<br>**URL**: `/api/master/hsn` | **Name**: `apiCreateHSN`<br>**URL**: `/api/master/hsn` | `{"code": {{code}}, "description": {{description}}, "tax_id": {{tax_id}} }` |

**Visibility Logic (Hidden Property)**:
*   **Banks Table**: `{{ tabs1.value !== 'Banks' }}`
*   **Brands Table**: `{{ tabs1.value !== 'Brands' }}`
*   **Categories Table**: `{{ tabs1.value !== 'Categories' }}`
*   **Tax Table**: `{{ tabs1.value !== 'Tax' }}`
*   **HSN Table**: `{{ tabs1.value !== 'HSN' }}`

### 19.3 Implementation Tips (Bulk Entry)
*   **Pattern: The "Clean Slate" Input Table**
    *   **Data Source**: `[]`
    *   **Columns to Create Manually**:
        *   **Banks**: `name`
        *   **Brands/Categories**: `name`, `code`
        *   **Tax**: `name`, `percent`, `type`
        *   **HSN**: `code`, `description`, `tax_id` (Dropdown mapped to Tax IDs)
        *   *Tip: Set "Editable" to true for all these columns.*

### 19.3 Implementation Tips (Bulk Entry - State Driven)
**Problem**: Retool's native "Add Row" sometimes limits you to one unsaved row at a time.
**Solution**: Use a **Variable** to drive the table.

1.  **Create Variable**:
    *   Name: `varBulkRows`
    *   Initial Value: `[{ temp_id: 1 }]` (One empty row with ID)

2.  **Table Setup (Columns & IDs)**:
    *   **Data Source**: `{{ varBulkRows.value }}`
    *   **Primary Key**: Set to `temp_id`.
    *   **Important**: You must manually add columns. Set the **Column ID** (key) exactly as below:
        
        | Table | Column Label | **Column ID (Key)** | Retool Type |
        | :--- | :--- | :--- | :--- |
        | Banks | Bank Name | `name` | String |
        | Brands | Brand Name | `name` | String |
        | **Brands** | **Code** | **(Auto-Generated)** | **SKIP** |
        | Categories | Category Name | `name` | String |
        | **Categories** | **Code** | **(Auto-Generated)** | **SKIP** |
        | Tax | Tax Name | `name` | String |
        | Tax | Percent | `percent` | Number |
        | HSN | HSN Code | `code` | String |
        | HSN | Description | `description` | String |

---

## Phase 22: Unified GRN Save Logic (Creation & Correction)
**Goal**: Use a SINGLE robust script to handle both "New GRN" and "GRN Correction".

1.  **Variables Required**:
    *   `varCorrectionID` (Default: `null`) -> Holds the ID of the reversed GRN if fixing a mistake.
    *   `varGRNPayload` -> Used to construct the body before sending.

2.  **The API**: `apiCreateGRN` (Ensure `parent_invoice_id` is mapped to `varCorrectionID.value` in the GUI query settings, OR pass it dynamically via trigger).

3.  **The Script**: `jsSaveGRN`
    *   **Logic**: Validates lines, prepares payload, adds `parent_invoice_id` if present, and resets form.

    ```javascript
    /* --- UNIFIED GRN SAVE LOGIC --- */
    
    // 1. Validation
    const rawLines = piLines.value || [];
    // Filter rows where Qty > 0
    const validLines = rawLines.filter(row => row.Qty && Number(row.Qty) > 0);
    
    if (validLines.length === 0) {
      utils.showNotification({ title: "Error", description: "No items to save! Enter Quantity.", notificationType: "error" });
      return;
    }
    
    const vID = vendorDropdownGRN.value;
    if (!vID || typeof vID === 'object') {
       utils.showNotification({ title: "Error", description: "Vendor ID is invalid (Check Dropdown settings).", notificationType: "error" });
       return;
    }
    
    // 2. Prepare Data
    const invDate = dateVendorInvoice.value ? moment(dateVendorInvoice.value).format("YYYY-MM-DD") : null;
    const recvDate = dateReceived.value ? moment(dateReceived.value).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD");
    
    // Calculate Payload Lines
    const dbLines = validLines.map(row => {
        return {
            product_id:         Number(row._product_id), // Must handle hidden ID column
            ordered_qty:        0, 
            accepted_qty:       Number(row.Qty),
            rejected_qty:       0,
            rate:               Number(row.Price),
            discount_percent:   Number(row['Disc %'] || 0),
            scheme_amount:      Number(row.Sch || 0),
            tax_amount:         Number(row['GST $'] || 0),
            amount:             Number(row['Net $'] || 0),
            batch_number:       row["Batch No"] ? row["Batch No"].toString() : "",
            expiry_date:        row.Expiry ? moment(row.Expiry).format("YYYY-MM-DD") : null,
            mrp:                Number(row.MRP || 0),
            sale_rate:          0
        };
    });
    
    // Calculate Headers (Frontend Sum)
    const totalNet = dbLines.reduce((acc, x) => acc + x.amount, 0); 
    const totalTax = dbLines.reduce((acc, x) => acc + x.tax_amount, 0);
    
    // Fix Null PO ID
    let finalPO = null;
    if (varPOViewId.value && varPOViewId.value != 0 && varPOViewId.value != "0") {
        finalPO = Number(varPOViewId.value);
    }
    
    // 3. Construct Payload
    const finalPayload = {
        vendor_id:          Number(vID),
        purchase_order_id:  finalPO,
        invoice_number:     vendorInvoiceNo.value || "",
        invoice_date:       invDate,
        received_date:      recvDate,
        total_net:          totalNet,
        tax_amount:         totalTax,
        grand_total:        totalNet + totalTax, // Ensure Grand Total is correct
        lines:              dbLines,
        // TRACEABILITY: Pass the Correction ID if it exists
        parent_invoice_id:  varCorrectionID.value || null 
    };
    
    // 4. Trigger API
    // We pass additionalScope to override the "Body" of the query dynamically if needed, 
    // OR just rely on data binding to varGRNPayload if you set it up that way.
    // Here we assume creating a variable-based binding is safest.
    
    await varGRNPayload.setValue(finalPayload);
    
    apiCreateGRN.trigger({
        onSuccess: function(data) {
            utils.showNotification({ title: "Success", description: "GRN Saved Successfully!", notificationType: "success" });
            
            // 5. CLEANUP & RESET
            piLines.setValue([]);
            vendorInvoiceNo.setValue("");
            vendorDropdownGRN.clearValue();
            ChoosePo.clearValue();
            dateVendorInvoice.clearValue();
            dateReceived.setValue(moment()); 
            varGRNPayload.setValue({});
            
            // Reset Correction Mode
            varCorrectionID.setValue(null);
            
            // Close Modal
            try { modalFrameGRN.close(); } catch(e) { console.log("Modal close error", e); }
        },
        onFailure: function(err) {
            console.error(err);
            utils.showNotification({ title: "Failed", description: err.message, notificationType: "error" });
        }
    });
    ```

---

## Phase 21: Product Intelligence & Edit Flows

### 21.1 Product Profile 360 (Drawer)
**Goal**: View complete product details, current stock batches, and purchase history.

1.  **UI Components**:
    *   **Drawer**: `drawerProductProfile` (Triggered by `tableProducts` Row Click)
    *   **Tabs**: `tabProductProfile` -> `['Overview', 'Stock Batches', 'Purchase History']`
    *   **Key Data**:
        *   **Stock**: `tableProductBatches`
        *   **History**: `tableProductHistory`

2.  **Backend Queries**:
    *   `apiGetProductStats` (GET `/api/products/{{ tableProducts.selectedRow.id }}/stats`)
        *   **Returns**: `{ current_stock, last_purchase_date, batches: [...], history: [...] }`

21.  **Backend Query**:
    *   `apiReverseGRN` (POST `/api/purchase-invoices/{{ tableGRN.selectedRow.id }}/reverse`)
    *   **Body**: JSON `{ "reversed_by_id": {{ current_user.sid }} }`
    *   **Success Event**: Trigger `jsCorrectGRN`_stock, last_purchase_date, batches: [...], history: [...] }`

3.  **Data Binding**:
    *   **Stock Table**: `{{ apiGetProductStats.data.batches }}`
    *   **History Table**: `{{ apiGetProductStats.data.history }}`

### 21.2 GRN Correction Workflow (User's "Reverse & Re-create" Flow)
**Goal**: A safe, stepped process to Fix GRN mistakes.

#### Step 1: In `modalViewGRN` (The View Modal)
1.  **Button 1**: `btnReverseGRN`
    *   **Text**: "Reverse / Void Entry"
    *   **Color**: Red/Danger
    *   **Event**: Trigger `apiReverseGRN`.
    *   **Hidden If**: `{{ tableGRN.selectedRow.status === 'Reversed' }}`

2.  **Button 2**: `btnOpenCorrection`
    *   **Text**: "Enter New GRN (Correction)"
    *   **Color**: Green/Primary
    *   **Hidden If**: `{{ tableGRN.selectedRow.status !== 'Reversed' }}` (Only shows AFTER you reverse).
    *   **Event**: 
        *   `varCorrectionID.setValue(tableGRN.selectedRow.id)`
        *   `varCorrectionData.setValue(tableGRN.selectedRow)`
        *   `modalFrameGRN.open()`

#### Step 2: In `modalFrameGRN` (The Create Modal)
1.  **Button**: `btnLoadCorrectionData`
    *   **Text**: "Load Data from Reversed GRN"
    *   **Location**: Top Header (Next to title).
    *   **Hidden If**: `{{ varCorrectionID.value == null }}`
    *   **Event**: Trigger `jsLoadCorrectionData`

2.  **Script**: `jsLoadCorrectionData`
    ```javascript
    const old = varCorrectionData.value;
    
    // 1. Fill Header
    selVendor.setValue(old.vendor_id);
    txtInvoiceNo.setValue(old.vendor_invoice_number);
    dateInvoice.setValue(old.vendor_invoice_date);
    dateReceived.setValue(old.received_date);
    
    // 2. Fill Lines (Assuming you have a variable or transformer for lines)
    // You might need to parse the JSON if it comes as string
    varGRNLines.setValue(old.lines); 
    
    utils.showNotification({title: "Data Loaded", description: "Review and Click Save"});
    
    // 3. Clear the Trigger Variable so button disappears/resets
    varCorrectionID.setValue(null);
    ```

3.  **Save**: Just click the standard `btnSaveGRN`. It's a new entry!

    *   **How to setup HSN `tax_id` Tag**:
        *   **Type**: Select `Tag`.
        *   **Option List**: `Mapped`.
        *   **Data Source**: `{{ apiGetTax.data }}`
        *   **Value**: `{{ item.id }}`
        *   **Label**: `{{ item.name }} ({{ item.percent }}%)`
        *   *Result: User sees "GST 18%", Backend receives ID `5`.*

3.  **Save Logic (`jsUniversalSave`)**:
    *   Loop through `varBulkRows.value`.
    
    ```javascript
    // 1. Identify which Tab is active
    const currentTab = tabbedContainer1.currentViewKey; 
    
    let tableComp, apiQuery, mapFunc;
    
    // 2. Select Components based on Tab
    switch (currentTab) {
        case 'Banks':
            tableComp = tblBanks;
            apiQuery = apiCreateBank;
            mapFunc = (row) => ({ name: row.name });
            break;
        case 'Brands':
            tableComp = tblBrands;
            apiQuery = apiCreateBrand;
            mapFunc = (row) => ({ name: row.name }); // Code is Auto-Genererated
            break;
        case 'Categories':
            tableComp = tblCats; 
            apiQuery = apiCreateCat;
            mapFunc = (row) => ({ name: row.name }); // Code is Auto-Genererated
            break;
        case 'Tax':
            tableComp = tblTax;
            apiQuery = apiCreateTax;
            mapFunc = (row) => ({ name: row.name, percent: row.percent, type: 'GST' });
            break;
        case 'HSN':
            tableComp = tblHSN;
            apiQuery = apiCreateHSN;
            mapFunc = (row) => ({ code: row.code, description: row.description, tax_id: row.tax_id });
            break;
        default:
            utils.showNotification({ title: "No tab match", notificationType: "error" });
            return; 
    }
    
    // 3. GET DYNAMIC DATA (The Fix for State-Driven Tables)
    // We must grab the 'changesetObject' because Retool sees these as EDITS to the empty rows
    const changes = tableComp.changesetObject; 
    
    // Convert changeset to array
    const rowsToSave = Object.keys(changes || {}).map(key => changes[key]);
    
    if(!rowsToSave || rowsToSave.length === 0) {
       utils.showNotification({ title: "Nothing to save (Did you type anything?)", notificationType: "warning" });
       return;
    }

    const promises = rowsToSave.map(row => apiQuery.trigger({
        additionalScope: mapFunc(row)
    }));
    
    await Promise.all(promises);
    varBulkRows.setValue([{ temp_id: Date.now() }]); // Clear/Reset table
    utils.showNotification({ title: `Saved ${rowsToSave.length} items to ${currentTab}!`, notificationType: "success" });
    ```

---

## Phase 17: Smart Bulk Update System Guide
*This guide details the "Smart" bulk update workflow where users can Export (Filtered by Brand), Edit in Excel, Upload to a Review Table, and then Commit changes.*

### 1. Backend API Configuration

**1.1 Export API (Modified)**
*   **URL**: `GET /api/products/export`
*   **Query Params**:
    *   `brand_id`: (Optional) ID of the brand to filter by.
*   **Behavior**: Returns CSV of products. If `brand_id` is provided, returns only products for that brand.

**1.2 Update API (Existing)**
*   **URL**: `POST /api/products/bulk-update`
*   **Body**: `{ "items": [...] }`
*   **Behavior**: Updates products based on ID. Handles Name-to-ID lookup automatically.

### 2. Frontend UI Components

**2.1 The Container / Modal**
*   **Name**: `modalSmartUpdate`
*   **Title**: "Smart Bulk Update Manager"

**2.2 Section A: Export Data**
*   **Dropdown**: `selExportBrand`
    *   **Label**: "Filter by Brand"
    *   **Data Source**: `{{ getBrands.data }}`
    *   **Value**: `id`
    *   **Label**: `brand_name`
    *   **Placeholder**: "All Brands" (Allow Clear)
*   **Button**: `btnSmartExport`
    *   **Label**: "Download CSV"
    *   **Icon**: `bold/interface-download-button-2`
    *   **Event**: Click -> Go to URL
    *   **URL**: `{{ apiBaseUrl.value }}/api/products/export?brand_id={{ selExportBrand.value }}`

**2.3 Section B: Upload & Review**
*   **File Button**: `fileSmartUpload`
    *   **Label**: "Upload Edited CSV"
    *   **Accept**: `.csv`
    *   **Parse**: `True`
    *   **Event**: Parse -> Trigger `jsParseSmartUpload`
*   **Variable**: `varSmartUpdateData`
    *   **Initial Value**: `[]`

**2.4 Section C: Review Table (The most important part)**
*   **Table**: `tblReviewUpdates`
    *   **Data Source**: `{{ varSmartUpdateData.value }}`
    *   **Editable**: `True` (Enable editing for Price columns)
    *   **Columns**:
        *   Product ID (Hidden/ReadOnly)
        *   Product Name (Text, ReadOnly)
        *   MRP (Number, Editable)
        *   Purchase Rate (Number, Editable)
        *   Distributor (Number, Editable)
        *   Wholesale (Number, Editable)
        *   Dealer (Number, Editable)
        *   Retail (Number, Editable)

**2.5 Section D: Commit**
*   **Button**: `btnCommitUpdates`
    *   **Label**: "Save Changes"
    *   **Color**: Green/Primary
    *   **Event**: Click -> Trigger `jsCommitSmartUpdates`

### 3. Frontend Logic Scripts

**3.1 jsParseSmartUpload**
*   **Goal**: Parse the CSV and populate the Review Table.
*   **Code**:
    ```javascript
    const rawData = fileSmartUpload.parsedValue[0]; // Assuming standard parsing
    // Normalize Keys Helper
    const clean = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
    const getVal = (row, key) => {
        const foundKey = Object.keys(row).find(k => clean(k).includes(clean(key)));
        return foundKey ? row[foundKey] : "";
    };
    const tableRows = rawData.map(r => ({
        "Product ID":   getVal(r, "Product ID") || getVal(r, "ID"),
        "Product Name": getVal(r, "Product Name"),
        "MRP":          getVal(r, "MRP"),
        "Purchase Rate": getVal(r, "Purchase Rate"),
        "Distributor":  getVal(r, "Distributor Rate"),
        "Wholesale":    getVal(r, "Wholesale Rate"),
        "Dealer":       getVal(r, "Dealer Rate"),
        "Retail":       getVal(r, "Retail Rate")
    }));
    varSmartUpdateData.setValue(tableRows);
    utils.showNotification({ title: "Loaded", description: tableRows.length + " rows for review." });
    ```

**3.2 jsCommitSmartUpdates**
*   **Goal**: Take data from the Table (including any last-minute edits) and send to Backend.
*   **Code**:
    ```javascript
    // We take data from the TABLE, because the user might have edited it there!
    const rows = tblReviewUpdates.data; 
    if (!rows || rows.length === 0) return;
    // Helper to round
    const num = (v) => v ? Number(v).toFixed(2) : null;
    // Format for Backend
    const payload = rows.map(r => ({
        id: r['Product ID'],
        mrp: num(r['MRP']),
        purchase_rate: num(r['Purchase Rate']),
        distributor_rate: num(r['Distributor']),
        wholesale_rate: num(r['Wholesale']),
        dealer_rate: num(r['Dealer']),
        retail_rate: num(r['Retail'])
        // Names are ignored by update if ID exists, so no need to send them
    }));
    apiBulkUpdate.trigger({
        additionalScope: { items: payload },
        onSuccess: () => {
             utils.showNotification({ title: "Success", description: "Prices Updated!", notificationType: "success" });
             modalSmartUpdate.close();
             varSmartUpdateData.setValue([]); // Clear
             apiGetProducts.trigger();
        },
        onFailure: (e) => utils.showNotification({ title: "Error", description: e.message, notificationType: "error" })
    });
    ```

---

## Phase 20: Vendor Profile (Home & Profile Tabs)

### 1. Goal
Create a detailed "Vendor 360" view with two main tabs:
*   **Home**: KPIs (Total POs, Pending Balance) and Charts.
*   **Profile**: Edit Basic Info (Name, GST) and Manage Addresses (Add/Edit/Set Default).

### 2. Backend Queries
Create these queries in your **Vendor Profile Module**:

*   `apiGetVendor` (GET `/api/vendors/{{ tableVendors.selectedRow.id }}`)
    *   *Note*: Ensure this runs ONLY when `tableVendors.selectedRow.id` is available.
*   `apiGetAddresses` (GET `/api/vendors/{{ tableVendors.selectedRow.id }}/addresses`)

*   `apiCreateGRN` (POST `/api/purchase-invoices`)
    *   **Body**:
        ```json
        {
          "vendor_id": {{ selVendor.value }},
          "purchase_order_id": {{ selPO.value ? selPO.value : 0 }},
          "invoice_number": {{ txtInvoiceNo.value }},
          "invoice_date": {{ dateInvoice.value }},
          "received_date": {{ dateReceived.value }},
          "total_net": {{ tblGrnLines.data.reduce((a,b)=>a+Number(b.amount),0) }},
          "tax_amount": {{ tblGrnLines.data.reduce((a,b)=>a+Number(b.tax_amount),0) }},
          "grand_total": {{ tblGrnLines.data.reduce((a,b)=>a+Number(b.amount)+Number(b.tax_amount),0) }},
          "lines": {{ tblGrnLines.data }},
          "parent_invoice_id": {{ varCorrectionID.value }} 
        }
        ```
        > **Note**: `parent_invoice_id` links this new GRN to the one you corrected (if any).

*   `apiAddAddress` (POST `/api/vendors/{{ tableVendors.selectedRow.id }}/addresses`)
    *   **Headers**: `Content-Type: application/json`
    *   **Body** (Raw JSON):
        ```json
        {
          "address_line": {{txtNewAddress.value}},
          "city": {{txtNewCity.value}},
          "state_code": {{selNewState.value}},
          "district": {{selNewDistrict.value}},
          "pin_code": {{txtNewPin.value}},
          "is_default": {{chkNewDefault.value}}
        }
        ```

*   `apiUpdateVendor` (PUT `/api/vendors/{{ tableVendors.selectedRow.id }}`)
    *   **Headers**: `Content-Type: application/json`
    *   **Body** (Raw JSON):
        ```json
        {
          "vendor_name": {{txtVendorName.value}},
          "contact_person": {{txtContactPerson.value}},
          "contact_no": {{txtContactNo.value}},
          "email": {{txtEmail.value}},
          "gst": {{txtGST.value}},
          "pan": {{txtPAN.value}},
          "bank_name": {{txtBankName.value}},
          "bank_account_no": {{txtAccountNo.value}},
          "bank_ifsc": {{txtIFSC.value}}
        }
        ```

        }
        ```

### 3. UI Setup (Tabbed Container)
... (Tabs 1 & 2 logic remains similar)

### 4. Special Logic: Cascading State/District
Since you want this simply on the frontend:
1.  Create a **JavaScript Query** (`jsStatesData`) with your data:
    *   **Logic**: Returns a JSON object mapping States to Districts.
    *   **Why Frontend?**: State/District names rarely change. Keeping this in the browser makes the dropdowns **Instant** (Zero Latency) compared to a database call. Ideally suited for "Static Reference Data".
    ```javascript
    // Performance Note: This is practically instant (O(1) lookup). 
    // Much faster than an API call for static data.
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
2.  **State Dropdown** (`selNewState`):
    *   **Values**: `{{ Object.keys(jsStatesData.data) }}`
3.  **District Dropdown** (`selNewDistrict`):
    *   **Values**: `{{ jsStatesData.data[selNewState.value] }}`
    *   **Disabled**: `{{ !selNewState.value }}`

### 3. UI Setup (Tabbed Container)
1.  **Tab 1: Home (KPIs)**
    *   Add **Statistic Components**:
        *   **Total POs**: `{{ apiGetVendor.data.total_pos }}` (You may need to add a stats endpoint later).
        *   **Pending Amount**: `{{ apiGetVendor.data.pending_balance }}`.
    *   Add a **Chart**: "Purchase History" (X=Date, Y=Amount).

2.  **Tab 2: Profile (Details & Addresses)**
    *   **Section A: Vendor Details** (Form)
        *   **Identity**:
            *   Name: `txtVendorName`
            *   Contact Person: `txtContactPerson`
            *   **Contact No**: `txtContactNo`
            *   Email: `txtEmail`
        *   **Tax & Legal**:
            *   GST: `txtGST`
            *   **PAN**: `txtPAN`
        *   **Bank Details**:
            *   **Bank Name**: `txtBankName`
            *   **Account No**: `txtAccountNo`
            *   **IFSC Code**: `txtIFSC`
        *   **Action Buttons**:
            *   **Edit Button** (`btnEditMode`): On Click -> `varIsEditing.setValue(true)`
            *   **Save Button** (`btnUpdateInfo`): 
                *   Hidden: `{{ !varIsEditing.value }}`
                *   On Click -> Trigger `apiUpdateVendor` -> Success -> `varIsEditing.setValue(false)`
            *   **Cancel Button**: On Click -> `varIsEditing.setValue(false)` & Reset Form.
        *   **Field Settings**:
            *   Set **Read Only** property of ALL inputs above to: `{{ !varIsEditing.value }}`.
    
    *   **Section B: Address Book** (Table)
        *   **Header Action**: Add Button (`btnAddAddress`) -> Icon: `bold/interface-add`.
        *   **On Click**: Open Modal (`modalAddAddress`).
        *   **Data Source**: `{{ apiGetAddresses.data }}`
        *   **Columns**: Address, City, State, Pin, **Is Default (Boolean)**.
        *   **Row Action**: Button "Set Default" -> Triggers `apiSetDefaultAddress`.

    *   **Modal: Add Address** (`modalAddAddress`)
        *   **Inputs**: Address Line, City, State, Pincode, Checkbox "Make Default".
        *   **Save Button**: Triggers `apiAddAddress` (POST).
        *   **Success**: Close Modal & Trigger `apiGetAddresses`.

### 4. Critical Logic
*   **Default Sync**: When you add a new address as "Default", the backend creates the row in `vendor_addresses` AND updates the main `vendors` table columns (`address_line1`, `state`).
*   **Refetch**: Always run `apiGetVendor.trigger()` after changing an address to see the new default on the main screen.

---

## Phase 23: Debit Note Module (Vendor Returns)
*Logic to return goods (Defective or Surplus) to Vendors.*

### 1. UI Setup
*   **Location**: Vendor Profile -> "Bills" Tab -> "Create Debit Note" Button.
*   **Modal**: `modalCreateDebitNote`
    *   **Header**: Vendor (Auto-selected), Date, Reason.
    *   **Table Input** (`tblDebitLines`):
        *   **Product** (Select): Link to `apiGetProducts`.
        *   **Batch Selection** (Dropdown):
            *   *Important*: Use the specific batch endpoint `api/stock/adjust/batches/{{ current_row.product_id }}`.
            *   This allows choosing EXACTLY which batch to return.
        *   **Return Status** (Dropdown):
            *   Values: `['Damage', 'Expiry', 'Good', 'Defective']`.
            *   Maps to `return_type` in API.
        *   **Qty**: Quantity to return.
        *   **Rate**: Purchase Rate (Auto-filled from Batch).
        *   **Amount**: `Qty * Rate`.

### 2. API Configuration
*   **Resource**: `apiCreateDebitNote`
*   **Method**: `POST`
*   **URL**: `/api/debit-notes`
*   **Body** (Raw JSON):
    ```json
    {
      "vendor_id": {{ selVendor.value }},
      "debit_note_date": {{ dateDN.value }},
      "reason": {{ txtReason.value }},
      "lines": {{ tblDebitLines.data.map(row => ({
          product_id: row.product_id,
          qty: row.qty,
          rate: row.rate,
          amount: row.amount,
          batch_number: row.batch_code, // Crucial for specific tracking
          return_type: row.status // 'Damage', 'Good' etc.
      })) }}
    }
    ```

---

## Phase 24: Stock Adjustment Module
*Logic to move stock from "Good" to "Damage/Expiry" or "Lost".*

### 1. The Logic Flow
1.  **Scan/Select Item**.
2.  **Enter Quantity** to move.
3.  **Select Reason** (Damage, Expiry, Lost, Found).
4.  **Save**: Backend deducts from `inventory_batches` (FIFO) and adds to `products.damaged_stock`.

### 2. UI Setup
*   **Location**: Create a new Main Tab (or Sub-tab in Inventory) called **"Stock Adjustments"**.

### 2. UI Setup (Editable Table)
*   **Location**: "Stock Adjustments" Tab.
*   **Components**:
    1.  **Add Button** (`btnNewAdjustment`): "Add New Adjustment".
        *   **Action**: Opens `modalStockAdjust`.
    2.  **History Table**: `tblAdjustmentHistory` (Read-only log).

#### Modal Setup (`modalStockAdjust`)
*   **Title**: "New Stock Adjustment"
*   **Component**: **Table** (`tblStockAdjustInput`) -> "Editable" Mode.
*   **Data Source**: `[]` (Start empty, user adds rows).

**Column Configuration**:
1.  **Product** (`product_id`)
    *   **Format**: Tag / Dropdown
    *   **Mapped Options**: `{{ getProducts.data }}`
    *   **Value**: `id`
    *   **Label**: `{{ item.product_name }}`
2.  **Batch No** (`batch_code`)
    *   **Format**: Tag / Dropdown
    *   **Mapped Options**: `{{ getBatches.data }}` (See Logic Below)
    *   **Caption**: "Optional (Leave empty for FIFO)"
3.  **Qty** (`qty`)
    *   **Format**: Number (Editable)
4.  **Reason** (`reason`)
    *   **Format**: Tag / Dropdown
    *   **Options**: `['Damage', 'Expiry', 'Lost', 'Found']`

**Dynamic Batch Helper**:
Since Retool tables can't easily filter dropdowns *per row* based on another column without complex workarounds, a simpler flow is:
*   **Option A (Simple)**: Just use a Text Input for Batch Code (User types it).
*   **Option B (Advanced)**: Use a `Select` component *outside* the table to "Add Line".
    *   Select Product -> Select Batch (Filtered) -> Enter Qty -> Click "Add to Table".
    *   Table then just displays the list to be Saved.
    *   **Recommendation**: Use **Option B** for error-free data entry.

**Recommended Flow (Option B) for `modalStockAdjust`**:
1.  **Select Product** (`selAdjProduct`):
    *   **Data Source**: `{{ getProducts.data }}` (Ensure `getProducts` query exists)
2.  **Select Batch** (`selAdjBatch`):
    *   **Data Source**: `{{ apiGetBatches.data }}`
    *   **Trigger**: Run `apiGetBatches` when `selAdjProduct` changes.
    *   **Value/Label**: `{{ item.batch_code }} (Expires: {{ item.expiry_date }})`
3.  **Input Qty** (`inpAdjQty`).
4.  **Button "Add"**: Appends `{ product_id: selAdjProduct.value, batch_code: selAdjBatch.value, qty: inpAdjustQty.value, reason: selAdjReason.value }` to `varAdjustmentList`.
5.  **Table**: Displays `{{ varAdjustmentList.value }}`.
6.  **Button "Save"**: Triggers `apiCreateStockAdjustment`.

### 3. API Configuration

#### 1. `apiGetBatches` (GET)
*   **URL**: `api/stock/adjust/batches/{{ selAdjProduct.value }}`
*   **Important**: Set **"Run only when manually triggered"** to avoid the `Cannot GET /batches/null` error when the dropdown is empty.
    *   *Alternative*: In "Advanced" tab -> "Disable query": `{{ !selAdjProduct.value }}`.

#### 2. `apiCreateStockAdjustment` (POST)
*   **URL**: `api/stock/adjust`
*   **Headers**:
    *   `Content-Type`: `application/json`
*   **Body Type**: **Raw** (JSON)
*   **Body**:
    ```json
    {
      "items": {{ varAdjustmentList.value }}
    }
    ```
    *(Assuming `varAdjustmentList` is an Array of Objects. If it's a string, remove the outer braces).*

### 4. Troubleshooting & Scripts
> [!IMPORTANT]
> **Server Restart Required**: You added new API routes (`/api/stock/adjust`). You **MUST** stop and restart your Node.js backend for these to work. otherwise you will see `Cannot GET ...` errors.

#### A. Initializing the List (`varAdjustmentList`)
1.  Create a **Variable** in Retool.
2.  **Name**: `varAdjustmentList`
3.  **Initial Value**: `[]` (Empty Array)

#### B. The "Add" Button Logic
*   **Component**: Button "Add to List"
*   **Event Handler**: On Click -> **Run Script**
*   **Code**:
    ```javascript
    const newItem = {
      product_id: selAdjProduct.value,
      product_name: selAdjProduct.selectedLabel, // Helpful to show name in table
      batch_code: selAdjBatch.value || null,     // Null if empty (FIFO)
      qty: Number(inpAdjQty.value),
      reason: selAdjReason.value
    };

    // Validation
    if (!newItem.product_id || !newItem.qty) {
      utils.showNotification({ title: "Error", description: "Select Product and Qty", notificationType: "error" });
      return; 
    }

    // Append to existing array
    const currentList = varAdjustmentList.value || [];
    varAdjustmentList.setValue([...currentList, newItem]);

    // Reset Inputs for next entry
    inpAdjQty.setValue(0);
    selAdjProduct.clearValue();
    selAdjBatch.clearValue();
    // selAdjReason.setValue('Damage'); // Optional: Keep or Reset Reason
    ```

#### C. The Table Logic
*   **Table Component**: `tblStockAdjustInput`
*   **Data Source**: `{{ varAdjustmentList.value }}`
*   **Columns**:
    *   `product_name` (Mapped from script above)
    *   `batch_code`
    *   `qty`
    *   `reason`

#### D. Delete Row Logic (Trash Icon)
*   **Location**: Table -> "Actions" -> Add Action "Delete".
*   **Icon**: `bold/interface-delete-bin-2`.
*   **Event Handler**: On Click -> **Run Script**
*   **Code**:
    ```javascript
    // 'i' is the index of the clicked row in Retool Table
    const current = varAdjustmentList.value;
    const updated = current.filter((item, index) => index !== i);
    varAdjustmentList.setValue(updated);
    ```

---

## Phase 30: Smart Bulk Update System
*This guide details the "Smart" bulk update workflow where users can Export (Filtered by Brand), Edit in Excel, Upload to a Review Table, and then Commit changes.*

### 1. Backend API Configuration

**1.1 Export API (Modified)**
*   **Name**: `apiExportProducts` (or accessed via Button URL)
*   **URL**: `GET /api/products/export`
*   **Query Params**:
    *   `brand_id`: (Optional) ID of the brand to filter by.
*   **Behavior**: Returns CSV of products. If `brand_id` is provided, returns only products for that brand.

**1.2 Update API (Existing)**
*   **Name**: `apiBulkUpdate`
*   **URL**: `POST /api/products/bulk-update`
*   **Headers**: `Content-Type: application/json`
*   **Body**: `{ "items": {{ items }} }`
*   **Behavior**: Updates products based on ID. Handles Name-to-ID lookup automatically.

### 2. Frontend UI Components

**2.1 The Container / Modal**
*   **Name**: `modalSmartUpdate`
*   **Title**: "Smart Bulk Update Manager"

**2.2 Section A: Export Data**
*   **Dropdown**: `selExportBrand`
    *   **Label**: "Filter by Brand"
    *   **Data Source**: `{{ getBrands.data }}`
    *   **Value**: `id`
    *   **Label**: `brand_name`
    *   **Placeholder**: "All Brands" (Allow Clear)
*   **Button**: `btnSmartExport`
    *   **Label**: "Download CSV"
    *   **Icon**: `bold/interface-download-button-2`
    *   **Event**: Click -> Go to URL
    *   **URL**: `{{ apiBaseUrl.value }}/api/products/export?brand_id={{ selExportBrand.value }}`
    *   **Hidden**: `{{ varModalMode.value !== 'bulk' || !selExportBrand.value }}`

**2.3 Section B: Upload & Review**
*   **File Button**: `fileSmartUpload`
    *   **Label**: "Upload Edited CSV"
    *   **Accept**: `.csv`
    *   **Parse**: `True`
    *   **Event**: Parse -> Trigger `jsParseSmartUpload`
*   **Variable**: `varSmartUpdateData`
    *   **Initial Value**: `[]`

**2.4 Section C: Review Table (The most important part)**
*   **Table**: `tblReviewUpdates`
    *   **Data Source**: `{{ varSmartUpdateData.value }}`
    *   **Editable**: `True` (Enable editing for Price columns)
    *   **Columns**:
        *   Product ID (Hidden/ReadOnly)
        *   Product Name (Text, ReadOnly)
        *   MRP (Number, Editable)
        *   Purchase Rate (Number, Editable)
        *   Distributor (Number, Editable)
        *   Wholesale (Number, Editable)
        *   Dealer (Number, Editable)
        *   Retail (Number, Editable)

**2.5 Section D: Commit**
*   **Button**: `btnCommitUpdates`
    *   **Label**: "Save Changes"
    *   **Color**: Green/Primary
    *   **Event**: Click -> Trigger `jsCommitSmartUpdates`

### 3. Frontend Logic Scripts

**3.1 jsParseSmartUpload**
*   **Goal**: Parse the CSV and populate the Review Table.
*   **Code**:
    ```javascript
    const rawData = fileSmartUpload.parsedValue[0]; // Assuming standard parsing
    // Normalize Keys Helper
    const clean = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
    const getVal = (row, key) => {
        const foundKey = Object.keys(row).find(k => clean(k).includes(clean(key)));
        return foundKey ? row[foundKey] : "";
    };
    const tableRows = rawData.map(r => ({
        "Product ID":   getVal(r, "Product ID") || getVal(r, "ID"),
        "Product Name": getVal(r, "Product Name"),
        "MRP":          getVal(r, "MRP"),
        "Purchase Rate": getVal(r, "Purchase Rate"),
        "Distributor":  getVal(r, "Distributor Rate"),
        "Wholesale":    getVal(r, "Wholesale Rate"),
        "Dealer":       getVal(r, "Dealer Rate"),
        "Retail":       getVal(r, "Retail Rate")
    }));
    varSmartUpdateData.setValue(tableRows);
    utils.showNotification({ title: "Loaded", description: tableRows.length + " rows for review." });
    ```

    ```javascript
    // We take data from the TABLE, because the user might have edited it there!
    const rows = tblReviewUpdates.data; 
    if (!rows || rows.length === 0) return;
    // Helper to round
    const num = (v) => v ? Number(v).toFixed(2) : null;
    // Format for Backend
    const payload = rows.map(r => ({
        id: r['Product ID'],
        mrp: num(r['MRP']),
        purchase_rate: num(r['Purchase Rate']),
        distributor_rate: num(r['Distributor']),
        wholesale_rate: num(r['Wholesale']),
        dealer_rate: num(r['Dealer']),
        retail_rate: num(r['Retail'])
        // Names are ignored by update if ID exists, so no need to send them
    }));
    apiBulkUpdate.trigger({
        additionalScope: { items: payload },
        onSuccess: () => {
             utils.showNotification({ title: "Success", description: "Prices Updated!", notificationType: "success" });
             modalSmartUpdate.close();
             varSmartUpdateData.setValue([]); // Clear
             apiGetProducts.trigger();
        },
        onFailure: (e) => utils.showNotification({ title: "Error", description: e.message, notificationType: "error" })
    });
    ```

---

## Phase 23: DSE / Delivery Expenses Settlement
*Goal: Process (Approve/Reject) DSE expenses from the Finance Settlement modal.*

### 1. The Listing Query (`q_getExpenses`)
*   **Resource**: REST API (`GET`)
*   **URL**: `api/finance/reconciliation/expenses`
*   **URL Parameters**:
    *   `report_id`: `{{ tblPendingDSR.selectedRow.id }}`
*   **Run on Page Load**: No (Trigger when modal opens)

### 2. The Process Query (`q_processExpense`)
*   **Method**: `POST`
*   **URL**: `{{ apiBaseUrl.value }}/api/finance/reconciliation/expenses/{{ override_id }}/process`
*   **Body Type**: **JSON**
*   **Body Content (Copy EXACTLY)**:
```json
{
  "action": "{{ action }}", 
  "reason": "{{ reason }}",
  "bank_account_id": {{ bank_account_id }},
  "user_id": {{ current_user.id }}
}
```
> **CRITICAL**: Do NOT put quotes `""` around `{{ bank_account_id }}`. It must be sent as a Number.

### 3. Button Logic (Row Action JS)

#### Button: "Approve" (Row Action)
```javascript
// 1. Get the pending changes (Handles both New and Legacy tables)
const changes = tableExpenses.changesetArray || tableExpenses.recordUpdates || [];
const rowChange = changes.find(x => x.id == currentRow.id);

// 2. Pick the bank account (draft first, then original)
const bankId = rowChange?.bank_account_id || currentRow.bank_account_id;

// Optional: Log to debug console
console.log("Processing Row ID:", currentRow.id, "Account ID:", bankId);

// 3. Trigger the Processing
await q_processExpense.trigger({
  additionalScope: {
    override_id: currentRow.id,
    action: 'Verified',
    bank_account_id: bankId || null 
  }
});

// 4. Refresh & Notify
q_getExpenses.trigger();
utils.showNotification({ 
  title: 'Approved', 
  description: 'Expense posted to Ledger', 
  notificationType: 'success' 
});
```

#### Button: "Reject" (Row Action)
```javascript
// 1. Get pending changes
const changes = tableExpenses.changesetArray || tableExpenses.recordUpdates || [];
const rowChange = changes.find(x => x.id == currentRow.id);

// 2. Pick the reason (draft first, then original)
const reason = rowChange?.rejection_reason || currentRow.rejection_reason;

await q_processExpense.trigger({
  additionalScope: {
    override_id: currentRow.id,
    action: 'Rejected',
    reason: reason || 'No reason provided'
  }
});

q_getExpenses.trigger();
utils.showNotification({ 
  title: 'Rejected', 
  description: 'Expense rejected', 
  notificationType: 'error' 
});
```

---

## Phase 24: Other Income (Non-Operating) Portal
*Goal: Record miscellaneous income like Interest, Scrap Sales, or Profit on Assets.*

### 1. Data Queries
*   **`q_getIncomeRecords`**: `GET /api/finance/other-income` (Filter by `start_date`, `end_date`).
*   **`q_getIncomeCats`**: `GET /api/finance/other-income/categories` (To populate Category dropdown).
*   **`q_getBankAccounts`**: `GET /api/bank-accounts` (To populate Destination Account dropdown).

### 2. The Record Income Query (`q_recordIncome`)
*   **Resource**: REST API (`POST`)
*   **URL**: `api/finance/other-income`
*   **Body Content**:
```json
{
  "transaction_date": "{{ dateIncome.value }}",
  "category_account_id": {{ selIncomeCat.value }},
  "destination_account_id": {{ selDestAcc.value }},
  "amount": {{ numIncomeAmount.value }},
  "taxable_amount": {{ numTaxableAmount.value || numIncomeAmount.value }},
  "tax_amount": {{ numTaxAmount.value || 0 }},
  "is_gst_income": {{ chkIsGST.value || false }},
  "gst_no": "{{ txtGSTNo.value }}",
  "received_from": "{{ txtReceivedFrom.value }}",
  "reference_no": "{{ txtRefNo.value }}",
  "description": "{{ txtDesc.value }}",
  "user_id": {{ current_user.id }}
}
```

### 3. UI Layout Tips
1.  **Tab**: Add an "Other Income" tab in your Finance Dashboard.
2.  **Form**: A simple form on the left or in a modal with fields for Date, Category, Bank/Cash Account, Amount, and Payer Name.
3.  **Table**: On the right, show a list of recent entries using `q_getIncomeRecords.data`.
4.  **Success Event**: After `q_recordIncome` succeeds:
    *   Show Notification: "Income Recorded: {{ data.income_number }}"
    *   Refresh: `q_getIncomeRecords.trigger()`
    *   Clear: `formIncome.clear()`
