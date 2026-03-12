<Container
  id="container6"
  _gap="0px"
  footerPadding="4px 12px"
  headerPadding="4px 12px"
  overflowType="hidden"
  padding="12px"
  showBody={true}
  showHeader={true}
>
  <Header>
    <Text
      id="containerTitle4"
      horizontalAlign="center"
      value="Purchase Order"
      verticalAlign="center"
    />
  </Header>
  <View id="00030" viewKey="View 1">
    <KeyValue
      id="keyValue3"
      data={
        '{\n  "Name": "Gniderton Private Limited",\n  "Address": "No.57/1003-C, Near Abu Haji Hall, Pallikandy Road, Kundungal Park, Kozhikode",\n  "State": "Kerala",\n  "Pin Code": "673003",\n  "GST": "32AALCG2360H1ZT",\n  "Contact No": "+919567987408"\n}\n'
      }
      enableSaveActions={true}
      groupLayout="singleColumn"
      heightType="fixed"
      labelWrap={true}
      overflowType="hidden"
      style={{}}
    />
    <Select
      id="vendorDropdown"
      captionByIndex="{{ item.email }}"
      data="{{ Vendors.data }}"
      emptyMessage="No options"
      label="Vendor"
      labels="{{ item.vendor_name }}"
      labelWidth=""
      overlayMaxHeight={375}
      showSelectionIndicator={true}
      value="Choose a Vendor"
      values="{{ item.id }}"
    >
      <Event
        id="47d05770"
        enabled=""
        event="change"
        method="run"
        params={{
          map: {
            src: "PopulateProductsTablebyVendors.trigger({\n  additionalScope: {\n    selected_vendor_id: vendorDropdown.value\n  }\n});",
          },
        }}
        pluginId=""
        type="script"
        waitMs="0"
        waitType="debounce"
      />
    </Select>
    <KeyValue
      id="keyValue4"
      data="{{
  (() => {
    const vendor = Vendors.data.find(v => v.id === vendorDropdown.value);
    if (!vendor) return {};

    // Get all valid addresses for this vendor
    const addresses = getvendoraddress.data.filter(
      a => a.vendor_id === vendor.id && a.is_active
    );

    // LOGIC: Pick 'Default', otherwise pick the 'First' one.
    const addr = addresses.find(a => a.is_default) || addresses[0] || {};

    return {
      // Vendor Details
      vendor_code: vendor.vendor_code,
      vendor_name: vendor.vendor_name,
      gst: vendor.gst,
      contact_person: vendor.contact_person,
      contact_no: vendor.contact_no,

      // Address Details (Corrected DB Columns)
      address_line: addr.address_line,
      area:         addr.area,
      city:         addr.city,
      district:     addr.district,
      state:        addr.state_code,
      pin_code:     addr.pin_code
    };
  })()
}}"
      enableSaveActions={true}
      groupLayout="singleColumn"
      heightType="fixed"
      labelWrap={true}
      overflowType="hidden"
    >
      <Property
        id="Vendor Name"
        editable="false"
        editableOptions={{ spellCheck: false }}
        format="string"
        formatOptions={{}}
        hidden="true"
        label="Vendor name"
      />
      <Property
        id="address"
        editable="false"
        editableOptions={{}}
        format="json"
        formatOptions={{}}
        hidden="true"
        label="Address"
      />
      <Property
        id="vendor_address_id"
        editable="false"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        hidden="true"
        label="Vendor address ID"
      />
      <Property
        id="id"
        editable="false"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        hidden="true"
        label="ID"
      />
      <Property
        id="created_at"
        editable="false"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        hidden="true"
        label="Created at"
      />
      <Property
        id="vendor_name"
        editable="false"
        editableOptions={{ spellCheck: false }}
        format="string"
        formatOptions={{}}
        hidden="true"
        label="Vendor name"
      />
      <Property
        id="vendor_code"
        editable="false"
        editableOptions={{ spellCheck: false }}
        format="string"
        formatOptions={{}}
        hidden="false"
        label="Vendor code"
      />
      <Property
        id="address_line"
        editable="false"
        editableOptions={{ spellCheck: false }}
        format="string"
        formatOptions={{}}
        hidden="false"
        label="Address line"
      />
      <Property
        id="state"
        editable="false"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        hidden="false"
        label="State"
      />
      <Property
        id="pin_code"
        editable="false"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        hidden="false"
        label="Pin code"
      />
      <Property
        id="gst"
        editable="false"
        editableOptions={{ spellCheck: false }}
        format="string"
        formatOptions={{}}
        hidden="false"
        label="Gst"
      />
      <Property
        id="contact_person"
        editable="false"
        editableOptions={{ spellCheck: false }}
        format="string"
        formatOptions={{}}
        hidden="true"
        label="Contact person"
      />
      <Property
        id="contact_no"
        editable="false"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        hidden="false"
        label="Contact no"
      />
      <Property
        id="contact_no_2"
        editable="false"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        hidden="true"
        label="Contact no 2"
      />
      <Property
        id="email"
        editable="false"
        editableOptions={{ spellCheck: false }}
        format="string"
        formatOptions={{}}
        hidden="true"
        label="Email"
      />
      <Property
        id="branch_id"
        editable="false"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        hidden="true"
        label="Branch ID"
      />
      <Property
        id="is_active"
        editable="false"
        editableOptions={{}}
        format="boolean"
        formatOptions={{}}
        hidden="true"
        label="Is active"
      />
      <Property
        id="address_id"
        editable="false"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        hidden="true"
        label="Address ID"
      />
      <Property
        id="address_type_id"
        editable="false"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        hidden="true"
        label="Address type ID"
      />
      <Property
        id="area"
        editable="false"
        editableOptions={{ spellCheck: false }}
        format="string"
        formatOptions={{}}
        hidden="false"
        label="Area"
      />
      <Property
        id="city"
        editable="false"
        editableOptions={{ spellCheck: false }}
        format="string"
        formatOptions={{}}
        hidden="true"
        label="City"
      />
      <Property
        id="district"
        editable="false"
        editableOptions={{ spellCheck: false }}
        format="string"
        formatOptions={{}}
        hidden="true"
        label="District"
      />
      <Property
        id="coordinates"
        editable="false"
        editableOptions={{ spellCheck: false }}
        format="string"
        formatOptions={{}}
        hidden="true"
        label="Coordinates"
      />
      <Property
        id="address_is_default"
        editable="false"
        editableOptions={{}}
        format="boolean"
        formatOptions={{}}
        hidden="true"
        label="Address is default"
      />
      <Property
        id="address_is_active"
        editable="false"
        editableOptions={{}}
        format="boolean"
        formatOptions={{}}
        hidden="true"
        label="Address is active"
      />
    </KeyValue>
    <Date
      id="date5"
      dateFormat="MMM d, yyyy"
      datePlaceholder="{{ self.dateFormat.toUpperCase() }}"
      iconBefore="bold/interface-calendar"
      label="PO Date"
      value="{{ new Date() }}"
    />
    <Date
      id="date6"
      dateFormat="MMM d, yyyy"
      datePlaceholder="{{ self.dateFormat.toUpperCase() }}"
      iconBefore="bold/interface-calendar"
      label="Delivery Date"
      value="{{ new Date() }}"
    />
    <Text
      id="poNumber2"
      imageWidth="fill"
      margin="0"
      value="**PO Number      :** GD-CLT-PO-26-{{ getNextPO.data.next_num }}"
      verticalAlign="center"
    />
    <Container
      id="container7"
      _gap="0px"
      footerPadding="4px 12px"
      headerPadding="4px 12px"
      padding="12px"
      showBody={true}
    >
      <View id="00030" viewKey="View 1">
        <Text
          id="text6"
          value={
            '**Total Gross:** {{ _.sum((poTable.data || []).map(r => Number(r["Gross $"] ?? 0))) }}'
          }
          verticalAlign="center"
        />
        <Text
          id="text7"
          value={
            '**Total Taxable:** {{ _.sum((poTable.data || []).map(r => Number(r["Taxable $"] ?? 0))) }}'
          }
          verticalAlign="center"
        />
        <Text
          id="text8"
          value={
            '**Total GST**: {{ (_.sum((poTable.data || []).map(r => Number(r["GST $"] ?? 0)))).toFixed(2) }}'
          }
          verticalAlign="center"
        />
        <Text
          id="text9"
          value={
            '**Total Net:** {{ Math.round(_.sum((poTable.data || []).map(r => Number(r["Net $"] ?? 0)))) }}'
          }
          verticalAlign="center"
        />
      </View>
    </Container>
    <Table
      id="poTablePrint"
      autoColumnWidth={true}
      clearChangesetOnSave={true}
      data="{{ printState.value.lines }}"
      defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
      emptyMessage="No rows found"
      enableSaveActions={true}
      headerTextWrap={true}
      heightType="auto"
      hidden="{{ !isPrinting.value }}"
      rowHeight="xsmall"
      showColumnBorders={true}
      showHeader={true}
      toolbarPosition="bottom"
    >
      <Column
        id="b1c98"
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
        id="3b74e"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="EAN Code"
        label="Ean code"
        placeholder="Enter value"
        position="center"
        size={68.640625}
        summaryAggregationMode="none"
      />
      <Column
        id="00101"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="Item Name"
        label="Item name"
        placeholder="Enter value"
        position="center"
        size={99.734375}
        summaryAggregationMode="none"
      />
      <Column
        id="ec478"
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
        id="9f354"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Rate"
        label="Rate"
        placeholder="Enter value"
        position="center"
        size={48.75}
        summaryAggregationMode="none"
      />
      <Column
        id="d30ed"
        alignment="right"
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
        id="214a1"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Gross Amt"
        label="Gross amt"
        placeholder="Enter value"
        position="center"
        size={73.828125}
        summaryAggregationMode="none"
      />
      <Column
        id="d1e96"
        alignment="right"
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
        id="d85ac"
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
        id="02f33"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Disc Amt"
        label="Disc amt"
        placeholder="Enter value"
        position="center"
        size={65.390625}
        summaryAggregationMode="none"
      />
      <Column
        id="21eca"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Taxable"
        label="Taxable"
        placeholder="Enter value"
        position="center"
        size={61.28125}
        summaryAggregationMode="none"
      />
      <Column
        id="fc87f"
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
        id="bf65c"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="GST Amt"
        label="Gst amt"
        placeholder="Enter value"
        position="center"
        size={60.5}
        summaryAggregationMode="none"
      />
      <Column
        id="9323d"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Net Amount"
        label="Net amount"
        placeholder="Enter value"
        position="center"
        size={82.484375}
        summaryAggregationMode="none"
      />
    </Table>
    <Table
      id="poTable"
      autoColumnWidth={true}
      clearChangesetOnSave={true}
      data="{{ poLines.value }}"
      defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
      emptyMessage="No rows found"
      headerTextWrap={true}
      heightType="auto"
      hidden="{{ isPrinting.value }}"
      primaryKeyColumnId="50e10"
      rowHeight="medium"
      showBorder={true}
      showColumnBorders={true}
      showHeader={true}
      toolbarPosition="bottom"
    >
      <Column
        id="b6684"
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
        id="d576b"
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
        id="e95b6"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="Item Name"
        label="Item name"
        placeholder="Enter value"
        position="center"
        size={172.484375}
        summaryAggregationMode="none"
      />
      <Column
        id="47d71"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="MRP"
        label="Mrp"
        placeholder="Enter value"
        position="center"
        size={46.421875}
        summaryAggregationMode="none"
      />
      <Column
        id="4dbba"
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
        size={38.71875}
        summaryAggregationMode="none"
      />
      <Column
        id="187a1"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Price"
        label="Price"
        placeholder="Enter value"
        position="center"
        size={53.359375}
        summaryAggregationMode="none"
      />
      <Column
        id="d7432"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Gross $"
        label="Gross"
        placeholder="Enter value"
        position="center"
        size={69.890625}
        summaryAggregationMode="none"
      />
      <Column
        id="f8285"
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
        id="e2516"
        alignment="right"
        editable={true}
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
        id="c99e4"
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
        id="7dcb5"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Taxable $"
        label="Taxable"
        placeholder="Enter value"
        position="center"
        size={69.890625}
        summaryAggregationMode="none"
      />
      <Column
        id="66efd"
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
        id="8eb1c"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="GST $"
        label="Gst"
        placeholder="Enter value"
        position="center"
        size={63.71875}
        summaryAggregationMode="none"
      />
      <Column
        id="6796c"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Net $"
        label="Net"
        placeholder="Enter value"
        position="center"
        size={72.171875}
        summaryAggregationMode="none"
      />
      <Column
        id="50e10"
        alignment="right"
        editable={false}
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
          id="daa47826"
          event="clickToolbar"
          method="exportData"
          pluginId="poTable"
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
          id="71a7f2e2"
          event="clickToolbar"
          method="refresh"
          pluginId="poTable"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
      </ToolbarButton>
      <Event
        id="f2afda6c"
        event="save"
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
        pluginId="savePOLine"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="625d8468"
        event="changeCell"
        method="trigger"
        params={{}}
        pluginId="savePOLine"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </Table>
  </View>
</Container>
