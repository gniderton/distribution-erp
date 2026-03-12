<ModalFrame
  id="modalFrame1"
  footerPadding="8px 12px"
  headerPadding="8px 12px"
  hidden={true}
  hideOnEscape={true}
  isHiddenOnMobile={true}
  overlayInteraction={true}
  padding="8px 12px"
  showHeader={true}
  showOverlay={true}
>
  <Header>
    <Text id="modalTitle3" value="create new vendor" verticalAlign="center" />
    <Button
      id="modalCloseButton4"
      ariaLabel="Close"
      heightType="auto"
      horizontalAlign="right"
      iconBefore="bold/interface-delete-1"
      style={{ map: { border: "transparent" } }}
      styleVariant="outline"
    >
      <Event
        id="97fb5f95"
        event="click"
        method="setHidden"
        params={{ map: { hidden: true } }}
        pluginId="modalFrame1"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
  </Header>
  <Body>
    <TextInput
      id="inpNewVendorName"
      label=""
      labelPosition="top"
      placeholder="Vendor"
    />
    <Button id="btnSaveVendor" text="Create Vendor">
      <Event
        id="99987cfc"
        event="click"
        method="trigger"
        params={{}}
        pluginId="apiCreateVendor"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="23c0ecb3"
        event="click"
        method="hide"
        params={{}}
        pluginId="modalFrame1"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Text id="text12" value="contact information" verticalAlign="center" />
    <TextInput
      id="inpNewVendorPhone"
      label=""
      labelPosition="top"
      placeholder="Contact No"
    />
    <TextInput
      id="inpNewVendorEmail"
      label=""
      labelPosition="top"
      placeholder="email"
    />
    <Text id="text11" value="address" verticalAlign="center" />
    <TextInput
      id="inpNewVendorAddress1"
      label=""
      labelPosition="top"
      placeholder="Address"
    />
    <Select
      id="inpNewVendorState"
      data="{{ Object.keys(jsStatesData.data) }}"
      emptyMessage="No options"
      label=""
      labelPosition="top"
      overlayMaxHeight={375}
      placeholder="State"
      showSelectionIndicator={true}
    />
    <Select
      id="inpNewVendorDistrict"
      data="{{ jsStatesData.data[inpNewVendorState.value] }}"
      disabledByIndex="{{ !inpNewVendorState.value }}"
      emptyMessage="No options"
      label=""
      labelPosition="top"
      overlayMaxHeight={375}
      placeholder="District"
      showSelectionIndicator={true}
    />
    <TextInput id="inpNewVendorPin" label="" placeholder="Pin Code" />
    <Text id="text10" value="official" verticalAlign="center" />
    <TextInput
      id="inpNewVendorGST"
      label=""
      labelPosition="top"
      placeholder="GST"
    />
    <TextInput
      id="inpNewVendorPan"
      label=""
      labelPosition="top"
      placeholder="Pan"
    />
    <Text id="text13" value="bank details" verticalAlign="center" />
    <Select
      id="inpNewVendorBankName"
      data="{{ apiGetBank.data }}"
      emptyMessage="No options"
      label=""
      labelPosition="top"
      labels="{{ item.bank_name }}"
      overlayMaxHeight={375}
      placeholder="Select an option"
      showSelectionIndicator={true}
      values="{{ item.id }}"
    />
    <TextInput
      id="inpNewVendorBankAcc"
      label=""
      labelPosition="top"
      placeholder="Account No"
    />
    <TextInput
      id="inpNewVendorIFSC"
      label="
"
      labelPosition="top"
      placeholder="IFSC Code"
    />
  </Body>
</ModalFrame>
