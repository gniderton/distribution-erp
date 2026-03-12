<Container
  id="tabbedContainer2"
  currentViewKey="{{ self.viewKeys[0] }}"
  footerPadding="4px 12px"
  headerPadding="4px 12px"
  padding="12px"
  showBody={true}
  showHeader={true}
>
  <Header>
    <Tabs
      id="tabs2"
      itemMode="static"
      navigateContainer={true}
      targetContainerId="tabbedContainer2"
      value="{{ self.values[0] }}"
    >
      <Option id="00030" value="Tab 1" />
      <Option id="00031" value="Tab 2" />
      <Option id="00032" value="Tab 3" />
    </Tabs>
  </Header>
  <View
    id="e128c"
    disabled={false}
    hidden={false}
    iconPosition="left"
    label="Home"
    viewKey="View 4"
  />
  <View id="00030" label="Pending Bills" viewKey="View 1">
    <Button id="button8" text="Pay Selected">
      <Event
        id="bbec462a"
        event="click"
        method="setValue"
        params={{
          map: {
            value:
              "{{ _.sumBy(tblPendingBills.selectedSourceRows, 'Balance $') }}",
          },
        }}
        pluginId="varPaymentAmount"
        type="state"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="593fbfb3"
        event="click"
        method="show"
        params={{}}
        pluginId="modalMakePayment"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Table
      id="tblPendingBills"
      autoColumnWidth={true}
      cellSelection="none"
      clearChangesetOnSave={true}
      data="{{ getVendorPendingBills.data }}"
      defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
      emptyMessage="No rows found"
      enableSaveActions={true}
      heightType="auto"
      primaryKeyColumnId="7e541"
      rowSelection="multiple"
      showBorder={true}
      showFooter={true}
      showHeader={true}
      toolbarPosition="bottom"
    >
      <Column
        id="7e541"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="id"
        label="ID"
        placeholder="Enter value"
        position="center"
        size={100}
        summaryAggregationMode="none"
      />
      <Column
        id="7157f"
        alignment="left"
        format="datetime"
        groupAggregationMode="none"
        key="Date"
        label="Date"
        placeholder="Enter value"
        position="center"
        size={138.65625}
        summaryAggregationMode="none"
      />
      <Column
        id="9bcef"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="Internal ID"
        label="Internal id"
        placeholder="Enter value"
        position="center"
        size={124.21875}
        summaryAggregationMode="none"
      />
      <Column
        id="738d8"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="Bill No"
        label="Bill no"
        placeholder="Enter value"
        position="center"
        size={112.28125}
        summaryAggregationMode="none"
      />
      <Column
        id="7788f"
        alignment="left"
        format="tag"
        formatOptions={{ automaticColors: true }}
        groupAggregationMode="none"
        hidden="true"
        key="Vendor"
        label="Vendor"
        placeholder="Select option"
        position="center"
        size={100}
        summaryAggregationMode="none"
        valueOverride="{{ _.startCase(item) }}"
      />
      <Column
        id="63471"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="Vendor ID"
        label="Vendor id"
        placeholder="Enter value"
        position="center"
        size={100}
        summaryAggregationMode="none"
      />
      <Column
        id="20780"
        alignment="left"
        format="tag"
        formatOptions={{ automaticColors: true }}
        groupAggregationMode="none"
        key="PO No"
        label="Po no"
        placeholder="Select option"
        position="center"
        size={123.96875}
        summaryAggregationMode="none"
        valueOverride="{{ _.startCase(item) }}"
      />
      <Column
        id="53a26"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Total $"
        label="Total"
        placeholder="Enter value"
        position="center"
        size={52.359375}
        summaryAggregationMode="none"
      />
      <Column
        id="db981"
        alignment="left"
        format="tag"
        formatOptions={{ automaticColors: true }}
        groupAggregationMode="none"
        key="Status"
        label="Status"
        placeholder="Select option"
        position="center"
        size={75.421875}
        summaryAggregationMode="none"
        valueOverride="{{ _.startCase(item) }}"
      />
      <Column
        id="6b2a3"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Paid $"
        label="Paid"
        placeholder="Enter value"
        position="center"
        size={40.6875}
        summaryAggregationMode="none"
      />
      <Column
        id="deb2c"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Balance $"
        label="Balance"
        placeholder="Enter value"
        position="center"
        size={60.90625}
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
          id="1bfcbac6"
          event="clickToolbar"
          method="exportData"
          pluginId="tblPendingBills"
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
          id="de9340e6"
          event="clickToolbar"
          method="refresh"
          pluginId="tblPendingBills"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
      </ToolbarButton>
    </Table>
  </View>
  <View id="00031" label="Ledger" viewKey="View 2">
    <TextInput
      id="stmtHeader"
      label=""
      labelPosition="top"
      placeholder="Enter value"
      value="Statement for {{ varSelectedVendor.value.vendor_name }} ({{ dateStart.value }} to {{ dateEnd.value }})"
    />
    <Date
      id="dateStart"
      dateFormat="MMM d, yyyy"
      datePlaceholder="{{ self.dateFormat.toUpperCase() }}"
      iconBefore="bold/interface-calendar"
      label="From"
      labelPosition="top"
      value="{{ new Date() }}"
    >
      <Event
        id="0e39b9fa"
        event="change"
        method="refresh"
        params={{}}
        pluginId="tblStatement"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Date>
    <Date
      id="dateEnd"
      dateFormat="MMM d, yyyy"
      datePlaceholder="{{ self.dateFormat.toUpperCase() }}"
      iconBefore="bold/interface-calendar"
      label="To"
      labelPosition="top"
      value="{{ new Date() }}"
    >
      <Event
        id="0061a4a6"
        event="change"
        method="refresh"
        params={{}}
        pluginId="tblStatement"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Date>
    <TextInput
      id="textInput1"
      label=""
      labelPosition="top"
      placeholder="Enter value"
      value="Opening Balance: {{ stmtTransformer.value.opening_balance }}"
    />
    <Table
      id="tblStatement"
      autoColumnWidth={true}
      cellSelection="none"
      clearChangesetOnSave={true}
      data="{{ stmtTransformer.value.transactions }}"
      defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
      emptyMessage="No rows found"
      enableSaveActions={true}
      heightType="auto"
      primaryKeyColumnId="1ceb8"
      showBorder={true}
      showFooter={true}
      showHeader={true}
      toolbarPosition="bottom"
    >
      <Column
        id="7a91a"
        alignment="left"
        format="datetime"
        groupAggregationMode="none"
        key="date"
        label="Date"
        placeholder="Enter value"
        position="center"
        size={145.90625}
        summaryAggregationMode="none"
      />
      <Column
        id="97f66"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="reference_number"
        label="Reference number"
        placeholder="Enter value"
        position="center"
        size={120.3125}
        summaryAggregationMode="none"
      />
      <Column
        id="91e19"
        alignment="left"
        format="tag"
        formatOptions={{ automaticColors: true }}
        groupAggregationMode="none"
        key="type"
        label="Type"
        placeholder="Select option"
        position="center"
        size={88.53125}
        summaryAggregationMode="none"
        valueOverride="{{ _.startCase(item) }}"
      />
      <Column
        id="9485d"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="description"
        label="Description"
        placeholder="Enter value"
        position="center"
        size={236.875}
        summaryAggregationMode="none"
      />
      <Column
        id="88504"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="net_change"
        label="Net change"
        placeholder="Enter value"
        position="center"
        size={81.65625}
        summaryAggregationMode="none"
      />
      <Column
        id="f7462"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="credit_amount"
        label="Credit amount"
        placeholder="Enter value"
        position="center"
        size={96.734375}
        summaryAggregationMode="none"
      />
      <Column
        id="f7aae"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="debit_amount"
        label="Debit amount"
        placeholder="Enter value"
        position="center"
        size={92.375}
        summaryAggregationMode="none"
      />
      <Column
        id="328f1"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="running_balance"
        label="Running balance"
        placeholder="Enter value"
        position="center"
        size={109.796875}
        summaryAggregationMode="none"
      />
      <Column
        id="1ceb8"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="id"
        label="ID"
        placeholder="Enter value"
        position="center"
        size={100}
        summaryAggregationMode="none"
      />
      <Column
        id="d758a"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="vendor_id"
        label="Vendor ID"
        placeholder="Enter value"
        position="center"
        size={100}
        summaryAggregationMode="none"
      />
      <Column
        id="347aa"
        alignment="left"
        format="datetime"
        groupAggregationMode="none"
        hidden="true"
        key="created_at"
        label="Created at"
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
          id="e35a591a"
          event="clickToolbar"
          method="exportData"
          pluginId="tblStatement"
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
          id="fc41d825"
          event="clickToolbar"
          method="refresh"
          pluginId="tblStatement"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
      </ToolbarButton>
    </Table>
  </View>
  <View id="00032" label="Debit Note" viewKey="View 3">
    <Button id="button10" text="Create Debit Note">
      <Event
        id="2eaed529"
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
        pluginId="populateDebitTableJS"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="ca8cae19"
        event="click"
        method="show"
        params={{}}
        pluginId="modalDebitNote"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Table
      id="debiteNotetbl"
      autoColumnWidth={true}
      cellSelection="none"
      clearChangesetOnSave={true}
      data="{{ getVendorDebitNotes.data }}"
      defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
      emptyMessage="No rows found"
      enableSaveActions={true}
      headerTextWrap={true}
      heightType="auto"
      primaryKeyColumnId="6c00d"
      rowHeight="medium"
      showBorder={true}
      showFooter={true}
      showHeader={true}
      toolbarPosition="bottom"
    >
      <Column
        id="03c86"
        alignment="right"
        editable={false}
        format="decimal"
        groupAggregationMode="countDistinct"
        hidden="true"
        key="id"
        label="ID"
        position="center"
        size={27.796875}
        summaryAggregationMode="none"
      />
      <Column
        id="c264e"
        alignment="left"
        format="datetime"
        groupAggregationMode="none"
        hidden="true"
        key="created_at"
        label="Created at"
        placeholder="Enter value"
        position="center"
        size={139.609375}
        summaryAggregationMode="none"
      />
      <Column
        id="03f8d"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="vendor_id"
        label="Vendor ID"
        placeholder="Enter value"
        position="center"
        size={71.765625}
        summaryAggregationMode="none"
      />
      <Column
        id="36565"
        alignment="left"
        format="datetime"
        groupAggregationMode="none"
        key="debit_note_date"
        label="Debit note date"
        placeholder="Enter value"
        position="center"
        size={104}
        summaryAggregationMode="none"
      />
      <Column
        id="26b01"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="debit_note_number"
        label="Debit note number"
        placeholder="Enter value"
        position="center"
        size={121.828125}
        summaryAggregationMode="none"
      />
      <Column
        id="a4ed7"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="amount"
        label="Amount"
        placeholder="Enter value"
        position="center"
        size={60.0625}
        summaryAggregationMode="none"
      />
      <Column
        id="6c00d"
        alignment="left"
        editable="false"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        hidden="true"
        key="linked_invoice_id"
        label="Linked invoice ID"
        placeholder="Enter value"
        position="center"
        size={111.625}
        summaryAggregationMode="none"
      />
      <Column
        id="b92b9"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="reason"
        label="Reason"
        placeholder="Enter value"
        position="center"
        size={57.8125}
        summaryAggregationMode="none"
      />
      <Column
        id="ba823"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="status"
        label="Status"
        placeholder="Enter value"
        position="center"
        size={52.40625}
        summaryAggregationMode="none"
      />
      <Column
        id="ccdb7"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        hidden="true"
        key="vendor_name"
        label="Vendor name"
        placeholder="Enter value"
        position="center"
        size={153.09375}
        summaryAggregationMode="none"
      />
      <Column
        id="8b3b9"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="linked_invoice_number"
        label="Linked invoice number"
        placeholder="Enter value"
        position="center"
        size={143.171875}
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
          id="26fb6eca"
          event="clickToolbar"
          method="exportData"
          pluginId="debiteNotetbl"
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
          id="1c799b0e"
          event="clickToolbar"
          method="refresh"
          pluginId="debiteNotetbl"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
      </ToolbarButton>
    </Table>
  </View>
  <View
    id="b60f9"
    disabled={false}
    hidden={false}
    iconPosition="left"
    label="Profile"
    viewKey="View 5"
  >
    <TextInput
      id="txtVendorName"
      isHiddenOnMobile={true}
      label="Name"
      labelWidth="20"
      placeholder="Enter value"
      readOnly="{{ !varIsEditing.value }}"
      value="{{ apiGetVendor.data.vendor_name }}"
    />
    <Button id="button13" hidden="{{ varIsEditing.value }}" text="Edit">
      <Event
        id="f692552e"
        event="click"
        method="setValue"
        params={{ map: { value: "true" } }}
        pluginId="varIsEditing"
        type="state"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <TextInput
      id="txtContactPerson"
      label="Contact Person"
      labelWidth="20
