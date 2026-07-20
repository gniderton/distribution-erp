# GNIDERTON ERP Blueprint & Logical Specifications

This document lists the widgets, logic tables, actions, and custom rules for every page of the GNIDERTON ERP system to construct a pixel-perfect React replica.

## Page: Inventory

### 1. JS Objects & Custom Functions
* **PopulateProductsTableByVendors**
* **savePOLine**
* **populateDrawerFromPO**
* **editPOHandler**
* **vendorSelectJS**
* **saveGRNJS**
* **savePaymentJS**
* **saveDebitNoteJS**
* **jsGroupProducts**
* **jsCommitSmartUpdates**
* **JSObjectState**
* **JSObject1**
* **POManager**
* **triggerUpdatePO**
* **GRNSummary**
* **JSFilterGRNPo**
* **JSPoOptionChange**
* **EditGrnTable**
* **JSAddOtherProducts**
* **JSOpenModalGrn**
* **JSObjectGrnfromPo**
* **GRNEditSummary**
* **Vendor_Logic**
* **getVendorPendingBills**
* **Payments_Logic**
* **PDF_Generator**
* **Global_Assets**
* **PDFUtilsGRN**
* **PO_Helper**

### 2. Queries & Data Bindings
* **Vendors** [undefined] [DS: RenderCloud] -> `GET /api/vendors`
* **Products** [undefined] [DS: RenderCloud] -> `GET /api/products`
* **Tax** [undefined] [DS: RenderCloud] -> `GET /api/master/taxes`
* **getBankAccounts** [undefined] [DS: RenderCloud] -> `GET /api/bank-accounts`
* **getNextPO** [undefined] [DS: RenderCloud] -> `GET /api/documents/next/PO`
* **getvendoraddress** [undefined] [DS: RenderCloud] -> `GET /api/master/vendor-addresses`
* **getPOs** [undefined] [DS: RenderCloud] -> `GET /api/purchase-orders`
* **getGRNList** [undefined] [DS: RenderCloud] -> `GET /api/purchase-invoices`
* **getBrands** [undefined] [DS: RenderCloud] -> `GET /api/master/brands`
* **getCategories** [undefined] [DS: RenderCloud] -> `GET /api/master/categories`
* **getHSN** [undefined] [DS: RenderCloud] -> `GET /api/master/hsn`
* **getTemplateData** [undefined] [DS: RenderCloud] -> `GET /api/products/template-data`
* **q_getUnconsumedDebits** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/bank/unconsumed-debits`
* **getPOById** [undefined] [DS: RenderCloud] -> `GET /api/purchase-orders/{{ poListTable.triggeredRow.id }}`
* **getVendorLedger** [undefined] [DS: RenderCloud] -> `GET /api/vendor-payments/ledger/{{ appsmith.store.selectedVendor.id }}`
* **getVendorDebitNotes** [undefined] [DS: RenderCloud] -> `GET /api/debit-notes/vendor/{{ appsmith.store.selectedVendor.id}}`
* **apiGetAddresses** [undefined] [DS: RenderCloud] -> `GET /api/vendors/{{ tblVendors.selectedRow.id }}/addresses`
* **apiGetBatches** [undefined] [DS: RenderCloud] -> `GET /api/stock/adjust/batches/{{ selAdjProduct.selectedOptionValue }}`
* **getDebitNoteLines** [undefined] [DS: RenderCloud] -> `GET /api/debit-notes/{{ debiteNotetbl.selectedRow.id }}/items`
* **onCellChange** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **viewPO** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **editPO** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **addMissingProducts** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **onVendorSelect** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **makePayment** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **saveDebitNote** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **groupByBrand** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **commitUpdates** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **openCreatePO** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **initializeState** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **submitPO** [undefined] [DS: RenderCloud] -> `POST /api/purchase-orders`
* **savePO** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **updatePO** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **updatePOQuery** [undefined] [DS: RenderCloud] -> `PUT /api/purchase-orders/{{ appsmith.store.selectedPOId }}`
* **getSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getPOForGRN** [undefined] [DS: RenderCloud] -> `GET /api/purchase-orders/{{ChoosePo.selectedOptionValue }}`
* **transformPORows** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **onPOSelected** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **recalculateRow** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **addRemainingProducts** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **saveGRN** [undefined] [DS: RenderCloud] -> `POST /api/purchase-invoices`
* **openNewGRN** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **inwardPO_FromTable** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getTaxSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **viewVendorProfile** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getFilteredPendingBills** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **apiGetBank** [undefined] [DS: RenderCloud] -> `GET /api/master/banks`
* **preparePayment** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **apiReverseGRN** [undefined] [DS: RenderCloud] -> `POST /api/purchase-invoices/{{ tblGrn.triggeredRow.id }}/reverse`
* **getMe** [undefined] [DS: RenderCloud] -> `GET /api/employees/profile`
* **getLogo** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **previewPO** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **_drawSimpleBox** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **_drawSimpleBox** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **previewGRN** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **saveGRN** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **populateForVendor** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **handleCSVUpload** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **downloadTemplate** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `

### 3. Data Tables & Interactive Grid Rules
* **Table: poListTable**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: true)
    * `created_at` (Label: "created_at", Type: date, Editable: true)
    * `po_number` (Label: "po_number", Type: text, Editable: false)
    * `po_date` (Label: "po_date", Type: date, Editable: false)
    * `vendor_id` (Label: "vendor_id", Type: text, Editable: true)
    * `status` (Label: "status", Type: text, Editable: false)
    * `total_qty` (Label: "total_qty", Type: number, Editable: false)
    * `total_net` (Label: "total_net", Type: text, Editable: false)
    * `total_taxable` (Label: "total_taxable", Type: text, Editable: true)
    * `gst` (Label: "gst", Type: text, Editable: true)
    * `total_excise` (Label: "total_excise", Type: text, Editable: true)
    * `total_disc` (Label: "total_disc", Type: text, Editable: true)
    * `total_scheme` (Label: "total_scheme", Type: text, Editable: true)
    * `grand_total` (Label: "grand_total", Type: text, Editable: true)
    * `remarks` (Label: "remarks", Type: text, Editable: true)
    * `created_by` (Label: "created_by", Type: text, Editable: true)
    * `vendor_name` (Label: "vendor_name", Type: text, Editable: false)
    * `customColumn1` (Label: "View PO", Type: iconButton, Editable: false)
    * `customColumn2` (Label: "Create GRN", Type: iconButton, Editable: false)
    * `customColumn3` (Label: "PDF", Type: iconButton, Editable: false)
