<ModalFrame
  id="modalViewGRN"
  footerPadding="8px 12px"
  headerPadding="8px 12px"
  hidden={true}
  hideOnEscape={true}
  isHiddenOnMobile={true}
  padding="8px 12px"
  showFooter={true}
  showFooterBorder={false}
  showHeader={true}
  showHeaderBorder={false}
  showOverlay={true}
  size="fullScreen"
>
  <Header>
    <Text
      id="modalTitle7"
      value="GRN View: {{ tblGrn.selectedRow['Bill No'] }} ({{ tblGrn.selectedRow.Vendor }})"
      verticalAlign="center"
    />
    <Button
      id="modalCloseButton8"
      ariaLabel="Close"
      horizontalAlign="right"
      iconBefore="bold/interface-delete-1"
      style={{ map: { border: "transparent" } }}
      styleVariant="outline"
    >
      <Event
        id="9778ef35"
        event="click"
        method="setHidden"
        params={{ map: { hidden: true } }}
        pluginId="modalViewGRN"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <DropdownButton
      id="dropdownButton1"
      _colorByIndex={["", "", "", "", ""]}
      _fallbackTextByIndex={["", "", "", "", ""]}
      _imageByIndex={["", "", "", "", ""]}
      _values={["", "", "", "Action 4", "Action 5"]}
      horizontalAlign="right"
      icon="bold/interface-setting-menu-1"
      iconPosition="right"
      itemMode="static"
      overlayMaxHeight={375}
      style={{}}
      styleVariant="outline"
    >
      <Option
        id="00030"
        icon="bold/computer-printer"
        label="Print / Download PDF"
        tooltip="print"
      />
      <Option
        id="00031"
        icon="bold/phone-telephone-message"
        label="Send on WhatsApp"
        tooltip="whatsapp"
      />
      <Option
        id="00032"
        icon="bold/interface-time-clock-circle-alternate"
        label="View History (Audit)"
        tooltip="audit"
      />
      <Option
        id="50d90"
        disabled={false}
        hidden="{{ tblGrn.selectedRow.Status === 'Reversed' }}"
        icon="bold/interface-delete-bin-throw-2"
        label="Reverse / Void GRN"
        tooltip="reverse"
      >
        <Event
          id="62977107"
          event="click"
          method="trigger"
          params={{}}
          pluginId="apiReverseGRN"
          type="datasource"
          waitMs="0"
          waitType="debounce"
        />
      </Option>
      <Option
        id="7938d"
        disabled={false}
        hidden="{{ tblGrn.selectedRow.Status !== 'Reversed' }}"
        icon="bold/computer-database-add-2"
        label="Enter New GRN"
      >
        <Event
          id="84d2e660"
          event="click"
          method="run"
          params={{
            map: {
              src: "// 1. Store the Old ID and Data\nvarCorrectionID.setValue(tblGrn.selectedRow.id);\nvarCorrectionData.setValue(tblGrn.selectedRow);",
            },
          }}
          pluginId=""
          type="script"
          waitMs="0"
          waitType="debounce"
        />
        <Event
          id="ef1f938e"
          event="click"
          method="hide"
          params={{}}
          pluginId="modalViewGRN"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
        <Event
          id="e83cb7fa"
          event="click"
          method="show"
          params={{}}
          pluginId="modalFrameGRN"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
      </Option>
    </DropdownButton>
  </Header>
  <Body>
    <TagsWidget2
      id="tags1"
      _colorByIndex={[
        "{{ self.value === 'REVERSED' ? 'red' : \n   (self.value === 'PAID' ? 'green' : \n   (self.value === 'UNPAID' ? 'orange' : 'blue')) \n}}",
      ]}
      _hiddenByIndex={[false]}
      _iconByIndex={[""]}
      _ids={["402b0"]}
      _imageByIndex={[""]}
      _labels={[""]}
      _textColorByIndex={[""]}
      _tooltipByIndex={[""]}
      _values={[
        "{{ tblGrn.selectedRow.Status === 'Reversed' ? 'REVERSED' : \n   (Number(tblGrn.selectedRow['Balance $']) === 0 ? 'PAID' : \n   (Number(tblGrn.selectedRow['Balance $']) === Number(tblGrn.selectedRow['Total $']) ? 'UNPAID' : 'PARTIAL')) \n}}",
      ]}
      allowWrap={true}
      colorByIndex=""
      data=""
      hiddenByIndex=""
      iconByIndex=""
      imageByIndex=""
      itemMode="static"
      labels=""
      textColorByIndex=""
      tooltipByIndex=""
      values=""
    />
    <Table
      id="table4"
      autoColumnWidth={true}
      cellSelection="none"
      clearChangesetOnSave={true}
      data="{{ trnGRNSummary.value }}"
      defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
      emptyMessage="No rows found"
      enableSaveActions={true}
      heightType="auto"
      rowHeight="xsmall"
      rowSelection="none"
      showBorder={true}
      showColumnBorders={true}
      showHeader={true}
      toolbarPosition="bottom"
    >
      <Column
        id="034f2"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="PARTICULARS"
        label="Particulars"
        placeholder="Enter value"
        position="center"
        size={76.5}
        summaryAggregationMode="none"
      />
      <Column
        id="5c99f"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Pcs"
        label="Pcs"
        placeholder="Enter value"
        position="center"
        size={48.671875}
        summaryAggregationMode="none"
      />
      <Column
        id="9a0e3"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Gross"
        label="Gross"
        placeholder="Enter value"
        position="center"
        size={72.515625}
        summaryAggregationMode="none"
      />
      <Column
        id="1f4a2"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Sch"
        label="Sch"
        placeholder="Enter value"
        position="center"
        size={44.5625}
        summaryAggregationMode="none"
      />
      <Column
        id="89fa8"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Disc"
        label="Disc"
        placeholder="Enter value"
        position="center"
        size={71.0625}
        summaryAggregationMode="none"
      />
      <Column
        id="a2069"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Taxable"
        label="Taxable"
        placeholder="Enter value"
        position="center"
        size={79.09375}
        summaryAggregationMode="none"
      />
      <Column
        id="92bc5"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Tax"
        label="Tax"
        placeholder="Enter value"
        position="center"
        size={65.40625}
        summaryAggregationMode="none"
      />
      <Column
        id="eca22"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Net"
        label="Net"
        placeholder="Enter value"
        position="center"
        size={61.0625}
        summaryAggregationMode="none"
      />
    </Table>
    <Table
      id="tblViewLines"
      autoColumnWidth={true}
      cellSelection="none"
      clearChangesetOnSave={true}
      data="{{ tblGrn.selectedRow.lines_json }}"
      defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
      emptyMessage="No rows found"
      enableSaveActions={true}
      heightType="auto"
      rowHeight="medium"
      rowSelection="none"
      showBorder={true}
      showColumnBorders={true}
      showHeader={true}
    >
      <Column
        id="0449b"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="_product_id"
        label="Product ID"
        placeholder="Enter value"
        position="center"
        size={75.703125}
      />
      <Column
        id="44687"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="Ean code"
        label="Ean code"
        placeholder="Enter value"
        position="center"
        size={68.640625}
        summaryAggregationMode="none"
      />
      <Column
        id="4f863"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="Item Name"
        label="Item name"
        placeholder="Enter value"
        position="center"
        size={182.9375}
        summaryAggregationMode="none"
      />
      <Column
        id="2d152"
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
        id="96f12"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Qty"
        label="Qty"
        placeholder="Enter value"
        position="center"
        size={38.609375}
      />
      <Column
        id="3fbac"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Price"
        label="Price"
        placeholder="Enter value"
        position="center"
        size={46.8125}
      />
      <Column
        id="065d9"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Gross"
        label="Gross"
        placeholder="Enter value"
        position="center"
        size={64.140625}
      />
      <Column
        id="b25e9"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Sch"
        label="Sch"
        placeholder="Enter value"
        position="center"
        size={41.5}
      />
      <Column
        id="430c8"
        alignment="right"
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
        id="2e27f"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Taxable"
        label="Taxable"
        placeholder="Enter value"
        position="center"
        size={74.4375}
      />
      <Column
        id="ea615"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="GST $"
        label="Gst"
        placeholder="Enter value"
        position="center"
        size={61.84375}
        summaryAggregationMode="none"
      />
      <Column
        id="5fa39"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Net $"
        label="Net"
        placeholder="Enter value"
        position="center"
        size={74.125}
        summaryAggregationMode="none"
      />
      <Column
        id="1635e"
        alignment="left"
        format="date"
        groupAggregationMode="none"
        key="Expiry"
        label="Expiry"
        placeholder="Enter value"
        position="center"
        size={82.359375}
      />
      <Column
        id="8334f"
        alignment="left"
        format="tag"
        formatOptions={{ automaticColors: true }}
        groupAggregationMode="none"
        key="Batch No"
        label="Batch no"
        placeholder="Select option"
        position="center"
        size={100.25}
        summaryAggregationMode="none"
        valueOverride="{{ _.startCase(item) }}"
      />
    </Table>
  </Body>
</ModalFrame>
