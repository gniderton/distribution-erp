<ModalFrame
  id="modalUpload"
  footerPadding="8px 12px"
  headerPadding="8px 12px"
  hidden="true"
  padding="8px 12px"
  showFooter={true}
  showFooterBorder={false}
  showHeader={true}
  showHeaderBorder={false}
  showOverlay={true}
  size="large"
>
  <Header>
    <Text
      id="text16"
      value="{{ varModalMode.value === 'bulk' ? 'Smart Bulk Update Manager' : 'New Product Import' }}"
      verticalAlign="center"
    />
    <Button
      id="modalCloseButton9"
      ariaLabel="Close"
      horizontalAlign="right"
      iconBefore="bold/interface-delete-1"
      style={{ map: { border: "transparent" } }}
      styleVariant="outline"
    >
      <Event
        id="3c78d559"
        event="click"
        method="setHidden"
        params={{ map: { hidden: true } }}
        pluginId="modalUpload"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="2e690c8e"
        event="click"
        method="run"
        params={{
          map: {
            src: "// Reset the file upload components\nfileBulkUpdate.reset();\nfileProductImport.reset();",
          },
        }}
        pluginId=""
        type="script"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="b7862f4a"
        event="click"
        method="setValue"
        params={{ map: { value: "null" } }}
        pluginId="varModalMode"
        type="state"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
  </Header>
  <Body>
    <FileButton
      id="fileProductImport"
      _isUpgraded={true}
      hidden="{{ varModalMode.value !== 'import' }}"
      iconBefore="bold/interface-upload-box-2"
      maxCount={20}
      maxSize="250mb"
      parseFiles={true}
      styleVariant="outline"
      text="Browse"
    >
      <Event
        id="d6d7b147"
        event="parse"
        method="trigger"
        params={{}}
        pluginId="validateImportJS"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </FileButton>
    <FileButton
      id="fileSmartUpload"
      _isUpgraded={true}
      accept=""
      hidden="{{ varModalMode.value !== 'bulk' }}"
      iconBefore="bold/programming-browser-search"
      maxCount={20}
      maxSize="250mb"
      parseFiles={true}
      style={{}}
      styleVariant="outline"
      text="Upload Edited CSV"
    >
      <Event
        id="ae6c93cb"
        event="parse"
        method="trigger"
        params={{}}
        pluginId="jsParseSmartUpload"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </FileButton>
    <Button
      id="btnDownloadTemplate"
      hidden="{{ varModalMode.value !== 'import' }}"
      iconBefore="bold/interface-download-desktop"
      text="Download Template"
    >
      <Event
        id="9b6227d8"
        event="click"
        method="run"
        params={{
          map: {
            src: 'const headers = [{\n  "Brand Name": "ExampleBrand",\n  "Category Name": "ExampleCategory",\n  "Vendor Name": "ExampleVendor", // Optional (Default: 4)\n  "Product Name": "New Product Name",\n  "Tax Name": "GST 5%", // Must match Tax Master\n  "HSN Code": "1234",\n  "EAN": "",\n  "MRP": 100,\n  "Purchase Rate": 80,\n  "Distributor Rate": 0,\n  "Wholesale Rate": 0,\n  "Dealer Rate": 0,\n  "Retail Rate": 0,\n  "Case Qty": 1,\n  "UOM": "Pcs",\n  "Model Number": "MOD-01",\n  "Min Stock": 10,\n  "Length(cm)": 10,\n  "Width(cm)": 5,\n  "Height(cm)": 5,\n  "Weight(kg)": 0.5,\n  "Description": "Product Details"\n}];\nutils.downloadFile({ data: headers, fileName: "product_import_template", fileType: "csv" });',
          },
        }}
        pluginId=""
        type="script"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Select
      id="selExportBrand"
      data="{{ getBrands.data }}"
      emptyMessage="No options"
      hidden="{{ varModalMode.value !== 'bulk' }}"
      hiddenByIndex=""
      label="Filter by Brand"
      labels="{{ item.brand_name }}"
      overlayMaxHeight={375}
      placeholder="All Brands"
      showClear={true}
      showSelectionIndicator={true}
      values="{{ item.id }}"
    />
    <Button
      id="btnSmartExport"
      hidden="{{ varModalMode.value !== 'bulk' || !selExportBrand.value }}"
      iconBefore="bold/interface-download-button-1"
      text="Download CSV"
    >
      <Event
        id="03c1217a"
        event="click"
        method="openUrl"
        params={{
          map: {
            url: "{{ apiBaseUrl.value }}/api/products/export?brand_id={{ selExportBrand.value }}",
          },
        }}
        pluginId=""
        type="util"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Table
      id="tblReviewUpdates"
      autoColumnWidth={true}
      cellSelection="none"
      clearChangesetOnSave={true}
      data="{{ varSmartUpdateData.value }}"
      defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
      emptyMessage="No rows found"
      enableSaveActions={true}
      hidden="{{ varModalMode.value !== 'bulk' }}"
      showBorder={true}
      showFooter={true}
      showHeader={true}
    >
      <Column
        id="81208"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Product ID"
        label="Product id"
        placeholder="Enter value"
        position="center"
        size={74.1875}
        summaryAggregationMode="none"
      />
      <Column
        id="528a5"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="Product Name"
        label="Product name"
        placeholder="Enter value"
        position="center"
        size={95.109375}
        summaryAggregationMode="none"
      />
      <Column
        id="f6d10"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="MRP"
        label="Mrp"
        placeholder="Enter value"
        position="center"
        size={38.4375}
        summaryAggregationMode="none"
      />
      <Column
        id="f2457"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Purchase Rate"
        label="Purchase rate"
        placeholder="Enter value"
        position="center"
        size={94.5625}
        summaryAggregationMode="none"
      />
      <Column
        id="ac776"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Distributor"
        label="Distributor"
        placeholder="Enter value"
        position="center"
        size={75.75}
        summaryAggregationMode="none"
      />
      <Column
        id="ef113"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Wholesale"
        label="Wholesale"
        placeholder="Enter value"
        position="center"
        size={74.34375}
        summaryAggregationMode="none"
      />
      <Column
        id="819dc"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Dealer"
        label="Dealer"
        placeholder="Enter value"
        position="center"
        size={52.6875}
        summaryAggregationMode="none"
      />
      <Column
        id="fde98"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Retail"
        label="Retail"
        placeholder="Enter value"
        position="center"
        size={47.421875}
        summaryAggregationMode="none"
      />
      <ToolbarButton
        id="4d"
        icon="bold/interface-arrows-round-left"
        label="Refresh"
        type="custom"
      >
        <Event
          id="856ad1a7"
          event="clickToolbar"
          method="refresh"
          pluginId="tblReviewUpdates"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
      </ToolbarButton>
      <ToolbarButton
        id="230a1"
        icon="bold/interface-arrows-turn-backward"
        label="Clear"
        type="custom"
      >
        <Event
          id="ae792b4a"
          event="clickToolbar"
          method="setValue"
          params={{ map: { value: "[]" } }}
          pluginId="varSmartUpdateData"
          type="state"
          waitMs="0"
          waitType="debounce"
        />
      </ToolbarButton>
      <ToolbarButton
        id="cded1"
        icon="bold/interface-upload-button-2"
        label="Save Changes"
        type="custom"
      >
        <Event
          id="f0c2139b"
          event="clickToolbar"
          method="trigger"
          params={{}}
          pluginId="apiBulkImport"
          type="datasource"
          waitMs="0"
          waitType="debounce"
        />
      </ToolbarButton>
    </Table>
  </Body>
</ModalFrame>