* **Table: tblGrn**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `vendor_invoice_number` (Label: "vendor_invoice_number", Type: text, Editable: false)
    * `vendor_id` (Label: "vendor_id", Type: text, Editable: false)
    * `purchase_order_id` (Label: "purchase_order_id", Type: text, Editable: false)
    * `vendor_invoice_date` (Label: "vendor_invoice_date", Type: date, Editable: false)
    * `received_date` (Label: "received_date", Type: date, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `grand_total` (Label: "grand_total", Type: text, Editable: false)
    * `paid_amount` (Label: "paid_amount", Type: text, Editable: false)
    * `dn_amount` (Label: "dn_amount", Type: text, Editable: false)
    * `balance` (Label: "balance", Type: text, Editable: false)
    * `vendor_name` (Label: "vendor_name", Type: text, Editable: false)
    * `po_number` (Label: "po_number", Type: text, Editable: false)
    * `lines_json` (Label: "lines_json", Type: text, Editable: false)
    * `customColumn1` (Label: "View GRN", Type: iconButton, Editable: false)
    * `customColumn2` (Label: "PDF", Type: iconButton, Editable: false)
    * `vendor_code` (Label: "vendor_code", Type: text, Editable: false)
    * `vendor_contact` (Label: "vendor_contact", Type: text, Editable: false)
    * `vendor_email` (Label: "vendor_email", Type: text, Editable: false)
    * `vendor_gst` (Label: "vendor_gst", Type: text, Editable: false)
    * `vendor_address_1` (Label: "vendor_address_1", Type: text, Editable: false)
    * `vendor_address_2` (Label: "vendor_address_2", Type: text, Editable: false)
    * `vendor_district` (Label: "vendor_district", Type: text, Editable: false)
    * `vendor_state` (Label: "vendor_state", Type: text, Editable: false)
    * `vendor_pan` (Label: "vendor_pan", Type: text, Editable: false)
    * `total_qty` (Label: "total_qty", Type: text, Editable: false)
    * `total_taxable` (Label: "total_taxable", Type: text, Editable: false)
    * `total_tax_amount` (Label: "total_tax_amount", Type: text, Editable: false)
    * `vendor_city` (Label: "vendor_city", Type: text, Editable: false)
    * `vendor_pin` (Label: "vendor_pin", Type: text, Editable: false)
* **Table: poTable**
  * Server-side Pagination: `false`
  * Columns:
    * `S_No` (Label: "S.No", Type: number, Editable: false)
    * `EAN_Code` (Label: "EAN Code", Type: text, Editable: false)
    * `Item_Name` (Label: "Item Name", Type: text, Editable: false)
    * `MRP` (Label: "MRP", Type: number, Editable: false)
    * `Price` (Label: "Price", Type: number, Editable: false)
    * `Qty` (Label: "Qty", Type: number, Editable: true)
    * `Sch` (Label: "Sch", Type: number, Editable: true)
    * `Disc__` (Label: "Disc %", Type: number, Editable: true)
    * `GST__` (Label: "GST %", Type: number, Editable: false)
    * `Gross__` (Label: "Gross $", Type: number, Editable: false)
    * `Disc___` (Label: "Disc. $", Type: number, Editable: false)
    * `Taxable__` (Label: "Taxable $", Type: number, Editable: false)
    * `GST__1` (Label: "GST $", Type: number, Editable: false)
    * `Net__` (Label: "Net $", Type: number, Editable: false)
    * `_product_id` (Label: "_product_id", Type: text, Editable: false)
    * `Stock` (Label: "Stock", Type: number, Editable: false)
* **Table: tblViewLines**
  * Server-side Pagination: `false`
  * Columns:
    * `_product_id` (Label: "_product_id", Type: number, Editable: false)
    * `Item_Name` (Label: "Item Name", Type: text, Editable: false)
    * `Ean_code` (Label: "Ean code", Type: text, Editable: false)
    * `MRP` (Label: "MRP", Type: number, Editable: false)
    * `Qty` (Label: "Qty", Type: number, Editable: false)
    * `Price` (Label: "Price", Type: number, Editable: false)
    * `Gross` (Label: "Gross", Type: number, Editable: false)
    * `Sch` (Label: "Sch", Type: number, Editable: false)
    * `Disc__` (Label: "Disc %", Type: number, Editable: false)
    * `Taxable` (Label: "Taxable", Type: number, Editable: false)
    * `GST__` (Label: "GST $", Type: number, Editable: false)
    * `Net__` (Label: "Net $", Type: number, Editable: false)
    * `Batch_No` (Label: "Batch No", Type: text, Editable: false)
    * `Expiry` (Label: "Expiry", Type: date, Editable: false)
    * `Tax__` (Label: "Tax %", Type: number, Editable: false)
    * `Tax_Name` (Label: "Tax Name", Type: text, Editable: false)
    * `Disc_Amt` (Label: "Disc Amt", Type: number, Editable: false)
* **Table: TableGrnSummary**
  * Server-side Pagination: `false`
  * Columns:
    * `PARTICULARS` (Label: "PARTICULARS", Type: text, Editable: false)
    * `Pcs` (Label: "Pcs", Type: number, Editable: false)
    * `Gross` (Label: "Gross", Type: number, Editable: false)
    * `Sch` (Label: "Sch", Type: number, Editable: false)
    * `Disc` (Label: "Disc", Type: number, Editable: false)
    * `Taxable` (Label: "Taxable", Type: number, Editable: false)
    * `Tax` (Label: "Tax", Type: number, Editable: false)
    * `Net` (Label: "Net", Type: number, Editable: false)
* **Table: GRNTable**
  * Server-side Pagination: `false`
  * Columns:
    * `S_No` (Label: "S.No", Type: number, Editable: false)
    * `EAN_Code` (Label: "EAN Code", Type: text, Editable: false)
    * `Item_Name` (Label: "Item Name", Type: text, Editable: false)
    * `MRP` (Label: "MRP", Type: number, Editable: false)
    * `Price` (Label: "Price", Type: number, Editable: false)
    * `Qty` (Label: "Qty", Type: number, Editable: true)
    * `Sch` (Label: "Sch", Type: number, Editable: true)
    * `Disc__` (Label: "Disc %", Type: number, Editable: true)
    * `GST__` (Label: "GST %", Type: number, Editable: false)
    * `Gross__` (Label: "Gross $", Type: number, Editable: false)
    * `Disc___` (Label: "Disc. $", Type: number, Editable: false)
    * `Taxable__` (Label: "Taxable $", Type: number, Editable: false)
    * `GST__1` (Label: "GST $", Type: number, Editable: false)
    * `Net__` (Label: "Net $", Type: number, Editable: false)
    * `Batch_No` (Label: "Batch No", Type: text, Editable: true)
    * `Expiry` (Label: "Expiry", Type: date, Editable: true)
    * `_product_id` (Label: "_product_id", Type: text, Editable: false)
* **Table: Table4**
  * Server-side Pagination: `false`
  * Columns:
    * `PARTICULARS` (Label: "PARTICULARS", Type: text, Editable: false)
    * `Pcs` (Label: "Pcs", Type: number, Editable: false)
    * `Gross` (Label: "Gross", Type: number, Editable: false)
    * `Sch` (Label: "Sch", Type: number, Editable: false)
    * `Disc` (Label: "Disc", Type: number, Editable: false)
    * `Taxable` (Label: "Taxable", Type: number, Editable: false)
    * `Tax` (Label: "Tax", Type: number, Editable: false)
    * `Net` (Label: "Net", Type: number, Editable: false)
* **Table: tblPendingBills**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `vendor_invoice_number` (Label: "vendor_invoice_number", Type: text, Editable: false)
    * `vendor_id` (Label: "vendor_id", Type: text, Editable: false)
    * `purchase_order_id` (Label: "purchase_order_id", Type: text, Editable: false)
    * `vendor_invoice_date` (Label: "vendor_invoice_date", Type: date, Editable: false)
    * `received_date` (Label: "received_date", Type: date, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `grand_total` (Label: "grand_total", Type: text, Editable: false)
    * `paid_amount` (Label: "paid_amount", Type: text, Editable: false)
    * `dn_amount` (Label: "dn_amount", Type: text, Editable: false)
    * `balance` (Label: "balance", Type: text, Editable: false)
    * `vendor_name` (Label: "vendor_name", Type: text, Editable: false)
    * `po_number` (Label: "po_number", Type: text, Editable: false)
    * `lines_json` (Label: "lines_json", Type: text, Editable: false)
    * `AR_Days` (Label: "AR Days", Type: number, Editable: false)

### 4. Dropdowns & Inputs
* **Select: vendorDropdown**
  * OnChange Event: `"{{PopulateProductsTableByVendors.populateForVendor(vendorDropdown.selectedOptionValue);}}"`
* **Select: vendorDropdownGRN**
  * OnChange Event: `"{{vendorSelectJS.onVendorSelect();}}"`
* **Select: ChoosePo**
  * OnChange Event: `"{{JSPoOptionChange.onPOSelected();}}"`

---

## Page: Vendor

### 1. JS Objects & Custom Functions
* **savePaymentJS**
* **Vendor_Logic**
* **getVendorPendingBills**
* **Payments_Logic**
* **JSObjectState**
* **Ledger_Logic**
* **Profile_Logic**
* **Location_Data**
* **Global_Assets**
* **Vendor_Assets**

### 2. Queries & Data Bindings
* **initializeState** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getFilteredPendingBills** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **viewVendorProfile** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **preparePayment** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **apiGetAddresses** [undefined] [DS: RenderCloud] -> `GET /api/vendors/{{ tblVendors.triggeredRow.id}}/addresses`
* **apiGetBank** [undefined] [DS: RenderCloud] -> `GET /api/master/banks`
* **getBankAccounts** [undefined] [DS: RenderCloud] -> `GET /api/bank-accounts`
* **Vendors** [undefined] [DS: RenderCloud] -> `GET /api/vendors`
* **getvendoraddress** [undefined] [DS: RenderCloud] -> `GET /api/master/vendor-addresses`
* **getVendorDebitNotes** [undefined] [DS: RenderCloud] -> `GET /api/debit-notes/vendor/{{ appsmith.store.selectedVendor.id}}`
* **getGRNList** [undefined] [DS: RenderCloud] -> `GET /api/purchase-invoices`
* **q_getUnconsumedDebits** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/bank/unconsumed-debits`
* **getVendorLedger** [undefined] [DS: RenderCloud] -> `GET /api/vendor-payments/ledger/{{ appsmith.store.selectedVendor.id}}`
* **getDebitNoteLines** [undefined] [DS: RenderCloud] -> `GET /api/debit-notes/{{ debiteNotetbl.selectedRow.id }}/items`
* **apiGetVendor** [undefined] [DS: RenderCloud] -> `GET /api/vendors/{{ tblVendors.triggeredRow.id}}`
* **startEditing** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **stopEditing** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **apiUpdateVendor** [undefined] [DS: RenderCloud] -> `PUT /api/vendors/{{ tblVendors.selectedRow.id }}`
* **getVendorLedgerData** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **apiMakePayment** [undefined] [DS: RenderCloud] -> `POST /api/vendor-payments`
* **submitPayment** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getStates** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getDistricts** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **apiAddAddress** [undefined] [DS: RenderCloud] -> `POST /api/vendors/{{ tblVendors.triggeredRow.id }}/addresses`
* **apiCreateVendor** [undefined] [DS: RenderCloud] -> `POST /api/vendors`
* **getDoc** [undefined] [DS: RenderCloud] -> `GET /api/documents/all-sequences`
* **getLogo** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getVendorPaymentHistory** [undefined] [DS: RenderCloud] -> `GET /api/vendor-payments/history/{{tblVendors.triggeredRow.id}}`
* **getVendorPaymentSlipDetails** [undefined] [DS: RenderCloud] -> `GET /api/vendor-payments/{{tblVendorPayments.triggeredRow.id}}/slip-details`
* **previewPaymentSlip** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **fetch_invoices_api** [undefined] [DS: RenderCloud] -> `GET /api/purchase-invoices/aging`

### 3. Data Tables & Interactive Grid Rules
* **Table: Table2**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `vendor_id` (Label: "vendor_id", Type: text, Editable: false)
    * `address_type_id` (Label: "address_type_id", Type: text, Editable: false)
    * `address_line` (Label: "address_line", Type: text, Editable: false)
    * `coordinates` (Label: "coordinates", Type: text, Editable: false)
    * `area` (Label: "area", Type: text, Editable: false)
    * `district` (Label: "district", Type: text, Editable: false)
    * `city` (Label: "city", Type: text, Editable: false)
    * `state_code` (Label: "state_code", Type: text, Editable: false)
    * `pin_code` (Label: "pin_code", Type: text, Editable: false)
    * `is_default` (Label: "is_default", Type: checkbox, Editable: false)
    * `is_active` (Label: "is_active", Type: checkbox, Editable: false)
* **Table: tblPendingBills**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `vendor_invoice_number` (Label: "vendor_invoice_number", Type: text, Editable: false)
    * `vendor_id` (Label: "vendor_id", Type: text, Editable: false)
    * `purchase_order_id` (Label: "purchase_order_id", Type: text, Editable: false)
    * `vendor_invoice_date` (Label: "vendor_invoice_date", Type: date, Editable: false)
    * `received_date` (Label: "received_date", Type: date, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `grand_total` (Label: "grand_total", Type: text, Editable: false)
    * `paid_amount` (Label: "paid_amount", Type: text, Editable: false)
    * `dn_amount` (Label: "dn_amount", Type: text, Editable: false)
    * `balance` (Label: "balance", Type: text, Editable: false)
    * `vendor_name` (Label: "vendor_name", Type: text, Editable: false)
    * `po_number` (Label: "po_number", Type: text, Editable: false)
    * `lines_json` (Label: "lines_json", Type: text, Editable: false)
    * `AR_Days` (Label: "AR Days", Type: number, Editable: false)
    * `vendor_code` (Label: "vendor_code", Type: text, Editable: false)
    * `vendor_contact` (Label: "vendor_contact", Type: text, Editable: false)
    * `vendor_email` (Label: "vendor_email", Type: text, Editable: false)
    * `vendor_gst` (Label: "vendor_gst", Type: text, Editable: false)
    * `vendor_address_1` (Label: "vendor_address_1", Type: text, Editable: false)
    * `vendor_address_2` (Label: "vendor_address_2", Type: text, Editable: false)
    * `vendor_district` (Label: "vendor_district", Type: text, Editable: false)
    * `vendor_city` (Label: "vendor_city", Type: text, Editable: false)
    * `vendor_state` (Label: "vendor_state", Type: text, Editable: false)
    * `vendor_pin` (Label: "vendor_pin", Type: text, Editable: false)
    * `vendor_pan` (Label: "vendor_pan", Type: text, Editable: false)
    * `total_qty` (Label: "total_qty", Type: text, Editable: false)
    * `total_taxable` (Label: "total_taxable", Type: text, Editable: false)
    * `total_tax_amount` (Label: "total_tax_amount", Type: text, Editable: false)
* **Table: Table1**
  * Server-side Pagination: `false`
  * Columns:
    * `net_change` (Label: "net_change", Type: number, Editable: false)
    * `running_balance` (Label: "running_balance", Type: number, Editable: false)
    * `id` (Label: "id", Type: text, Editable: false)
    * `vendor_id` (Label: "vendor_id", Type: text, Editable: false)
    * `date` (Label: "date", Type: date, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `type` (Label: "type", Type: text, Editable: false)
    * `reference_number` (Label: "reference_number", Type: text, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
    * `credit_amount` (Label: "credit_amount", Type: text, Editable: false)
    * `debit_amount` (Label: "debit_amount", Type: text, Editable: false)
* **Table: tblVendorPayments**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `payment_number` (Label: "payment_number", Type: text, Editable: false)
    * `payment_date` (Label: "payment_date", Type: date, Editable: false)
    * `amount` (Label: "amount", Type: text, Editable: false)
    * `payment_mode` (Label: "payment_mode", Type: text, Editable: false)
    * `transaction_ref` (Label: "transaction_ref", Type: text, Editable: false)
    * `remarks` (Label: "remarks", Type: text, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
* **Table: Table4**
  * Server-side Pagination: `false`
  * Columns:
    * `invoice_date` (Label: "invoice_date", Type: date, Editable: false)
    * `bill_no_vendor` (Label: "bill_no_vendor", Type: text, Editable: false)
    * `our_series` (Label: "our_series", Type: text, Editable: false)
    * `bill_amount` (Label: "bill_amount", Type: text, Editable: false)
    * `amount_paid` (Label: "amount_paid", Type: text, Editable: false)
* **Table: tblVendors**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `vendor_code` (Label: "vendor_code", Type: text, Editable: false)
    * `vendor_name` (Label: "vendor_name", Type: text, Editable: false)
    * `contact_person` (Label: "contact_person", Type: text, Editable: false)
    * `contact_no` (Label: "contact_no", Type: button, Editable: false)
    * `contact_no_2` (Label: "contact_no_2", Type: iconButton, Editable: false)
    * `email` (Label: "email", Type: text, Editable: false)
    * `gst` (Label: "gst", Type: text, Editable: false)
    * `branch_id` (Label: "branch_id", Type: text, Editable: false)
    * `is_active` (Label: "is_active", Type: checkbox, Editable: false)
    * `vendor_address_id` (Label: "vendor_address_id", Type: text, Editable: false)
    * `pan` (Label: "pan", Type: text, Editable: false)
    * `address_line1` (Label: "address_line1", Type: text, Editable: false)
    * `address_line2` (Label: "address_line2", Type: text, Editable: false)
    * `state` (Label: "state", Type: text, Editable: false)
    * `district` (Label: "district", Type: text, Editable: false)
    * `bank_name` (Label: "bank_name", Type: text, Editable: false)
    * `bank_account_no` (Label: "bank_account_no", Type: text, Editable: false)
    * `bank_ifsc` (Label: "bank_ifsc", Type: text, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
    * `credit_limit_amount` (Label: "credit_limit_amount", Type: text, Editable: false)
    * `credit_period_days` (Label: "credit_period_days", Type: number, Editable: false)
* **Table: Table5**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `vendor_invoice_number` (Label: "vendor_invoice_number", Type: text, Editable: false)
    * `bill_date` (Label: "bill_date", Type: date, Editable: false)
    * `received_date` (Label: "received_date", Type: date, Editable: false)
    * `vendor_id` (Label: "vendor_id", Type: text, Editable: false)
    * `vendor_name` (Label: "vendor_name", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `bill_amount` (Label: "bill_amount", Type: text, Editable: false)
    * `paid_amount` (Label: "paid_amount", Type: text, Editable: false)
    * `debit_note_amount` (Label: "debit_note_amount", Type: text, Editable: false)
    * `balance_amount` (Label: "balance_amount", Type: text, Editable: false)
    * `days_since_received` (Label: "days_since_received", Type: text, Editable: false)
    * `days_since_bill_date` (Label: "days_since_bill_date", Type: text, Editable: false)

### 4. Dropdowns & Inputs
* **Select: txtBankName**
* **Select: payMode**
* **Select: selPaymentBank**
* **Select: payChqBank**
* **Select: selBankRefVendor**
  * OnChange Event: `"{{}}"`
* **Select: selNewState**
* **Select: selNewDistrict**
* **Select: inpNewVendorState**
* **Select: inpNewVendorDistrict**
* **Select: inpNewVendorBankName**

---

## Page: Debit Notes

### 1. JS Objects & Custom Functions
* **DebitNote_Logic**
* **DebitNote_LogicPopulateLines**
* **DebitNoteTableEdit**
* **CreateDebitNoteJS**
* **RStoDN**
* **PDFUtils**
* **Global_Assets**
* **JSObject1**
* **JSObject2**
* **JS_Delete_Lines**

### 2. Queries & Data Bindings
* **getDebitNotes** [undefined] [DS: RenderCloud] -> `GET /api/debit-notes`
* **getDebitNoteLines** [undefined] [DS: RenderCloud] -> `GET /api/debit-notes/{{debiteNotetbl.triggeredRow.id}}/items`
* **getDNTaxSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **Products** [undefined] [DS: RenderCloud] -> `GET /api/products`
* **Vendors** [undefined] [DS: RenderCloud] -> `GET /api/vendors`
* **getDocNo** [undefined] [DS: RenderCloud] -> `GET /api/documents/all-sequences`
* **getPendingBills** [undefined] [DS: RenderCloud] -> `GET /api/purchase-invoices`
* **apiCreateDebitNote** [undefined] [DS: RenderCloud] -> `POST /api/debit-notes`
* **createDebitNote** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getBatches** [undefined] [DS: RenderCloud] -> `GET /api/stock/adjust/batches/{{tblDebitLines.selectedRow._product_id}}`
* **apiConvertRSToDN** [undefined] [DS: RenderCloud] -> `POST /api/debit-notes/{{debiteNotetbl.triggeredRow.id}}/convert`
* **convertToDN** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getLogo** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getBatch** [undefined] [DS: RenderCloud] -> `GET /api/products/batches`
* **ReverseDebitNote** [undefined] [DS: RenderCloud] -> `POST /api/debit-notes/{{debiteNotetbl.triggeredRow.id}}/reverse`
* **getMe** [undefined] [DS: RenderCloud] -> `GET /api/employees/profile`
* **duplicateRow** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **updateDebitRow** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **toWords** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **populateDebitLines** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **previewDebitNote** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getDNTaxSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **_drawSimpleBox** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **populateDebitLines** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **deleteSelectedLines** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **keepOnlySelectedLines** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **deleteSingleLine** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `

### 3. Data Tables & Interactive Grid Rules
* **Table: debiteNotetbl**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `vendor_id` (Label: "vendor_id", Type: text, Editable: false)
    * `linked_invoice_id` (Label: "linked_invoice_id", Type: text, Editable: false)
    * `debit_note_number` (Label: "debit_note_number", Type: text, Editable: false)
    * `debit_note_date` (Label: "debit_note_date", Type: date, Editable: false)
    * `amount` (Label: "amount", Type: text, Editable: false)
    * `reason` (Label: "reason", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `taxable_amount` (Label: "taxable_amount", Type: text, Editable: false)
    * `tax_amount` (Label: "tax_amount", Type: text, Editable: false)
    * `cgst_amount` (Label: "cgst_amount", Type: text, Editable: false)
    * `sgst_amount` (Label: "sgst_amount", Type: text, Editable: false)
    * `igst_amount` (Label: "igst_amount", Type: text, Editable: false)
    * `place_of_supply` (Label: "place_of_supply", Type: text, Editable: false)
    * `vendor_name` (Label: "vendor_name", Type: text, Editable: false)
    * `linked_invoice_number` (Label: "linked_invoice_number", Type: text, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
    * `note_type` (Label: "note_type", Type: text, Editable: false)
    * `converted_from_rs` (Label: "converted_from_rs", Type: text, Editable: false)
    * `customColumn2` (Label: "PDF", Type: iconButton, Editable: false)
    * `vendor_gst` (Label: "vendor_gst", Type: text, Editable: false)
    * `vendor_contact` (Label: "vendor_contact", Type: text, Editable: false)
    * `vendor_email` (Label: "vendor_email", Type: text, Editable: false)
    * `vendor_address` (Label: "vendor_address", Type: text, Editable: false)
    * `vendor_city` (Label: "vendor_city", Type: text, Editable: false)
    * `vendor_district` (Label: "vendor_district", Type: text, Editable: false)
    * `vendor_state` (Label: "vendor_state", Type: text, Editable: false)
    * `vendor_pin` (Label: "vendor_pin", Type: text, Editable: false)
    * `reversed_at` (Label: "reversed_at", Type: date, Editable: false)
    * `reversed_by_id` (Label: "reversed_by_id", Type: text, Editable: false)
* **Table: Table1**
  * Server-side Pagination: `false`
  * Columns:
    * `S_No` (Label: "S.No", Type: text, Editable: false)
    * `EAN_Code` (Label: "EAN Code", Type: text, Editable: false)
    * `Item_Name` (Label: "Item Name", Type: text, Editable: false)
    * `MRP` (Label: "MRP", Type: text, Editable: false)
    * `Price` (Label: "Price", Type: number, Editable: false)
    * `Qty` (Label: "Qty", Type: text, Editable: false)
    * `Sch` (Label: "Sch", Type: number, Editable: false)
    * `Disc__` (Label: "Disc %", Type: number, Editable: false)
    * `GST__` (Label: "GST %", Type: text, Editable: false)
    * `Gross__` (Label: "Gross $", Type: text, Editable: false)
    * `Disc___` (Label: "Disc. $", Type: number, Editable: false)
    * `Taxable__` (Label: "Taxable $", Type: text, Editable: false)
    * `GST__1` (Label: "GST $", Type: text, Editable: false)
    * `Net__` (Label: "Net $", Type: text, Editable: false)
    * `Batch_No` (Label: "Batch No", Type: text, Editable: false)
    * `_product_id` (Label: "_product_id", Type: text, Editable: false)
    * `product_code` (Label: "product_code", Type: text, Editable: false)
    * `hsn_code` (Label: "hsn_code", Type: text, Editable: false)
    * `Expiry` (Label: "Expiry", Type: text, Editable: false)
* **Table: Table2**
  * Server-side Pagination: `false`
  * Columns:
    * `PARTICULARS` (Label: "PARTICULARS", Type: text, Editable: false)
    * `Pcs` (Label: "Pcs", Type: number, Editable: false)
    * `Gross` (Label: "Gross", Type: number, Editable: false)
    * `Sch` (Label: "Sch", Type: number, Editable: false)
    * `Disc` (Label: "Disc", Type: number, Editable: false)
    * `Taxable` (Label: "Taxable", Type: number, Editable: false)
    * `Tax` (Label: "Tax", Type: number, Editable: false)
    * `Net` (Label: "Net", Type: number, Editable: false)
* **Table: tblDebitLines**
  * Server-side Pagination: `false`
  * Columns:
    * `S_No` (Label: "S.No", Type: number, Editable: false)
    * `EAN_Code` (Label: "EAN Code", Type: text, Editable: false)
    * `Item_Name` (Label: "Item Name", Type: text, Editable: false)
    * `MRP` (Label: "MRP", Type: number, Editable: false)
    * `Price` (Label: "Price", Type: number, Editable: false)
    * `Qty` (Label: "Qty", Type: number, Editable: true)
    * `Sch` (Label: "Sch", Type: number, Editable: true)
    * `Disc__` (Label: "Disc %", Type: number, Editable: true)
    * `GST__` (Label: "GST %", Type: number, Editable: false)
    * `Gross__` (Label: "Gross $", Type: number, Editable: false)
    * `Disc___` (Label: "Disc. $", Type: number, Editable: false)
    * `Taxable__` (Label: "Taxable $", Type: number, Editable: false)
    * `GST__1` (Label: "GST $", Type: number, Editable: false)
    * `Net__` (Label: "Net $", Type: number, Editable: false)
    * `_product_id` (Label: "_product_id", Type: text, Editable: false)
    * `customColumn1` (Label: "Duplicate", Type: iconButton, Editable: false)
    * `_row_id` (Label: "_row_id", Type: text, Editable: false)
    * `Reason` (Label: "Reason", Type: text, Editable: false)
    * `Batch_No` (Label: "Batch No", Type: select, Editable: true)
    * `Expiry` (Label: "Expiry", Type: date, Editable: false)
    * `_batches` (Label: "_batches", Type: text, Editable: false)

### 4. Dropdowns & Inputs
* **Select: selLinkedBill**
* **Select: SelectVendor**
  * OnChange Event: `"{{Products.run().then(() => {\n  DebitNote_LogicPopulateLines.populateDebitLines();\n});}}"`
* **Select: selNoteType**

---

## Page: Items

### 1. JS Objects & Custom Functions
* **Brand_Utils**
* **ProductImportUtils**
* **The_Smart_Upload**
* **AdjustmentUtils**
* **JSObject1**
* **BrandPDF**

### 2. Queries & Data Bindings
* **Products** [undefined] [DS: RenderCloud] -> `GET /api/products`
* **getGroupedBrands** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getBrands** [undefined] [DS: RenderCloud] -> `GET /api/master/brands`
* **apiUpdateProduct** [undefined] [DS: RenderCloud] -> `PUT /api/products/{{tblProducts.triggeredRow.id}}`
* **getCategories** [undefined] [DS: RenderCloud] -> `GET /api/master/categories`
* **getTaxes** [undefined] [DS: RenderCloud] -> `GET /api/master/taxes`
* **getHSN** [undefined] [DS: RenderCloud] -> `GET /api/master/hsn`
* **apiCreateProduct** [undefined] [DS: RenderCloud] -> `POST /api/products`
* **getTemplateData** [undefined] [DS: RenderCloud] -> `GET /api/products/template-data`
* **downloadTemplate** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **downloadErrors** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **submitValidData** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **apiImportProducts** [undefined] [DS: RenderCloud] -> `POST /api/products/import`
* **processUpload** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **apiBulkUpdateProducts** [undefined] [DS: RenderCloud] -> `POST /api/products/bulk-update`
* **apiGetBatches** [undefined] [DS: RenderCloud] -> `GET /api/stock/adjust/batches/{{ selAdjProduct.selectedOptionValue }}`
* **apiCreateStockAdjustment** [undefined] [DS: RenderCloud] -> `POST /api/stock/adjust`
* **submitToDatabase** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **addAdjustment** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **deleteRow** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getAdjustementHistory** [undefined] [DS: RenderCloud] -> `GET /api/stock/adjust`
* **getMe** [undefined] [DS: RenderCloud] -> `GET /api/employees/profile`
* **apiDeleteAdjustment** [undefined] [DS: RenderCloud] -> `DELETE /api/stock/adjust/{{tblStockAdjHistory.triggeredRow.id}}`
* **getInventoryBatches** [undefined] [DS: RenderCloud] -> `GET /api/products/{{tblProducts.triggeredRow.id}}/batches`
* **UpdateBatchAPI** [undefined] [DS: RenderCloud] -> `PUT /api/products/batches/{{tblBatches.triggeredRow.id}}`
* **productLedger** [undefined] [DS: RenderCloud] -> `GET /api/inventory/ledger/{{tblProducts.triggeredRow.id}}`
* **getProductProfile** [undefined] [DS: RenderCloud] -> `GET /api/analytics/products/{{tblProducts.triggeredRow.id}}/profile`
* **Brand_History** [undefined] [DS: RenderCloud] -> `GET /api/analytics/brands/{{List1.triggeredItem.id}}/history`
* **processBulkUpdate** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **pushToWidget** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **myFun2** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **myFun1** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **generate** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **BulkUpdateStatus** [undefined] [DS: RenderCloud] -> `POST /api/products/bulk-status`

### 3. Data Tables & Interactive Grid Rules
* **Table: tblProducts**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `vendor_id` (Label: "vendor_id", Type: text, Editable: false)
    * `brand_id` (Label: "brand_id", Type: text, Editable: false)
    * `category_id` (Label: "category_id", Type: text, Editable: false)
    * `product_code` (Label: "product_code", Type: text, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `ean_code` (Label: "ean_code", Type: text, Editable: false)
    * `hsn_id` (Label: "hsn_id", Type: text, Editable: false)
    * `mrp` (Label: "mrp", Type: currency, Editable: false)
    * `tax_id` (Label: "tax_id", Type: text, Editable: false)
    * `purchase_rate` (Label: "purchase_rate", Type: text, Editable: false)
    * `distributor_rate` (Label: "distributor_rate", Type: currency, Editable: false)
    * `wholesale_rate` (Label: "wholesale_rate", Type: text, Editable: false)
    * `dealer_rate` (Label: "dealer_rate", Type: text, Editable: false)
    * `retail_rate` (Label: "retail_rate", Type: text, Editable: false)
    * `is_active` (Label: "is_active", Type: checkbox, Editable: false)
    * `current_stock` (Label: "current_stock", Type: text, Editable: false)
    * `damaged_stock` (Label: "damaged_stock", Type: text, Editable: false)
    * `case_quantity` (Label: "case_quantity", Type: number, Editable: false)
    * `uom` (Label: "uom", Type: text, Editable: false)
    * `model_number` (Label: "model_number", Type: text, Editable: false)
    * `min_stock_level` (Label: "min_stock_level", Type: number, Editable: false)
    * `box_length_cm` (Label: "box_length_cm", Type: text, Editable: false)
    * `box_width_cm` (Label: "box_width_cm", Type: text, Editable: false)
    * `box_height_cm` (Label: "box_height_cm", Type: text, Editable: false)
    * `weight_kg` (Label: "weight_kg", Type: text, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
    * `stock_damage` (Label: "stock_damage", Type: text, Editable: false)
    * `stock_expiry` (Label: "stock_expiry", Type: text, Editable: false)
    * `stock_value_cost` (Label: "stock_value_cost", Type: text, Editable: false)
    * `stock_value_gross` (Label: "stock_value_gross", Type: text, Editable: false)
    * `stock_value_total_bought` (Label: "stock_value_total_bought", Type: text, Editable: false)
    * `brand_name` (Label: "brand_name", Type: text, Editable: false)
    * `category_name` (Label: "category_name", Type: text, Editable: false)
    * `tax_name` (Label: "tax_name", Type: text, Editable: false)
    * `tax_percentage` (Label: "tax_percentage", Type: text, Editable: false)
    * `hsn_code` (Label: "hsn_code", Type: text, Editable: false)
    * `total_units_bought` (Label: "total_units_bought", Type: text, Editable: false)
    * `total_units_sold` (Label: "total_units_sold", Type: text, Editable: false)
    * `sales_value_taxable` (Label: "sales_value_taxable", Type: text, Editable: false)
    * `total_cogs_value` (Label: "total_cogs_value", Type: text, Editable: false)
    * `margin_amount` (Label: "margin_amount", Type: currency, Editable: false)
    * `margin_percentage` (Label: "margin_percentage", Type: number, Editable: false)
    * `total_units_returned` (Label: "total_units_returned", Type: text, Editable: false)
    * `total_units_adjusted` (Label: "total_units_adjusted", Type: text, Editable: false)
    * `in_transit_qty` (Label: "in_transit_qty", Type: text, Editable: false)
    * `last_sold_date` (Label: "last_sold_date", Type: date, Editable: false)
    * `last_purchased_date` (Label: "last_purchased_date", Type: date, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
    * `customColumn2` (Label: "Dash", Type: iconButton, Editable: false)
* **Table: tblBatches**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `batch_code` (Label: "batch_code", Type: text, Editable: false)
    * `mrp` (Label: "mrp", Type: text, Editable: false)
    * `expiry_date` (Label: "expiry_date", Type: date, Editable: false)
    * `quantity_remaining` (Label: "quantity_remaining", Type: text, Editable: false)
    * `purchase_rate` (Label: "purchase_rate", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `distributor_rate` (Label: "distributor_rate", Type: text, Editable: false)
    * `wholesale_rate` (Label: "wholesale_rate", Type: text, Editable: false)
    * `dealer_rate` (Label: "dealer_rate", Type: text, Editable: false)
    * `retail_rate` (Label: "retail_rate", Type: text, Editable: false)
    * `customColumn1` (Label: "Edit", Type: iconButton, Editable: false)
    * `distributor_margin_pct` (Label: "distributor_margin_pct", Type: text, Editable: false)
    * `wholesale_margin_pct` (Label: "wholesale_margin_pct", Type: text, Editable: false)
    * `dealer_margin_pct` (Label: "dealer_margin_pct", Type: text, Editable: false)
    * `retail_margin_pct` (Label: "retail_margin_pct", Type: text, Editable: false)
* **Table: Table2**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `date` (Label: "date", Type: date, Editable: false)
    * `transaction_type` (Label: "transaction_type", Type: text, Editable: false)
    * `quantity_change` (Label: "quantity_change", Type: text, Editable: false)
    * `reference_id` (Label: "reference_id", Type: text, Editable: false)
    * `reference_type` (Label: "reference_type", Type: text, Editable: false)
    * `notes` (Label: "notes", Type: text, Editable: false)
    * `batch_code` (Label: "batch_code", Type: text, Editable: false)
    * `reference_number` (Label: "reference_number", Type: text, Editable: false)
    * `running_balance` (Label: "running_balance", Type: number, Editable: false)
* **Table: tblErrors**
  * Server-side Pagination: `false`
  * Columns:
    * `Error_Details` (Label: "Error_Details", Type: text, Editable: false)
    * `Row_Number` (Label: "Row_Number", Type: number, Editable: false)
    * `name` (Label: "name", Type: text, Editable: false)
    * `data` (Label: "data", Type: text, Editable: false)
* **Table: tblValidData**
  * Server-side Pagination: `false`
  * Columns:
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `brand_id` (Label: "brand_id", Type: text, Editable: false)
    * `category_id` (Label: "category_id", Type: text, Editable: false)
    * `vendor_id` (Label: "vendor_id", Type: text, Editable: false)
    * `hsn_id` (Label: "hsn_id", Type: text, Editable: false)
    * `tax_id` (Label: "tax_id", Type: text, Editable: false)
    * `ean_code` (Label: "ean_code", Type: text, Editable: false)
    * `mrp` (Label: "mrp", Type: number, Editable: false)
    * `purchase_rate` (Label: "purchase_rate", Type: number, Editable: false)
    * `distributor_rate` (Label: "distributor_rate", Type: number, Editable: false)
    * `wholesale_rate` (Label: "wholesale_rate", Type: number, Editable: false)
    * `dealer_rate` (Label: "dealer_rate", Type: number, Editable: false)
    * `retail_rate` (Label: "retail_rate", Type: number, Editable: false)
    * `case_quantity` (Label: "case_quantity", Type: number, Editable: false)
    * `uom` (Label: "uom", Type: text, Editable: false)
    * `model_number` (Label: "model_number", Type: text, Editable: false)
    * `min_stock_level` (Label: "min_stock_level", Type: number, Editable: false)
    * `box_length_cm` (Label: "box_length_cm", Type: number, Editable: false)
    * `box_width_cm` (Label: "box_width_cm", Type: number, Editable: false)
    * `box_height_cm` (Label: "box_height_cm", Type: number, Editable: false)
    * `weight_kg` (Label: "weight_kg", Type: number, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
* **Table: Table1**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: number, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `brand_id` (Label: "brand_id", Type: text, Editable: false)
    * `category_id` (Label: "category_id", Type: text, Editable: false)
    * `vendor_id` (Label: "vendor_id", Type: text, Editable: false)
    * `tax_id` (Label: "tax_id", Type: text, Editable: false)
    * `hsn_id` (Label: "hsn_id", Type: number, Editable: false)
    * `ean_code` (Label: "ean_code", Type: text, Editable: false)
    * `mrp` (Label: "mrp", Type: number, Editable: false)
    * `purchase_rate` (Label: "purchase_rate", Type: number, Editable: false)
    * `distributor_rate` (Label: "distributor_rate", Type: number, Editable: false)
    * `wholesale_rate` (Label: "wholesale_rate", Type: number, Editable: false)
    * `dealer_rate` (Label: "dealer_rate", Type: number, Editable: false)
    * `retail_rate` (Label: "retail_rate", Type: number, Editable: false)
    * `case_quantity` (Label: "case_quantity", Type: number, Editable: false)
    * `uom` (Label: "uom", Type: text, Editable: false)
    * `model_number` (Label: "model_number", Type: text, Editable: false)
    * `min_stock_level` (Label: "min_stock_level", Type: number, Editable: false)
    * `box_length_cm` (Label: "box_length_cm", Type: text, Editable: false)
    * `box_width_cm` (Label: "box_width_cm", Type: text, Editable: false)
    * `box_height_cm` (Label: "box_height_cm", Type: text, Editable: false)
    * `weight_kg` (Label: "weight_kg", Type: text, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
* **Table: tblAdjustments**
  * Server-side Pagination: `false`
  * Columns:
    * `product_id` (Label: "product_id", Type: text, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `batch_code` (Label: "batch_code", Type: text, Editable: false)
    * `qty` (Label: "qty", Type: number, Editable: false)
    * `reason` (Label: "reason", Type: text, Editable: false)
    * `customColumn1` (Label: "Delete", Type: iconButton, Editable: false)
* **Table: tblStockAdjHistory**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `product_id` (Label: "product_id", Type: text, Editable: false)
    * `qty` (Label: "qty", Type: text, Editable: false)
    * `reason` (Label: "reason", Type: text, Editable: false)
    * `batch_code` (Label: "batch_code", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `created_by` (Label: "created_by", Type: text, Editable: false)
    * `notes` (Label: "notes", Type: text, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `product_code` (Label: "product_code", Type: text, Editable: false)
    * `brand_name` (Label: "brand_name", Type: text, Editable: false)
    * `category_name` (Label: "category_name", Type: text, Editable: false)
    * `date` (Label: "date", Type: date, Editable: false)
    * `created_by_name` (Label: "created_by_name", Type: text, Editable: false)
    * `customColumn1` (Label: "Delete", Type: iconButton, Editable: false)
* **Table: Productstbl**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `vendor_id` (Label: "vendor_id", Type: text, Editable: false)
    * `brand_id` (Label: "brand_id", Type: text, Editable: false)
    * `category_id` (Label: "category_id", Type: text, Editable: false)
    * `product_code` (Label: "product_code", Type: text, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `ean_code` (Label: "ean_code", Type: text, Editable: false)
    * `hsn_id` (Label: "hsn_id", Type: text, Editable: false)
    * `mrp` (Label: "mrp", Type: text, Editable: false)
    * `tax_id` (Label: "tax_id", Type: text, Editable: false)
    * `purchase_rate` (Label: "purchase_rate", Type: text, Editable: false)
    * `distributor_rate` (Label: "distributor_rate", Type: text, Editable: false)
    * `wholesale_rate` (Label: "wholesale_rate", Type: text, Editable: false)
    * `dealer_rate` (Label: "dealer_rate", Type: text, Editable: false)
    * `retail_rate` (Label: "retail_rate", Type: text, Editable: false)
    * `is_active` (Label: "is_active", Type: checkbox, Editable: false)
    * `current_stock` (Label: "current_stock", Type: text, Editable: false)
    * `damaged_stock` (Label: "damaged_stock", Type: text, Editable: false)
    * `case_quantity` (Label: "case_quantity", Type: number, Editable: false)
    * `uom` (Label: "uom", Type: text, Editable: false)
    * `model_number` (Label: "model_number", Type: text, Editable: false)
    * `min_stock_level` (Label: "min_stock_level", Type: number, Editable: false)
    * `box_length_cm` (Label: "box_length_cm", Type: text, Editable: false)
    * `box_width_cm` (Label: "box_width_cm", Type: text, Editable: false)
    * `box_height_cm` (Label: "box_height_cm", Type: text, Editable: false)
    * `weight_kg` (Label: "weight_kg", Type: text, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
    * `stock_damage` (Label: "stock_damage", Type: text, Editable: false)
    * `stock_expiry` (Label: "stock_expiry", Type: text, Editable: false)
    * `stock_value_cost` (Label: "stock_value_cost", Type: text, Editable: false)
    * `stock_value_gross` (Label: "stock_value_gross", Type: text, Editable: false)
    * `stock_value_total_bought` (Label: "stock_value_total_bought", Type: text, Editable: false)
    * `total_units_bought` (Label: "total_units_bought", Type: text, Editable: false)
    * `total_units_sold` (Label: "total_units_sold", Type: text, Editable: false)
    * `sales_value_taxable` (Label: "sales_value_taxable", Type: text, Editable: false)
    * `total_cogs_value` (Label: "total_cogs_value", Type: text, Editable: false)
    * `margin_amount` (Label: "margin_amount", Type: text, Editable: false)
    * `margin_percentage` (Label: "margin_percentage", Type: text, Editable: false)
    * `total_units_returned` (Label: "total_units_returned", Type: text, Editable: false)
    * `total_units_adjusted` (Label: "total_units_adjusted", Type: text, Editable: false)
    * `in_transit_qty` (Label: "in_transit_qty", Type: text, Editable: false)
    * `last_sold_date` (Label: "last_sold_date", Type: date, Editable: false)
    * `last_purchased_date` (Label: "last_purchased_date", Type: date, Editable: false)
    * `brand_name` (Label: "brand_name", Type: text, Editable: false)
    * `category_name` (Label: "category_name", Type: text, Editable: false)
    * `tax_name` (Label: "tax_name", Type: text, Editable: false)
    * `tax_percentage` (Label: "tax_percentage", Type: text, Editable: false)
    * `hsn_code` (Label: "hsn_code", Type: text, Editable: false)

### 4. Dropdowns & Inputs
* **Select: selExportBrand**
* **Select: sltStockFilter**
* **Select: selAdjProduct**
  * OnChange Event: `"{{apiGetBatches.run()}}"`
* **Select: selAdjBatch**
* **Select: selAdjReason**

---

## Page: Sales Order

### 1. JS Objects & Custom Functions
* **JSObject1**
* **Invoice_Actions**
* **Transit_Actions**
* **TransitTableEdit**
* **JSObject2**

### 2. Queries & Data Bindings
* **getSalesOrder** [undefined] [DS: RenderCloud] -> `GET /api/sales-orders`
* **analyzeDemand** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getProducts** [undefined] [DS: RenderCloud] -> `GET /api/products`
* **generateBulkInvoices** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **apiBulkInvoiceGenerate** [undefined] [DS: RenderCloud] -> `POST /api/sales/bulk-invoice-generate`
* **openTransitEntry** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **syncTransitEntry** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getProductBreakup** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `

### 3. Data Tables & Interactive Grid Rules
* **Table: tblAllocation**
  * Server-side Pagination: `false`
  * Columns:
    * `item_id` (Label: "item_id", Type: text, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `demand` (Label: "demand", Type: number, Editable: false)
    * `master_rate` (Label: "master_rate", Type: number, Editable: false)
    * `real_stock` (Label: "real_stock", Type: number, Editable: false)
    * `transit_qty` (Label: "transit_qty", Type: number, Editable: false)
    * `temp_batch` (Label: "temp_batch", Type: text, Editable: false)
    * `total_avail` (Label: "total_avail", Type: number, Editable: false)
    * `shortage` (Label: "shortage", Type: number, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `mrp` (Label: "mrp", Type: number, Editable: false)
    * `distributor_rate` (Label: "distributor_rate", Type: number, Editable: false)
    * `wholesale_rate` (Label: "wholesale_rate", Type: number, Editable: false)
    * `dealer_rate` (Label: "dealer_rate", Type: number, Editable: false)
    * `retail_rate` (Label: "retail_rate", Type: number, Editable: false)
    * `rate` (Label: "rate", Type: number, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
* **Table: tblSalesOrders**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `so_number` (Label: "so_number", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `created_by` (Label: "created_by", Type: text, Editable: false)
    * `order_date` (Label: "order_date", Type: date, Editable: false)
    * `delivery_date` (Label: "delivery_date", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `total_amount` (Label: "total_amount", Type: text, Editable: false)
    * `tax_amount` (Label: "tax_amount", Type: text, Editable: false)
    * `remarks` (Label: "remarks", Type: text, Editable: false)
    * `payment_instruction` (Label: "payment_instruction", Type: text, Editable: false)
    * `special_instruction` (Label: "special_instruction", Type: text, Editable: false)
    * `location_lat` (Label: "location_lat", Type: text, Editable: false)
    * `location_lng` (Label: "location_lng", Type: text, Editable: false)
    * `offline_id` (Label: "offline_id", Type: text, Editable: false)
    * `dse_id` (Label: "dse_id", Type: text, Editable: false)
    * `updated_at` (Label: "updated_at", Type: date, Editable: false)
    * `latitude` (Label: "latitude", Type: text, Editable: false)
    * `longitude` (Label: "longitude", Type: text, Editable: false)
    * `notes` (Label: "notes", Type: text, Editable: false)
    * `sync_id` (Label: "sync_id", Type: text, Editable: false)
    * `report_id` (Label: "report_id", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `route_id` (Label: "route_id", Type: text, Editable: false)
    * `route_name` (Label: "route_name", Type: text, Editable: false)
    * `dse_name` (Label: "dse_name", Type: text, Editable: false)
    * `lines` (Label: "lines", Type: text, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
* **Table: tblTransitEntry**
  * Server-side Pagination: `false`
  * Columns:
    * `item_id` (Label: "item_id", Type: text, Editable: false)
    * `ordered_qty` (Label: "ordered_qty", Type: number, Editable: false)
    * `shortfall_qty` (Label: "shortfall_qty", Type: number, Editable: false)
    * `qty` (Label: "qty", Type: number, Editable: true)
    * `batch_code` (Label: "batch_code", Type: text, Editable: false)
    * `rate` (Label: "rate", Type: number, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
* **Table: Table1**
  * Server-side Pagination: `false`
  * Columns:
    * `product_id` (Label: "product_id", Type: number, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `qty` (Label: "qty", Type: number, Editable: false)
    * `rate` (Label: "rate", Type: number, Editable: false)
    * `amount` (Label: "amount", Type: number, Editable: false)
* **Table: Table2**
  * Server-side Pagination: `false`
  * Columns:
    * `so_number` (Label: "so_number", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `route` (Label: "route", Type: text, Editable: false)
    * `dse_name` (Label: "dse_name", Type: text, Editable: false)
    * `qty` (Label: "qty", Type: number, Editable: false)
    * `rate` (Label: "rate", Type: number, Editable: false)
    * `amount` (Label: "amount", Type: number, Editable: false)

### 4. Dropdowns & Inputs
* None

---

## Page: Invoice

### 1. JS Objects & Custom Functions
* **OpenModal**
* **Invoice_Utils**
* **Invoice_Edit_Utils**
* **Invoice_Utils_Pdf**
* **Global_Assets**
* **Invoice_Bulk_Download**

### 2. Queries & Data Bindings
* **getInvoices** [undefined] [DS: RenderCloud] -> `GET /api/sales/unified`
* **getUnifiedInvoiceDetail** [undefined] [DS: RenderCloud] -> `GET /api/sales/unified/{{appsmith.store.varSelectedInvoice}}`
* **viewInvoice** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **apiUnlockInvoice** [undefined] [DS: RenderCloud] -> `POST /api/sales/invoices/{{appsmith.store.varInvoiceId}}/unlock-for-edit`
* **apiRegenerateInvoice** [undefined] [DS: RenderCloud] -> `POST /api/sales/invoices/regenerate`
* **apiUpdateSalesOrder** [undefined] [DS: RenderCloud] -> `PUT /api/sales/orders/{{appsmith.store.varInvoiceViewData.order_id}}`
* **unlockInvoice** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **removeLine** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **regenerateInvoice** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **syncTableEdits** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getBankDetails** [undefined] [DS: RenderCloud] -> `GET /api/sales/bank-details/3`
* **getSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getLogo** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getInvoiceLines** [undefined] [DS: RenderCloud] -> `GET /api/sales/unified/{{tblSales.triggeredRow.id}}`
* **previewInvoice** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **_drawSimpleBox** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **downloadBulkInvoices** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **onPageLoad** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **previewInvoice** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **_drawSimpleBox** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `

### 3. Data Tables & Interactive Grid Rules
* **Table: tblSales**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `so_number` (Label: "so_number", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `dse_id` (Label: "dse_id", Type: text, Editable: false)
    * `dse_name` (Label: "dse_name", Type: text, Editable: false)
    * `order_date` (Label: "order_date", Type: date, Editable: false)
    * `delivery_date` (Label: "delivery_date", Type: date, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `order_total` (Label: "order_total", Type: text, Editable: false)
    * `order_tax` (Label: "order_tax", Type: text, Editable: false)
    * `remarks` (Label: "remarks", Type: text, Editable: false)
    * `latitude` (Label: "latitude", Type: text, Editable: false)
    * `longitude` (Label: "longitude", Type: text, Editable: false)
    * `invoice_gross_amount` (Label: "invoice_gross_amount", Type: text, Editable: false)
    * `invoice_scheme_amount` (Label: "invoice_scheme_amount", Type: text, Editable: false)
    * `invoice_discount_amount` (Label: "invoice_discount_amount", Type: text, Editable: false)
    * `invoice_taxable_amount` (Label: "invoice_taxable_amount", Type: text, Editable: false)
    * `invoice_gst_amount` (Label: "invoice_gst_amount", Type: text, Editable: false)
    * `invoice_net_amount` (Label: "invoice_net_amount", Type: text, Editable: false)
    * `invoice_id` (Label: "invoice_id", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `invoice_date` (Label: "invoice_date", Type: date, Editable: false)
    * `grand_total` (Label: "grand_total", Type: text, Editable: false)
    * `total_taxable` (Label: "total_taxable", Type: text, Editable: false)
    * `total_cgst` (Label: "total_cgst", Type: text, Editable: false)
    * `total_sgst` (Label: "total_sgst", Type: text, Editable: false)
    * `total_gst` (Label: "total_gst", Type: text, Editable: false)
    * `invoice_status` (Label: "invoice_status", Type: text, Editable: false)
    * `paid_amount` (Label: "paid_amount", Type: text, Editable: false)
    * `balance_amount` (Label: "balance_amount", Type: text, Editable: false)
    * `display_number` (Label: "display_number", Type: text, Editable: false)
    * `display_amount` (Label: "display_amount", Type: text, Editable: false)
    * `document_type` (Label: "document_type", Type: text, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
    * `delivery_status` (Label: "delivery_status", Type: text, Editable: false)
    * `gstin` (Label: "gstin", Type: text, Editable: false)
    * `route` (Label: "route", Type: text, Editable: false)
    * `customer_address` (Label: "customer_address", Type: text, Editable: false)
    * `district` (Label: "district", Type: text, Editable: false)
    * `pin_code` (Label: "pin_code", Type: text, Editable: false)
    * `customColumn2` (Label: "PDF", Type: iconButton, Editable: false)
    * `delivered_in_trip` (Label: "delivered_in_trip", Type: text, Editable: false)
    * `trip_id` (Label: "trip_id", Type: text, Editable: false)
* **Table: Table1**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: number, Editable: false)
    * `product_id` (Label: "product_id", Type: number, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `shipped_qty` (Label: "shipped_qty", Type: number, Editable: false)
    * `rate` (Label: "rate", Type: number, Editable: false)
    * `mrp` (Label: "mrp", Type: number, Editable: false)
    * `gross_amount` (Label: "gross_amount", Type: number, Editable: false)
    * `scheme_amount` (Label: "scheme_amount", Type: number, Editable: false)
    * `discount_percent` (Label: "discount_percent", Type: number, Editable: false)
    * `discount_amount` (Label: "discount_amount", Type: number, Editable: false)
    * `taxable_amount` (Label: "taxable_amount", Type: number, Editable: false)
    * `tax_percent` (Label: "tax_percent", Type: number, Editable: false)
    * `tax_amount` (Label: "tax_amount", Type: number, Editable: false)
    * `amount` (Label: "amount", Type: number, Editable: false)
    * `s_no` (Label: "s_no", Type: number, Editable: false)
    * `product_code` (Label: "product_code", Type: text, Editable: false)
    * `ean_code` (Label: "ean_code", Type: text, Editable: false)
    * `category_name` (Label: "category_name", Type: text, Editable: false)
    * `brand_name` (Label: "brand_name", Type: text, Editable: false)
    * `batch_code` (Label: "batch_code", Type: text, Editable: false)
    * `expiry_date` (Label: "expiry_date", Type: text, Editable: false)
    * `hsn_code` (Label: "hsn_code", Type: text, Editable: false)
    * `tier_applied` (Label: "tier_applied", Type: text, Editable: false)
* **Table: tblSO**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: number, Editable: false)
    * `product_id` (Label: "product_id", Type: number, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `ordered_qty` (Label: "ordered_qty", Type: number, Editable: false)
    * `dispatched_qty` (Label: "dispatched_qty", Type: number, Editable: false)
    * `cancelled_qty` (Label: "cancelled_qty", Type: number, Editable: false)
    * `rate` (Label: "rate", Type: number, Editable: false)
    * `discount_percent` (Label: "discount_percent", Type: number, Editable: false)
    * `tax_percent` (Label: "tax_percent", Type: number, Editable: false)
    * `amount` (Label: "amount", Type: number, Editable: false)
    * `tier_applied` (Label: "tier_applied", Type: text, Editable: false)
* **Table: tblEditSO**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: number, Editable: false)
    * `product_id` (Label: "product_id", Type: number, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `ordered_qty` (Label: "ordered_qty", Type: number, Editable: true)
    * `dispatched_qty` (Label: "dispatched_qty", Type: number, Editable: false)
    * `cancelled_qty` (Label: "cancelled_qty", Type: number, Editable: false)
    * `rate` (Label: "rate", Type: number, Editable: false)
    * `discount_percent` (Label: "discount_percent", Type: number, Editable: false)
    * `tax_percent` (Label: "tax_percent", Type: number, Editable: false)
    * `amount` (Label: "amount", Type: number, Editable: false)
    * `tier_applied` (Label: "tier_applied", Type: text, Editable: false)
    * `customColumn1` (Label: "Delete", Type: iconButton, Editable: false)
* **Table: Table2**
  * Server-side Pagination: `false`
  * Columns:
    * `PARTICULARS` (Label: "PARTICULARS", Type: text, Editable: false)
    * `Pcs` (Label: "Pcs", Type: number, Editable: false)
    * `Gross` (Label: "Gross", Type: text, Editable: false)
    * `Sch` (Label: "Sch", Type: text, Editable: false)
    * `Disc` (Label: "Disc", Type: text, Editable: false)
    * `Taxable` (Label: "Taxable", Type: text, Editable: false)
    * `Tax` (Label: "Tax", Type: text, Editable: false)
    * `Net` (Label: "Net", Type: text, Editable: false)

### 4. Dropdowns & Inputs
* None

---

## Page: Schemes

### 1. JS Objects & Custom Functions
* **Scheme_Utils**
* **Save_Scheme**
* **Combo_Group_Add**
* **Combo_Utils**
* **PriceSlab_Utils**
* **JS_Schemes**
* **JSObject1**
* **Scheme_Reports**
* **DownloadInvoices**
* **Global_Assets**
* **JS_Schemes_New**

### 2. Queries & Data Bindings
* **getSchemes** [undefined] [DS: RenderCloud] -> `GET /api/schemes`
* **getProducts** [undefined] [DS: RenderCloud] -> `GET /api/products`
* **getBrands** [undefined] [DS: RenderCloud] -> `GET /api/products/brands`
* **getCategories** [undefined] [DS: RenderCloud] -> `GET /api/categories`
* **createScheme** [undefined] [DS: RenderCloud] -> `POST /api/schemes`
* **addNewSlab** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **addComboSlab** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **addPriceSlab** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **createScheme** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **updateScheme** [undefined] [DS: RenderCloud] -> `PUT /api/schemes/{{this.params.id}}`
* **addComboProduct** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **enableEdit** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **cancelEdit** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **hydrateUI** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **initView** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **toggleSchemeStatus** [undefined] [DS: RenderCloud] -> `PATCH /api/schemes/{{tblSchemes.triggeredRow.id}}/toggle`
* **getSchemeUsage** [undefined] [DS: RenderCloud] -> `GET /api/schemes/{{SelectScheme.selectedOptionValue}}/usage`
* **saveScheme** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **initCreate** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **onSaveSuccess** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **toggleStatus** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **addComboSlab** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **addNewSlab** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **addComboProduct** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **addPriceSlab** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **resetModal** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getBulkInvoiceLines** [undefined] [DS: RenderCloud] -> `GET /api/sales/invoices/lines-bulk`
* **bulkDownloadInvoices** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getLogo** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getBankDetails** [undefined] [DS: RenderCloud] -> `GET /api/sales/bank-details/3`
* **getUnifiedInvoiceDetail** [undefined] [DS: RenderCloud] -> `GET /api/sales/unified/{{this.params.id}}`
* **downloadSelectedTableInvoices** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **downloadBulkInvoices** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **_drawSimpleBox** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **previewInvoice** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getCustomers** [undefined] [DS: RenderCloud] -> `GET /api/customers`
* **cancelEdit** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **enableEdit** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **initView** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **onSaveSuccess** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **initCreate** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **addFlatMrpSlab** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **addNewSlab** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **addPriceSlab** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **saveScheme** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **addComboSlab** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **toggleStatus** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **addComboProduct** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **resetModal** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **hydrateUI** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **generateReports** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getProductSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getCustomerSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getDSESummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getInvoiceSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getTierSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getProductSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **generateReports** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getDSESummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getInvoiceSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getTierSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getCustomerSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `

### 3. Data Tables & Interactive Grid Rules
* **Table: tblSlabs**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: number, Editable: false)
    * `scheme_type` (Label: "scheme_type", Type: text, Editable: false)
    * `trigger_type` (Label: "trigger_type", Type: text, Editable: false)
    * `trigger_id` (Label: "trigger_id", Type: text, Editable: false)
    * `trigger_name` (Label: "trigger_name", Type: text, Editable: false)
    * `min_qty` (Label: "min_qty", Type: number, Editable: false)
    * `reward_qty` (Label: "reward_qty", Type: number, Editable: false)
    * `tier_level` (Label: "tier_level", Type: number, Editable: false)
    * `is_recursive` (Label: "is_recursive", Type: checkbox, Editable: false)
    * `customColumn1` (Label: "Delete", Type: iconButton, Editable: false)
    * `special_price` (Label: "special_price", Type: text, Editable: false)
    * `targeted_product_ids` (Label: "targeted_product_ids", Type: text, Editable: false)
* **Table: Table2**
  * Server-side Pagination: `false`
  * Columns:
    * `product_id` (Label: "product_id", Type: text, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `product_code` (Label: "product_code", Type: text, Editable: false)
    * `customColumn1` (Label: "Delete", Type: iconButton, Editable: false)
* **Table: tblSchemes**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `scheme_name` (Label: "scheme_name", Type: text, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
    * `start_date` (Label: "start_date", Type: date, Editable: false)
    * `end_date` (Label: "end_date", Type: text, Editable: false)
    * `is_active` (Label: "is_active", Type: button, Editable: true)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `created_by` (Label: "created_by", Type: text, Editable: false)
    * `rule_count` (Label: "rule_count", Type: text, Editable: false)
    * `computed_status` (Label: "computed_status", Type: text, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
    * `rules` (Label: "rules", Type: text, Editable: false)
    * `targeted_customer_ids` (Label: "targeted_customer_ids", Type: text, Editable: false)
* **Table: Table3**
  * Server-side Pagination: `false`
  * Columns:
    * `Invoice_No` (Label: "Invoice No", Type: text, Editable: false)
    * `Customer` (Label: "Customer", Type: text, Editable: false)
    * `Product` (Label: "Product", Type: text, Editable: false)
    * `DSE` (Label: "DSE", Type: text, Editable: false)
    * `Scheme_Given` (Label: "Scheme Given", Type: text, Editable: false)
    * `Free_Qty_Given` (Label: "Free Qty Given", Type: text, Editable: false)
* **Table: tblUsageInvoices**
  * Server-side Pagination: `false`
  * Columns:
    * `invoice_id` (Label: "invoice_id", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `invoice_date` (Label: "invoice_date", Type: date, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `grand_total` (Label: "grand_total", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `id` (Label: "id", Type: text, Editable: false)
  * **OnRowSelected Event**: `"{{getBulkInvoiceLines.run().then(() => {});}}"`

### 4. Dropdowns & Inputs
* **Select: selectTriggerItem**
* **Select: selectFreeProduct**
* **Select: selectChannel**
* **Select: selectComboProduct**
* **Select: selectFreeProductCombo**
* **Select: selectChannelCombo**
* **Select: selectChannelPriceSlab**
* **Select: selectProductPriceSlab**
* **Select: sel_brandFlat**
* **Select: SelectScheme**

---

## Page: Customer

### 1. JS Objects & Custom Functions
* **Location_Data**
* **DownloadLedger_JS**
* **Global_Assets**

### 2. Queries & Data Bindings
* **getCustomers** [undefined] [DS: RenderCloud] -> `GET /api/customers/detailed-list`
* **getChannel** [undefined] [DS: RenderCloud] -> `GET /api/channels`
* **getRoutes** [undefined] [DS: RenderCloud] -> `GET /api/master/routes`
* **getDSEs** [undefined] [DS: RenderCloud] -> `GET /api/employees`
* **getRouteFrequency** [undefined] [DS: RenderCloud] -> `GET /api/master/route-types`
* **getStates** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getDistricts** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **CreateCustomer_API** [undefined] [DS: RenderCloud] -> `POST /api/customers`
* **view_customer_ledger** [undefined] [DS: RenderCloud] -> `GET /api/customers/{{tblCustomers.triggeredRow.id}}/ledger`
* **getSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getLogo** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **_drawSimpleBox** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **previewLedger** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **exportToExcel** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **UpdateCustomer_API** [undefined] [DS: RenderCloud] -> `PUT //api/customers/{{tblCustomers.triggeredRow.id}}`
* **getPendingRequests** [undefined] [DS: RenderCloud] -> `GET /api/verify-requests/pending`
* **approveCustomer** [undefined] [DS: RenderCloud] -> `POST /api/customers/{{ tblPending.triggeredRow.id }}/verify`
* **getMe** [undefined] [DS: RenderCloud] -> `GET /api/employees/profile`
* **approveRequest** [undefined] [DS: RenderCloud] -> `POST /api/verify-requests/{{tblPending.triggeredRow.id}}/approve`
* **rejectRequest** [undefined] [DS: RenderCloud] -> `POST /api/verify-requests/{{tblPending.triggeredRow.id}}/reject`
* **createRealCustomer** [undefined] [DS: RenderCloud] -> `POST /api/customers`
* **apiUpdatePricing** [undefined] [DS: RenderCloud] -> `POST /api/customers/{{tblCustomers.triggeredRow.id}}/pricing`
* **getBrands** [undefined] [DS: RenderCloud] -> `GET /api/master/brands`
* **apiGetPricing** [undefined] [DS: RenderCloud] -> `GET /api/customers/{{tblCustomers.triggeredRow.id}}/pricing`
* **BulkEditCustomersAPI** [undefined] [DS: RenderCloud] -> `POST /api/customers/bulk-edit`

### 3. Data Tables & Interactive Grid Rules
* **Table: tblCustomers**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `customer_phone` (Label: "customer_phone", Type: text, Editable: false)
    * `email` (Label: "email", Type: text, Editable: false)
    * `gstin` (Label: "gstin", Type: text, Editable: false)
    * `pan` (Label: "pan", Type: text, Editable: false)
    * `credit_limit` (Label: "credit_limit", Type: text, Editable: false)
    * `credit_days` (Label: "credit_days", Type: number, Editable: false)
    * `route_id` (Label: "route_id", Type: text, Editable: false)
    * `dse_id` (Label: "dse_id", Type: text, Editable: false)
    * `is_active` (Label: "is_active", Type: checkbox, Editable: false)
    * `channel_id` (Label: "channel_id", Type: text, Editable: false)
    * `customer_code` (Label: "customer_code", Type: text, Editable: false)
    * `route_type_id` (Label: "route_type_id", Type: text, Editable: false)
    * `whatsapp_number` (Label: "whatsapp_number", Type: text, Editable: false)
    * `default_price_tier` (Label: "default_price_tier", Type: text, Editable: false)
    * `latitude` (Label: "latitude", Type: text, Editable: false)
    * `longitude` (Label: "longitude", Type: text, Editable: false)
    * `route_sequence` (Label: "route_sequence", Type: number, Editable: false)
    * `route_name` (Label: "route_name", Type: text, Editable: false)
    * `dse_name` (Label: "dse_name", Type: text, Editable: false)
    * `channel_name` (Label: "channel_name", Type: text, Editable: false)
    * `address_line1` (Label: "address_line1", Type: text, Editable: false)
    * `city` (Label: "city", Type: text, Editable: false)
    * `location_lat` (Label: "location_lat", Type: text, Editable: false)
    * `location_lng` (Label: "location_lng", Type: text, Editable: false)
    * `pricing_ex` (Label: "pricing_ex", Type: text, Editable: false)
    * `customColumn1` (Label: "Profile", Type: iconButton, Editable: false)
    * `verification_status` (Label: "verification_status", Type: text, Editable: false)
    * `last_verified_at` (Label: "last_verified_at", Type: text, Editable: false)
    * `verified_by` (Label: "verified_by", Type: text, Editable: false)
    * `is_verified` (Label: "is_verified", Type: checkbox, Editable: false)
    * `migration_id` (Label: "migration_id", Type: text, Editable: false)
    * `address_line2` (Label: "address_line2", Type: text, Editable: false)
    * `state` (Label: "state", Type: text, Editable: false)
    * `pincode` (Label: "pincode", Type: text, Editable: false)
* **Table: Table2**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `date` (Label: "date", Type: date, Editable: false)
    * `type` (Label: "type", Type: text, Editable: false)
    * `reference_number` (Label: "reference_number", Type: text, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
    * `debit_amount` (Label: "debit_amount", Type: text, Editable: false)
    * `credit_amount` (Label: "credit_amount", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `running_balance` (Label: "running_balance", Type: number, Editable: false)
* **Table: Table3**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `channel_id` (Label: "channel_id", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `brand_id` (Label: "brand_id", Type: text, Editable: false)
    * `brand_name` (Label: "brand_name", Type: text, Editable: false)
    * `override_channel` (Label: "override_channel", Type: text, Editable: false)
* **Table: tblPending**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `latitude` (Label: "latitude", Type: text, Editable: false)
    * `longitude` (Label: "longitude", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `dse_id` (Label: "dse_id", Type: text, Editable: false)
    * `proposed_customer_name` (Label: "proposed_customer_name", Type: text, Editable: false)
    * `proposed_phone` (Label: "proposed_phone", Type: text, Editable: false)
    * `proposed_gstin` (Label: "proposed_gstin", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `reviewed_at` (Label: "reviewed_at", Type: text, Editable: false)
    * `reviewed_by` (Label: "reviewed_by", Type: text, Editable: false)
    * `rejection_reason` (Label: "rejection_reason", Type: text, Editable: false)
    * `current_code` (Label: "current_code", Type: text, Editable: false)
    * `dse_name` (Label: "dse_name", Type: text, Editable: false)
    * `customColumn1` (Label: "Create", Type: iconButton, Editable: false)
    * `customColumn2` (Label: "Approve", Type: iconButton, Editable: false)
    * `customColumn3` (Label: "Reject", Type: iconButton, Editable: false)

### 4. Dropdowns & Inputs
* **Select: selBrand**
* **Select: selChannel**
* **Select: SelectNewDSE**
* **Select: SelectNewRoute**

---

## Page: Migration Setup

### 1. JS Objects & Custom Functions
* **Migration_Utils**

### 2. Queries & Data Bindings
* **BulkImport_Customers** [undefined] [DS: RenderCloud] -> `POST /api/migration/customers`
* **BulkImport_Vendors** [undefined] [DS: RenderCloud] -> `POST /api/migration/vendors`
* **BulkImport_Inventory** [undefined] [DS: RenderCloud] -> `POST /api/migration/opening-stock`
* **BulkImport_Invoices** [undefined] [DS: RenderCloud] -> `POST /api/migration/outstanding-invoices`
* **BulkImport_Bills** [undefined] [DS: RenderCloud] -> `POST /api/migration/outstanding-bills`
* **BulkImport_CustAdvances** [undefined] [DS: RenderCloud] -> `POST /api/migration/customer-advances`
* **BulkImport_VendAdvances** [undefined] [DS: RenderCloud] -> `POST /api/migration/vendor-advances`
* **BulkImport_Loans** [undefined] [DS: RenderCloud] -> `POST /api/migration/loans`
* **formatDate** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **downloadTemplate** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **startImport** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `

### 3. Data Tables & Interactive Grid Rules
* **Table: TablePreview**
  * Server-side Pagination: `false`
  * Columns:
    * `product_id` (Label: "product_id", Type: number, Editable: false)
    * `batch_code` (Label: "batch_code", Type: text, Editable: false)
    * `expiry_date` (Label: "expiry_date", Type: date, Editable: false)
    * `quantity` (Label: "quantity", Type: number, Editable: false)
    * `mrp` (Label: "mrp", Type: number, Editable: false)
    * `purchase_rate` (Label: "purchase_rate", Type: number, Editable: false)
    * `distributor_rate` (Label: "distributor_rate", Type: number, Editable: false)
    * `wholesale_rate` (Label: "wholesale_rate", Type: number, Editable: false)
    * `dealer_rate` (Label: "dealer_rate", Type: number, Editable: false)
    * `retail_rate` (Label: "retail_rate", Type: number, Editable: false)
    * `status_type` (Label: "status_type", Type: text, Editable: false)

### 4. Dropdowns & Inputs
* **Select: SelectModule**

---

## Page: Loan

### 1. JS Objects & Custom Functions
* None

### 2. Queries & Data Bindings
* **GetLoanEntities** [undefined] [DS: RenderCloud] -> `GET /api/loan-entities`
* **CreateLoanEntity** [undefined] [DS: RenderCloud] -> `POST /api/loan-entities`
* **GetEmployees_API** [undefined] [DS: RenderCloud] -> `GET /api/employees`
* **getLoanTransactions** [undefined] [DS: RenderCloud] -> `GET /api/finance/loans`
* **getBanks** [undefined] [DS: RenderCloud] -> `GET /api/bank-accounts`
* **GetUnconsumedCredits** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/bank/unconsumed-credits`
* **GetUnconsumedDebits** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/bank/unconsumed-debits`
* **CreateLoanTransaction** [undefined] [DS: RenderCloud] -> `POST /api/finance/loans`
* **getMe** [undefined] [DS: RenderCloud] -> `GET /api/employees/profile`
* **CreateInstallment** [undefined] [DS: RenderCloud] -> `POST /api/finance/loans/{{ tblLoans.triggeredRow.id }}/installment`
* **GetLoanLedger** [undefined] [DS: RenderCloud] -> `GET /api/finance/loans/{{tblLoans.triggeredRow.id}}/ledger`
* **GetEntityLedger** [undefined] [DS: RenderCloud] -> `GET /api/loan-entities/{{tblEntity.triggeredRow.id}}/ledger`
* **DeleteLoanTransaction** [undefined] [DS: RenderCloud] -> `DELETE /api/finance/loans/transactions/{{tblLoanTransactionLed.triggeredRow.id}}`
* **deleteLoan** [undefined] [DS: RenderCloud] -> `DELETE /api/finance/loans/{{tblLoans.triggeredRow.id}}`

### 3. Data Tables & Interactive Grid Rules
* **Table: tblEntity**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: number, Editable: false)
    * `entity_name` (Label: "entity_name", Type: text, Editable: false)
    * `entity_type` (Label: "entity_type", Type: text, Editable: false)
    * `role_type` (Label: "role_type", Type: text, Editable: false)
    * `contact_number` (Label: "contact_number", Type: text, Editable: false)
    * `email` (Label: "email", Type: text, Editable: false)
    * `address` (Label: "address", Type: text, Editable: false)
    * `notes` (Label: "notes", Type: text, Editable: false)
    * `is_active` (Label: "is_active", Type: checkbox, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `updated_at` (Label: "updated_at", Type: date, Editable: false)
    * `reference_id` (Label: "reference_id", Type: number, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
* **Table: tblLoans**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `loan_number` (Label: "loan_number", Type: text, Editable: false)
    * `loan_type` (Label: "loan_type", Type: text, Editable: false)
    * `party_type` (Label: "party_type", Type: text, Editable: false)
    * `party_id` (Label: "party_id", Type: text, Editable: false)
    * `party_name` (Label: "party_name", Type: text, Editable: false)
    * `principal_amount` (Label: "principal_amount", Type: text, Editable: false)
    * `interest_rate_pa` (Label: "interest_rate_pa", Type: text, Editable: false)
    * `tenor_months` (Label: "tenor_months", Type: number, Editable: false)
    * `emi_amount` (Label: "emi_amount", Type: text, Editable: false)
    * `disbursement_date` (Label: "disbursement_date", Type: date, Editable: false)
    * `start_date` (Label: "start_date", Type: date, Editable: false)
    * `balance_principal` (Label: "balance_principal", Type: text, Editable: false)
    * `balance_interest` (Label: "balance_interest", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `remarks` (Label: "remarks", Type: text, Editable: false)
    * `created_by` (Label: "created_by", Type: number, Editable: false)
    * `customColumn1` (Label: "Make Payment", Type: button, Editable: false)
    * `customColumn2` (Label: "View", Type: iconButton, Editable: false)
    * `customColumn3` (Label: "Delete", Type: iconButton, Editable: false)
* **Table: Table1**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `loan_id` (Label: "loan_id", Type: text, Editable: false)
    * `loan_number` (Label: "loan_number", Type: text, Editable: false)
    * `date` (Label: "date", Type: date, Editable: false)
    * `type` (Label: "type", Type: text, Editable: false)
    * `reference_number` (Label: "reference_number", Type: text, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
    * `debit_amount` (Label: "debit_amount", Type: text, Editable: false)
    * `credit_amount` (Label: "credit_amount", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `running_balance` (Label: "running_balance", Type: number, Editable: false)
* **Table: tblLoanTransactionLed**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `date` (Label: "date", Type: date, Editable: false)
    * `type` (Label: "type", Type: text, Editable: false)
    * `reference_number` (Label: "reference_number", Type: text, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
    * `debit_amount` (Label: "debit_amount", Type: text, Editable: false)
    * `credit_amount` (Label: "credit_amount", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `running_balance` (Label: "running_balance", Type: number, Editable: false)
    * `customColumn1` (Label: "Delete", Type: iconButton, Editable: false)

### 4. Dropdowns & Inputs
* None

---

## Page: Assets

### 1. JS Objects & Custom Functions
* **Location_Data**

### 2. Queries & Data Bindings
* **getStates** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getDistricts** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getBanks** [undefined] [DS: RenderCloud] -> `GET /api/bank-accounts`
* **CreateAssetEntity** [undefined] [DS: RenderCloud] -> `POST /api/asset-entities`
* **GetAssetEntities** [undefined] [DS: RenderCloud] -> `GET /api/asset-entities`
* **getAssets** [undefined] [DS: RenderCloud] -> `GET /api/assets`
* **getAssetCategories** [undefined] [DS: RenderCloud] -> `GET /api/assets/categories`
* **GetAssetAccounts** [undefined] [DS: RenderCloud] -> `GET /api/assets/accounts`
* **CreateAsset** [undefined] [DS: RenderCloud] -> `POST /api/assets`
* **getUnconsumedDebits** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/bank/unconsumed-debits`
* **getBanksGen** [undefined] [DS: RenderCloud] -> `GET /api/master/banks`
* **RecordAssetPayment** [undefined] [DS: RenderCloud] -> `POST /api/assets/payment`
* **SellAssets** [undefined] [DS: RenderCloud] -> `POST /api/assets/{{tblAssets.triggeredRow.id}}/sale`
* **getMe** [undefined] [DS: RenderCloud] -> `GET /api/employees/profile`
* **getUnconsumedCredits** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/bank/unconsumed-credits`
* **RecordAssetSalesPayment** [undefined] [DS: RenderCloud] -> `POST /api/assets/{{tblAssets.triggeredRow.id}}/sale-payment`
* **getDepreciation** [undefined] [DS: RenderCloud] -> `GET /api/assets/depreciations`
* **runAutoDep** [undefined] [DS: RenderCloud] -> `POST /api/assets/auto-depreciate`
* **Asset_Entity_Ledger** [undefined] [DS: RenderCloud] -> `GET /api/asset-entities/{{tblAssetEntities.triggeredRow.id}}/ledger`

### 3. Data Tables & Interactive Grid Rules
* **Table: tblAssets**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `asset_name` (Label: "asset_name", Type: text, Editable: false)
    * `category` (Label: "category", Type: text, Editable: false)
    * `purchase_date` (Label: "purchase_date", Type: date, Editable: false)
    * `purchase_cost` (Label: "purchase_cost", Type: text, Editable: false)
    * `useful_life_years` (Label: "useful_life_years", Type: text, Editable: false)
    * `salvage_value` (Label: "salvage_value", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `asset_account_code` (Label: "asset_account_code", Type: number, Editable: false)
    * `accum_dep_account_code` (Label: "accum_dep_account_code", Type: number, Editable: false)
    * `vendor_id` (Label: "vendor_id", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `updated_at` (Label: "updated_at", Type: date, Editable: false)
    * `is_gst_purchase` (Label: "is_gst_purchase", Type: checkbox, Editable: false)
    * `taxable_amount` (Label: "taxable_amount", Type: text, Editable: false)
    * `tax_amount` (Label: "tax_amount", Type: text, Editable: false)
    * `gst_no` (Label: "gst_no", Type: text, Editable: false)
    * `bill_no` (Label: "bill_no", Type: text, Editable: false)
    * `created_by` (Label: "created_by", Type: number, Editable: false)
    * `sale_buyer_name` (Label: "sale_buyer_name", Type: text, Editable: false)
    * `sale_buyer_gst` (Label: "sale_buyer_gst", Type: text, Editable: false)
    * `sale_is_gst` (Label: "sale_is_gst", Type: checkbox, Editable: false)
    * `sale_taxable_amount` (Label: "sale_taxable_amount", Type: text, Editable: false)
    * `sale_tax_amount` (Label: "sale_tax_amount", Type: text, Editable: false)
    * `sale_invoice_no` (Label: "sale_invoice_no", Type: text, Editable: false)
    * `sale_total_amount` (Label: "sale_total_amount", Type: text, Editable: false)
    * `sale_balance_receivable` (Label: "sale_balance_receivable", Type: text, Editable: false)
    * `sale_hsn_code` (Label: "sale_hsn_code", Type: text, Editable: false)
    * `sale_invoice_number` (Label: "sale_invoice_number", Type: text, Editable: false)
    * `sale_buyer_address` (Label: "sale_buyer_address", Type: text, Editable: false)
    * `sale_delivery_address` (Label: "sale_delivery_address", Type: text, Editable: false)
    * `sale_created_by` (Label: "sale_created_by", Type: text, Editable: false)
    * `total_depreciation` (Label: "total_depreciation", Type: text, Editable: false)
    * `total_paid` (Label: "total_paid", Type: text, Editable: false)
    * `net_book_value` (Label: "net_book_value", Type: text, Editable: false)
    * `balance_payable` (Label: "balance_payable", Type: text, Editable: false)
    * `asset_purchase_no` (Label: "asset_purchase_no", Type: text, Editable: false)
    * `customColumn1` (Label: "Payment", Type: iconButton, Editable: false)
    * `customColumn2` (Label: "Sell", Type: iconButton, Editable: false)
    * `purchase_entity_id` (Label: "purchase_entity_id", Type: text, Editable: false)
    * `sale_entity_id` (Label: "sale_entity_id", Type: text, Editable: false)
    * `purchase_vendor_name` (Label: "purchase_vendor_name", Type: text, Editable: false)
    * `purchase_vendor_gst` (Label: "purchase_vendor_gst", Type: text, Editable: false)
    * `sale_customer_name` (Label: "sale_customer_name", Type: text, Editable: false)
    * `sale_customer_gst` (Label: "sale_customer_gst", Type: text, Editable: false)
    * `customColumn3` (Label: "Sold Payment", Type: iconButton, Editable: false)
* **Table: tblAssetEntities**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `entity_code` (Label: "entity_code", Type: text, Editable: false)
    * `entity_type` (Label: "entity_type", Type: text, Editable: false)
    * `entity_name` (Label: "entity_name", Type: text, Editable: false)
    * `contact_number` (Label: "contact_number", Type: text, Editable: false)
    * `email` (Label: "email", Type: text, Editable: false)
    * `gst_number` (Label: "gst_number", Type: text, Editable: false)
    * `pan_number` (Label: "pan_number", Type: text, Editable: false)
    * `address` (Label: "address", Type: text, Editable: false)
    * `state` (Label: "state", Type: text, Editable: false)
    * `district` (Label: "district", Type: text, Editable: false)
    * `pincode` (Label: "pincode", Type: text, Editable: false)
    * `bank_account_id` (Label: "bank_account_id", Type: text, Editable: false)
    * `account_no` (Label: "account_no", Type: text, Editable: false)
    * `ifsc_code` (Label: "ifsc_code", Type: text, Editable: false)
    * `opening_balance` (Label: "opening_balance", Type: text, Editable: false)
    * `is_active` (Label: "is_active", Type: checkbox, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `updated_at` (Label: "updated_at", Type: date, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
    * `bank_name` (Label: "bank_name", Type: text, Editable: false)
* **Table: Table2**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `asset_id` (Label: "asset_id", Type: text, Editable: false)
    * `transaction_type` (Label: "transaction_type", Type: text, Editable: false)
    * `transaction_date` (Label: "transaction_date", Type: date, Editable: false)
    * `amount` (Label: "amount", Type: text, Editable: false)
    * `journal_entry_id` (Label: "journal_entry_id", Type: text, Editable: false)
    * `remarks` (Label: "remarks", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `asset_name` (Label: "asset_name", Type: text, Editable: false)
    * `bank_statement_entry_id` (Label: "bank_statement_entry_id", Type: text, Editable: false)
* **Table: Table3**
  * Server-side Pagination: `false`
  * Columns:
    * `entity_id` (Label: "entity_id", Type: text, Editable: false)
    * `date` (Label: "date", Type: date, Editable: false)
    * `particulars` (Label: "particulars", Type: text, Editable: false)
    * `debit` (Label: "debit", Type: text, Editable: false)
    * `credit` (Label: "credit", Type: text, Editable: false)
    * `sort_id` (Label: "sort_id", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `running_balance` (Label: "running_balance", Type: text, Editable: false)

### 4. Dropdowns & Inputs
* None

---

## Page: Cheque Management

### 1. JS Objects & Custom Functions
* None

### 2. Queries & Data Bindings
* **getCheques** [undefined] [DS: RenderCloud] -> `GET /api/finance/cheques`
* **getUnconsumedCredits** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/bank/unconsumed-credits`
* **getUnconsumedDebits** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/bank/unconsumed-debits`
* **getBanks** [undefined] [DS: RenderCloud] -> `GET /api/bank-accounts`
* **BulkClearCheques** [undefined] [DS: RenderCloud] -> `POST /api/finance/cheques/bulk-clear`
* **BounceCheque** [undefined] [DS: RenderCloud] -> `POST /api/finance/cheques/{{ tblCheques.triggeredRow.id }}/bounce`
* **getMe** [undefined] [DS: RenderCloud] -> `GET /api/employees/profile`
* **apiUnclearCheque** [undefined] [DS: RenderCloud] -> `POST /api/finance/cheques/{{tblCheques.triggeredRow.id}}/unclear`

### 3. Data Tables & Interactive Grid Rules
* **Table: tblCheques**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: number, Editable: false)
    * `cheque_number` (Label: "cheque_number", Type: text, Editable: false)
    * `cheque_date` (Label: "cheque_date", Type: date, Editable: false)
    * `bank_name` (Label: "bank_name", Type: text, Editable: false)
    * `amount` (Label: "amount", Type: text, Editable: false)
    * `type` (Label: "type", Type: text, Editable: false)
    * `party_type` (Label: "party_type", Type: text, Editable: false)
    * `party_id` (Label: "party_id", Type: text, Editable: false)
    * `reference_type` (Label: "reference_type", Type: text, Editable: false)
    * `reference_id` (Label: "reference_id", Type: number, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `clearance_date` (Label: "clearance_date", Type: text, Editable: false)
    * `bank_account_id` (Label: "bank_account_id", Type: text, Editable: false)
    * `remarks` (Label: "remarks", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `updated_at` (Label: "updated_at", Type: date, Editable: false)
    * `party_name` (Label: "party_name", Type: text, Editable: false)
    * `bank_id` (Label: "bank_id", Type: number, Editable: false)
    * `bank_statement_entry_id` (Label: "bank_statement_entry_id", Type: text, Editable: false)
    * `customColumn1` (Label: "Cheque Bounce", Type: iconButton, Editable: false)
    * `customColumn2` (Label: "Reverse Clearence", Type: iconButton, Editable: false)

### 4. Dropdowns & Inputs
* **Select: selType**
* **Select: selStatus**
* **Select: selStatementEntry**
* **Select: selClearBank**
* **Select: selBounceReason**
* **Select: selBounceEntry**
* **Select: selDepositEntry**

---

## Page: Transactions

### 1. JS Objects & Custom Functions
* **InternalTransfer**
* **DenomUtils**

### 2. Queries & Data Bindings
* **getIncomeEntity** [undefined] [DS: RenderCloud] -> `GET /api/entities/income`
* **createIncomeEntity** [undefined] [DS: RenderCloud] -> `POST /api/entities/income`
* **getBanksGen** [undefined] [DS: RenderCloud] -> `GET /api/master/banks`
* **getExpensesEntity** [undefined] [DS: RenderCloud] -> `GET /api/entities/expense`
* **createExpensesEntity** [undefined] [DS: RenderCloud] -> `POST /api/entities/expense`
* **getExpenses** [undefined] [DS: RenderCloud] -> `GET /api/finance/expenses`
* **getIncome** [undefined] [DS: RenderCloud] -> `GET /api/finance/other-income`
* **getExpensesCat** [undefined] [DS: RenderCloud] -> `GET /api/finance/expenses/categories`
* **getBanks** [undefined] [DS: RenderCloud] -> `GET /api/bank-accounts`
* **getUnconsumedDebits** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/bank/unconsumed-debits`
* **createExpenses** [undefined] [DS: RenderCloud] -> `POST /api/finance/expenses`
* **getIncomeCat** [undefined] [DS: RenderCloud] -> `GET /api/finance/other-income/categories`
* **getUnconsumedCredits** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/bank/unconsumed-credits`
* **createIncome** [undefined] [DS: RenderCloud] -> `POST /api/finance/other-income`
* **getMe** [undefined] [DS: RenderCloud] -> `GET /api/employees/profile`
* **getTransfer** [undefined] [DS: RenderCloud] -> `GET /api/finance/transfers`
* **createTransfer** [undefined] [DS: RenderCloud] -> `POST /api/finance/transfers`
* **handleTransfer** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getTotalSum** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getApiObject** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **initializeTable** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **onCellEdit** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **handleTransfer** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **Income_Entity_Ledger** [undefined] [DS: RenderCloud] -> `GET //api/entities/income/{{tblIncomeEntity.triggeredRow.id}}/ledger`
* **Expense_Entity_Ledger** [undefined] [DS: RenderCloud] -> `GET /api/entities/expense/{{tblExpenseEntity.triggeredRow.id}}/ledger`
* **DeleteExpenseApi** [undefined] [DS: RenderCloud] -> `DELETE /api/finance/expenses/{{tblExpenseTransaction.triggeredRow.id}}`
* **DeleteOtherIncomeApi** [undefined] [DS: RenderCloud] -> `DELETE /api/finance/other-income/{{tblIncometransaction.triggeredRow.id}}`
* **DeleteTransferApi** [undefined] [DS: RenderCloud] -> `DELETE /api/finance/transfers/{{tblInternalTransfer.triggeredRow.id}}`

### 3. Data Tables & Interactive Grid Rules
* **Table: tblExpenseEntity**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `name` (Label: "name", Type: text, Editable: false)
    * `phone` (Label: "phone", Type: text, Editable: false)
    * `email` (Label: "email", Type: text, Editable: false)
    * `gst_no` (Label: "gst_no", Type: text, Editable: false)
    * `address` (Label: "address", Type: text, Editable: false)
    * `is_active` (Label: "is_active", Type: checkbox, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `updated_at` (Label: "updated_at", Type: date, Editable: false)
    * `bank_name` (Label: "bank_name", Type: text, Editable: false)
    * `account_no` (Label: "account_no", Type: text, Editable: false)
    * `ifsc_code` (Label: "ifsc_code", Type: text, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
* **Table: tblExpenseTransaction**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `expense_date` (Label: "expense_date", Type: date, Editable: false)
    * `category_account_id` (Label: "category_account_id", Type: number, Editable: false)
    * `payment_source_id` (Label: "payment_source_id", Type: number, Editable: false)
    * `journal_entry_id` (Label: "journal_entry_id", Type: text, Editable: false)
    * `taxable_amount` (Label: "taxable_amount", Type: text, Editable: false)
    * `tax_amount` (Label: "tax_amount", Type: text, Editable: false)
    * `grand_total` (Label: "grand_total", Type: text, Editable: false)
    * `is_gst_expense` (Label: "is_gst_expense", Type: checkbox, Editable: false)
    * `entity_id` (Label: "entity_id", Type: text, Editable: false)
    * `bill_no` (Label: "bill_no", Type: text, Editable: false)
    * `gst_no` (Label: "gst_no", Type: text, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
    * `reference_no` (Label: "reference_no", Type: text, Editable: false)
    * `created_by` (Label: "created_by", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `is_active` (Label: "is_active", Type: checkbox, Editable: false)
    * `expense_number` (Label: "expense_number", Type: text, Editable: false)
    * `bank_statement_entry_id` (Label: "bank_statement_entry_id", Type: text, Editable: false)
    * `category_name` (Label: "category_name", Type: text, Editable: false)
    * `payment_source_name` (Label: "payment_source_name", Type: text, Editable: false)
    * `entity_name` (Label: "entity_name", Type: text, Editable: false)
    * `customColumn1` (Label: "Delete", Type: iconButton, Editable: false)
* **Table: tblIncomeEntity**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `name` (Label: "name", Type: text, Editable: false)
    * `phone` (Label: "phone", Type: text, Editable: false)
    * `email` (Label: "email", Type: text, Editable: false)
    * `gst_no` (Label: "gst_no", Type: text, Editable: false)
    * `address` (Label: "address", Type: text, Editable: false)
    * `is_active` (Label: "is_active", Type: checkbox, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `updated_at` (Label: "updated_at", Type: date, Editable: false)
    * `bank_name` (Label: "bank_name", Type: text, Editable: false)
    * `account_no` (Label: "account_no", Type: text, Editable: false)
    * `ifsc_code` (Label: "ifsc_code", Type: text, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
* **Table: tblIncometransaction**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `income_number` (Label: "income_number", Type: text, Editable: false)
    * `transaction_date` (Label: "transaction_date", Type: date, Editable: false)
    * `category_account_id` (Label: "category_account_id", Type: number, Editable: false)
    * `destination_account_id` (Label: "destination_account_id", Type: number, Editable: false)
    * `journal_entry_id` (Label: "journal_entry_id", Type: text, Editable: false)
    * `amount` (Label: "amount", Type: text, Editable: false)
    * `entity_id` (Label: "entity_id", Type: text, Editable: false)
    * `reference_no` (Label: "reference_no", Type: text, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
    * `created_by` (Label: "created_by", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `is_active` (Label: "is_active", Type: checkbox, Editable: false)
    * `taxable_amount` (Label: "taxable_amount", Type: text, Editable: false)
    * `tax_amount` (Label: "tax_amount", Type: text, Editable: false)
    * `is_gst_income` (Label: "is_gst_income", Type: checkbox, Editable: false)
    * `gst_no` (Label: "gst_no", Type: text, Editable: false)
    * `bank_statement_entry_id` (Label: "bank_statement_entry_id", Type: text, Editable: false)
    * `category_name` (Label: "category_name", Type: text, Editable: false)
    * `destination_account_name` (Label: "destination_account_name", Type: text, Editable: false)
    * `entity_name` (Label: "entity_name", Type: text, Editable: false)
    * `customColumn1` (Label: "Delete", Type: iconButton, Editable: false)
* **Table: tblInternalTransfer**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `transfer_date` (Label: "transfer_date", Type: date, Editable: false)
    * `from_account_id` (Label: "from_account_id", Type: number, Editable: false)
    * `to_account_id` (Label: "to_account_id", Type: number, Editable: false)
    * `amount` (Label: "amount", Type: text, Editable: false)
    * `payment_mode` (Label: "payment_mode", Type: text, Editable: false)
    * `reference_no` (Label: "reference_no", Type: text, Editable: false)
    * `remarks` (Label: "remarks", Type: text, Editable: false)
    * `journal_entry_id` (Label: "journal_entry_id", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `from_bank_statement_entry_id` (Label: "from_bank_statement_entry_id", Type: text, Editable: false)
    * `to_bank_statement_entry_id` (Label: "to_bank_statement_entry_id", Type: text, Editable: false)
    * `denominations` (Label: "denominations", Type: text, Editable: false)
    * `from_account_name` (Label: "from_account_name", Type: text, Editable: false)
    * `to_account_name` (Label: "to_account_name", Type: text, Editable: false)
    * `customColumn1` (Label: "Delete", Type: iconButton, Editable: false)
    * `is_active` (Label: "is_active", Type: checkbox, Editable: false)
* **Table: tblDenominations**
  * Server-side Pagination: `false`
  * Columns:
    * `note` (Label: "note", Type: number, Editable: false)
    * `count` (Label: "count", Type: number, Editable: true)
    * `customColumn1` (Label: "Total", Type: currency, Editable: false)
    * `id` (Label: "id", Type: number, Editable: false)
* **Table: Table6**
  * Server-side Pagination: `false`
  * Columns:
    * `entity_id` (Label: "entity_id", Type: text, Editable: false)
    * `date` (Label: "date", Type: date, Editable: false)
    * `reference` (Label: "reference", Type: text, Editable: false)
    * `type` (Label: "type", Type: text, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
    * `debit` (Label: "debit", Type: text, Editable: false)
    * `credit` (Label: "credit", Type: text, Editable: false)
    * `sort_id` (Label: "sort_id", Type: text, Editable: false)
    * `running_balance` (Label: "running_balance", Type: text, Editable: false)
* **Table: Table6Copy**
  * Server-side Pagination: `false`
  * Columns:
    * `entity_id` (Label: "entity_id", Type: text, Editable: false)
    * `date` (Label: "date", Type: date, Editable: false)
    * `reference` (Label: "reference", Type: text, Editable: false)
    * `type` (Label: "type", Type: text, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
    * `debit` (Label: "debit", Type: text, Editable: false)
    * `credit` (Label: "credit", Type: text, Editable: false)
    * `sort_id` (Label: "sort_id", Type: text, Editable: false)
    * `running_balance` (Label: "running_balance", Type: text, Editable: false)

### 4. Dropdowns & Inputs
* None

---

## Page: Reports

### 1. JS Objects & Custom Functions
* **Global_Assets**
* **JS_Receivables**
* **JS_BankUpload**
* **utilsPnL**
* **DownloadPnl**
* **FinancialEngine**
* **StockReport_PDF**
* **Payslip_JS**
* **JSObject1**

### 2. Queries & Data Bindings
* **AttendanceReport** [undefined] [DS: RenderCloud] -> `GET /api/employees/attendance/details`
* **RecievablesList** [undefined] [DS: RenderCloud] -> `GET /api/payments/dse-pending-invoices`
* **getSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getLogo** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getEmployees** [undefined] [DS: RenderCloud] -> `GET /api/employees`
* **getOpeneningBalance** [undefined] [DS: RenderCloud] -> `GET /api/migration/opening-capital`
* **downloadReceivablesPDF** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **_drawSimpleBox** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getBankStatement** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/bank/list`
* **getBanks** [undefined] [DS: RenderCloud] -> `GET /api/bank-accounts`
* **Api_UploadStatement** [undefined] [DS: RenderCloud] -> `POST /api/finance/reconciliation/bank/upload`
* **uploadStatement** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **AuditView** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/bank/audit-view`
* **journalEntries** [undefined] [DS: RenderCloud] -> `GET /api/journal-entries`
* **saleReport** [undefined] [DS: RenderCloud] -> `GET /api/analytics/sales-fy-report`
* **getPnL** [undefined] [DS: RenderCloud] -> `GET /api/analytics/reports/p-and-l`
* **cashFlow** [undefined] [DS: RenderCloud] -> `GET /api/analytics/reports/cash-flow`
* **balanceSheet** [undefined] [DS: RenderCloud] -> `GET /api/analytics/reports/balance-sheet`
* **bankBalance** [undefined] [DS: RenderCloud] -> `GET /api/analytics/reports/fy-operating-balances`
* **getSalesLines** [undefined] [DS: RenderCloud] -> `GET /api/analytics/reports/sales-lines`
* **getJournalLines** [undefined] [DS: RenderCloud] -> `GET /api/general-ledger`
* **AccountStatement** [undefined] [DS: RenderCloud] -> `GET /api/accounting/unified-liquid-ledger`
* **custPayment** [undefined] [DS: RenderCloud] -> `GET /api/payments/allocations`
* **getQuarterOptions** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getFYOptions** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getMonthOptions** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **previewPnL** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **_drawStatBox** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **fetch_source_transactions** [undefined] [DS: RenderCloud] -> `GET /api/accounting/source-transactions`
* **getRunningStatement** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **Api1** [undefined] [DS: RenderCloud] -> `GET /api/analytics/reports/integrity-audit`
* **getProducts** [undefined] [DS: RenderCloud] -> `GET /api/products`
* **getBrands** [undefined] [DS: RenderCloud] -> `GET /api/master/brands`
* **getVendors** [undefined] [DS: RenderCloud] -> `GET /api/vendors`
* **getMe** [undefined] [DS: RenderCloud] -> `GET /api/employees/profile`
* **previewStockReport** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getDSEDashboard** [undefined] [DS: RenderCloud] -> `GET /api/analytics/employees/{{sltDseDash.selectedOptionValue}}/dashboard`
* **getSalesSummary** [undefined] [DS: RenderCloud] -> `GET /api/analytics/reports/sales-summary-detailed`
* **getSalary** [undefined] [DS: RenderCloud] -> `GET /api/employees/salary-payment-headers`
* **get_salary_details_api** [undefined] [DS: RenderCloud] -> `GET /api/employees/salary-payment-details/{{tblSalary.triggeredRow.id}}`
* **forensicAPI** [undefined] [DS: RenderCloud] -> `GET /api/accounting/forensic-snapshot`
* **getCashFlow** [undefined] [DS: RenderCloud] -> `GET /api/accounting/cash-flow`
* **_drawStatBox** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **exportForensicReport** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **generatePayslip** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getPurchaseLines** [undefined] [DS: RenderCloud] -> `GET /api/purchase-invoices/lines`
* **GetSalesLinesPaginated** [undefined] [DS: RenderCloud] -> `GET /api/sales/invoice-lines`
* **GetAllSalesLinesForDownload** [undefined] [DS: RenderCloud] -> `GET /api/sales/invoice-lines`
* **getCustomers** [undefined] [DS: RenderCloud] -> `GET /api/customers`

### 3. Data Tables & Interactive Grid Rules
* **Table: tblRecievables**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `invoice_date` (Label: "invoice_date", Type: date, Editable: false)
    * `bill_amount` (Label: "bill_amount", Type: text, Editable: false)
    * `paid_amount` (Label: "paid_amount", Type: text, Editable: false)
    * `balance` (Label: "balance", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `route_name` (Label: "route_name", Type: text, Editable: false)
    * `ard_days` (Label: "ard_days", Type: number, Editable: false)
    * `days_from_billed` (Label: "days_from_billed", Type: number, Editable: false)
    * `overdue_days` (Label: "overdue_days", Type: number, Editable: false)
    * `due_date` (Label: "due_date", Type: date, Editable: false)
    * `dse_name` (Label: "dse_name", Type: text, Editable: false)
* **Table: Table1**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `transaction_date` (Label: "transaction_date", Type: date, Editable: false)
    * `bank_name` (Label: "bank_name", Type: text, Editable: false)
    * `particulars` (Label: "particulars", Type: text, Editable: false)
    * `bank_ref_id` (Label: "bank_ref_id", Type: text, Editable: false)
    * `amount` (Label: "amount", Type: text, Editable: false)
    * `consumed_amount` (Label: "consumed_amount", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `upload_batch_id` (Label: "upload_batch_id", Type: text, Editable: false)
    * `debit_amount` (Label: "debit_amount", Type: text, Editable: false)
    * `credit_amount` (Label: "credit_amount", Type: text, Editable: false)
    * `bank_account_id` (Label: "bank_account_id", Type: number, Editable: false)
* **Table: Table2**
  * Server-side Pagination: `false`
  * Columns:
    * `statement_entry_id` (Label: "statement_entry_id", Type: text, Editable: false)
    * `transaction_date` (Label: "transaction_date", Type: date, Editable: false)
    * `bank_account_id` (Label: "bank_account_id", Type: number, Editable: false)
    * `account` (Label: "account", Type: text, Editable: false)
    * `bank_narration` (Label: "bank_narration", Type: text, Editable: false)
    * `debit_amount` (Label: "debit_amount", Type: text, Editable: false)
    * `credit_amount` (Label: "credit_amount", Type: text, Editable: false)
    * `reconciliation_status` (Label: "reconciliation_status", Type: text, Editable: false)
    * `transaction_type` (Label: "transaction_type", Type: text, Editable: false)
    * `erp_reference` (Label: "erp_reference", Type: text, Editable: false)
    * `party_name` (Label: "party_name", Type: text, Editable: false)
    * `user_narration` (Label: "user_narration", Type: text, Editable: false)
    * `recorded_by` (Label: "recorded_by", Type: text, Editable: false)
    * `erp_date` (Label: "erp_date", Type: date, Editable: false)
    * `erp_recorded_at` (Label: "erp_recorded_at", Type: date, Editable: false)
* **Table: Table3**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: number, Editable: false)
    * `employee_id` (Label: "employee_id", Type: number, Editable: false)
    * `full_name` (Label: "full_name", Type: text, Editable: false)
    * `employee_code` (Label: "employee_code", Type: text, Editable: false)
    * `attendance_date` (Label: "attendance_date", Type: date, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `remarks` (Label: "remarks", Type: text, Editable: false)
* **Table: Table4**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: number, Editable: false)
    * `transaction_date` (Label: "transaction_date", Type: date, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
    * `reference_type` (Label: "reference_type", Type: text, Editable: false)
    * `reference_id` (Label: "reference_id", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `total_amount` (Label: "total_amount", Type: text, Editable: false)
* **Table: tblSalesLines**
  * Server-side Pagination: `false`
  * Columns:
    * `date` (Label: "date", Type: date, Editable: true)
    * `invoice_no` (Label: "invoice_no", Type: text, Editable: true)
    * `customer` (Label: "customer", Type: text, Editable: true)
    * `product` (Label: "product", Type: text, Editable: true)
    * `sku` (Label: "sku", Type: text, Editable: true)
    * `qty` (Label: "qty", Type: number, Editable: true)
    * `unit_rate` (Label: "unit_rate", Type: number, Editable: true)
    * `tax` (Label: "tax", Type: number, Editable: true)
    * `total_amount` (Label: "total_amount", Type: number, Editable: true)
    * `status` (Label: "status", Type: text, Editable: true)
    * `brand` (Label: "brand", Type: text, Editable: true)
    * `category` (Label: "category", Type: text, Editable: true)
    * `taxable` (Label: "taxable", Type: number, Editable: true)
    * `dse_name` (Label: "dse_name", Type: text, Editable: true)
    * `route_name` (Label: "route_name", Type: text, Editable: true)
* **Table: Table6**
  * Server-side Pagination: `false`
  * Columns:
    * `line_id` (Label: "line_id", Type: number, Editable: false)
    * `entry_id` (Label: "entry_id", Type: number, Editable: false)
    * `transaction_date` (Label: "transaction_date", Type: date, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
    * `reference_type` (Label: "reference_type", Type: text, Editable: false)
    * `reference_id` (Label: "reference_id", Type: text, Editable: false)
    * `account_code` (Label: "account_code", Type: number, Editable: false)
    * `account_name` (Label: "account_name", Type: text, Editable: false)
    * `debit` (Label: "debit", Type: text, Editable: false)
    * `credit` (Label: "credit", Type: text, Editable: false)
* **Table: Table7**
  * Server-side Pagination: `false`
  * Columns:
    * `source_table` (Label: "source_table", Type: text, Editable: false)
    * `running_balance` (Label: "running_balance", Type: text, Editable: false)
    * `trans_date` (Label: "trans_date", Type: date, Editable: false)
    * `party_name` (Label: "party_name", Type: text, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
    * `amount_in` (Label: "amount_in", Type: text, Editable: false)
    * `amount_out` (Label: "amount_out", Type: text, Editable: false)
    * `liquid_account_id` (Label: "liquid_account_id", Type: text, Editable: false)
    * `source_id` (Label: "source_id", Type: text, Editable: false)
    * `bank_statement_entry_id` (Label: "bank_statement_entry_id", Type: text, Editable: false)
    * `journal_entry_id` (Label: "journal_entry_id", Type: text, Editable: false)
    * `direct_bank_id` (Label: "direct_bank_id", Type: text, Editable: false)
* **Table: Table8**
  * Server-side Pagination: `false`
  * Columns:
    * `allocation_id` (Label: "allocation_id", Type: text, Editable: false)
    * `allocated_amount` (Label: "allocated_amount", Type: text, Editable: false)
    * `allocated_at` (Label: "allocated_at", Type: date, Editable: false)
    * `allocation_status` (Label: "allocation_status", Type: text, Editable: false)
    * `payment_number` (Label: "payment_number", Type: text, Editable: false)
    * `payment_date` (Label: "payment_date", Type: date, Editable: false)
    * `payment_mode` (Label: "payment_mode", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `invoice_date` (Label: "invoice_date", Type: date, Editable: false)
    * `invoice_amount` (Label: "invoice_amount", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `payment_id` (Label: "payment_id", Type: text, Editable: false)
    * `bank_name` (Label: "bank_name", Type: text, Editable: false)
    * `transaction_ref` (Label: "transaction_ref", Type: text, Editable: false)
    * `bank_statement_entry_id` (Label: "bank_statement_entry_id", Type: text, Editable: false)
* **Table: Table9**
  * Server-side Pagination: `false`
  * Columns:
    * `code` (Label: "code", Type: number, Editable: false)
    * `name` (Label: "Particulars", Type: text, Editable: false)
    * `amount` (Label: "Amount", Type: text, Editable: false)
* **Table: Table10**
  * Server-side Pagination: `false`
  * Columns:
    * `code` (Label: "code", Type: number, Editable: false)
    * `name` (Label: "Particulars", Type: text, Editable: false)
    * `amount` (Label: "Amount", Type: number, Editable: false)
* **Table: Table11**
  * Server-side Pagination: `false`
  * Columns:
    * `code` (Label: "code", Type: number, Editable: false)
    * `name` (Label: "Particulars", Type: text, Editable: false)
    * `amount` (Label: "Amount", Type: number, Editable: false)
* **Table: Table12**
  * Server-side Pagination: `false`
  * Columns:
    * `code` (Label: "code", Type: number, Editable: false)
    * `name` (Label: "Pariculars", Type: text, Editable: false)
    * `amount` (Label: "Amount", Type: number, Editable: false)
* **Table: tblStockReport**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `vendor_id` (Label: "vendor_id", Type: text, Editable: false)
    * `brand_id` (Label: "brand_id", Type: text, Editable: false)
    * `category_id` (Label: "category_id", Type: text, Editable: false)
    * `product_code` (Label: "product_code", Type: text, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `ean_code` (Label: "ean_code", Type: text, Editable: false)
    * `hsn_id` (Label: "hsn_id", Type: text, Editable: false)
    * `mrp` (Label: "mrp", Type: text, Editable: false)
    * `tax_id` (Label: "tax_id", Type: text, Editable: false)
    * `purchase_rate` (Label: "purchase_rate", Type: text, Editable: false)
    * `distributor_rate` (Label: "distributor_rate", Type: text, Editable: false)
    * `wholesale_rate` (Label: "wholesale_rate", Type: text, Editable: false)
    * `dealer_rate` (Label: "dealer_rate", Type: text, Editable: false)
    * `retail_rate` (Label: "retail_rate", Type: text, Editable: false)
    * `is_active` (Label: "is_active", Type: checkbox, Editable: false)
    * `current_stock` (Label: "current_stock", Type: text, Editable: false)
    * `damaged_stock` (Label: "damaged_stock", Type: text, Editable: false)
    * `case_quantity` (Label: "case_quantity", Type: number, Editable: false)
    * `uom` (Label: "uom", Type: text, Editable: false)
    * `model_number` (Label: "model_number", Type: text, Editable: false)
    * `min_stock_level` (Label: "min_stock_level", Type: number, Editable: false)
    * `box_length_cm` (Label: "box_length_cm", Type: text, Editable: false)
    * `box_width_cm` (Label: "box_width_cm", Type: text, Editable: false)
    * `box_height_cm` (Label: "box_height_cm", Type: text, Editable: false)
    * `weight_kg` (Label: "weight_kg", Type: text, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
    * `stock_damage` (Label: "stock_damage", Type: text, Editable: false)
    * `stock_expiry` (Label: "stock_expiry", Type: text, Editable: false)
    * `stock_value_cost` (Label: "stock_value_cost", Type: text, Editable: false)
    * `stock_value_gross` (Label: "stock_value_gross", Type: text, Editable: false)
    * `stock_value_total_bought` (Label: "stock_value_total_bought", Type: text, Editable: false)
    * `total_units_bought` (Label: "total_units_bought", Type: text, Editable: false)
    * `total_units_sold` (Label: "total_units_sold", Type: text, Editable: false)
    * `sales_value_taxable` (Label: "sales_value_taxable", Type: text, Editable: false)
    * `total_cogs_value` (Label: "total_cogs_value", Type: text, Editable: false)
    * `margin_amount` (Label: "margin_amount", Type: text, Editable: false)
    * `margin_percentage` (Label: "margin_percentage", Type: text, Editable: false)
    * `total_units_returned` (Label: "total_units_returned", Type: text, Editable: false)
    * `total_units_adjusted` (Label: "total_units_adjusted", Type: text, Editable: false)
    * `in_transit_qty` (Label: "in_transit_qty", Type: text, Editable: false)
    * `last_sold_date` (Label: "last_sold_date", Type: date, Editable: false)
    * `last_purchased_date` (Label: "last_purchased_date", Type: date, Editable: false)
    * `brand_name` (Label: "brand_name", Type: text, Editable: false)
    * `category_name` (Label: "category_name", Type: text, Editable: false)
    * `tax_name` (Label: "tax_name", Type: text, Editable: false)
    * `tax_percentage` (Label: "tax_percentage", Type: text, Editable: false)
    * `hsn_code` (Label: "hsn_code", Type: text, Editable: false)
* **Table: tblSalary**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: number, Editable: false)
    * `employee_id` (Label: "employee_id", Type: number, Editable: false)
    * `full_name` (Label: "full_name", Type: text, Editable: false)
    * `employee_code` (Label: "employee_code", Type: text, Editable: false)
    * `month` (Label: "month", Type: number, Editable: false)
    * `year` (Label: "year", Type: number, Editable: false)
    * `net_salary` (Label: "net_salary", Type: text, Editable: false)
    * `payment_mode` (Label: "payment_mode", Type: text, Editable: false)
    * `payment_date` (Label: "payment_date", Type: date, Editable: false)
    * `processed_at` (Label: "processed_at", Type: date, Editable: false)
    * `source_account` (Label: "source_account", Type: text, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
    * `customColumn2` (Label: "PDF", Type: iconButton, Editable: false)
* **Table: Table13**
  * Server-side Pagination: `false`
  * Columns:
    * `line_id` (Label: "line_id", Type: text, Editable: false)
    * `purchase_invoice_header_id` (Label: "purchase_invoice_header_id", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `vendor_invoice_number` (Label: "vendor_invoice_number", Type: text, Editable: false)
    * `vendor_invoice_date` (Label: "vendor_invoice_date", Type: date, Editable: false)
    * `received_date` (Label: "received_date", Type: date, Editable: false)
    * `vendor_id` (Label: "vendor_id", Type: text, Editable: false)
    * `vendor_name` (Label: "vendor_name", Type: text, Editable: false)
    * `product_id` (Label: "product_id", Type: text, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `product_code` (Label: "product_code", Type: text, Editable: false)
    * `ean_code` (Label: "ean_code", Type: text, Editable: false)
    * `brand_id` (Label: "brand_id", Type: text, Editable: false)
    * `brand_name` (Label: "brand_name", Type: text, Editable: false)
    * `accepted_qty` (Label: "accepted_qty", Type: text, Editable: false)
    * `rate` (Label: "rate", Type: text, Editable: false)
    * `discount_percent` (Label: "discount_percent", Type: text, Editable: false)
    * `discount_amount` (Label: "discount_amount", Type: text, Editable: false)
    * `scheme_amount` (Label: "scheme_amount", Type: text, Editable: false)
    * `tax_amount` (Label: "tax_amount", Type: text, Editable: false)
    * `net_amount` (Label: "net_amount", Type: text, Editable: false)
    * `taxable_amount` (Label: "taxable_amount", Type: text, Editable: false)
    * `tax_percentage` (Label: "tax_percentage", Type: text, Editable: false)
    * `mrp` (Label: "mrp", Type: text, Editable: false)
    * `batch_code` (Label: "batch_code", Type: text, Editable: false)
    * `expiry_date` (Label: "expiry_date", Type: date, Editable: false)
* **Table: Table14**
  * Server-side Pagination: `false`
  * Columns:
    * `Brand_Name` (Label: "Brand Name", Type: text, Editable: false)
    * `Purchase_Value` (Label: "Purchase Value", Type: number, Editable: false)
* **Table: Table14Copy**
  * Server-side Pagination: `false`
  * Columns:
    * `Purchase_Value` (Label: "Purchase Value", Type: number, Editable: false)
    * `Product_Name` (Label: "Product Name", Type: text, Editable: false)
* **Table: tblSalesLines_**
  * Server-side Pagination: `false`
  * Columns:
    * `line_id` (Label: "line_id", Type: text, Editable: false)
    * `invoice_id` (Label: "invoice_id", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `invoice_date` (Label: "invoice_date", Type: date, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `product_id` (Label: "product_id", Type: text, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `product_code` (Label: "product_code", Type: text, Editable: false)
    * `ean_code` (Label: "ean_code", Type: text, Editable: false)
    * `brand_id` (Label: "brand_id", Type: text, Editable: false)
    * `brand_name` (Label: "brand_name", Type: text, Editable: false)
    * `shipped_qty` (Label: "shipped_qty", Type: text, Editable: false)
    * `selling_rate` (Label: "selling_rate", Type: text, Editable: false)
    * `tax_percent` (Label: "tax_percent", Type: text, Editable: false)
    * `tax_amount` (Label: "tax_amount", Type: text, Editable: false)
    * `gross_amount` (Label: "gross_amount", Type: text, Editable: false)
    * `scheme_amount` (Label: "scheme_amount", Type: text, Editable: false)
    * `discount_percent` (Label: "discount_percent", Type: text, Editable: false)
    * `discount_amount` (Label: "discount_amount", Type: text, Editable: false)
    * `taxable_sales_value` (Label: "taxable_sales_value", Type: text, Editable: false)
    * `net_sales_value` (Label: "net_sales_value", Type: text, Editable: false)
    * `batch_id` (Label: "batch_id", Type: text, Editable: false)
    * `batch_code` (Label: "batch_code", Type: text, Editable: false)
    * `purchase_rate` (Label: "purchase_rate", Type: text, Editable: false)
    * `cogs` (Label: "cogs", Type: currency, Editable: false)
    * `margin_amount` (Label: "margin_amount", Type: currency, Editable: false)
    * `margin_percentage` (Label: "margin_percentage", Type: text, Editable: false)
    * `mrp` (Label: "mrp", Type: text, Editable: false)

### 4. Dropdowns & Inputs
* **Select: SelectDse**
* **Select: SelectRoute**
* **Select: SelectBank**
* **Select: Select_Account**
* **Select: fySelect**
* **Select: qSelect**
* **Select: mSelect**
* **Select: sltDseDash**
* **Select: SelectFY**
* **Select: SelectMonth**
* **Select: SelectVendor**
  * OnChange Event: `"{{getPurchaseLines.run()}}"`
* **Select: SelectCustomer**

---

## Page: HR

### 1. JS Objects & Custom Functions
* **Utils**
* **UpdateSalary**
* **AdvanceUtils**
* **SalaryUtils**

### 2. Queries & Data Bindings
* **getDesignations** [undefined] [DS: RenderCloud] -> `GET /api/employees/designations`
* **getBanksGen** [undefined] [DS: RenderCloud] -> `GET /api/master/banks`
* **createEmployee** [undefined] [DS: RenderCloud] -> `POST /api/employees`
* **getMe** [undefined] [DS: RenderCloud] -> `GET /api/employees/profile`
* **saveEmployee** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getEmployeeList** [undefined] [DS: RenderCloud] -> `GET /api/employees`
* **getSalaryHistory** [undefined] [DS: RenderCloud] -> `GET /api/employees/{{tblEmployees.triggeredRow.id}}/salary-history`
* **updateSalary** [undefined] [DS: RenderCloud] -> `POST /api/employees/{{ JSONFormUpdateSalary.formData.employee_id }}/salary-update`
* **handleSalaryUpdate** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **bulkSalaryUpdate** [undefined] [DS: RenderCloud] -> `POST /api/employees/bulk-salary-update`
* **bulkAttendanceAPI** [undefined] [DS: RenderCloud] -> `POST /api/employees/bulk-attendance`
* **EmployeeAttendanceHistory** [undefined] [DS: RenderCloud] -> `GET /api/employees/{{tblEmployees.triggeredRow.id}}/attendance`
* **getAccounts** [undefined] [DS: RenderCloud] -> `GET /api/bank-accounts`
* **getUnconsumedDebits** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/bank/unconsumed-debits`
* **bulkAdvanceAPI** [undefined] [DS: RenderCloud] -> `POST /api/employees/bulk-salary-advance`
* **getPayload** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **saveAdvances** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getBulkPayload** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getSalaryPreview** [undefined] [DS: RenderCloud] -> `GET /api/employees/salary-preview`
* **bulkSalaryPayment** [undefined] [DS: RenderCloud] -> `POST /api/employees/bulk-salary-payment`
* **bulkBonusPost** [undefined] [DS: RenderCloud] -> `POST /api/employees/bulk-bonus`
* **markResignedAPI** [undefined] [DS: RenderCloud] -> `POST //api/employees/{{tblEmployees.triggeredRow.id}}/resign`
* **getInvoices** [undefined] [DS: RenderCloud] -> `GET /api/sales/invoices/lookup`
* **apiCreateLiability** [undefined] [DS: RenderCloud] -> `POST /api/employees/liabilities`
* **get_employee_profile_api** [undefined] [DS: RenderCloud] -> `GET /api/employees/profile/{{tblEmployees.triggeredRow.id}}`
* **getSalaryAdvance** [undefined] [DS: RenderCloud] -> `GET /api/employees/advances`
* **deleteAdvance** [undefined] [DS: RenderCloud] -> `DELETE /api/employees/advances/{{tblEmployeeAdvances.triggeredRow.id}}`

### 3. Data Tables & Interactive Grid Rules
* **Table: tblEmployees**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `employee_code` (Label: "employee_code", Type: text, Editable: false)
    * `full_name` (Label: "full_name", Type: text, Editable: false)
    * `gender` (Label: "gender", Type: text, Editable: false)
    * `contact_primary` (Label: "contact_primary", Type: number, Editable: false)
    * `contact_secondary` (Label: "contact_secondary", Type: text, Editable: false)
    * `email` (Label: "email", Type: text, Editable: false)
    * `address` (Label: "address", Type: text, Editable: false)
    * `designation_id` (Label: "designation_id", Type: text, Editable: false)
    * `joining_date` (Label: "joining_date", Type: date, Editable: false)
    * `resignation_date` (Label: "resignation_date", Type: text, Editable: false)
    * `employment_status` (Label: "employment_status", Type: text, Editable: false)
    * `shift_start_time` (Label: "shift_start_time", Type: text, Editable: false)
    * `shift_end_time` (Label: "shift_end_time", Type: text, Editable: false)
    * `aadhar_no` (Label: "aadhar_no", Type: text, Editable: false)
    * `license_no` (Label: "license_no", Type: text, Editable: false)
    * `bank_name` (Label: "bank_name", Type: text, Editable: false)
    * `account_no` (Label: "account_no", Type: text, Editable: false)
    * `ifsc_code` (Label: "ifsc_code", Type: text, Editable: false)
    * `emergency_contact_name` (Label: "emergency_contact_name", Type: text, Editable: false)
    * `emergency_contact_number` (Label: "emergency_contact_number", Type: text, Editable: false)
    * `emergency_relation` (Label: "emergency_relation", Type: text, Editable: false)
    * `doc_aadhar_url` (Label: "doc_aadhar_url", Type: text, Editable: false)
    * `doc_license_url` (Label: "doc_license_url", Type: text, Editable: false)
    * `doc_certificate_url` (Label: "doc_certificate_url", Type: text, Editable: false)
    * `login_pin` (Label: "login_pin", Type: text, Editable: false)
    * `designation_name` (Label: "designation_name", Type: text, Editable: false)
    * `department_name` (Label: "department_name", Type: text, Editable: false)
    * `current_salary` (Label: "current_salary", Type: text, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
* **Table: tblBulkUpdate**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `full_name` (Label: "full_name", Type: text, Editable: false)
    * `current_salary` (Label: "current_salary", Type: number, Editable: false)
    * `new_salary` (Label: "new_salary", Type: number, Editable: true)
* **Table: Table2**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `employee_code` (Label: "employee_code", Type: text, Editable: false)
    * `full_name` (Label: "full_name", Type: text, Editable: false)
    * `gender` (Label: "gender", Type: text, Editable: false)
    * `contact_primary` (Label: "contact_primary", Type: text, Editable: false)
    * `contact_secondary` (Label: "contact_secondary", Type: text, Editable: false)
    * `email` (Label: "email", Type: text, Editable: false)
    * `address` (Label: "address", Type: text, Editable: false)
    * `designation_id` (Label: "designation_id", Type: text, Editable: false)
    * `joining_date` (Label: "joining_date", Type: date, Editable: false)
    * `resignation_date` (Label: "resignation_date", Type: text, Editable: false)
    * `employment_status` (Label: "employment_status", Type: text, Editable: false)
    * `shift_start_time` (Label: "shift_start_time", Type: text, Editable: false)
    * `shift_end_time` (Label: "shift_end_time", Type: text, Editable: false)
    * `aadhar_no` (Label: "aadhar_no", Type: text, Editable: false)
    * `license_no` (Label: "license_no", Type: text, Editable: false)
    * `bank_name` (Label: "bank_name", Type: text, Editable: false)
    * `account_no` (Label: "account_no", Type: text, Editable: false)
    * `ifsc_code` (Label: "ifsc_code", Type: text, Editable: false)
    * `emergency_contact_name` (Label: "emergency_contact_name", Type: text, Editable: false)
    * `emergency_contact_number` (Label: "emergency_contact_number", Type: text, Editable: false)
    * `emergency_relation` (Label: "emergency_relation", Type: text, Editable: false)
    * `doc_aadhar_url` (Label: "doc_aadhar_url", Type: text, Editable: false)
    * `doc_license_url` (Label: "doc_license_url", Type: text, Editable: false)
    * `doc_certificate_url` (Label: "doc_certificate_url", Type: text, Editable: false)
    * `login_pin` (Label: "login_pin", Type: text, Editable: false)
    * `designation_name` (Label: "designation_name", Type: text, Editable: false)
    * `department_name` (Label: "department_name", Type: text, Editable: false)
    * `current_salary` (Label: "current_salary", Type: text, Editable: false)
* **Table: tblAdvancePreview**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `full_name` (Label: "full_name", Type: text, Editable: false)
    * `employee_code` (Label: "employee_code", Type: text, Editable: false)
    * `amount` (Label: "amount", Type: number, Editable: true)
    * `payment_mode` (Label: "payment_mode", Type: select, Editable: true)
    * `from_account_id` (Label: "from_account_id", Type: select, Editable: true)
    * `bank_statement_entry_id` (Label: "bank_statement_entry_id", Type: select, Editable: true)
* **Table: tblSalaryPreview**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `full_name` (Label: "full_name", Type: text, Editable: false)
    * `employee_code` (Label: "employee_code", Type: text, Editable: false)
    * `base_salary` (Label: "base_salary", Type: text, Editable: false)
    * `absent_days` (Label: "absent_days", Type: text, Editable: false)
    * `half_days` (Label: "half_days", Type: text, Editable: false)
    * `advance_deduction` (Label: "advance_deduction", Type: text, Editable: false)
    * `loan_deduction` (Label: "loan_deduction", Type: text, Editable: false)
    * `leave_deduction` (Label: "leave_deduction", Type: text, Editable: false)
    * `net_salary` (Label: "net_salary", Type: text, Editable: false)
    * `payment_mode` (Label: "payment_mode", Type: select, Editable: true)
    * `from_account_id` (Label: "from_account_id", Type: select, Editable: true)
    * `bank_statement_entry_id` (Label: "bank_statement_entry_id", Type: select, Editable: true)
    * `bonus_addition` (Label: "bonus_addition", Type: text, Editable: false)
    * `leave_encashment` (Label: "leave_encashment", Type: text, Editable: false)
    * `joining_date` (Label: "joining_date", Type: date, Editable: false)
    * `resignation_date` (Label: "resignation_date", Type: date, Editable: false)
    * `misc_liabilities` (Label: "misc_liabilities", Type: text, Editable: false)
    * `adjusted_base_salary` (Label: "adjusted_base_salary", Type: text, Editable: false)
    * `total_deductions` (Label: "total_deductions", Type: text, Editable: false)
    * `total_additions` (Label: "total_additions", Type: text, Editable: false)
    * `employment_status` (Label: "employment_status", Type: text, Editable: false)
* **Table: tblBonusEditor**
  * Server-side Pagination: `false`
  * Columns:
    * `employee_id` (Label: "employee_id", Type: text, Editable: false)
    * `full_name` (Label: "full_name", Type: text, Editable: false)
    * `amount` (Label: "amount", Type: currency, Editable: true)
    * `remarks` (Label: "remarks", Type: text, Editable: true)
    * `bonus_type` (Label: "bonus_type", Type: select, Editable: true)
    * `employee_code` (Label: "employee_code", Type: text, Editable: false)
* **Table: tblEmployeeAdvances**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: number, Editable: false)
    * `employee_id` (Label: "employee_id", Type: number, Editable: false)
    * `advance_date` (Label: "advance_date", Type: date, Editable: false)
    * `amount` (Label: "amount", Type: text, Editable: false)
    * `payment_mode` (Label: "payment_mode", Type: text, Editable: false)
    * `from_account_id` (Label: "from_account_id", Type: number, Editable: false)
    * `bank_statement_entry_id` (Label: "bank_statement_entry_id", Type: text, Editable: false)
    * `journal_entry_id` (Label: "journal_entry_id", Type: text, Editable: false)
    * `remarks` (Label: "remarks", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `created_by` (Label: "created_by", Type: number, Editable: false)
    * `is_settled` (Label: "is_settled", Type: checkbox, Editable: false)
    * `salary_payment_id` (Label: "salary_payment_id", Type: text, Editable: false)
    * `employee_name` (Label: "employee_name", Type: text, Editable: false)
    * `employee_code` (Label: "employee_code", Type: text, Editable: false)
    * `customColumn1` (Label: "Delete", Type: iconButton, Editable: false)

### 4. Dropdowns & Inputs
* **Select: selBulkReason**
* **Select: selAttendanceStatus**
* **Select: selMonth**
* **Select: selYear**
* **Select: selBulkMode**
* **Select: selBulkAccountRefNo**
* **Select: selBulkAccount**

---

## Page: Payment Settlement

### 1. JS Objects & Custom Functions
* **utils**
* **utilsdisable**

### 2. Queries & Data Bindings
* **getPendingReports** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/list`
* **getReportDetails** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/{{ tblPendingDSR.triggeredRow.report_id }}/details`
* **getSyncExpenses** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/expenses`
* **processExpenseAPI** [undefined] [DS: RenderCloud] -> `POST /api/finance/reconciliation/expenses/{{ tblExpenses.triggeredRow.id }}/process`
* **getMe** [undefined] [DS: RenderCloud] -> `GET /api/employees/profile`
* **bulkUpdateAPI** [undefined] [DS: RenderCloud] -> `POST /api/finance/reconciliation/bulk-update`
* **getUnconsumedCredits** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/bank/unconsumed-credits`
* **getMergedData** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **syncEdit** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getSummaryStats** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getCashRequirement** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **isCashMatching** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getEnteredCashTotal** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **approveRow** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getCategoryStats** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **stageCategory** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **canApproveOnline** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `

### 3. Data Tables & Interactive Grid Rules
* **Table: tblPendingDSR**
  * Server-side Pagination: `false`
  * Columns:
    * `report_id` (Label: "report_id", Type: text, Editable: false)
    * `report_date` (Label: "report_date", Type: date, Editable: false)
    * `dse_name` (Label: "dse_name", Type: text, Editable: false)
    * `settlement_status` (Label: "settlement_status", Type: text, Editable: false)
    * `total_payment_collection` (Label: "total_payment_collection", Type: text, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
    * `pending_payment_count` (Label: "pending_payment_count", Type: text, Editable: false)
    * `pending_expense_count` (Label: "pending_expense_count", Type: text, Editable: false)
    * `sync_time` (Label: "sync_time", Type: date, Editable: false)
    * `sync_id` (Label: "sync_id", Type: text, Editable: false)
* **Table: Table2**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `payment_date` (Label: "payment_date", Type: date, Editable: false)
    * `amount` (Label: "amount", Type: text, Editable: false)
    * `payment_mode` (Label: "payment_mode", Type: text, Editable: false)
    * `cheque_number` (Label: "cheque_number", Type: text, Editable: false)
    * `cheque_date` (Label: "cheque_date", Type: date, Editable: false)
    * `bank_name` (Label: "bank_name", Type: text, Editable: false)
    * `bank_id` (Label: "bank_id", Type: text, Editable: false)
    * `transaction_reference` (Label: "transaction_reference", Type: text, Editable: false)
    * `verification_status` (Label: "verification_status", Type: text, Editable: false)
    * `rejection_reason` (Label: "rejection_reason", Type: text, Editable: false)
    * `bank_match_status` (Label: "bank_match_status", Type: text, Editable: false)
    * `bank_total_amount` (Label: "bank_total_amount", Type: text, Editable: false)
    * `bank_consumed_amount` (Label: "bank_consumed_amount", Type: text, Editable: false)
    * `bank_stmt_id` (Label: "bank_stmt_id", Type: text, Editable: false)
    * `selected_invoices` (Label: "selected_invoices", Type: text, Editable: false)
* **Table: tblExpenses**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `expense_type` (Label: "expense_type", Type: text, Editable: false)
    * `amount` (Label: "amount", Type: text, Editable: false)
    * `description` (Label: "description", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `rejection_reason` (Label: "rejection_reason", Type: text, Editable: false)
    * `customColumn1` (Label: "Approve", Type: iconButton, Editable: false)
    * `customColumn2` (Label: "Reject", Type: iconButton, Editable: false)
* **Table: tblCash**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `payment_date` (Label: "payment_date", Type: date, Editable: false)
    * `amount` (Label: "amount", Type: text, Editable: false)
    * `payment_mode` (Label: "payment_mode", Type: text, Editable: false)
    * `cheque_number` (Label: "cheque_number", Type: text, Editable: false)
    * `cheque_date` (Label: "cheque_date", Type: text, Editable: false)
    * `bank_name` (Label: "bank_name", Type: text, Editable: false)
    * `bank_id` (Label: "bank_id", Type: text, Editable: false)
    * `transaction_reference` (Label: "transaction_reference", Type: text, Editable: false)
    * `verification_status` (Label: "verification_status", Type: text, Editable: false)
    * `rejection_reason` (Label: "rejection_reason", Type: select, Editable: true)
    * `bank_match_status` (Label: "bank_match_status", Type: text, Editable: false)
    * `bank_total_amount` (Label: "bank_total_amount", Type: text, Editable: false)
    * `bank_consumed_amount` (Label: "bank_consumed_amount", Type: text, Editable: false)
    * `bank_stmt_id` (Label: "bank_stmt_id", Type: text, Editable: false)
    * `selected_invoices` (Label: "selected_invoices", Type: text, Editable: false)
* **Table: tblCheque**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `payment_date` (Label: "payment_date", Type: date, Editable: false)
    * `amount` (Label: "amount", Type: text, Editable: false)
    * `payment_mode` (Label: "payment_mode", Type: text, Editable: false)
    * `cheque_number` (Label: "cheque_number", Type: text, Editable: false)
    * `cheque_date` (Label: "cheque_date", Type: date, Editable: false)
    * `bank_name` (Label: "bank_name", Type: text, Editable: false)
    * `bank_id` (Label: "bank_id", Type: text, Editable: false)
    * `transaction_reference` (Label: "transaction_reference", Type: text, Editable: false)
    * `verification_status` (Label: "verification_status", Type: text, Editable: false)
    * `rejection_reason` (Label: "rejection_reason", Type: select, Editable: true)
    * `bank_match_status` (Label: "bank_match_status", Type: text, Editable: false)
    * `bank_total_amount` (Label: "bank_total_amount", Type: text, Editable: false)
    * `bank_consumed_amount` (Label: "bank_consumed_amount", Type: text, Editable: false)
    * `bank_stmt_id` (Label: "bank_stmt_id", Type: text, Editable: false)
    * `selected_invoices` (Label: "selected_invoices", Type: text, Editable: false)
* **Table: tblOnline**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `payment_date` (Label: "payment_date", Type: date, Editable: false)
    * `amount` (Label: "amount", Type: text, Editable: false)
    * `payment_mode` (Label: "payment_mode", Type: text, Editable: false)
    * `cheque_number` (Label: "cheque_number", Type: text, Editable: false)
    * `cheque_date` (Label: "cheque_date", Type: date, Editable: false)
    * `bank_name` (Label: "bank_name", Type: text, Editable: false)
    * `bank_id` (Label: "bank_id", Type: text, Editable: false)
    * `transaction_reference` (Label: "transaction_reference", Type: text, Editable: false)
    * `verification_status` (Label: "verification_status", Type: text, Editable: false)
    * `rejection_reason` (Label: "rejection_reason", Type: select, Editable: true)
    * `bank_match_status` (Label: "bank_match_status", Type: text, Editable: false)
    * `bank_total_amount` (Label: "bank_total_amount", Type: text, Editable: false)
    * `bank_consumed_amount` (Label: "bank_consumed_amount", Type: text, Editable: false)
    * `bank_stmt_id` (Label: "bank_stmt_id", Type: select, Editable: true)
    * `selected_invoices` (Label: "selected_invoices", Type: text, Editable: false)
* **Table: Table3**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `denomination` (Label: "denomination", Type: text, Editable: false)
    * `dse_count` (Label: "dse_count", Type: number, Editable: false)
    * `finance_count` (Label: "finance_count", Type: number, Editable: true)
    * `customColumn1` (Label: "Total", Type: currency, Editable: false)

### 4. Dropdowns & Inputs
* **Select: sltStatus**
* **Select: selRejectReason**

---

## Page: Settings

### 1. JS Objects & Custom Functions
* **utilsBackups**
* **ThemeManager**

### 2. Queries & Data Bindings
* **triggerBackup** [undefined] [DS: RenderCloud] -> `POST /api/backups/trigger`
* **apiManualSync** [undefined] [DS: RenderCloud] -> `POST /api/dse/eod-sync`
* **runBackup** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **downloadBackup** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **apiListBackups** [undefined] [DS: RenderCloud] -> `GET /api/backups/list`
* **init** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **setTheme** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getThemeOptions** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `

### 3. Data Tables & Interactive Grid Rules
* **Table: Table1**
  * Server-side Pagination: `false`
  * Columns:
    * `name` (Label: "name", Type: text, Editable: false)
    * `size` (Label: "size", Type: text, Editable: false)
    * `createdAt` (Label: "createdAt", Type: date, Editable: false)
    * `customColumn1` (Label: "Download", Type: iconButton, Editable: false)

### 4. Dropdowns & Inputs
* None

---

## Page: Incentives

### 1. JS Objects & Custom Functions
* None

### 2. Queries & Data Bindings
* **_API_GetIncentivePlans** [undefined] [DS: RenderCloud] -> `GET /api/targets/plans`
* **Api1** [undefined] [DS: RenderCloud] -> `GET /api/products`
* **getBankStatement** [undefined] [DS: RenderCloud] -> `GET /api/finance/reconciliation/bank/list`
* **Api2** [undefined] [DS: RenderCloud] -> `GET /api/finance/loans`

### 3. Data Tables & Interactive Grid Rules
* None

### 4. Dropdowns & Inputs
* None

---

## Page: Supply Chain Management

### 1. JS Objects & Custom Functions
* **TripEditor**
* **SyncManager1**
* **TripReports**
* **Global_Assets**
* **TripActions**
* **utils**
* **DataFormatter**

### 2. Queries & Data Bindings
* **getTrips** [undefined] [DS: RenderCloud] -> `GET /api/delivery/trips`
* **getPickList** [undefined] [DS: RenderCloud] -> `GET /api/delivery/trips/{{ tblTripList.triggeredRow.id}}/picklist-web`
* **getDeliveryTeam** [undefined] [DS: RenderCloud] -> `GET /api/delivery/teams`
* **getDeliveryList** [undefined] [DS: RenderCloud] -> `GET /api/delivery/trips/{{ tblTripList.triggeredRow.id }}/manifest-web`
* **getPendingInvoices** [undefined] [DS: RenderCloud] -> `GET /api/delivery/invoices-pool`
* **updateTrip** [undefined] [DS: RenderCloud] -> `PUT /api/delivery/trips/{{ tblTripList.triggeredRow.id }}`
* **deleteTrip** [undefined] [DS: RenderCloud] -> `DELETE /api/delivery/trips/{{tblTripList.triggeredRow.id}}`
* **getSyncLogs** [undefined] [DS: RenderCloud] -> `GET /api/delivery/sync-logs`
* **getSyncDetails** [undefined] [DS: RenderCloud] -> `GET /api/delivery/sync/{{tblSyncLogs.triggeredRow.id}}/details`
* **initSyncDetails** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **settle** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **handleManifestEdit** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **handleReturnEdit** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **settleSyncAPI** [undefined] [DS: RenderCloud] -> `POST /api/delivery/verify/settle`
* **getMe** [undefined] [DS: RenderCloud] -> `GET /api/employees/profile`
* **createTrip** [undefined] [DS: RenderCloud] -> `POST /api/delivery/trips`
* **getVerfiedTrips** [undefined] [DS: RenderCloud] -> `GET /api/delivery/sync-logs/history`
* **verifiedTripHistory** [undefined] [DS: RenderCloud] -> `GET /api/delivery/sync/{{tblVerfiedTrips.triggeredRow.id}}/history`
* **getSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getLogo** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **_drawSimpleBox** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getUnifiedInvoiceDetail** [undefined] [DS: RenderCloud] -> `GET /api/sales/unified/{{this.params.id}}`
* **getBankDetails** [undefined] [DS: RenderCloud] -> `GET /api/sales/bank-details/3`
* **prepareEditMode** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **generateDeliveryList** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **downloadTripReports** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **generatePickList** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getCombinedInvoices** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **_drawSimpleBox** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **downloadBulkInvoices** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **downloadAllTripInvoices** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **previewInvoice** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **downloadBulkInvoices** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **previewInvoice** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **_drawSimpleBox** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **downloadAllTripInvoices** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getMergedData** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **mark_self_collected_api** [undefined] [DS: RenderCloud] -> `POST /api/delivery/mark-self-collected`
* **get_delivery_details** [undefined] [DS: RenderCloud] -> `GET /api/delivery/invoices/{{tblSales.triggeredRow.invoice_id}}/delivery-cycle`
* **getInvoices** [undefined] [DS: RenderCloud] -> `GET /api/sales/unified`
* **timeline** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **latestStatus** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **pickListBD** [undefined] [DS: RenderCloud] -> `GET /api/delivery/trips/{{tblTripList.triggeredRow.id}}/product-breakdown`
* **picklistDelivered** [undefined] [DS: RenderCloud] -> `GET //api/delivery/trips/{{ tblVerfiedTrips.triggeredRow.trip_id}}/picklist-web`

### 3. Data Tables & Interactive Grid Rules
* **Table: tblTripList**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `trip_number` (Label: "trip_number", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `team_name` (Label: "team_name", Type: text, Editable: false)
    * `driver_name` (Label: "driver_name", Type: text, Editable: false)
    * `vehicle_number` (Label: "vehicle_number", Type: text, Editable: false)
    * `invoice_count` (Label: "invoice_count", Type: text, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
    * `start_time` (Label: "start_time", Type: date, Editable: false)
    * `end_time` (Label: "end_time", Type: date, Editable: false)
    * `team_id` (Label: "team_id", Type: text, Editable: false)
    * `driver_id` (Label: "driver_id", Type: text, Editable: false)
* **Table: Table4**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `trip_id` (Label: "trip_id", Type: text, Editable: false)
    * `invoice_id` (Label: "invoice_id", Type: text, Editable: false)
    * `sequence_no` (Label: "sequence_no", Type: number, Editable: false)
    * `delivery_status` (Label: "delivery_status", Type: text, Editable: false)
    * `delivery_time` (Label: "delivery_time", Type: date, Editable: false)
    * `customer_signature_url` (Label: "customer_signature_url", Type: text, Editable: false)
    * `notes` (Label: "notes", Type: text, Editable: false)
    * `submitted_at` (Label: "submitted_at", Type: date, Editable: false)
    * `sync_id` (Label: "sync_id", Type: text, Editable: false)
    * `verification_status` (Label: "verification_status", Type: text, Editable: false)
    * `verified_by` (Label: "verified_by", Type: text, Editable: false)
    * `verified_at` (Label: "verified_at", Type: date, Editable: false)
    * `failure_reason` (Label: "failure_reason", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `grand_total` (Label: "grand_total", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
* **Table: Table7**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `trip_id` (Label: "trip_id", Type: text, Editable: false)
    * `invoice_id` (Label: "invoice_id", Type: text, Editable: false)
    * `sequence_no` (Label: "sequence_no", Type: number, Editable: false)
    * `delivery_status` (Label: "delivery_status", Type: text, Editable: false)
    * `delivery_time` (Label: "delivery_time", Type: date, Editable: false)
    * `customer_signature_url` (Label: "customer_signature_url", Type: text, Editable: false)
    * `notes` (Label: "notes", Type: text, Editable: false)
    * `submitted_at` (Label: "submitted_at", Type: date, Editable: false)
    * `sync_id` (Label: "sync_id", Type: text, Editable: false)
    * `verification_status` (Label: "verification_status", Type: text, Editable: false)
    * `verified_by` (Label: "verified_by", Type: text, Editable: false)
    * `verified_at` (Label: "verified_at", Type: date, Editable: false)
    * `failure_reason` (Label: "failure_reason", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `grand_total` (Label: "grand_total", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
* **Table: Table6**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `trip_id` (Label: "trip_id", Type: text, Editable: false)
    * `invoice_id` (Label: "invoice_id", Type: text, Editable: false)
    * `sequence_no` (Label: "sequence_no", Type: number, Editable: false)
    * `delivery_status` (Label: "delivery_status", Type: text, Editable: false)
    * `delivery_time` (Label: "delivery_time", Type: date, Editable: false)
    * `customer_signature_url` (Label: "customer_signature_url", Type: text, Editable: false)
    * `notes` (Label: "notes", Type: text, Editable: false)
    * `submitted_at` (Label: "submitted_at", Type: date, Editable: false)
    * `sync_id` (Label: "sync_id", Type: text, Editable: false)
    * `verification_status` (Label: "verification_status", Type: text, Editable: false)
    * `verified_by` (Label: "verified_by", Type: text, Editable: false)
    * `verified_at` (Label: "verified_at", Type: date, Editable: false)
    * `failure_reason` (Label: "failure_reason", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `grand_total` (Label: "grand_total", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
* **Table: Table5**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `invoice_id` (Label: "invoice_id", Type: text, Editable: false)
    * `sync_id` (Label: "sync_id", Type: text, Editable: false)
    * `grand_total` (Label: "grand_total", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `return_number` (Label: "return_number", Type: text, Editable: false)
    * `return_date` (Label: "return_date", Type: date, Editable: false)
    * `type` (Label: "type", Type: text, Editable: false)
    * `total_taxable` (Label: "total_taxable", Type: text, Editable: false)
    * `total_tax` (Label: "total_tax", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `remarks` (Label: "remarks", Type: text, Editable: false)
    * `created_by` (Label: "created_by", Type: text, Editable: false)
    * `applied_by` (Label: "applied_by", Type: text, Editable: false)
    * `applied_at` (Label: "applied_at", Type: text, Editable: false)
    * `is_active` (Label: "is_active", Type: checkbox, Editable: false)
* **Table: Table8**
  * Server-side Pagination: `false`
  * Columns:
    * `Category` (Label: "Category", Type: text, Editable: false)
    * `Product_Name` (Label: "Product Name", Type: text, Editable: false)
    * `Total_Qty` (Label: "Total Qty", Type: text, Editable: false)
    * `MRP` (Label: "MRP", Type: text, Editable: false)
    * `Total_Amount` (Label: "Total Amount", Type: text, Editable: false)
* **Table: Table10**
  * Server-side Pagination: `false`
  * Columns:
    * `product_id` (Label: "product_id", Type: text, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `product_code` (Label: "product_code", Type: text, Editable: false)
    * `mrp` (Label: "mrp", Type: text, Editable: false)
    * `total_qty` (Label: "total_qty", Type: text, Editable: false)
    * `batches` (Label: "batches", Type: text, Editable: false)
* **Table: tblVerfiedTrips**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `trip_id` (Label: "trip_id", Type: text, Editable: false)
    * `payload_summary` (Label: "payload_summary", Type: text, Editable: false)
    * `sync_type` (Label: "sync_type", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `trip_number` (Label: "trip_number", Type: text, Editable: false)
    * `driver_name` (Label: "driver_name", Type: text, Editable: false)
    * `manifest_count` (Label: "manifest_count", Type: text, Editable: false)
    * `return_count` (Label: "return_count", Type: text, Editable: false)
    * `customColumn2` (Label: "View", Type: iconButton, Editable: false)
* **Table: tblSyncLogs**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `trip_id` (Label: "trip_id", Type: text, Editable: false)
    * `payload_summary` (Label: "payload_summary", Type: text, Editable: false)
    * `sync_type` (Label: "sync_type", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `trip_number` (Label: "trip_number", Type: text, Editable: false)
    * `driver_name` (Label: "driver_name", Type: text, Editable: false)
    * `manifest_count` (Label: "manifest_count", Type: text, Editable: false)
    * `return_count` (Label: "return_count", Type: text, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
* **Table: tblSales**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `so_number` (Label: "so_number", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `dse_id` (Label: "dse_id", Type: text, Editable: false)
    * `dse_name` (Label: "dse_name", Type: text, Editable: false)
    * `order_date` (Label: "order_date", Type: date, Editable: false)
    * `delivery_date` (Label: "delivery_date", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `order_total` (Label: "order_total", Type: text, Editable: false)
    * `order_tax` (Label: "order_tax", Type: text, Editable: false)
    * `remarks` (Label: "remarks", Type: text, Editable: false)
    * `latitude` (Label: "latitude", Type: text, Editable: false)
    * `longitude` (Label: "longitude", Type: text, Editable: false)
    * `invoice_gross_amount` (Label: "invoice_gross_amount", Type: text, Editable: false)
    * `invoice_scheme_amount` (Label: "invoice_scheme_amount", Type: text, Editable: false)
    * `invoice_discount_amount` (Label: "invoice_discount_amount", Type: text, Editable: false)
    * `invoice_taxable_amount` (Label: "invoice_taxable_amount", Type: text, Editable: false)
    * `invoice_gst_amount` (Label: "invoice_gst_amount", Type: text, Editable: false)
    * `invoice_net_amount` (Label: "invoice_net_amount", Type: text, Editable: false)
    * `invoice_id` (Label: "invoice_id", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `invoice_date` (Label: "invoice_date", Type: date, Editable: false)
    * `grand_total` (Label: "grand_total", Type: text, Editable: false)
    * `total_taxable` (Label: "total_taxable", Type: text, Editable: false)
    * `total_cgst` (Label: "total_cgst", Type: text, Editable: false)
    * `total_sgst` (Label: "total_sgst", Type: text, Editable: false)
    * `total_gst` (Label: "total_gst", Type: text, Editable: false)
    * `invoice_status` (Label: "invoice_status", Type: text, Editable: false)
    * `delivery_status` (Label: "delivery_status", Type: text, Editable: false)
    * `delivered_in_trip` (Label: "delivered_in_trip", Type: text, Editable: false)
    * `trip_id` (Label: "trip_id", Type: text, Editable: false)
    * `gstin` (Label: "gstin", Type: text, Editable: false)
    * `route` (Label: "route", Type: text, Editable: false)
    * `customer_address` (Label: "customer_address", Type: text, Editable: false)
    * `district` (Label: "district", Type: text, Editable: false)
    * `pin_code` (Label: "pin_code", Type: text, Editable: false)
    * `paid_amount` (Label: "paid_amount", Type: text, Editable: false)
    * `balance_amount` (Label: "balance_amount", Type: text, Editable: false)
    * `display_number` (Label: "display_number", Type: text, Editable: false)
    * `display_amount` (Label: "display_amount", Type: text, Editable: false)
    * `document_type` (Label: "document_type", Type: text, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
* **Table: Table1**
  * Server-side Pagination: `false`
  * Columns:
    * `trip_invoice_id` (Label: "trip_invoice_id", Type: text, Editable: false)
    * `invoice_id` (Label: "invoice_id", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `invoice_date` (Label: "invoice_date", Type: date, Editable: false)
    * `grand_total` (Label: "grand_total", Type: text, Editable: false)
    * `balance_amount` (Label: "balance_amount", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `address` (Label: "address", Type: text, Editable: false)
    * `latitude` (Label: "latitude", Type: text, Editable: false)
    * `longitude` (Label: "longitude", Type: text, Editable: false)
    * `phone` (Label: "phone", Type: text, Editable: false)
    * `delivery_status` (Label: "delivery_status", Type: text, Editable: false)
    * `instructions` (Label: "instructions", Type: text, Editable: false)
    * `sales_order_id` (Label: "sales_order_id", Type: text, Editable: false)
* **Table: tblPicklist**
  * Server-side Pagination: `false`
  * Columns:
    * `product_id` (Label: "product_id", Type: text, Editable: true)
    * `product_name` (Label: "product_name", Type: text, Editable: true)
    * `product_code` (Label: "product_code", Type: text, Editable: true)
    * `mrp` (Label: "mrp", Type: text, Editable: true)
    * `total_qty` (Label: "total_qty", Type: text, Editable: true)
    * `batches` (Label: "batches", Type: text, Editable: true)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
* **Table: tblEditInvoices**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `grand_total` (Label: "grand_total", Type: text, Editable: false)
    * `current_status` (Label: "current_status", Type: text, Editable: false)
* **Table: Table9**
  * Server-side Pagination: `false`
  * Columns:
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `qty` (Label: "qty", Type: text, Editable: false)
    * `mrp` (Label: "mrp", Type: text, Editable: false)
* **Table: Table2**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `trip_id` (Label: "trip_id", Type: text, Editable: false)
    * `invoice_id` (Label: "invoice_id", Type: text, Editable: false)
    * `sequence_no` (Label: "sequence_no", Type: number, Editable: false)
    * `delivery_status` (Label: "delivery_status", Type: text, Editable: false)
    * `delivery_time` (Label: "delivery_time", Type: date, Editable: false)
    * `customer_signature_url` (Label: "customer_signature_url", Type: text, Editable: false)
    * `notes` (Label: "notes", Type: text, Editable: false)
    * `submitted_at` (Label: "submitted_at", Type: date, Editable: false)
    * `sync_id` (Label: "sync_id", Type: text, Editable: false)
    * `verification_status` (Label: "verification_status", Type: text, Editable: false)
    * `verified_by` (Label: "verified_by", Type: text, Editable: false)
    * `verified_at` (Label: "verified_at", Type: text, Editable: false)
    * `failure_reason` (Label: "failure_reason", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `grand_total` (Label: "grand_total", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `colVerification` (Label: "colVerification", Type: select, Editable: true)
* **Table: Table3**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `trip_id` (Label: "trip_id", Type: text, Editable: false)
    * `invoice_id` (Label: "invoice_id", Type: text, Editable: false)
    * `product_id` (Label: "product_id", Type: text, Editable: false)
    * `return_type` (Label: "return_type", Type: text, Editable: false)
    * `qty` (Label: "qty", Type: text, Editable: false)
    * `reason` (Label: "reason", Type: text, Editable: false)
    * `verification_status` (Label: "verification_status", Type: text, Editable: false)
    * `verified_by` (Label: "verified_by", Type: text, Editable: false)
    * `verified_at` (Label: "verified_at", Type: date, Editable: false)
    * `created_at` (Label: "created_at", Type: date, Editable: false)
    * `batch_id` (Label: "batch_id", Type: text, Editable: false)
    * `condition` (Label: "condition", Type: text, Editable: false)
    * `customer_id` (Label: "customer_id", Type: text, Editable: false)
    * `sync_id` (Label: "sync_id", Type: text, Editable: false)
    * `sales_return_id` (Label: "sales_return_id", Type: text, Editable: false)
    * `offline_id` (Label: "offline_id", Type: text, Editable: false)
    * `report_id` (Label: "report_id", Type: text, Editable: false)
    * `product_name` (Label: "product_name", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `colReturnStatus` (Label: "colReturnStatus", Type: select, Editable: true)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
* **Table: tblPendingInvoices**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `invoice_date` (Label: "invoice_date", Type: date, Editable: false)
    * `grand_total` (Label: "grand_total", Type: text, Editable: false)
    * `delivery_status` (Label: "delivery_status", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `latitude` (Label: "latitude", Type: text, Editable: false)
    * `longitude` (Label: "longitude", Type: text, Editable: false)
    * `route_sequence` (Label: "route_sequence", Type: number, Editable: false)
    * `route_name` (Label: "route_name", Type: text, Editable: false)
    * `dse_name` (Label: "dse_name", Type: text, Editable: false)
* **Table: tblSelfCollectInvoices**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `invoice_number` (Label: "invoice_number", Type: text, Editable: false)
    * `invoice_date` (Label: "invoice_date", Type: date, Editable: false)
    * `grand_total` (Label: "grand_total", Type: text, Editable: false)
    * `delivery_status` (Label: "delivery_status", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `latitude` (Label: "latitude", Type: text, Editable: false)
    * `longitude` (Label: "longitude", Type: text, Editable: false)
    * `route_sequence` (Label: "route_sequence", Type: number, Editable: false)
    * `route_name` (Label: "route_name", Type: text, Editable: false)
    * `dse_name` (Label: "dse_name", Type: text, Editable: false)
    * `customColumn1` (Label: "Mark Collected", Type: button, Editable: false)

### 4. Dropdowns & Inputs
* **Select: selTeamEdit**
* **Select: selTeam**
* **Select: selIDType**

---

## Page: Credit Note

### 1. JS Objects & Custom Functions
* **CreditNoteManager**
* **Global_Assets**
* **init_js**
* **CN_Helper**
* **taxSummary**

### 2. Queries & Data Bindings
* **getCreditNote** [undefined] [DS: RenderCloud] -> `GET /api/sales-returns`
* **getSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getLogo** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **onPageLoad** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getCustomersInvoice** [undefined] [DS: RenderCloud] -> `GET //api/customers/{{selCustomer.selectedOptionValue}}/pending-bills`
* **get_existing_returns** [undefined] [DS: RenderCloud] -> `GET /api/sales/returns`
* **getCustomers** [undefined] [DS: RenderCloud] -> `GET /api/customers`
* **getProducts** [undefined] [DS: RenderCloud] -> `GET /api/products`
* **save_manual_cn** [undefined] [DS: RenderCloud] -> `POST /api/sales/returns/manual`
* **getBatch** [undefined] [DS: RenderCloud] -> `GET /api/products/batches`
* **deleteCN** [undefined] [DS: RenderCloud] -> `DELETE /api/sales-returns/{{tblCreditNote.triggeredRow.id}}`
* **loadInvoiceItems** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **loadAllProducts** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **updateRow** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getTaxSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getFinalItems** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **_drawSimpleBox** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **previewCreditNote** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getTaxSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getFinalItems** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **loadInvoiceItems** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **updateRow** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **loadAllProducts** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `

### 3. Data Tables & Interactive Grid Rules
* **Table: tblCreditNote**
  * Server-side Pagination: `false`
  * Columns:
    * `id` (Label: "id", Type: text, Editable: false)
    * `return_number` (Label: "return_number", Type: text, Editable: false)
    * `return_date` (Label: "return_date", Type: date, Editable: false)
    * `type` (Label: "type", Type: text, Editable: false)
    * `total_taxable` (Label: "total_taxable", Type: text, Editable: false)
    * `total_tax` (Label: "total_tax", Type: text, Editable: false)
    * `status` (Label: "status", Type: text, Editable: false)
    * `customer_name` (Label: "customer_name", Type: text, Editable: false)
    * `created_by_name` (Label: "created_by_name", Type: text, Editable: false)
    * `items` (Label: "items", Type: text, Editable: false)
    * `customColumn1` (Label: "View", Type: iconButton, Editable: false)
    * `amount` (Label: "amount", Type: text, Editable: false)
    * `reason` (Label: "reason", Type: text, Editable: false)
    * `customer_gst` (Label: "customer_gst", Type: text, Editable: false)
    * `customer_contact` (Label: "customer_contact", Type: text, Editable: false)
    * `customer_email` (Label: "customer_email", Type: text, Editable: false)
    * `customer_address` (Label: "customer_address", Type: text, Editable: false)
    * `customer_district` (Label: "customer_district", Type: text, Editable: false)
    * `customer_pin` (Label: "customer_pin", Type: text, Editable: false)
    * `linked_invoice_number` (Label: "linked_invoice_number", Type: text, Editable: false)
    * `customColumn2` (Label: "PDF", Type: iconButton, Editable: false)
* **Table: Table1**
  * Server-side Pagination: `false`
  * Columns:
    * `S_No` (Label: "S.No", Type: number, Editable: false)
    * `EAN_Code` (Label: "EAN Code", Type: text, Editable: false)
    * `product_code` (Label: "product_code", Type: text, Editable: false)
    * `hsn_code` (Label: "hsn_code", Type: text, Editable: false)
    * `Item_Name` (Label: "Item Name", Type: text, Editable: false)
    * `MRP` (Label: "MRP", Type: number, Editable: false)
    * `Price` (Label: "Price", Type: number, Editable: false)
    * `Qty` (Label: "Qty", Type: number, Editable: false)
    * `Sch` (Label: "Sch", Type: number, Editable: false)
    * `Disc__` (Label: "Disc %", Type: number, Editable: false)
    * `GST__` (Label: "GST %", Type: number, Editable: false)
    * `Gross__` (Label: "Gross $", Type: number, Editable: false)
    * `Disc___` (Label: "Disc. $", Type: number, Editable: false)
    * `Taxable__` (Label: "Taxable $", Type: number, Editable: false)
    * `GST__1` (Label: "GST $", Type: number, Editable: false)
    * `Net__` (Label: "Net $", Type: number, Editable: false)
    * `Batch_No` (Label: "Batch No", Type: text, Editable: false)
    * `Expiry` (Label: "Expiry", Type: date, Editable: false)
    * `_product_id` (Label: "_product_id", Type: number, Editable: false)
* **Table: tblCreditLines**
  * Server-side Pagination: `false`
  * Columns:
    * `_product_id` (Label: "_product_id", Type: text, Editable: false)
    * `Item_Name` (Label: "Item Name", Type: text, Editable: false)
    * `batch_id` (Label: "batch_id", Type: select, Editable: true)
    * `Qty` (Label: "Qty", Type: number, Editable: true)
    * `Price` (Label: "Price", Type: number, Editable: false)
    * `Sch` (Label: "Sch", Type: number, Editable: true)
    * `Disc__` (Label: "Disc %", Type: number, Editable: true)
    * `GST__` (Label: "GST %", Type: number, Editable: false)
    * `Invoiced_Qty` (Label: "Invoiced Qty", Type: text, Editable: false)
    * `Taxable__` (Label: "Taxable $", Type: number, Editable: false)
    * `GST__1` (Label: "GST $", Type: number, Editable: false)
    * `Net__` (Label: "Net $", Type: number, Editable: false)
    * `MRP` (Label: "MRP", Type: number, Editable: false)
    * `Gross__` (Label: "Gross $", Type: number, Editable: false)
    * `Disc___` (Label: "Disc. $", Type: number, Editable: false)
    * `_batches` (Label: "_batches", Type: text, Editable: false)
    * `inventory_status` (Label: "inventory_status", Type: select, Editable: true)
    * `return_to_stock` (Label: "return_to_stock", Type: checkbox, Editable: false)
* **Table: Table2**
  * Server-side Pagination: `false`
  * Columns:
    * `PARTICULARS` (Label: "PARTICULARS", Type: text, Editable: false)
    * `Pcs` (Label: "Pcs", Type: number, Editable: false)
    * `Gross` (Label: "Gross", Type: number, Editable: false)
    * `Sch` (Label: "Sch", Type: number, Editable: false)
    * `Disc` (Label: "Disc", Type: number, Editable: false)
    * `Taxable` (Label: "Taxable", Type: number, Editable: false)
    * `Tax` (Label: "Tax", Type: number, Editable: false)
    * `Net` (Label: "Net", Type: number, Editable: false)

### 4. Dropdowns & Inputs
* **Select: selCustomer**
* **Select: selInvoice**
  * OnChange Event: `"{{ CN_Helper.loadInvoiceItems() }}"`
* **Select: selAdjType**

---

## Page: GST

### 1. JS Objects & Custom Functions
* **GstUtils**
* **Gstr1Engine**

### 2. Queries & Data Bindings
* **getGstr1** [undefined] [DS: RenderCloud] -> `GET /api/finance/gst/gstr1`
* **getGstr3b** [undefined] [DS: RenderCloud] -> `GET /api/finance/gst/gstr3b`
* **handleExport** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getHsnSummary** [undefined] [DS: RenderCloud] -> `GET /api/finance/gst/hsn-summary`
* **downloadPortalJson** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `

### 3. Data Tables & Interactive Grid Rules
* None

### 4. Dropdowns & Inputs
* None

---

## Page: Login

### 1. JS Objects & Custom Functions
* None

### 2. Queries & Data Bindings
* None

### 3. Data Tables & Interactive Grid Rules
* None

### 4. Dropdowns & Inputs
* None

---

## Page: Letterhead Editor

### 1. JS Objects & Custom Functions
* **LetterheadJS**
* **Global_Assets**

### 2. Queries & Data Bindings
* **apiGetLetters** [undefined] [DS: RenderCloud] -> `GET /api/letters`
* **apiSendLetter** [undefined] [DS: RenderCloud] -> `POST /api/letters/send`

### 3. Data Tables & Interactive Grid Rules
* **Table: tblHistory**
  * Server-side Pagination: `false`
  * Columns:
    * `letter_code` (Label: "Letter Ref", Type: text, Editable: false)
    * `date` (Label: "Date", Type: text, Editable: false)
    * `recipient_name` (Label: "Recipient", Type: text, Editable: false)
    * `subject` (Label: "Subject", Type: text, Editable: false)
    * `is_sent` (Label: "Email Dispatched", Type: text, Editable: false)

### 4. Dropdowns & Inputs
* None

---

## Page: Page1

### 1. JS Objects & Custom Functions
* **Global_Assets**
* **InvoiceUtils**

### 2. Queries & Data Bindings
* **getSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getLogo** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **downloadTemplate** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **groupRows** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **normalizeRow** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **_blankCustomer** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **generateInvoicesFromFile** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **previewInvoice** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getSummary** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **_drawSimpleBox** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getCustomerDetails** [undefined] [DS: UNUSED_DATASOURCE] -> `DB `
* **getBankDetails** [undefined] [DS: RenderCloud] -> `GET /api/sales/bank-details/3`

### 3. Data Tables & Interactive Grid Rules
* None

### 4. Dropdowns & Inputs
* None

---