"
      placeholder="Enter value"
      readOnly="{{ !varIsEditing.value }}"
      value="{{ apiGetVendor.data.contact_person }}"
    />
    <TextInput
      id="txtContactNo"
      label="Contact No"
      labelWidth="20"
      placeholder="Enter value"
      readOnly="{{ !varIsEditing.value }}"
      value="{{ apiGetVendor.data.contact_no }}"
    />
    <TextInput
      id="txtEmail"
      label="Email"
      labelWidth="20"
      placeholder="Enter value"
      readOnly="{{ !varIsEditing.value }}"
      value="{{ apiGetVendor.data.email }}"
    />
    <TextInput
      id="txtGST"
      label="GST"
      labelWidth="20"
      placeholder="Enter value"
      readOnly="{{ !varIsEditing.value }}"
      value="{{ apiGetVendor.data.gst }}"
    />
    <TextInput
      id="txtPAN"
      label="Pan"
      labelWidth="20"
      placeholder="Enter value"
      readOnly="{{ !varIsEditing.value }}"
      value="{{ apiGetVendor.data.pan }}"
    />
    <Button
      id="btnUpdateInfo"
      hidden="{{ !varIsEditing.value }}"
      text="Update Info"
    >
      <Event
        id="9604814d"
        event="click"
        method="trigger"
        params={{}}
        pluginId="apiUpdateVendor"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="3ff8e71f"
        event="click"
        method="setValue"
        params={{ map: { value: "false" } }}
        pluginId="varIsEditing"
        type="state"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <TextInput
      id="txtBankName"
      label="Bank Name"
      labelWidth="20
