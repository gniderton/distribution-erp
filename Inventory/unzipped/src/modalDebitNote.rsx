<ModalFrame
  id="modalDebitNote"
  footerPadding="8px 12px"
  headerPadding="8px 12px"
  hidden={true}
  hideOnEscape={true}
  overlayInteraction={true}
  padding="8px 12px"
  showFooter={true}
  showHeader={true}
  showOverlay={true}
  size="fullScreen"
>
  <Header>
    <Text
      id="modalDebitNoteHeader"
      value="Create Debit Note"
      verticalAlign="center"
    />
    <Button
      id="modalCloseButton3"
      ariaLabel="Close"
      horizontalAlign="right"
      iconBefore="bold/interface-delete-1"
      style={{ map: { border: "transparent" } }}
      styleVariant="outline"
    >
      <Event
        id="d0b62753"
        event="click"
        method="setHidden"
        params={{ map: { hidden: true } }}
        pluginId="modalDebitNote"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
  </Header>
  <Body>
    <Date
      id="dnDate"
      dateFormat="MMM d, yyyy"
      datePlaceholder="{{ self.dateFormat.toUpperCase() }}"
      iconBefore="bold/interface-calendar"
      label="Date"
      labelPosition="top"
      value="{{ new Date() }}"
    />
    <TextInput
      id="txtDNNumber"
      label="Debit Note"
      labelPosition="top"
      placeholder="Auto-Generated after Save"
      value="{{ varLastDN.value }}"
    />
    <Button id="button11" hidden="" text="Button">
      <Event
        id="3834278b"
        event="click"
        method="trigger"
        params={{}}
        pluginId="createDebitNoteJS"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="c11b8df0"
        event="click"
        method="hide"
        params={{}}
        pluginId="modalDebitNote"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="fcb5ed65"
        event="click"
        method="trigger"
        params={{}}
        pluginId="getVendorDebitNotes"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Select
      id="selLinkedBill"
      captionByIndex=""
      data="{{ getVendorPendingBills.data }}"
      emptyMessage="No options"
      labelPosition="top"
      labels="{{ item['Internal ID'] }}"
      overlayMaxHeight={375}
      placeholder="Select an option"
      showSelectionIndicator={true}
      values="{{ item['Internal ID'] }}"
    />
    <TextInput
      id="dnReason"
      label="Reason"
      labelPosition="top"
      placeholder="Debit Note Reason"
    />
    <SegmentedControl
      id="dnMode"
      itemMode="static"
      labelPosition="top"
      paddingType="spacious"
      value="1"
    >
      <Option id="00030" label="Flat Amount" value="Flat Amount" />
      <Option id="00031" label="Item Return" value="Item Return" />
    </SegmentedControl>
    <Container
      id="container10"
      enableFullBleed={true}
      footerPadding="4px 12px"
      headerPadding="4px 12px"
      heightType="fixed"
      hidden={'{{ dnMode.value !== "Item Return" }}'}
      overflowType="hidden"
      padding="12px"
      showBody={true}
    >
      <Header>
        <Text
          id="containerTitle5"
          value="#### Container title"
          verticalAlign="center"
        />
      </Header>
      <View id="00030" viewKey="View 1">
        <Table
          id="tblDebitLines"
          autoColumnWidth={true}
          cellSelection="none"
          clearChangesetOnSave={true}
          data="{{ varDebitLinesData.value }}"
          defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
          emptyMessage="No rows found"
          primaryKeyColumnId="ac983"
          rowHeight="medium"
          showBorder={true}
          showFooter={true}
          showHeader={true}
          toolbarPosition="bottom"
        >
          <Column
            id="d5409"
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
            id="dab24"
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
            id="35399"
            alignment="left"
            editableOptions={{ spellCheck: false }}
            format="string"
            groupAggregationMode="none"
            key="Item Name"
            label="Item name"
            placeholder="Enter value"
            position="center"
            size={190.375}
            summaryAggregationMode="none"
          />
          <Column
            id="0b2a6"
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
            id="0395a"
            alignment="right"
            editableOptions={{ showStepper: true }}
            format="decimal"
            formatOptions={{ showSeparators: true, notation: "standard" }}
            groupAggregationMode="sum"
            key="Price"
            label="Price"
            placeholder="Enter value"
            position="center"
            size={48.96875}
            summaryAggregationMode="none"
          />
          <Column
            id="04fbe"
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
            id="fd782"
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
            id="6256c"
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
            id="6503c"
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
            id="dfca4"
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
            id="26210"
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
            id="9c7e0"
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
            id="a8bf4"
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
            id="b49e4"
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
            id="498ff"
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
            id="5ca6c"
            alignment="left"
            editable="true"
            editableOptions={{ spellCheck: false }}
            format="string"
            groupAggregationMode="none"
            key="Expiry"
            label="Expiry"
            placeholder="Enter value"
            position="center"
            size={51.171875}
            summaryAggregationMode="none"
          />
          <Column
            id="c9f5b"
            alignment="left"
            editable="true"
            editableOptions={{ spellCheck: false }}
            format="tag"
            formatOptions={{ automaticColors: true }}
            groupAggregationMode="none"
            key="Reason"
            label="Reason"
            optionList={{
              mode: "mapped",
              mappedData: "['Good', 'Damage', 'Expiry']",
            }}
            placeholder="Select option"
            position="center"
            size={78.90625}
            summaryAggregationMode="none"
          />
          <Column
            id="ac983"
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
            size={75.703125}
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
              id="befeb109"
              event="clickToolbar"
              method="exportData"
              pluginId="tblDebitLines"
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
              id="c57b78e1"
              event="clickToolbar"
              method="refresh"
              pluginId="tblDebitLines"
              type="widget"
              waitMs="0"
              waitType="debounce"
            />
          </ToolbarButton>
          <Event
            id="6fdde6a9"
            event="save"
            method="run"
            params={{
              map: {
                src: "// 1. Get Changes & Current Data\nconst changes = tblDebitLines.recordUpdates; \nconst currentData = varDebitLinesData.value; \n\n// 2. Clone to avoid issues\nlet newData = _.cloneDeep(currentData);\n\n// 3. Update & Recalculate\nchanges.forEach(change => {\n    // Find row by _product_id (primary key)\n    const index = newData.findIndex(row => row._product_id === change._product_id);\n    if (index === -1) return;\n\n    // Merge: Existing + Change\n    let row = { ...newData[index], ...change };\n\n    // Parse Numbers (Safety first!)\n    const qty = Number(row['Qty'] || 0);\n    const price = Number(row['Price'] || 0);    \n    const discPager = Number(row['Disc %'] || 0);\n    const gstPager = Number(row['GST %'] || 0);\n\n    // The Math 🧮\n    const gross = qty * price;\n    const discAmount = gross * (discPager / 100);\n    const taxable = gross - discAmount;\n    const gstAmount = taxable * (gstPager / 100);\n    const net = taxable + gstAmount;\n\n    // Update Row Columns\n    row['Gross $'] = Number(gross.toFixed(2));\n    row['Disc. $'] = Number(discAmount.toFixed(2));\n    row['Taxable $'] = Number(taxable.toFixed(2));\n    row['GST $'] = Number(gstAmount.toFixed(2));\n    row['Net $'] = Number(net.toFixed(2));\n\n    newData[index] = row;\n});\n\n// 4. Save Back to Variable\nvarDebitLinesData.setValue(newData);",
              },
            }}
            pluginId=""
            type="script"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="bd9f5448"
            event="changeCell"
            method="run"
            params={{
              map: {
                src: "// 1. Get Changes (Retool New Table Approach)\nconst changes = tblDebitLines.changesetArray || []; \nif (changes.length === 0) return;\nconst currentData = varDebitLinesData.value;\nconst change = changes[0];\n// Use _product_id to find the row\nconst targetIndex = currentData.findIndex(row => row._product_id === (change._product_id || change.product_id));\nif (targetIndex === -1) {\n    console.error(\"Row not found for update\");\n    return;\n}\n// 2. Clone Full Data\nlet newData = _.cloneDeep(currentData);\n// 3. Update & Recalculate Logic\n// Merge: Existing + Change\nlet row = { ...newData[targetIndex], ...change };\n// Parse Numbers (Safety first!)\nconst Qty = Number(row['Qty'] || 0);\nconst Price = Number(row['Price'] || 0);    \nconst Sch = Number(row['Sch'] || 0);\nconst DiscPct = Number(row['Disc %'] || 0);\nconst GstPct = Number(row['GST %'] || 0);\n// Math (Standard ERP Logic - Matches GRN)\nconst Gross = Qty * Price;\nconst DiscAmt = (Gross - Sch) * (DiscPct / 100);\nconst Taxable = Math.max(0, Gross - Sch - DiscAmt);\nconst GstAmt = Taxable * (GstPct / 100);\nconst Net = Taxable + GstAmt;\n// Update Row Columns\nrow['Qty'] = Qty;\nrow['Price'] = Price;\nrow['Sch'] = Sch;\nrow['Disc %'] = DiscPct;\nrow['GST %'] = GstPct;\nrow['Gross $'] = Number(Gross.toFixed(2));\nrow['Disc. $'] = Number(DiscAmt.toFixed(2));\nrow['Taxable $'] = Number(Taxable.toFixed(2));\nrow['GST $'] = Number(GstAmt.toFixed(2));\nrow['Net $'] = Number(Net.toFixed(2));\nnewData[targetIndex] = row;\n// 4. Save Back & Clear Changeset\nvarDebitLinesData.setValue(newData);\ntblDebitLines.clearChangeset();",
              },
            }}
            pluginId=""
            type="script"
            waitMs="0"
            waitType="debounce"
          />
        </Table>
      </View>
    </Container>
    <Container
      id="dnReason1"
      footerPadding="4px 12px"
      headerPadding="4px 12px"
      hidden={'{{ dnMode.value !== "Flat Amount" }}'}
      padding="12px"
      showBody={true}
    >
      <Header>
        <Text
          id="containerTitle6"
          value="#### Container title"
          verticalAlign="center"
        />
      </Header>
      <View id="00030" viewKey="View 1">
        <NumberInput
          id="dnAmount"
          currency="USD"
          inputValue={0}
          label="Enter Amount"
          labelPosition="top"
          placeholder="Enter value"
          showSeparators={true}
          showStepper={true}
          value={0}
        />
      </View>
    </Container>
  </Body>
</ModalFrame>
