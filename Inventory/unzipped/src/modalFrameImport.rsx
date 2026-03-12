<ModalFrame
  id="modalFrameImport"
  footerPadding="8px 12px"
  headerPadding="8px 12px"
  hidden={true}
  hideOnEscape={true}
  isHiddenOnMobile={true}
  overlayInteraction={true}
  padding="8px 12px"
  showFooter={true}
  showHeader={true}
  showOverlay={true}
  size="fullScreen"
>
  <Header>
    <Text id="modalTitle5" value="add product in bulk" verticalAlign="center" />
    <Button
      id="modalCloseButton6"
      ariaLabel="Close"
      horizontalAlign="right"
      iconBefore="line/interface-delete-circle"
      style={{ map: { border: "transparent" } }}
      styleVariant="outline"
    >
      <Event
        id="9328016d"
        event="click"
        method="setHidden"
        params={{ map: { hidden: true } }}
        pluginId="modalFrameImport"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
  </Header>
  <Body>
    <Text
      id="text14"
      hidden="{{ varImportData.value.length === 0 }}"
      value="Found {{ varImportData.value.length }} valid products"
      verticalAlign="center"
    />
    <Button
      id="btnConfirmImport"
      hidden="{{ varImportData.value.length === 0 }}"
      text="Import {{ varImportData.value.length }} Items"
    >
      <Event
        id="44423a9c"
        event="click"
        method="trigger"
        params={{}}
        pluginId="apiBulkImport"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="a8af40a4"
        event="click"
        method="trigger"
        params={{}}
        pluginId="postImportCleanupJS"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Text
      id="text15"
      hidden="{{ varImportData.value.length > 0 }}"
      value={
        'Found {{ varImportErrors.value.length }} errors. Please fix and re-upload." (Red)'
      }
      verticalAlign="center"
    />
    <Button
      id="btnDownloadErrors"
      hidden="{{ varImportData.value.length > 0 }}"
      text="Download Errors (CSV)"
    >
      <Event
        id="1d9a45da"
        event="click"
        method="exportData"
        params={{
          fileType: "csv",
          data: "{{ varImportErrors.value }}",
          fileName: "import_errors",
        }}
        pluginId=""
        type="util"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Table
      id="tblImportErrors"
      autoColumnWidth={true}
      cellSelection="none"
      clearChangesetOnSave={true}
      data="{{ varImportErrors.value }}"
      defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
      emptyMessage="No rows found"
      enableSaveActions={true}
      heightType="auto"
      hidden="{{ varImportData.value.length > 0 }}"
      rowHeight="medium"
      rowSelection="none"
      showBorder={true}
      showFooter={true}
      showHeader={true}
      toolbarPosition="bottom"
    >
      <Column
        id="36256"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="Error"
        label="Error"
        placeholder="Enter value"
        position="center"
        size={614.78125}
        summaryAggregationMode="none"
      />
      <Column
        id="182c4"
        alignment="right"
        editable={false}
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Row"
        label="Row"
        placeholder="Enter value"
        position="center"
        size={40.296875}
        summaryAggregationMode="none"
      />
      <Column
        id="9da7c"
        alignment="left"
        format="tag"
        formatOptions={{ automaticColors: true }}
        groupAggregationMode="none"
        key={'{"data":[{"Brand Name":"ExampleBrand"'}
        label="Data brand name example brand"
        placeholder="Select option"
        position="center"
        size={201.1875}
        summaryAggregationMode="none"
        valueOverride="{{ _.startCase(item) }}"
      />
      <Column
        id="db41b"
        alignment="left"
        format="tag"
        formatOptions={{ automaticColors: true }}
        groupAggregationMode="none"
        key={'Category Name:"ExampleCategory"'}
        label="Category name example category"
        placeholder="Select option"
        position="center"
        size={208.15625}
        summaryAggregationMode="none"
        valueOverride="{{ _.startCase(item) }}"
      />
      <Column
        id="031f2"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key={'Vendor Name:"ExampleVendor"'}
        label="Vendor name example vendor"
        placeholder="Enter value"
        position="center"
        size={185.09375}
        summaryAggregationMode="none"
      />
      <Column
        id="2bab9"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key={'Product Name:"New Product Name"'}
        label="Product name new product name"
        placeholder="Enter value"
        position="center"
        size={223.53125}
        summaryAggregationMode="none"
      />
      <Column
        id="33faa"
        alignment="left"
        format="tag"
        formatOptions={{ automaticColors: true }}
        groupAggregationMode="none"
        key={'Tax Name:"GST 5%"'}
        label="Tax name gst 5"
        placeholder="Select option"
        position="center"
        size={102.65625}
        summaryAggregationMode="none"
        valueOverride="{{ _.startCase(item) }}"
      />
      <Column
        id="01a2d"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key={'HSN Code:"1234"'}
        label="Hsn code 1234"
        placeholder="Enter value"
        position="center"
        size={101.40625}
        summaryAggregationMode="none"
      />
      <Column
        id="a6340"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key={'EAN:""'}
        label="Ean"
        placeholder="Enter value"
        position="center"
        size={36.96875}
        summaryAggregationMode="none"
      />
      <Column
        id="c7396"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="MRP:100"
        label="Mrp 100"
        placeholder="Enter value"
        position="center"
        size={62.40625}
        summaryAggregationMode="none"
      />
      <Column
        id="3e94a"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Purchase Rate:80"
        label="Purchase rate 80"
        placeholder="Enter value"
        position="center"
        size={112.84375}
        summaryAggregationMode="none"
      />
      <Column
        id="5a553"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Distributor Rate:0"
        label="Distributor rate 0"
        placeholder="Enter value"
        position="center"
        size={112.53125}
        summaryAggregationMode="none"
      />
      <Column
        id="b0124"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Wholesale Rate:0"
        label="Wholesale rate 0"
        placeholder="Enter value"
        position="center"
        size={111.125}
        summaryAggregationMode="none"
      />
      <Column
        id="064d7"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Dealer Rate:0"
        label="Dealer rate 0"
        placeholder="Enter value"
        position="center"
        size={89.453125}
        summaryAggregationMode="none"
      />
      <Column
        id="bbe9b"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Retail Rate:0}]"
        label="Retail rate 0"
        placeholder="Enter value"
        position="center"
        size={84.1875}
        summaryAggregationMode="none"
      />
      <Column
        id="171e5"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key={'fileName:"product_import_template"'}
        label="File name product import template"
        placeholder="Enter value"
        position="center"
        size={211.5625}
        summaryAggregationMode="none"
      />
      <Column
        id="94cfb"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key={'fileType:"csv"}'}
        label="File type csv"
        placeholder="Enter value"
        position="center"
        size={87.484375}
        summaryAggregationMode="none"
      />
    </Table>
    <Table
      id="tblImportPreview"
      autoColumnWidth={true}
      cellSelection="none"
      clearChangesetOnSave={true}
      data="{{ varImportData.value }}"
      defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
      emptyMessage="No rows found"
      enableSaveActions={true}
      heightType="auto"
      hidden="{{ varImportData.value.length === 0 }}"
      rowHeight="medium"
      showBorder={true}
      showFooter={true}
      showHeader={true}
      toolbarPosition="bottom"
    >
      <Column
        id="c3a15"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="product_name"
        label="Product name"
        placeholder="Enter value"
        position="center"
        size={172.15625}
        summaryAggregationMode="none"
      />
      <Column
        id="af6b7"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="brand_id"
        label="Brand ID"
        placeholder="Enter value"
        position="center"
        size={64.6875}
        summaryAggregationMode="none"
      />
      <Column
        id="658bb"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="category_id"
        label="Category ID"
        placeholder="Enter value"
        position="center"
        size={83.78125}
        summaryAggregationMode="none"
      />
      <Column
        id="07146"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="vendor_id"
        label="Vendor ID"
        placeholder="Enter value"
        position="center"
        size={71.765625}
        summaryAggregationMode="none"
      />
      <Column
        id="260e7"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="mrp"
        label="Mrp"
        placeholder="Enter value"
        position="center"
        size={46.421875}
        summaryAggregationMode="none"
      />
      <Column
        id="502fc"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="purchase_rate"
        label="Purchase rate"
        placeholder="Enter value"
        position="center"
        size={94.5625}
        summaryAggregationMode="none"
      />
      <Column
        id="13035"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="ean_code"
        label="Ean code"
        placeholder="Enter value"
        position="center"
        size={68.640625}
        summaryAggregationMode="none"
      />
      <Column
        id="e02b8"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="hsn_id"
        label="Hsn ID"
        placeholder="Enter value"
        position="center"
        size={53.359375}
        summaryAggregationMode="none"
      />
      <Column
        id="e0437"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="tax_id"
        label="Tax ID"
        placeholder="Enter value"
        position="center"
        size={51.234375}
        summaryAggregationMode="none"
      />
      <Column
        id="cfc8a"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="distributor_rate"
        label="Distributor rate"
        placeholder="Enter value"
        position="center"
        size={101.65625}
        summaryAggregationMode="none"
      />
      <Column
        id="ea3c5"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="wholesale_rate"
        label="Wholesale rate"
        placeholder="Enter value"
        position="center"
        size={100.25}
        summaryAggregationMode="none"
      />
      <Column
        id="fb63f"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="dealer_rate"
        label="Dealer rate"
        placeholder="Enter value"
        position="center"
        size={78.578125}
        summaryAggregationMode="none"
      />
      <Column
        id="bd2fe"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="retail_rate"
        label="Retail rate"
        placeholder="Enter value"
        position="center"
        size={73.3125}
        summaryAggregationMode="none"
      />
    </Table>
  </Body>
</ModalFrame>