"
      placeholder="Enter value"
      readOnly="{{ !varIsEditing.value }}"
      value="{{ apiGetVendor.data.bank_name }}"
    />
    <TextInput
      id="txtAccountNo"
      label="Account No"
      labelWidth="20"
      placeholder="Enter value"
      readOnly="{{ !varIsEditing.value }}"
      value="{{ apiGetVendor.data.bank_account_no }}"
    />
    <TextInput
      id="txtIFSC"
      label="IFSC Code"
      labelWidth="20"
      placeholder="IFSC Code"
      readOnly="{{ !varIsEditing.value }}"
      value="{{ apiGetVendor.data.bank_ifsc }}"
    />
    <Button id="CancelBtn" hidden="{{ !varIsEditing.value }}" text="Cancel">
      <Event
        id="c0130446"
        event="click"
        method="setValue"
        params={{ map: { value: "false" } }}
        pluginId="varIsEditing"
        type="state"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Table
      id="table3"
      autoColumnWidth={true}
      cellSelection="none"
      clearChangesetOnSave={true}
      data="{{ apiGetAddresses.data }}"
      defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
      emptyMessage="No rows found"
      enableSaveActions={true}
      heightType="auto"
      primaryKeyColumnId="27554"
      rowHeight="medium"
      rowSelection="none"
      showBorder={true}
      showHeader={true}
    >
      <Column
        id="27554"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="id"
        label="ID"
        placeholder="Enter value"
        position="center"
        size={100}
        summaryAggregationMode="none"
      />
      <Column
        id="8ca4b"
        alignment="left"
        format="datetime"
        groupAggregationMode="none"
        hidden="true"
        key="created_at"
        label="Created at"
        placeholder="Enter value"
        position="center"
        size={100}
        summaryAggregationMode="none"
      />
      <Column
        id="111a7"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="vendor_id"
        label="Vendor ID"
        placeholder="Enter value"
        position="center"
        size={100}
        summaryAggregationMode="none"
      />
      <Column
        id="a1640"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="address_type_id"
        label="Address type ID"
        placeholder="Enter value"
        position="center"
        size={100}
        summaryAggregationMode="none"
      />
      <Column
        id="e8b5e"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="address_line"
        label="Address line"
        placeholder="Enter value"
        position="center"
        size={330.796875}
        summaryAggregationMode="none"
      />
      <Column
        id="74d3f"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        hidden="true"
        key="coordinates"
        label="Coordinates"
        placeholder="Enter value"
        position="center"
        size={100}
        summaryAggregationMode="none"
      />
      <Column
        id="a4ee4"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        hidden="true"
        key="area"
        label="Area"
        placeholder="Enter value"
        position="center"
        size={100}
        summaryAggregationMode="none"
      />
      <Column
        id="f8f67"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="city"
        label="City"
        placeholder="Enter value"
        position="center"
        size={38.625}
        summaryAggregationMode="none"
      />
      <Column
        id="5b7d5"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="pin_code"
        label="Pin code"
        placeholder="Enter value"
        position="center"
        size={65.171875}
        summaryAggregationMode="none"
      />
      <Column
        id="c2723"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="district"
        label="District"
        placeholder="Enter value"
        position="center"
        size={86.3125}
        summaryAggregationMode="none"
      />
      <Column
        id="dbcf3"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="state_code"
        label="State code"
        placeholder="Enter value"
        position="center"
        size={77.75}
        summaryAggregationMode="none"
      />
      <Column
        id="d11e2"
        alignment="left"
        format="boolean"
        groupAggregationMode="none"
        key="is_default"
        label="Is default"
        placeholder="Enter value"
        position="center"
        size={68.359375}
        summaryAggregationMode="none"
      />
      <Column
        id="1dccc"
        alignment="left"
        format="boolean"
        groupAggregationMode="none"
        hidden="true"
        key="is_active"
        label="Is active"
        placeholder="Enter value"
        position="center"
        size={62.9375}
        summaryAggregationMode="none"
      />
      <ToolbarButton
        id="9df88"
        icon="bold/interface-add-square"
        label="Add New Address"
        type="custom"
      >
        <Event
          id="f1c01b48"
          event="clickToolbar"
          method="show"
          params={{}}
          pluginId="modalAddAddress"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
        <Event
          id="1565b7c0"
          event="clickToolbar"
          method="trigger"
          params={{}}
          pluginId="jsStatesData"
          type="datasource"
          waitMs="0"
          waitType="debounce"
        />
      </ToolbarButton>
      <ToolbarButton
        id="afeaa"
        icon="bold/interface-arrows-round-left"
        label="Refresh"
        type="custom"
      >
        <Event
          id="7babc78d"
          event="clickToolbar"
          method="refresh"
          pluginId="table3"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
      </ToolbarButton>
    </Table>
  </View>
</Container>
