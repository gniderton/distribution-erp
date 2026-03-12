<DrawerFrame
  id="drawerCreatePO"
  footerPadding="8px 12px"
  headerPadding="8px 12px"
  hidden={true}
  hideOnEscape={true}
  padding="0"
  showFooter={true}
  showHeader={true}
  showOverlay={true}
  style={{}}
  width="70%"
>
  <Header>
    <Text
      id="drawerTitle1"
      imageWidth="fill"
      margin="0"
      overflowType="hidden"
      style={{}}
      value="### {{ varPOMode.value === 'CREATE' ? 'New Purchase Order' : (varPOMode.value === 'EDIT' ? 'Edit PO ' + (poNumber2.value || '') : 'View PO ' + (poNumber2.value || '')) }}"
      verticalAlign="center"
    />
    <Button
      id="drawerCloseButton1"
      ariaLabel="Close"
      horizontalAlign="right"
      iconBefore="bold/interface-delete-1"
      style={{ map: { border: "transparent" } }}
      styleVariant="outline"
    >
      <Event
        id="23f71d34"
        event="click"
        method="setHidden"
        params={{ map: { hidden: true } }}
        pluginId="drawerCreatePO"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="9e3c5b4f"
        event="click"
        method="trigger"
        params={{}}
        pluginId="Vendors"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="15523a9f"
        event="click"
        method="trigger"
        params={{}}
        pluginId="getvendoraddress"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
  </Header>
  <Body>
    <Button
      id="button4"
      hidden="{{ varPOMode.value !== 'VIEW' }}"
      style={{}}
      text="Edit PO"
    >
      <Event
        id="390d2a27"
        event="click"
        method="trigger"
        params={{}}
        pluginId="editPOHandler"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Button
      id="button5"
      hidden="{{ varPOMode.value !== 'EDIT' }}"
      style={{}}
      text="Update PO"
    >
      <Event
        id="12c3b750"
        event="click"
        method="trigger"
        params={{}}
        pluginId="triggerUpdatePO"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Button
      id="button1"
      hidden="{{ varPOMode.value !== 'CREATE' }}"
      style={{}}
      text="Create PO"
    >
      <Event
        id="a84e0b65"
        event="click"
        method="run"
        params={{
          map: {
            src: '/* --- SAVE & PRINT SCRIPT --- */\n\n// 1. FILTER INPUTS\nconst rawLines = poLines.value;\nconst validLines = rawLines.filter(row => Number(row.Qty) > 0);\n\nif (validLines.length === 0) {\n  utils.showNotification({ title: "Error", description: "No items to save!", notificationType: "error" });\n  return;\n}\nif (!vendorDropdown.value) {\n   utils.showNotification({ title: "Error", description: "Select a Vendor", notificationType: "error" });\n   return;\n}\n\n// 2. PREPARE PAYLOAD\n// Note: We use the local Component names directly\nconst dbPayloadLines = validLines.map(row => ({\n    product_id:         row._product_id,\n    ordered_qty:        Number(row.Qty),\n    mrp:                Number(row.MRP),\n    price:              Number(row.Price),\n    scheme_amount:      Number(row.Sch || 0),\n    discount_percent:   Number(row[\'Disc %\'] || 0),\n    tax_percent:        Number(row[\'GST %\'] || 0)\n}));\n\nconst dbPayload = {\n    vendor_id:      vendorDropdown.value,\n    remarks:        "", \n    lines:          dbPayloadLines\n};\n\n// 3. SEND TO SERVER\nutils.showNotification({ title: "Saving...", description: "Please wait...", notificationType: "info" });\nconst result = await submitPO.trigger({ additionalScope: { payload: dbPayload } });\n\nif (result?.success) {\n  \n  // 4. PREPARE PRINT DATA (For the Hidden Table)\n  const formattedPrintLines = validLines.map((row, i) => ({\n      "S.No": i+1,\n      "EAN Code": row[\'EAN Code\'] || "",\n      "Item Name": row[\'Item Name\'],\n      "MRP": Number(row.MRP).toFixed(2),\n      "Rate": Number(row.Price).toFixed(2),\n      "Qty": Number(row.Qty),\n      "Gross Amt": Number(row[\'Gross $\'] || 0).toFixed(2),\n      "Sch": Number(row.Sch || 0),\n      "Disc %": Number(row[\'Disc %\'] || 0),\n      "Disc Amt": Number(row[\'Disc $\'] || 0).toFixed(2),\n      "Taxable": Number(row[\'Taxable $\']).toFixed(2),\n      "GST %": Number(row[\'GST %\'] || 0),\n      "GST Amt": Number(row[\'GST $\']).toFixed(2),\n      "Net Amount": Number(row[\'Net $\']).toFixed(2)\n  }));\n  \n  // Update Global Variable (Print State)\n  await printState.setValue({\n      poNumber: result.po_number,\n      date: new Date().toLocaleDateString(),\n      vendorName: vendorDropdown.selectedLabel, // Uses Label (Name) instead of ID\n      lines: formattedPrintLines\n  });\n  \n  // 5. PRINT (Magic Swap)\n  isPrinting.setValue(true);\n  utils.showNotification({ title: "Generating PDF...", description: "Please wait...", notificationType: "info" });\n  await new Promise(r => setTimeout(r, 2500)); // Wait for render\n\n  // 6. DOWNLOAD\n  utils.downloadPage(result.po_number, { \n      componentsToInclude: [\'poTablePrint\'], // Make sure this Container/Table ID is correct!\n      scale: 0.6 \n  });\n  \n  // 7. CLEANUP\n  await new Promise(r => setTimeout(r, 1000));\n  isPrinting.setValue(false);\n  poLines.setValue([]);\n  vendorDropdown.setValue(null);\n  getNextPO.trigger();\n  \n  // 8. CLOSE DRAWER (New Step for UI)\n  drawerCreatePO.hide();\n}',
          },
        }}
        pluginId=""
        type="script"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Include src="./container6.rsx" />
  </Body>
</DrawerFrame>
