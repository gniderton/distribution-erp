<DrawerFrame
  id="drawerBrand"
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
  width="70%"
>
  <Header>
    <Text
      id="drawerTitle3"
      value="****{{ varSelectedBrand.value.brand_name}}**** Overview"
      verticalAlign="center"
    />
    <Button
      id="drawerCloseButton3"
      ariaLabel="Close"
      horizontalAlign="right"
      iconBefore="bold/interface-delete-1"
      style={{ map: { border: "transparent" } }}
      styleVariant="outline"
    >
      <Event
        id="7ba1cfc8"
        event="click"
        method="setHidden"
        params={{ map: { hidden: true } }}
        pluginId="drawerBrand"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
  </Header>
  <Body>
    <Tabs id="tabs3" itemMode="static" value="{{ self.values[0] }}">
      <Option id="00030" label="Home" value="Tab 1" />
      <Option id="00031" label="Brand Profile" value="Tab 2" />
    </Tabs>
  </Body>
</DrawerFrame>
