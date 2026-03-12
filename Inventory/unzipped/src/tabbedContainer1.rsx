<Container
  id="tabbedContainer1"
  currentViewKey="{{ self.viewKeys[0] }}"
  footerPadding="4px 12px"
  headerPadding="4px 12px"
  overflowType="hidden"
  padding="12px"
  showBody={true}
  showHeader={true}
  transition="fade"
>
  <Header>
    <Tabs
      id="tabs1"
      itemMode="static"
      navigateContainer={true}
      style={{}}
      styleVariant="lineBottom"
      targetContainerId="tabbedContainer1"
      value="{{ self.values[0] }}"
    >
      <Option id="00030" value="Tab 1" />
      <Option id="00031" value="Tab 2" />
      <Option id="00032" value="Tab 3" />
    </Tabs>
  </Header>
  <View id="00030" label="Dashboard" viewKey="View 1" />
  <View id="00031" label="Procurement" viewKey="View 2">
    <Button
      id="button2"
      iconBefore="bold/interface-add-square"
      text="Create PO"
    >
      <Event
        id="7a1efda6"
        event="click"
        method="run"
        params={{
          map: {
            src: "/* --- NEW PO BUTTON SCRIPT --- */\n\n// 1. Set Mode to CREATE\nvarPOMode.setValue('CREATE');\n\n// 2. Wipe Table Memory (Crucial!)\npoLines.setValue([]);\n\n// 3. Reset Inputs\nvendorDropdown.clearValue();\npoNumber2.clearValue();\ndate5.setValue(new Date());\n\n// 4. LAUNCH DRAWER 🚀\ndrawerCreatePO.show();",
          },
        }}
        pluginId=""
        type="script"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="ed2ff3f3"
        event="click"
        method="refresh"
        params={{}}
        pluginId="poListTable"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Table
      id="poListTable"
      actionsOverflowPosition={1}
      autoColumnWidth={true}
      cellSelection="none"
      clearChangesetOnSave={true}
      data="{{ getPOs.data }}"
      defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
      emptyMessage="No rows found"
      enableSaveActions={true}
      headerTextWrap={true}
      heightType="auto"
      primaryKeyColumnId="dbf89"
      rowHeight="medium"
      showBorder={true}
      showHeader={true}
    >
      <Column
        id="dbf89"
        alignment="right"
        editable="false"
        format="decimal"
        formatOptions={{ notation: "standard" }}
        groupAggregationMode="countDistinct"
        hidden="true"
        key="id"
        label="ID"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="2d4d2"
        alignment="left"
        format="datetime"
        groupAggregationMode="none"
        hidden="true"
        key="created_at"
        label="Created at"
        placeholder="Enter value"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="b9ba5"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="po_number"
        label="Po number"
        placeholder="Enter value"
        position="center"
        size={120.9375}
        summaryAggregationMode="none"
      />
      <Column
        id="1c416"
        alignment="left"
        format="datetime"
        groupAggregationMode="none"
        key="po_date"
        label="Po date"
        placeholder="Enter value"
        position="center"
        size={147.8125}
        summaryAggregationMode="none"
      />
      <Column
        id="4a972"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="vendor_name"
        label="Vendor name"
        placeholder="Enter value"
        position="center"
        size={249.953125}
        summaryAggregationMode="none"
      />
      <Column
        id="a783f"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="total_taxable"
        label="Total taxable"
        placeholder="Enter value"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="bab39"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="total_net"
        label="Total net"
        placeholder="Enter value"
        position="center"
        size={79.046875}
        summaryAggregationMode="none"
      />
      <Column
        id="cb2f0"
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
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="b0363"
        alignment="left"
        format="tag"
        formatOptions={{ automaticColors: true }}
        groupAggregationMode="none"
        key="status"
        label="Status"
        placeholder="Select option"
        position="center"
        size={84.015625}
        summaryAggregationMode="none"
        valueOverride="{{ _.startCase(item) }}"
      />
      <Column
        id="03d77"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="total_qty"
        label="Total qty"
        placeholder="Enter value"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="b8e57"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="gst"
        label="Gst"
        placeholder="Enter value"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="230dd"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="total_excise"
        label="Total excise"
        placeholder="Enter value"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="0752e"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="total_disc"
        label="Total disc"
        placeholder="Enter value"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="b028c"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="total_scheme"
        label="Total scheme"
        placeholder="Enter value"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="f5440"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="grand_total"
        label="total_net"
        placeholder="Enter value"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="a6f1f"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        hidden="true"
        key="remarks"
        label="Remarks"
        placeholder="Enter value"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="60df5"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        hidden="true"
        key="created_by"
        label="Created by"
        placeholder="Enter value"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Action id="16a48" icon="bold/interface-edit-view" label="Set Value">
        <Event
          id="27de7ed4"
          event="clickAction"
          method="setValue"
          params={{ map: { value: "{{ currentSourceRow.id }}" } }}
          pluginId="varPOViewId"
          type="state"
          waitMs="0"
          waitType="debounce"
        />
        <Event
          id="eb440ab0"
          event="clickAction"
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
          pluginId="populateDrawerFromPO"
          type="datasource"
          waitMs="0"
          waitType="debounce"
        />
        <Event
          id="b59e20c5"
          event="clickAction"
          method="trigger"
          params={{}}
          pluginId="getPOById"
          type="datasource"
          waitMs="0"
          waitType="debounce"
        />
      </Action>
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
          id="70a5182c"
          event="clickToolbar"
          method="exportData"
          params={{ map: { options: { map: { fileType: "csv" } } } }}
          pluginId="poListTable"
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
          id="025059e3"
          event="clickToolbar"
          method="refresh"
          pluginId="poListTable"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
      </ToolbarButton>
    </Table>
  </View>
  <View id="00032" label="Inwarding" viewKey="View 3">
    <Button
      id="button6"
      iconBefore="bold/interface-add-square"
      text="Create New GRN"
    >
      <Event
        id="c7f67e36"
        event="click"
        method="show"
        params={{}}
        pluginId="modalFrameGRN"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="24b15979"
        event="click"
        method="refresh"
        params={{}}
        pluginId="poListTable"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="4a8977e7"
        event="click"
        method="run"
        params={{
          map: {
            src: "// 1. Reset Correction State (Critical)\nvarCorrectionID.setValue(null);\nvarCorrectionData.setValue({});\n// 2. Clear Form\nvendorDropdownGRN.clearValue();\npiLines.setValue([]);",
          },
        }}
        pluginId=""
        type="script"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Table
      id="tblGrn"
      actionsOverflowPosition={1}
      autoColumnWidth={true}
      cellSelection="none"
      clearChangesetOnSave={true}
      data="{{ getGRNList.data }}"
      defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
      emptyMessage="No rows found"
      enableSaveActions={true}
      groupByColumns={{}}
      heightType="auto"
      showBorder={true}
      showHeader={true}
      templatePageSize="50"
    >
      <Column
        id="14599"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="Internal ID"
        label="Internal id"
        placeholder="Enter value"
        position="center"
        size={129.796875}
      />
      <Column
        id="28ea6"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="Bill No"
        label="Bill no"
        placeholder="Enter value"
        position="center"
        size={125.859375}
      />
      <Column
        id="0d9af"
        alignment="left"
        format="tag"
        formatOptions={{ automaticColors: true }}
        groupAggregationMode="none"
        key="Vendor"
        label="Vendor"
        placeholder="Select option"
        position="center"
        size={266.4375}
        valueOverride="{{ _.startCase(item) }}"
      />
      <Column
        id="d8026"
        alignment="left"
        format="tag"
        formatOptions={{ automaticColors: true }}
        groupAggregationMode="none"
        key="PO No"
        label="Po no"
        placeholder="Select option"
        position="center"
        size={127.71875}
        valueOverride="{{ _.startCase(item) }}"
      />
      <Column
        id="e27db"
        alignment="left"
        format="datetime"
        groupAggregationMode="none"
        key="Date"
        label="Date"
        placeholder="Enter value"
        position="center"
        size={147.671875}
      />
      <Column
        id="95a73"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Total $"
        label="Total"
        placeholder="Enter value"
        position="center"
        size={61.265625}
      />
      <Column
        id="9dbd0"
        alignment="left"
        format="tag"
        formatOptions={{ automaticColors: true }}
        groupAggregationMode="none"
        key="Status"
        label="Status"
        placeholder="Select option"
        position="center"
        size={75.421875}
        valueOverride="{{ _.startCase(item) }}"
      />
      <Column
        id="1edc3"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Balance $"
        label="Balance"
        placeholder="Enter value"
        position="center"
        size={61.265625}
      />
      <Column
        id="2e382"
        alignment="right"
        editable="false"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="id"
        label="ID"
        placeholder="Enter value"
        position="center"
        size={27.796875}
      />
      <Column
        id="08a52"
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
        size={70.265625}
      />
      <Column
        id="5dc45"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="Paid $"
        label="Paid"
        placeholder="Enter value"
        position="center"
        size={61.984375}
      />
      <Column
        id="2cd89"
        alignment="left"
        cellTooltipMode="overflow"
        format="tags"
        formatOptions={{ automaticColors: true }}
        groupAggregationMode="none"
        hidden="true"
        key="lines_json"
        label="Lines json"
        placeholder="Select options"
        position="center"
        size={72.5625}
      />
      <Action
        id="9d485"
        icon="bold/interface-edit-view"
        label="View modalViewGRN"
      >
        <Event
          id="eec44d99"
          event="clickAction"
          method="show"
          params={{}}
          pluginId="modalViewGRN"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
      </Action>
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
          id="2e5321bf"
          event="clickToolbar"
          method="exportData"
          pluginId="tblGrn"
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
          id="3882f0a1"
          event="clickToolbar"
          method="refresh"
          pluginId="tblGrn"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
      </ToolbarButton>
    </Table>
  </View>
  <View
    id="c8e4b"
    disabled={false}
    hidden={false}
    iconPosition="left"
    label="Vendors"
    viewKey="View 4"
  >
    <Button
      id="modalAddVendor"
      hidden="false"
      iconBefore="bold/interface-add-square"
      text="Create New Vendor"
    >
      <Event
        id="0d9fd925"
        event="click"
        method="show"
        params={{}}
        pluginId="modalFrame1"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="dae6dea0"
        event="click"
        method="trigger"
        params={{}}
        pluginId="jsStatesData"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Table
      id="tblVendors"
      actionsOverflowPosition={1}
      autoColumnWidth={true}
      cellSelection="none"
      clearChangesetOnSave={true}
      data="{{ Vendors.data }}"
      defaultSelectedRow={{ mode: "index", indexType: "display", index: 0 }}
      emptyMessage="No rows found"
      enableSaveActions={true}
      heightType="auto"
      primaryKeyColumnId="55a57"
      rowHeight="medium"
      showBorder={true}
      showHeader={true}
    >
      <Column
        id="55a57"
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
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="25810"
        alignment="left"
        format="datetime"
        groupAggregationMode="none"
        hidden="true"
        key="created_at"
        label="Created at"
        placeholder="Enter value"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="1ab51"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="vendor_code"
        label="Vendor code"
        placeholder="Enter value"
        position="center"
        size={88.265625}
        summaryAggregationMode="none"
      />
      <Column
        id="75258"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="vendor_name"
        label="Vendor name"
        placeholder="Enter value"
        position="center"
        size={249.953125}
        summaryAggregationMode="none"
      />
      <Column
        id="ac734"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        hidden="true"
        key="contact_person"
        label="Contact person"
        placeholder="Enter value"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="4cc36"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        key="contact_no"
        label="Contact no"
        placeholder="Enter value"
        position="center"
        size={112.078125}
        summaryAggregationMode="none"
      />
      <Column
        id="45807"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="contact_no_2"
        label="Contact no 2"
        placeholder="Enter value"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="3b5b7"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="email"
        label="Email"
        placeholder="Enter value"
        position="center"
        size={218}
        summaryAggregationMode="none"
      />
      <Column
        id="bdc55"
        alignment="left"
        editableOptions={{ spellCheck: false }}
        format="string"
        groupAggregationMode="none"
        key="gst"
        label="Gst"
        placeholder="Enter value"
        position="center"
        size={133.8125}
        summaryAggregationMode="none"
      />
      <Column
        id="345e7"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="branch_id"
        label="Branch ID"
        placeholder="Enter value"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="ea106"
        alignment="left"
        format="boolean"
        groupAggregationMode="none"
        hidden="true"
        key="is_active"
        label="Is active"
        placeholder="Enter value"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Column
        id="5e819"
        alignment="right"
        editableOptions={{ showStepper: true }}
        format="decimal"
        formatOptions={{ showSeparators: true, notation: "standard" }}
        groupAggregationMode="sum"
        hidden="true"
        key="vendor_address_id"
        label="Vendor address ID"
        placeholder="Enter value"
        position="center"
        size={0}
        summaryAggregationMode="none"
      />
      <Action
        id="0f6e3"
        icon="bold/interface-edit-view"
        label="viewVendorProfile"
      >
        <Event
          id="80f32b3a"
          event="clickAction"
          method="setValue"
          params={{ map: { value: "{{ currentSourceRow }}" } }}
          pluginId="varSelectedVendor"
          type="state"
          waitMs="0"
          waitType="debounce"
        />
        <Event
          id="1d4637b5"
          event="clickAction"
          method="show"
          params={{}}
          pluginId="drawerVendorProfile"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
        <Event
          id="3dfe3ee5"
          event="clickAction"
          method="refresh"
          params={{}}
          pluginId="tblPendingBills"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
        <Event
          id="07e944b4"
          event="clickAction"
          method="refresh"
          params={{}}
          pluginId="tblGrn"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
        <Event
          id="1ddd3f8a"
          event="clickAction"
          method="trigger"
          params={{}}
          pluginId="apiGetVendor"
          type="datasource"
          waitMs="0"
          waitType="debounce"
        />
      </Action>
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
          id="df1ff84d"
          event="clickToolbar"
          method="exportData"
          pluginId="tblVendors"
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
          id="99140d0d"
          event="clickToolbar"
          method="refresh"
          pluginId="tblVendors"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
      </ToolbarButton>
    </Table>
  </View>
  <View
    id="cc5f7"
    disabled={false}
    hidden={false}
    iconPosition="left"
    label="Products"
    viewKey="View 5"
  >
    <Button
      id="button18"
      heightType="auto"
      horizontalAlign="right"
      iconBefore="bold/interface-arrows-synchronize"
      style={{}}
      styleVariant="outline"
    >
      <Event
        id="9bcd2b7d"
        event="click"
        method="trigger"
        params={{}}
        pluginId="jsGroupProducts"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="07c42d7d"
        event="click"
        method="trigger"
        params={{}}
        pluginId="Products"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <DropdownButton
      id="dropdownButton2"
      _colorByIndex={["", "", "", "", ""]}
      _fallbackTextByIndex={["", "", "", "", ""]}
      _imageByIndex={["", "", "", "", ""]}
      _values={["", "", "", "Action 4", "Action 5"]}
      horizontalAlign="right"
      icon="bold/interface-setting-menu-1"
      itemMode="static"
      overlayMaxHeight={375}
      styleVariant="outline"
    >
      <Option id="00030" icon="bold/interface-add-square" label="Add Products">
        <Event
          id="26a53ecd"
          event="click"
          method="show"
          params={{}}
          pluginId="modalAddProduct"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
      </Option>
      <Option
        id="00031"
        icon="bold/interface-edit-portrait-setting"
        label="Export"
      >
        <Event
          id="4808054d"
          event="click"
          method="openUrl"
          params={{
            map: { url: "{{ apiBaseUrl.value }}/api/products/export" },
          }}
          pluginId=""
          type="util"
          waitMs="0"
          waitType="debounce"
        />
      </Option>
      <Option
        id="00032"
        icon="bold/interface-file-clipboard-add"
        label="Import Bulk Edit"
      >
        <Event
          id="3ebe3a32"
          event="click"
          method="show"
          params={{}}
          pluginId="modalUpload"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
        <Event
          id="22227cac"
          event="click"
          method="setValue"
          params={{ map: { value: "bulk" } }}
          pluginId="varModalMode"
          type="state"
          waitMs="0"
          waitType="debounce"
        />
      </Option>
      <Option
        id="b2870"
        disabled={false}
        hidden={false}
        icon="bold/interface-file-multiple"
        label="Import Products"
      >
        <Event
          id="24c7cfe1"
          event="click"
          method="show"
          params={{}}
          pluginId="modalUpload"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
        <Event
          id="12d2b3cb"
          event="click"
          method="setValue"
          params={{ map: { value: "import" } }}
          pluginId="varModalMode"
          type="state"
          waitMs="0"
          waitType="debounce"
        />
        <Event
          id="317b32f8"
          event="click"
          method="trigger"
          params={{}}
          pluginId="getTemplateData"
          type="datasource"
          waitMs="0"
          waitType="debounce"
        />
      </Option>
      <Option
        id="33074"
        disabled={false}
        hidden={false}
        icon="bold/interface-setting-slider-horizontal-square"
        label="Stock Adjustments"
      >
        <Event
          id="81446ffd"
          event="click"
          method="show"
          params={{}}
          pluginId="modalStockAdjust"
          type="widget"
          waitMs="0"
          waitType="debounce"
        />
      </Option>
    </DropdownButton>
    <ListViewBeta
      id="listView1"
      data="{{ jsGroupProducts.data }}"
      enableInstanceValues={true}
      hidden="false"
      itemWidth="200px"
      numColumns={3}
      padding="12px"
    >
      <Container
        id="collapsibleContainer1"
        footerPadding="4px 12px"
        headerPadding="4px 12px"
        overflowType="hidden"
        padding="12px"
        showHeader={true}
      >
        <Header>
          <Text
            id="text17"
            value="****{{ item.brand_name }} | Count of Products:{{ item.product_count }}****
