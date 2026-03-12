<ModalFrame
  id="modalStockAdjust"
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
  size="large"
>
  <Header>
    <Text
      id="modalTitle8"
      value="Inventory Adjustment"
      verticalAlign="center"
    />
    <Button
      id="modalCloseButton10"
      ariaLabel="Close"
      horizontalAlign="right"
      iconBefore="bold/interface-delete-1"
      style={{ map: { border: "transparent" } }}
      styleVariant="outline"
    >
      <Event
        id="85e389da"
        event="click"
        method="setHidden"
        params={{ map: { hidden: true } }}
        pluginId="modalStockAdjust"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="0b32ad61"
        event="click"
        method="setValue"
        params={{ map: { value: "[]" } }}
        pluginId="varAdjustmentList"
        type="state"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
  </Header>
  <Body>
    <Button id="button16" text="Save">
      <Event
        id="2d9c056e"
        event="click"
        method="trigger"
        params={{}}
        pluginId="apiCreateStockAdjustment"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Select
      id="selAdjProduct"
      data="{{ Products.data.data }}"
      emptyMessage="No options"
      label=""
      labelPosition="top"
      labels="{{ item.product_name }}"
      overlayMaxHeight={375}
      placeholder="Select a Product"
      showClear={true}
      showSelectionIndicator={true}
      values="{{ item.id }}"
    >
      <Event
        id="aa69cd2b"
        event="change"
        method="trigger"
        params={{}}
        pluginId="apiGetBatches"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </Select>
    <Select
      id="selAdjReason"
      captionByIndex=""
      colorByIndex=""
      data="['Damage', 'Expiry', 'Lost', 'Found']"
      disabledByIndex=""
      emptyMessage="No options"
      fallbackTextByIndex=""
      hiddenByIndex=""
      iconByIndex=""
      imageByIndex=""
      label=""
      labelPosition="top"
      labels=""
      overlayMaxHeight={375}
      placeholder="Select the Basket to Transfer"
      showClear={true}
      showSelectionIndicator={true}
      tooltipByIndex=""
      values=""
    />
    <Button
      id="button15"
      horizontalAlign="center"
      iconBefore="line/interface-add-square"
      style={{}}
      styleVariant="outline"
      submitTargetId=""
    >
      <Event
        id="1bc36cad"
        event="click"
        method="run"
        params={{
          map: {
            src: 'const newItem = {\n  product_id: selAdjProduct.value,\n  product_name: selAdjProduct.selectedLabel, // Helpful to show name in table\n  batch_code: selAdjBatch.value || null,     // Null if empty (FIFO)\n  qty: Number(inpAdjQty.value),\n  reason: selAdjReason.value\n};\n// Validation\nif (!newItem.product_id || !newItem.qty) {\n  utils.showNotification({ title: "Error", description: "Select Product and Qty", notificationType: "error" });\n  return; \n}\n// Append to existing array\nconst currentList = varAdjustmentList.value || [];\nvarAdjustmentList.setValue([...currentList, newItem]);\n// Reset Inputs for next entry\ninpAdjQty.setValue(0);\nselAdjProduct.clearValue();\nselAdjBatch.clearValue();\n// selAdjReason.setValue(\'Damage\'); // Optional: Keep or Reset Reason',
          },
        }}
        pluginId=""
        type="script"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Select
      id="selAdjBatch"
      data="{{ apiGetBatches.data }}"
      emptyMessage="No options"
      label=""
      labelPosition="top"
      labels="{{ item.batch_code }} (Expires: {{ item.expiry_date }})"
      overlayMaxHeight={375}
      placeholder="Select the Batch"
      showClear={true}
      showSelectionIndicator={true}
    />
    <NumberInput
      id="inpAdjQty"
      currency="USD"
      inputValue={0}
      label=""
      labelPosition="top"
      placeholder="Enter Quantity"
      showClear={true}
      showSeparators={true}
      showStepper={true}
      value={0}
    />
    <Table
      id="table5"
      actionsOverflowPosition={1}
      autoColumnWidth={true}
      cellSelection="none"
      clearChangesetOnSave={true}
      data="{{ varAdjustmentList.value }}"
      defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
      emptyMessage="No rows found"
      enableSaveActions={true}
      heightType="auto"
      rowHeight="medium"
      rowSelection="none"
      showBorder={true}
      showHeader={true}
    >
      <Column
        id="2384f"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="product_id"
        label="Product ID"
        placeholder="Enter value"
        position="center"
        size={100}
        summaryAggregationMode="none"
      />
      <Column
        id="f5d63"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="product_name"
        label="Product name"
        placeholder="Enter value"
        position="center"
        size={130.28125}
        summaryAggregationMode="none"
      />
      <Column
        id="3e994"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="batch_code"
        label="Batch code"
        placeholder="Enter value"
        position="center"
        size={80.34375}
        summaryAggregationMode="none"
      />
      <Column
        id="2b858"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="qty"
        label="Qty"
        placeholder="Enter value"
        position="center"
        size={36.1875}
        summaryAggregationMode="none"
      />
      <Column
        id="fe30b"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="reason"
        label="Reason"
        placeholder="Enter value"
        position="center"
        size={62.90625}
        summaryAggregationMode="none"
      />
      <Action id="f904a" icon="bold/interface-delete-bin-2" label="Action 1">
        <Event
          id="0a421e23"
          event="clickAction"
          method="run"
          params={{
            map: {
              src: "// 'i' is the index of the clicked row in Retool Table\nconst current = varAdjustmentList.value;\nconst updated = current.filter((item, index) => index !== i);\nvarAdjustmentList.setValue(updated);",
            },
          }}
          pluginId=""
          type="script"
          waitMs="0"
          waitType="debounce"
        />
      </Action>
      <ToolbarButton
        id="51336"
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
          id="b43076b1"
          event="clickToolbar"
          method="exportData"
          pluginId="table5"
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
          id="1ca042bc"
          event="clickToolbar"
          method="refresh"
          pluginId="table5"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
      </ToolbarButton>
    </Table>
  </Body>
</ModalFrame>
