<Screen
  id="Inventory_Management"
  _customShortcuts={[]}
  _hashParams={[]}
  _order={0}
  _searchParams={[]}
  browserTitle={null}
  title={null}
  urlSlug={null}
  uuid="43ef26a3-932f-4ba6-a2d0-ae97ecbfb6ea"
>
  <RESTQuery
    id="Vendors"
    enableTransformer={true}
    isMultiplayerEdited={false}
    query="api/vendors"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    resourceTypeOverride=""
    transformer="return data.data"
  />
  <RESTQuery
    id="Tax"
    query="api/master/taxes"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    resourceTypeOverride=""
  />
  <RESTQuery
    id="getBankAccounts"
    query="api/bank-accounts"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
  />
  <State id="printState" value="{}" />
  <State id="isPrinting" value="false" />
  <State id="poLines" value="[]" />
  <JavascriptQuery
    id="PopulateProductsTablebyVendors"
    isMultiplayerEdited={false}
    notificationDuration={4.5}
    query={include("../lib/PopulateProductsTablebyVendors.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <RESTQuery
    id="submitPO"
    body="{{ payload }}"
    bodyType="raw"
    cookies="[]"
    headers={'[{"key":"Content-Type","value":"application/json"}]'}
    notificationDuration={4.5}
    query="api/purchase-orders?"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
    showSuccessToaster={false}
    type="POST"
  />
  <RESTQuery
    id="Products"
    enableTransformer={true}
    isMultiplayerEdited={false}
    notificationDuration={4.5}
    query="api/products"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    resourceTypeOverride=""
    showSuccessToaster={false}
  />
  <RESTQuery
    id="getNextPO"
    query="api/documents/next/PO"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
  />
  <State id="poCounter" value="1" />
  <JavascriptQuery
    id="savePOLine"
    notificationDuration={4.5}
    query={include("../lib/savePOLine.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <RESTQuery
    id="getvendoraddress"
    notificationDuration={4.5}
    query="api/master/vendor-addresses"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    resourceTypeOverride=""
    showSuccessToaster={false}
  />
  <JavascriptQuery
    id="populateDrawerFromPO"
    isMultiplayerEdited={false}
    notificationDuration={4.5}
    query={include("../lib/populateDrawerFromPO.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <RESTQuery
    id="getPOs"
    enableTransformer={true}
    notificationDuration={4.5}
    query="api/purchase-orders"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    showSuccessToaster={false}
    transformer="return data.data"
  />
  <State id="varPOViewId" value="[]" />
  <State id="varPOViewLines" value="[]" />
  <State id="varPOMode" value={'"VIEW"'} />
  <JavascriptQuery
    id="editPOHandler"
    notificationDuration={4.5}
    query={include("../lib/editPOHandler.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <Function
    id="transformerPreparePO"
    funcBody={include("../lib/transformerPreparePO.js", "string")}
  />
  <JavascriptQuery
    id="triggerUpdatePO"
    isMultiplayerEdited={false}
    notificationDuration={4.5}
    query={include("../lib/triggerUpdatePO.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <RESTQuery
    id="updatePOQuery"
    body="{{ payload }}"
    bodyType="raw"
    headers={'[{"key":"Content-Type","value":"application/json"}]'}
    notificationDuration={4.5}
    query="api/purchase-orders/{{ varPOViewId.value }}"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
    showSuccessToaster={false}
    type="PUT"
  />
  <RESTQuery
    id="getPurchaseInvoices"
    isMultiplayerEdited={false}
    query="api/purchase-invoices"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
  >
    <Event
      id="ae2449fc"
      event="success"
      method="setValue"
      params={{ map: { value: "{{ getPurchaseInvoices.data }}" } }}
      pluginId="varGRNList"
      type="state"
      waitMs="0"
      waitType="debounce"
    />
  </RESTQuery>
  <State id="piLines" value="[]" />
  <RESTQuery
    id="saveGRN"
    body="{{ varGRNPayload.value }}"
    bodyType="raw"
    headers={'[{"key":"Content-Type","value":"application/json"}]'}
    isMultiplayerEdited={false}
    notificationDuration={4.5}
    query="api/purchase-invoices?"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
    showSuccessToaster={false}
    type="POST"
  />
  <JavascriptQuery
    id="saveGRNJS"
    isMultiplayerEdited={false}
    notificationDuration={4.5}
    query={include("../lib/saveGRNJS.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  >
    <Event
      id="840edda7"
      event="success"
      method="trigger"
      params={{}}
      pluginId="getGRNList"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
  </JavascriptQuery>
  <JavascriptQuery
    id="EditGrnTable"
    notificationDuration={4.5}
    query={include("../lib/EditGrnTable.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <State id="varGRNPayload" value="{}" />
  <JavascriptQuery
    id="vendorSelectJS"
    isMultiplayerEdited={false}
    notificationDuration={4.5}
    query={include("../lib/vendorSelectJS.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <RESTQuery
    id="getPOForGRN"
    enableTransformer={true}
    isMultiplayerEdited={false}
    query="api/purchase-orders/{{ varPOViewId.value }}?"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    transformer={
      '// API returns { header: {...}, lines: [...] }\nconst lines = data.lines || [];\nreturn lines.map(row => {\n  // 1. Calculations\n  // USE MASTER DATA if available (per user request), fallback to PO logic\n  const qty = Number(row.ordered_qty || 0);\n  const price = Number(row.purchase_rate || row.price || 0); // Prefer Master Price\n  const mrp = Number(row.product_mrp || row.mrp || 0);        // Prefer Master MRP\n  const sch = Number(row.scheme_amount || 0);\n  const discPct = Number(row.discount_percent || 0);\n  const taxPct = Number(row.tax_percent || 5); // From Master (Products table)\n  const gross = qty * price;\n  // Discount is typically on (Gross - Scheme)\n  const discAmt = (gross - sch) * (discPct / 100);\n  const taxable = gross - sch - discAmt;\n  const taxAmt = taxable * (taxPct / 100);\n  const net = taxable + taxAmt;\n  // 2. Return Unified Row\n  return {\n    "S.No": 0, // Will be re-indexed later\n    "EAN Code": row.ean_code || "",\n    "Item Name": row.product_name,\n    "MRP": mrp,\n    "Price": price,\n    "Qty": qty,\n    "Sch": sch,\n    "Disc %": discPct,\n    "GST %": taxPct,\n    "Gross $": Number(gross.toFixed(2)),\n    "Disc. $": Number(discAmt.toFixed(2)),\n    "Taxable $": Number(taxable.toFixed(2)),\n    "GST $": Number(taxAmt.toFixed(2)),\n    "Net $": Number(net.toFixed(2)),\n    "Batch No": "",       // GRN Specific\n    "Expiry": null,       // GRN Specific\n    "_product_id": row.product_id\n  };\n});'
    }
  >
    <Event
      id="d215de06"
      event="success"
      method="setValue"
      params={{ map: { value: "{{ getPOForGRN.data }}" } }}
      pluginId="piLines"
      type="state"
      waitMs="0"
      waitType="debounce"
    />
  </RESTQuery>
  <RESTQuery
    id="getPOById"
    isMultiplayerEdited={false}
    query="api/purchase-orders/{{ poListTable.selectedRow.id }}"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
  />
  <JavascriptQuery
    id="addRestOfProducts"
    notificationDuration={4.5}
    query={include("../lib/addRestOfProducts.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <RESTQuery
    id="getGRNList"
    enableTransformer={true}
    isMultiplayerEdited={false}
    query="api/purchase-invoices"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    transformer={
      'return data.map(row => ({\n  "id": row.id, \n  "Internal ID": row.invoice_number,\n  "Bill No": row.vendor_invoice_number,\n  "Vendor": row.vendor_name,\n  "Vendor ID": row.vendor_id, \n  "PO No": row.po_number || "-",\n  "Date": row.received_date,\n  "Total $": Number(row.grand_total || 0),\n  "Status": row.status,\n  "Paid $": Number(row.paid_amount || 0),\n  "Balance $": Number(row.balance || 0),\n  \n  // --- NEW FIELD FOR TABLE ---\n  "lines_json": row.lines_json \n}));'
    }
  />
  <State id="varSelectedVendor" value="[]" />
  <State id="varPaymentAmount" value="0" />
  <RESTQuery
    id="getVendorLedger"
    isMultiplayerEdited={false}
    query="api/vendor-payments/ledger/{{ varSelectedVendor.value.id }}"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
  />
  <JavascriptQuery
    id="savePaymentJS"
    isMultiplayerEdited={false}
    notificationDuration={4.5}
    query={include("../lib/savePaymentJS.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <RESTQuery
    id="apiMakePayment"
    body="{{ payload }}"
    bodyType="raw"
    headers={'[{"key":"Content-Type","value":"application/json"}]'}
    query="api/vendor-payments"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
    type="POST"
  />
  <JavascriptQuery
    id="getVendorPendingBills"
    notificationDuration={4.5}
    query={include("../lib/getVendorPendingBills.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <State id="varDebitAmount" value="0" />
  <JavascriptQuery
    id="populateDebitTableJS"
    isMultiplayerEdited={false}
    notificationDuration={4.5}
    query={include("../lib/populateDebitTableJS.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <State id="varDebitLinesData" value="[]" />
  <JavascriptQuery
    id="saveDebitNoteJS"
    notificationDuration={4.5}
    query={include("../lib/saveDebitNoteJS.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <RESTQuery
    id="apiCreateDebitNote"
    body="{{ payload }}"
    bodyType="raw"
    enableTransformer={true}
    headers={'[{"key":"Content-Type","value":"application/json"}]'}
    notificationDuration={4.5}
    query="api/debit-notes"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
    showSuccessToaster={false}
    type="POST"
  />
  <RESTQuery
    id="getVendorDebitNotes"
    query="api/debit-notes/vendor/{{ varSelectedVendor.value.id }}"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
  />
  <Function
    id="stmtTransformer"
    funcBody={include("../lib/stmtTransformer.js", "string")}
  />
  <RESTQuery
    id="apiCreateVendor"
    body={
      '{\n  "vendor_code": "", // Leave empty for Auto-Generation\n  "vendor_name": "{{ inpNewVendorName.value }}",\n  "gst": "{{ inpNewVendorGST.value }}",\n  "pan": "{{ inpNewVendorPan.value }}",\n  "contact_no": "{{ inpNewVendorPhone.value }}",\n  "email": "{{ inpNewVendorEmail.value }}",\n  "address_line1": "{{ inpNewVendorAddress1.value }}",\n  "state": "{{ inpNewVendorState.value }}",\n  "district": "{{ inpNewVendorDistrict.value }}",\n  "pin_code": "{{ inpNewVendorPin.value }}",\n  "bank_name": "{{ inpNewVendorBankName.value }}",\n  "bank_account_no": "{{ inpNewVendorBankAcc.value }}",\n  "bank_ifsc": "{{ inpNewVendorIFSC.value }}"\n}'
    }
    bodyType="raw"
    headers={'[{"key":"Content-Type","value":"application/json"}]'}
    isMultiplayerEdited={false}
    query="api/vendors"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
    type="POST"
  />
  <RESTQuery
    id="getBrands"
    query="api/master/brands"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
  />
  <RESTQuery
    id="getCategories"
    query="api/master/categories"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
  />
  <RESTQuery
    id="getHSN"
    query="api/master/hsn"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
  />
  <RESTQuery
    id="apiCreateProduct"
    body={
      '{\n  "product_name": "{{ inpNewProductName.value }}",\n  "ean_code": "{{ inpNewProductEan.value }}",\n  "brand_id": "{{ selNewProductBrand.value }}",\n  "category_id": "{{ selNewProductCategory.value }}",\n  "vendor_id": "{{ selNewProductVendor.value }}",\n  "hsn_id": "{{ selNewProductHSN.value }}",\n  "tax_id": "{{ selNewProductTax.value }}",\n  "mrp": "{{ inpNewProductMRP.value }}",\n  "purchase_rate": "{{ inpNewProductPurchaseRate.value }}",\n  "distributor_rate": "{{ inpNewProductDistRate.value }}",\n  "wholesale_rate": "{{ inpNewProductWholesaleRate.value }}",\n  "dealer_rate": "{{ inpNewProductDealerRate.value }}",\n  "retail_rate": "{{ inpNewProductRetailRate.value }}"\n}'
    }
    bodyType="raw"
    headers={'[{"key":"Content-Type","value":"application/json"}]'}
    isMultiplayerEdited={false}
    query="api/products"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
    type="POST"
  />
  <State id="varImportData" value="[]" />
  <State id="varImportErrors" value="[]" />
  <JavascriptQuery
    id="validateImportJS"
    isMultiplayerEdited={false}
    notificationDuration={4.5}
    query={include("../lib/validateImportJS.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  >
    <Event
      id="5d79f963"
      event="success"
      method="show"
      params={{}}
      pluginId="modalFrameImport"
      type="widget"
      waitMs="0"
      waitType="debounce"
    />
  </JavascriptQuery>
  <RESTQuery
    id="apiBulkImport"
    body={'{\n  "items": {{ varImportData.value }} \n}'}
    bodyType="raw"
    headers={'[{"key":"Content-Type","value":"application/json"}]'}
    isMultiplayerEdited={false}
    query="api/products/import"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
    type="POST"
  >
    <Event
      id="8f815b1f"
      event="success"
      method="trigger"
      params={{}}
      pluginId="Products"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
    <Event
      id="6bdcc412"
      event="success"
      method="trigger"
      params={{}}
      pluginId="postImportCleanupJS"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
    <Event
      id="e3fe0022"
      event="failure"
      method="showNotification"
      params={{
        map: {
          options: { notificationType: "error", title: "", description: "" },
        },
      }}
      pluginId=""
      type="util"
      waitMs="0"
      waitType="debounce"
    />
  </RESTQuery>
  <JavascriptQuery
    id="postImportCleanupJS"
    isMultiplayerEdited={false}
    notificationDuration={4.5}
    query={include("../lib/postImportCleanupJS.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  >
    <Event
      id="f0b24600"
      event="success"
      method="hide"
      params={{}}
      pluginId="modalUpload"
      type="widget"
      waitMs="0"
      waitType="debounce"
    />
  </JavascriptQuery>
  <RESTQuery
    id="getTemplateData"
    query="api/products/template-data"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
  />
  <RESTQuery
    id="apiBulkUpdate"
    body={'{ "items": {{ items }} }'}
    bodyType="raw"
    headers={'[{"key":"Content-Type","value":"application/json"}]'}
    query="api/products/bulk-update"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
    type="POST"
  />
  <State id="apiBaseUrl" value={'"https://distribution-erp.onrender.com"'} />
  <State id="varIsEditing" value="false" />
  <RESTQuery
    id="apiGetVendor"
    query="api/vendors/{{ tblVendors.selectedRow.id }}"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
  />
  <RESTQuery
    id="apiGetAddresses"
    query="api/vendors/{{ tblVendors.selectedRow.id }}/addresses"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
  />
  <RESTQuery
    id="apiAddAddress"
    body={
      '{\n  "address_line": {{txtNewAddress.value}},\n  "city": {{txtNewCity.value}},\n  "state_code": {{selNewState.value}},\n  "district": {{selNewDistrict.value}},\n  "pin_code": {{txtNewPin.value}},\n  "is_default": {{chkNewDefault.value}}\n}'
    }
    bodyType="raw"
    headers={'[{"key":"Content-Type","value":"application/json"}]'}
    query="api/vendors/{{ tblVendors.selectedRow.id }}/addresses"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
    type="POST"
  />
  <RESTQuery
    id="apiGetBank"
    query="api/master/banks"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
  />
  <RESTQuery
    id="apiUpdateVendor"
    body={
      '{\n  "vendor_name": {{txtVendorName.value}},\n  "contact_person": {{txtContactPerson.value}},\n  "contact_no": {{txtContactNo.value}},\n  "email": {{txtEmail.value}},\n  "gst": {{txtGST.value}},\n  "pan": {{txtPAN.value}},\n  "bank_name": {{txtBankName.value}},\n  "bank_account_no": {{txtAccountNo.value}},\n  "bank_ifsc": {{txtIFSC.value}}\n}'
    }
    bodyType="raw"
    headers={'[{"key":"Content-Type","value":"application/json"}]'}
    isMultiplayerEdited={false}
    query="api/vendors/{{ tblVendors.selectedRow.id }}"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
    type="PUT"
  />
  <JavascriptQuery
    id="jsStatesData"
    notificationDuration={4.5}
    query={include("../lib/jsStatesData.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <State id="varCorrectionID" value="" />
  <State id="varCorrectionData" value="{}" />
  <RESTQuery
    id="apiReverseGRN"
    body={'{\n  "reversed_by_id": {{ current_user.id }}\n}'}
    bodyType="raw"
    headers={'[{"key":"Content-Type","value":"application/json"}]'}
    query="api/purchase-invoices/{{ tblGrn.selectedRow.id }}/reverse"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
    type="POST"
  />
  <RESTQuery
    id="apiCreateGRN"
    body="{{ varGRNPayload.value }}"
    bodyType="raw"
    headers={
      '[{"key":"Content-Type","value":"application/json"},{"key":"","value":""}]'
    }
    isMultiplayerEdited={false}
    query="api/purchase-invoices"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
    type="POST"
  />
  <JavascriptQuery
    id="jsLoadCorrectionData"
    isMultiplayerEdited={false}
    notificationDuration={4.5}
    query={include("../lib/jsLoadCorrectionData.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <Function
    id="trnGRNSummary"
    funcBody={include("../lib/trnGRNSummary.js", "string")}
  />
  <State id="varModalMode" />
  <RESTQuery
    id="apiGetBatches"
    isMultiplayerEdited={false}
    query="api/stock/adjust/batches/{{ selAdjProduct.value }}?"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
  />
  <RESTQuery
    id="apiCreateStockAdjustment"
    body={'{\n  "items": {{ varAdjustmentList.value }}\n}'}
    bodyType="raw"
    headers={'[{"key":"Content-Type","value":"application/json"}]'}
    query="api/stock/adjust"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
    type="POST"
  />
  <State id="varAdjustmentList" value="[]" />
  <JavascriptQuery
    id="jsParseSmartUpload"
    notificationDuration={4.5}
    query={include("../lib/jsParseSmartUpload.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <JavascriptQuery
    id="jsCommitSmartUpdates"
    notificationDuration={4.5}
    query={include("../lib/jsCommitSmartUpdates.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  >
    <Event
      id="9f80700f"
      event="success"
      method="setValue"
      params={{ map: { value: "[]" } }}
      pluginId="varSmartUpdateData"
      type="state"
      waitMs="0"
      waitType="debounce"
    />
    <Event
      id="742c640b"
      event="success"
      method="hide"
      params={{}}
      pluginId="modalUpload"
      type="widget"
      waitMs="0"
      waitType="debounce"
    />
  </JavascriptQuery>
  <State id="varSmartUpdateData" value="[]" />
  <JavascriptQuery
    id="jsCreatePo"
    notificationDuration={4.5}
    query={include("../lib/jsCreatePo.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  >
    <Event
      id="9df08f06"
      event="success"
      method="trigger"
      params={{}}
      pluginId="getPOs"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
  </JavascriptQuery>
  <State id="varProductsCache" value="{{ Products.data }}" />
  <JavascriptQuery
    id="jsGroupProducts"
    isMultiplayerEdited={false}
    notificationDuration={4.5}
    query={include("../lib/jsGroupProducts.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <State id="varSelectedBrand" value="null" />
  <State id="varProductViewId" value="null" />
  <RESTQuery
    id="apiGetProductStats"
    isMultiplayerEdited={false}
    query="api/products/{{ varProductViewId.value }}/stats"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    runWhenModelUpdates={false}
  />
  <JavascriptQuery
    id="createDebitNoteJS"
    notificationDuration={4.5}
    query={include("../lib/createDebitNoteJS.js", "string")}
    resourceName="JavascriptQuery"
    showSuccessToaster={false}
  />
  <RESTQuery
    id="q_getUnconsumedDebits"
    notificationDuration={4.5}
    query="api/finance/reconciliation/bank/unconsumed-debits"
    resourceDisplayName="CloudSupabaseRender"
    resourceName="a4f226f3-b9e7-4041-bcec-47bdf5d3ab04"
    showSuccessToaster={false}
  />
  <Include src="./drawerBrand.rsx" />
  <Include src="./drawerCreatePO.rsx" />
  <Include src="./drawerProduct.rsx" />
  <Include src="./drawerVendorProfile.rsx" />
  <Include src="./modalAddAddress.rsx" />
  <Include src="./modalAddProduct.rsx" />
  <Include src="./modalDebitNote.rsx" />
  <Include src="./modalFrame1.rsx" />
  <Include src="./modalFrameGRN.rsx" />
  <Include src="./modalFrameImport.rsx" />
  <Include src="./modalMakePayment.rsx" />
  <Include src="./modalStockAdjust.rsx" />
  <Include src="./modalUpload.rsx" />
  <Include src="./modalViewGRN.rsx" />
  <Frame
    id="$main4"
    enableFullBleed={true}
    isHiddenOnDesktop={false}
    isHiddenOnMobile={false}
    padding="8px 12px"
    sticky={null}
    type="main"
  />
  <Frame
    id="$main"
    enableFullBleed={false}
    isHiddenOnDesktop={false}
    isHiddenOnMobile={false}
    padding="8px 12px"
    sticky={null}
    type="main"
  >
    <Include src="./tabbedContainer1.rsx" />
  </Frame>
</Screen>
