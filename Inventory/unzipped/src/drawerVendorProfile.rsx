<DrawerFrame
  id="drawerVendorProfile"
  footerPadding="8px 12px"
  headerPadding="8px 12px"
  hidden={true}
  hideOnEscape={true}
  overlayInteraction={true}
  padding="8px 12px"
  showFooter={true}
  showHeader={true}
  showOverlay={true}
  width="70%"
>
  <Header>
    <Text
      id="drawerTitle2"
      value="{{ varSelectedVendor.value.vendor_name }}"
      verticalAlign="center"
    />
    <Button
      id="drawerCloseButton2"
      ariaLabel="Close"
      horizontalAlign="right"
      iconBefore="bold/interface-delete-1"
      style={{}}
      styleVariant="outline"
    >
      <Event
        id="13381b9c"
        event="click"
        method="setHidden"
        params={{ map: { hidden: true } }}
        pluginId="drawerVendorProfile"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="bd4aac4f"
        event="click"
        method="setValue"
        params={{ map: { value: "{{ currentSourceRow }}" } }}
        pluginId="varSelectedVendor"
        type="state"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
  </Header>
  <Body>
    <Include src="./tabbedContainer2.rsx" />
  </Body>
</DrawerFrame>
