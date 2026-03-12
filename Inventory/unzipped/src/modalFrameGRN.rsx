<ModalFrame
  id="modalFrameGRN"
  enableFullBleed={true}
  footerPadding="8px 12px"
  headerPadding="8px 12px"
  hidden={true}
  hideOnEscape={true}
  padding="8px 12px"
  showHeader={true}
  showOverlay={true}
  size="fullScreen"
>
  <Header>
    <Text id="modalTitle1" value="### GRN" verticalAlign="center" />
    <Button
      id="modalCloseButton1"
      ariaLabel="Close"
      horizontalAlign="right"
      iconBefore="bold/interface-delete-1"
      style={{ map: { border: "transparent" } }}
      styleVariant="outline"
    >
      <Event
        id="78b7135f"
        event="click"
        method="setHidden"
        params={{ map: { hidden: true } }}
        pluginId="modalFrameGRN"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
  </Header>
  <Body>
    <Include src="./container9.rsx" />
  </Body>
</ModalFrame>
