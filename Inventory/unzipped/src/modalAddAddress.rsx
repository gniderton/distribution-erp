<ModalFrame
  id="modalAddAddress"
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
  size="medium"
>
  <Header>
    <Text id="modalTitle6" value="Add New Address" verticalAlign="center" />
    <Button
      id="modalCloseButton7"
      ariaLabel="Close"
      horizontalAlign="right"
      iconBefore="bold/interface-delete-1"
      style={{ map: { border: "transparent" } }}
      styleVariant="outline"
    >
      <Event
        id="ea54c85e"
        event="click"
        method="setHidden"
        params={{ map: { hidden: true } }}
        pluginId="modalAddAddress"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
  </Header>
  <Body>
    <TextInput id="txtNewAddress" label="Address" placeholder="Address" />
    <Button
      id="button14"
      iconBefore="bold/interface-add-square"
      text="Add new Address"
    >
      <Event
        id="2bb86968"
        event="click"
        method="trigger"
        params={{}}
        pluginId="apiAddAddress"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <TextInput id="txtNewCity" label="City" placeholder="City" />
    <Select
      id="selNewState"
      data="{{ Object.keys(jsStatesData.data) }}"
      emptyMessage="No options"
      label="State"
      overlayMaxHeight={375}
      placeholder="State"
      showSelectionIndicator={true}
    />
    <Select
      id="selNewDistrict"
      data="{{ jsStatesData.data[selNewState.value] }}"
      disabledByIndex="{{ !selNewState.value }}"
      emptyMessage="No options"
      label="District"
      overlayMaxHeight={375}
      placeholder="District"
      showSelectionIndicator={true}
    />
    <TextInput id="txtNewPin" label="Pin Code" placeholder="Pin Code" />
    <Checkbox
      id="chkNewDefault"
      label="Make it Default Address"
      labelWidth="100"
    />
  </Body>
</ModalFrame>
