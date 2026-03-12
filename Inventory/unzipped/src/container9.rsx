<Container
  id="container9"
  footerPadding="4px 12px"
  headerPadding="4px 12px"
  padding="12px"
  showBody={true}
>
  <View id="00030" viewKey="View 1">
    <Select
      id="vendorDropdownGRN"
      captionByIndex="{{ item.vendor_code }}"
      data="{{ Vendors.data }}"
      emptyMessage="No options"
      label="Choose Vendor"
      labelPosition="top"
      labels="{{ item.vendor_name }}"
      overlayMaxHeight={375}
      placeholder="Select an option"
      showSelectionIndicator={true}
      values="{{ item.id }}"
    >
      <Event
        id="d57c7942"
        event="change"
        method="trigger"
        params={{
          map: {
            options: {
              object: {
                onSuccess: null,
                onFailure: null,
                additionalScope: null,
              },
            },
          },
        }}
        pluginId="vendorSelectJS"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </Select>
    <Select
      id="ChoosePo"
      data="{{ getPOs.data.filter(x => x.vendor_id === vendorDropdownGRN.value) }}"
      emptyMessage="No options"
      hidden="{{ !vendorDropdownGRN.value }}"
      label="Select PO"
      labelPosition="top"
      labels="{{ item.po_number }}"
      overlayMaxHeight={375}
      placeholder="Select an option"
      showSelectionIndicator={true}
      values="{{ item.id }}"
    >
      <Event
        id="bcc5565a"
        event="change"
        method="setValue"
        params={{ map: { value: "{{ ChoosePo.value }}" } }}
        pluginId="varPOViewId"
        type="state"
        waitMs="0"
        waitType="debounce"
      />
    </Select>
    <TextInput
      id="vendorInvoiceNo"
      label="Vendor Bill No"
      labelPosition="top"
      placeholder="Enter value"
    />
    <Date
      id="dateVendorInvoice"
      dateFormat="MMM d, yyyy"
      datePlaceholder="{{ self.dateFormat.toUpperCase() }}"
      iconBefore="bold/interface-calendar"
      label="Bill Date"
      labelPosition="top"
      value="{{ new Date() }}"
    />
    <Date
      id="dateReceived"
      dateFormat="MMM d, yyyy"
      datePlaceholder="{{ self.dateFormat.toUpperCase() }}"
      iconBefore="bold/interface-calendar"
      label="Received Date"
      labelPosition="top"
      value="{{ moment() }}"
    />
    <Button id="button7" text="Save GRN">
      <Event
        id="e6943529"
        event="click"
        method="trigger"
        params={{
          map: {
            options: {
              object: {
                onSuccess: null,
                onFailure: null,
                additionalScope: null,
              },
            },
          },
        }}
        pluginId="saveGRNJS"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="1d6afee0"
        event="click"
        method="hide"
        params={{}}
        pluginId="modalFrameGRN"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <TextInput
      id="GrnNo"
      label="GRN No"
      labelPosition="top"
      placeholder="Enter value"
    />
    <Button id="addRestOfProductsButton" text="Add Other Product">
      <Event
        id="0d2f5ee6"
        event="click"
        method="trigger"
        params={{}}
        pluginId="addRestOfProducts"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Button
      id="btnLoadCorrectionData"
      hidden="{{ varCorrectionID.value == null }}"
      text="Load Data"
    >
      <Event
        id="98df4e51"
        event="click"
        method="trigger"
        params={{}}
        pluginId="jsLoadCorrectionData"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Table
      id="GRNTable"
      autoColumnWidth={true}
      cellSelection="none"
      clearChangesetOnSave={true}
      data="{{ piLines.value }}"
      defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
      emptyMessage="No rows found"
      heightType="auto"
      primaryKeyColumnId="e6986"
      rowBackgroundColor="{{ currentSourceRow.from_po ? '#e6fffa' : '' }}"
      showBorder={true}
      showColumnBorders={true}
      showFooter={true}
      showHeader={true}
      toolbarPosition="bottom"
    >
      <Column
        id="e22cc"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="S.No"
        label="S no"
        placeholder="Enter value"
        position="center"
        size={41.21875}
        summaryAggregationMode="none"
      />
      <Column
        id="2c5c3"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="EAN Code"
        label="Ean code"
        placeholder="Enter value"
        position="center"
        size={68.640625}
        summaryAggregationMode="none"
      />
      <Column
        id="9ed27"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="Item Name"
        label="Item name"
        placeholder="Enter value"
        position="center"
        size={75.484375}
        summaryAggregationMode="none"
      />
      <Column
        id="4e658"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="MRP"
        label="Mrp"
        placeholder="Enter value"
        position="center"
        size={38.453125}
        summaryAggregationMode="none"
      />
      <Column
        id="c88b4"
        alignment="right"
        editable="true"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Qty"
        label="Qty"
        placeholder="Enter value"
        position="center"
        size={36.1875}
        summaryAggregationMode="none"
      />
      <Column
        id="ac44f"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Price"
        label="Price"
        placeholder="Enter value"
        position="center"
        size={44.625}
        summaryAggregationMode="none"
      />
      <Column
        id="d6b09"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Gross $"
        label="Gross"
        placeholder="Enter value"
        position="center"
        size={48.890625}
        summaryAggregationMode="none"
      />
      <Column
        id="3f27c"
        alignment="right"
        editable="true"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Sch"
        label="Sch"
        placeholder="Enter value"
        position="center"
        size={37.453125}
        summaryAggregationMode="none"
      />
      <Column
        id="83503"
        alignment="right"
        editable="true"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Disc %"
        label="Disc"
        placeholder="Enter value"
        position="center"
        size={40.453125}
        summaryAggregationMode="none"
      />
      <Column
        id="64527"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Disc. $"
        label="Disc"
        placeholder="Enter value"
        position="center"
        size={40.453125}
        summaryAggregationMode="none"
      />
      <Column
        id="a27c8"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Taxable $"
        label="Taxable"
        placeholder="Enter value"
        position="center"
        size={60.125}
        summaryAggregationMode="none"
      />
      <Column
        id="f0a58"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="GST %"
        label="Gst"
        placeholder="Enter value"
        position="center"
        size={35.5625}
        summaryAggregationMode="none"
      />
      <Column
        id="a51e2"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="GST $"
        label="Gst"
        placeholder="Enter value"
        position="center"
        size={35.5625}
        summaryAggregationMode="none"
      />
      <Column
        id="fd40b"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Net $"
        label="Net"
        placeholder="Enter value"
        position="center"
        size={36.390625}
        summaryAggregationMode="none"
      />
      <Column
        id="6b70c"
        alignment="left"
        editable="true"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="Batch No"
        label="Batch no"
        placeholder="Enter value"
        position="center"
        size={66.21875}
        summaryAggregationMode="none"
      />
      <Column
        id="37872"
        alignment="left"
        editable="true"
        editableOptions={{ spellCheck: false }}
        format="date"
        groupAggregationMode="none"
        key="Expiry"
        label="Expiry"
        placeholder="Enter value"
        position="center"
        size={51.171875}
        summaryAggregationMode="none"
      />
      <Column
        id="e6986"
        alignment="right"
        editable="false"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="_product_id"
        label="Product ID"
        placeholder="Enter value"
        position="center"
        size={100}
        summaryAggregationMode="none"
      />
      <ToolbarButton
        id="1a"
        icon="bold/interface-text-formatting-filter-2"
        label="Filter"
        type="filter"
      />
      <ToolbarButton
        id="3c"
        icon="bold/interface-download-button-2"
        label="Download"
        type="custom"
      >
        <Event
          id="e228e8a3"
          event="clickToolbar"
          method="exportData"
          pluginId="GRNTable"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
      </ToolbarButton>
      <ToolbarButton
        id="4d"
        icon="bold/interface-arrows-round-left"
        label="Refresh"
        type="custom"
      >
        <Event
          id="b6cf087b"
          event="clickToolbar"
          method="refresh"
          pluginId="GRNTable"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
      </ToolbarButton>
      <Event
        id="a9b3d51a"
        event="save"
        method="trigger"
        params={{}}
        pluginId="EditGrnTable"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="feb77ded"
        event="changeCell"
        method="trigger"
        params={{}}
        pluginId="EditGrnTable"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </Table>
  </View>
</Container>