Taxable Stock Value: ₹{{ item.val_stock_taxable }} | Total Bought Value: ₹{{ item.val_total_bought }}"
            verticalAlign="center"
          />
          <Button
            id="button17"
            allowWrap={false}
            heightType="auto"
            horizontalAlign="right"
            iconBefore="bold/interface-edit-view"
            style={{}}
            styleVariant="outline"
            submitTargetId=""
          >
            <Event
              id="6b186525"
              event="click"
              method="run"
              params={{
                map: {
                  src: "// i is the list index, or we use the item\n// Set a variable to know WHICH brand we are looking at\nawait varSelectedBrand.setValue(item); \ndrawerBrand.show();",
                },
              }}
              pluginId=""
              type="script"
              waitMs="0"
              waitType="debounce"
            />
          </Button>
          <ToggleButton
            id="collapsibleToggle1"
            iconForFalse="bold/interface-arrows-button-down"
            iconForTrue="bold/interface-arrows-button-up"
            iconPosition="replace"
            style={{}}
            styleVariant="outline"
            text="{{ self.value ? 'Hide Products' : 'Show Products' }}"
            value="{{ collapsibleContainer1.showBody }}"
          >
            <Event
              id="c4d13f0a"
              event="change"
              method="setShowBody"
              params={{ map: { showBody: "{{ self.value }}" } }}
              pluginId="collapsibleContainer1"
              type="widget"
              waitMs="0"
              waitType="debounce"
            />
          </ToggleButton>
        </Header>
        <View id="00030" viewKey="View 1">
          <Table
            id="table6"
            actionsOverflowPosition={1}
            autoColumnWidth={true}
            cellSelection="none"
            clearChangesetOnSave={true}
            data="{{ item.products }}"
            defaultSelectedRow={{
              mode: "index",
              indexType: "display",
              index: 0,
            }}
            emptyMessage="No rows found"
            enableSaveActions={true}
            heightType="auto"
            primaryKeyColumnId="8d211"
            showBorder={true}
            showHeader={true}
            toolbarPosition="bottom"
          >
            <Column
              id="8d211"
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
              id="76991"
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
              id="2a516"
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
              id="677ae"
              alignment="right"
              editableOptions={{ showStepper: true }}
              format="decimal"
              formatOptions={{ showSeparators: true, notation: "standard" }}
              groupAggregationMode="sum"
              hidden="true"
              key="brand_id"
              label="Brand ID"
              placeholder="Enter value"
              position="center"
              size={100}
              summaryAggregationMode="none"
            />
            <Column
              id="17e86"
              alignment="right"
              editableOptions={{ showStepper: true }}
              format="decimal"
              formatOptions={{ showSeparators: true, notation: "standard" }}
              groupAggregationMode="sum"
              hidden="true"
              key="category_id"
              label="Category ID"
              placeholder="Enter value"
              position="center"
              size={100}
              summaryAggregationMode="none"
            />
            <Column
              id="634a6"
              alignment="left"
              editableOptions={{ spellCheck: false }}
              format="string"
              groupAggregationMode="none"
              hidden="true"
              key="product_code"
              label="Product code"
              placeholder="Enter value"
              position="center"
              size={100}
              summaryAggregationMode="none"
            />
            <Column
              id="42844"
              alignment="right"
              editableOptions={{ showStepper: true }}
              format="decimal"
              formatOptions={{ showSeparators: true, notation: "standard" }}
              groupAggregationMode="sum"
              key="hsn_code"
              label="Hsn code"
              placeholder="Enter value"
              position="center"
              size={77.84375}
              summaryAggregationMode="none"
            />
            <Column
              id="3e76d"
              alignment="left"
              editableOptions={{ spellCheck: false }}
              format="string"
              groupAggregationMode="none"
              key="ean_code"
              label="Ean code"
              placeholder="Enter value"
              position="center"
              size={68.640625}
              summaryAggregationMode="none"
            />
            <Column
              id="70fbb"
              alignment="left"
              format="tag"
              formatOptions={{ automaticColors: true }}
              groupAggregationMode="none"
              key="category_name"
              label="Category name"
              placeholder="Select option"
              position="center"
              size={133.125}
              summaryAggregationMode="none"
              valueOverride="{{ _.startCase(item) }}"
            />
            <Column
              id="f6348"
              alignment="left"
              editableOptions={{ spellCheck: false }}
              format="string"
              groupAggregationMode="none"
              hidden="false"
              key="product_name"
              label="Product name"
              placeholder="Enter value"
              position="center"
              size={182.375}
              summaryAggregationMode="none"
            />
            <Column
              id="e852c"
              alignment="right"
              editableOptions={{ showStepper: true }}
              format="decimal"
              formatOptions={{ showSeparators: true, notation: "standard" }}
              groupAggregationMode="sum"
              key="mrp"
              label="Mrp"
              placeholder="Enter value"
              position="center"
              size={38.453125}
              summaryAggregationMode="none"
            />
            <Column
              id="6f7e5"
              alignment="left"
              format="tag"
              formatOptions={{ automaticColors: true }}
              groupAggregationMode="none"
              key="tax_name"
              label="Tax name"
              placeholder="Select option"
              position="center"
              size={72.625}
              summaryAggregationMode="none"
              valueOverride="{{ _.startCase(item) }}"
            />
            <Column
              id="901b8"
              alignment="right"
              editableOptions={{ showStepper: true }}
              format="decimal"
              formatOptions={{ showSeparators: true, notation: "standard" }}
              groupAggregationMode="sum"
              hidden="true"
              key="hsn_id"
              label="Hsn ID"
              placeholder="Enter value"
              position="center"
              size={100}
              summaryAggregationMode="none"
            />
            <Column
              id="4906f"
              alignment="right"
              editableOptions={{ showStepper: true }}
              format="decimal"
              formatOptions={{ showSeparators: true, notation: "standard" }}
              groupAggregationMode="sum"
              hidden="true"
              key="tax_id"
              label="Tax ID"
              placeholder="Enter value"
              position="center"
              size={100}
              summaryAggregationMode="none"
            />
            <Column
              id="1ec42"
              alignment="right"
              editableOptions={{ showStepper: true }}
              format="decimal"
              formatOptions={{ showSeparators: true, notation: "standard" }}
              groupAggregationMode="sum"
              hidden="true"
              key="purchase_rate"
              label="Purchase rate"
              placeholder="Enter value"
              position="center"
              size={100}
              summaryAggregationMode="none"
            />
            <Column
              id="9629b"
              alignment="right"
              editableOptions={{ showStepper: true }}
              format="decimal"
              formatOptions={{ showSeparators: true, notation: "standard" }}
              groupAggregationMode="sum"
              hidden="true"
              key="distributor_rate"
              label="Distributor rate"
              placeholder="Enter value"
              position="center"
              size={100}
              summaryAggregationMode="none"
            />
            <Column
              id="f3279"
              alignment="right"
              editableOptions={{ showStepper: true }}
              format="decimal"
              formatOptions={{ showSeparators: true, notation: "standard" }}
              groupAggregationMode="sum"
              hidden="true"
              key="wholesale_rate"
              label="Wholesale rate"
              placeholder="Enter value"
              position="center"
              size={100}
              summaryAggregationMode="none"
            />
            <Column
              id="d6ca7"
              alignment="right"
              editableOptions={{ showStepper: true }}
              format="decimal"
              formatOptions={{ showSeparators: true, notation: "standard" }}
              groupAggregationMode="sum"
              hidden="true"
              key="dealer_rate"
              label="Dealer rate"
              placeholder="Enter value"
              position="center"
              size={100}
              summaryAggregationMode="none"
            />
            <Column
              id="c8b3f"
              alignment="right"
              editableOptions={{ showStepper: true }}
              format="decimal"
              formatOptions={{ showSeparators: true, notation: "standard" }}
              groupAggregationMode="sum"
              hidden="true"
              key="retail_rate"
              label="Retail rate"
              placeholder="Enter value"
              position="center"
              size={100}
              summaryAggregationMode="none"
            />
            <Column
              id="b9d52"
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
            <Column
              id="8c439"
              alignment="right"
              editableOptions={{ showStepper: true }}
              format="decimal"
              formatOptions={{ showSeparators: true, notation: "standard" }}
              groupAggregationMode="sum"
              hidden="false"
              key="current_stock"
              label="Current stock"
              placeholder="Enter value"
              position="center"
              size={93.140625}
              summaryAggregationMode="none"
            />
            <Column
              id="7d20e"
              alignment="right"
              editableOptions={{ showStepper: true }}
              format="decimal"
              formatOptions={{ showSeparators: true, notation: "standard" }}
              groupAggregationMode="sum"
              hidden="true"
              key="damaged_stock"
              label="Damaged stock"
              placeholder="Enter value"
              position="center"
              size={100}
              summaryAggregationMode="none"
            />
            <Column
              id="64a37"
              alignment="right"
              editableOptions={{ showStepper: true }}
              format="decimal"
              formatOptions={{ showSeparators: true, notation: "standard" }}
              groupAggregationMode="sum"
              hidden="true"
              key="stock_damage"
              label="Stock damage"
              placeholder="Enter value"
              position="center"
              size={100}
              summaryAggregationMode="none"
            />
            <Column
              id="25d65"
              alignment="right"
              editableOptions={{ showStepper: true }}
              format="decimal"
              formatOptions={{ showSeparators: true, notation: "standard" }}
              groupAggregationMode="sum"
              hidden="true"
              key="stock_expiry"
              label="Stock expiry"
              placeholder="Enter value"
              position="center"
              size={100}
              summaryAggregationMode="none"
            />
            <Column
              id="c8a28"
              alignment="left"
              format="tag"
              formatOptions={{ automaticColors: true }}
              groupAggregationMode="none"
              hidden="true"
              key="brand_name"
              label="Brand name"
              placeholder="Select option"
              position="center"
              size={100}
              summaryAggregationMode="none"
              valueOverride="{{ _.startCase(item) }}"
            />
            <Action id="7b4c1" icon="bold/interface-edit-view" label="Action 1">
              <Event
                id="70360d30"
                event="clickAction"
                method="run"
                params={{
                  map: {
                    src: "// We passed product_id in additionalScope\nawait varProductViewId.setValue(currentSourceRow.id);\napiGetProductStats.trigger();\ndrawerProduct.show();",
                  },
                }}
                pluginId=""
                type="script"
                waitMs="0"
                waitType="debounce"
              />
            </Action>
          </Table>
        </View>
        <Event
          id="9d7965e8"
          event="click"
          method="trigger"
          params={{}}
          pluginId="jsGroupProducts"
          type="datasource"
          waitMs="0"
          waitType="debounce"
        />
      </Container>
    </ListViewBeta>
  </View>
  <Event
    id="d8a86e1f"
    enabled="{{ self.currentViewKey === 'View 5' }}"
    event="click"
    method="trigger"
    params={{}}
    pluginId="jsGroupProducts"
    type="datasource"
    waitMs="0"
    waitType="debounce"
  />
</Container>
