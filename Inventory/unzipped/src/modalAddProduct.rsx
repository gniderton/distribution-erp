<ModalFrame
  id="modalAddProduct"
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
    <Text id="modalTitle4" value="add product" verticalAlign="center" />
    <Button
      id="modalCloseButton5"
      ariaLabel="Close"
      horizontalAlign="right"
      iconBefore="bold/interface-delete-1"
      style={{ map: { border: "transparent" } }}
      styleVariant="outline"
    >
      <Event
        id="7ab6a857"
        event="click"
        method="setHidden"
        params={{ map: { hidden: true } }}
        pluginId="modalAddProduct"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
  </Header>
  <Body>
    <TextInput
      id="inpNewProductName"
      label="Product Name"
      placeholder="product name"
    />
    <TextInput id="inpNewProductEan" label="EAN Code" placeholder="ean code" />
    <Select
      id="selNewProductVendor"
      captionByIndex="{{ item.vendor_code }}"
      data="{{ Vendors.data }}"
      emptyMessage="No options"
      label="Vendor"
      labels="{{ item.vendor_name }}"
      overlayMaxHeight={375}
      placeholder="Select an option"
      showSelectionIndicator={true}
      values="{{ item.id }}"
    />
    <Select
      id="selNewProductBrand"
      data="{{ getBrands.data }}"
      emptyMessage="No options"
      label="Brand"
      labels="{{ item.brand_name }}"
      overlayMaxHeight={375}
      placeholder="Brands"
      showSelectionIndicator={true}
      values="{{ item.id }}"
    />
    <Select
      id="selNewProductCategory"
      data="{{ getCategories.data }}"
      emptyMessage="No options"
      label="Category"
      labels="{{ item.category_name }}"
      overlayMaxHeight={375}
      placeholder="Categories"
      showSelectionIndicator={true}
      values="{{ item.id }}"
    />
    <Select
      id="selNewProductHSN"
      data="{{ getHSN.data }}"
      emptyMessage="No options"
      label="HSN Code"
      labels="{{ item.hsn_description }}
"
      overlayMaxHeight={375}
      placeholder="HSN Code"
      showSelectionIndicator={true}
      values="{{ item.id }}"
    />
    <Select
      id="selNewProductTax"
      data="{{ Tax.data}}"
      emptyMessage="No options"
      label="Tax %"
      labels="{{ item.tax_percentage }}"
      overlayMaxHeight={375}
      placeholder="Tax %"
      showSelectionIndicator={true}
    />
    <NumberInput
      id="inpNewProductMRP"
      currency="USD"
      inputValue={0}
      label="MRP"
      labelPosition="top"
      placeholder="Enter value"
      showSeparators={true}
      showStepper={true}
      value={0}
    />
    <NumberInput
      id="inpNewProductPurchaseRate"
      currency="USD"
      inputValue={0}
      label="Purchase Rate"
      labelPosition="top"
      placeholder="Enter value"
      showSeparators={true}
      showStepper={true}
      value={0}
    />
    <NumberInput
      id="inpNewProductDistRate"
      currency="USD"
      inputValue={0}
      label="Dist Price"
      labelPosition="top"
      placeholder="Enter value"
      showSeparators={true}
      showStepper={true}
      value={0}
    />
    <NumberInput
      id="inpNewProductWholesaleRate"
      currency="USD"
      inputValue={0}
      label="Wholesale Price"
      labelPosition="top"
      placeholder="Enter value"
      showSeparators={true}
      showStepper={true}
      value={0}
    />
    <NumberInput
      id="inpNewProductDealerRate"
      currency="USD"
      inputValue={0}
      label="Dealer Price"
      labelPosition="top"
      placeholder="Enter value"
      showSeparators={true}
      showStepper={true}
      value={0}
    />
    <NumberInput
      id="inpNewProductRetailRate"
      currency="USD"
      inputValue={0}
      label="Retail Price"
      labelPosition="top"
      placeholder="Enter value"
      showSeparators={true}
      showStepper={true}
      value={0}
    />
    <Button
      id="btnSaveProduct"
      iconBefore="bold/interface-add-square"
      text="Add Product"
    >
      <Event
        id="adae4500"
        event="click"
        method="trigger"
        params={{}}
        pluginId="apiCreateProduct"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </Button>
  </Body>
</ModalFrame>
