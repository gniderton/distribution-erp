<ModalFrame
  id="modalMakePayment"
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
    <Text id="modalTitle2" value="### Container title" verticalAlign="center" />
    <Button
      id="modalCloseButton2"
      ariaLabel="Close"
      horizontalAlign="right"
      iconBefore="bold/interface-delete-1"
      style={{ map: { border: "transparent" } }}
      styleVariant="outline"
    >
      <Event
        id="7d367d48"
        event="click"
        method="hide"
        params={{}}
        pluginId="modalMakePayment"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
  </Header>
  <Body>
    <SegmentedControl
      id="payType"
      itemMode="static"
      label=""
      labelPosition="top"
      paddingType="spacious"
      value="PAYMENT"
    >
      <Option id="00030" label="PAYMENT" value="PAYMENT" />
      <Option id="00031" label="REFUND" value="REFUND" />
    </SegmentedControl>
    <Button id="button9" text="Confirm Payment">
      <Event
        id="957f3106"
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
        pluginId="savePaymentJS"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
      <Event
        id="f5898050"
        event="click"
        method="hide"
        params={{}}
        pluginId="modalMakePayment"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
    <Date
      id="payDate"
      dateFormat="MMM d, yyyy"
      datePlaceholder="{{ self.dateFormat.toUpperCase() }}"
      iconBefore="bold/interface-calendar"
      label="Date of Payment"
      labelPosition="top"
      value="{{ new Date() }}"
    />
    <Select
      id="payMode"
      captionByIndex=""
      colorByIndex=""
      data=""
      disabledByIndex=""
      emptyMessage="No options"
      fallbackTextByIndex=""
      hiddenByIndex=""
      iconByIndex=""
      imageByIndex=""
      itemMode="static"
      label="Choose Mode"
      labelPosition="top"
      labels=""
      overlayMaxHeight={375}
      placeholder="Select an option"
      showSelectionIndicator={true}
      tooltipByIndex=""
      values=""
    >
      <Option
        id="a0e46"
        disabled={false}
        hidden={false}
        label="Cash"
        value="Cash"
      />
      <Option
        id="05e9d"
        disabled={false}
        hidden={false}
        label="Online"
        value="Online"
      />
      <Option
        id="a87a5"
        disabled={false}
        hidden={false}
        label="Cheque"
        value="Cheque"
      />
    </Select>
    <TextInput
      id="payChqNo"
      hidden="{{ payMode.value !== 'Cheque' }}"
      label="Cheque No"
      labelPosition="top"
      placeholder="Enter value"
    />
    <Date
      id="payChqDate"
      dateFormat="MMM d, yyyy"
      datePlaceholder="{{ self.dateFormat.toUpperCase() }}"
      hidden="{{ payMode.value !== 'Cheque' }}"
      iconBefore="bold/interface-calendar"
      label="Cheque Date"
      labelPosition="top"
      value="{{ new Date() }}"
    />
    <Select
      id="payChqBank"
      data="{{ getBankAccounts.data }}"
      emptyMessage="No options"
      hidden="{{ payMode.value !== 'Cheque' }}"
      label="Source Bank"
      labelPosition="top"
      labels="{{ item.name }}"
      overlayMaxHeight={375}
      placeholder="Select an option"
      showSelectionIndicator={true}
      values="{{ item.id }}"
    />
    <Select
      id="selPaymentBank"
      data="{{ getBankAccounts.data }}"
      emptyMessage="No options"
      hidden="{{ payMode.value === 'Cheque' }}"
      label="Source Account"
      labelPosition="top"
      labels="{{ item.name }} (₹{{ item.current_balance }})"
      overlayMaxHeight={375}
      placeholder="Select an option"
      showSelectionIndicator={true}
      values="{{ item.id }}"
    />
    <Select
      id="selBankRefVendor"
      captionByIndex="{{ item.debit_amount }}"
      data="{{ q_getUnconsumedDebits.data }}"
      emptyMessage="No options"
      hidden="{{ payMode.value !== 'Online' }}"
      label="Online Reference No"
      labelPosition="top"
      labels="{{ item.id }} | {{ item.consumed_amount }}"
      overlayMaxHeight={375}
      placeholder="Select an option"
      showSelectionIndicator={true}
      values="{{ item.id }}"
    />
    <TextInput
      id="payRef"
      hidden="{{ payMode.value !== 'Cash' }}"
      label="Reference No"
      labelPosition="top"
      placeholder="Enter value"
    />
    <NumberInput
      id="payAmount"
      currency="USD"
      inputValue={0}
      label="Amount"
      labelPosition="top"
      placeholder="Enter value"
      showSeparators={true}
      showStepper={true}
      value="{{ varPaymentAmount.value }}"
    />
    <TextInput
      id="payRemarks"
      label="Remarks"
      labelPosition="top"
      placeholder="Remarks"
    />
  </Body>
</ModalFrame>
