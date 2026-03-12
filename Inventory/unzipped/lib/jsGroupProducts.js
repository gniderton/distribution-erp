const all = Products.data.data || Products.data || []; 
// Group By Brand
const grouped = _.groupBy(all, 'brand_name');
// Return Array for ListView
return Object.keys(grouped).map((brandName, index) => {
    const products = grouped[brandName];
    // Grab the brand_id from the first product
    const brandId = products[0] ? products[0].brand_id : index; 
    // 1. Taxable Stock Value (Current Value of Goods on Hand - Taxable)
    const valStockTaxable = _.sumBy(products, p => Number(p.stock_value_cost || 0));
    // 2. Total Bought Value (Historical Value of All Goods Purchased - Taxable)
    const valTotalBought = _.sumBy(products, p => Number(p.stock_value_total_bought || 0));
    return {
        id: brandId,
        brand_name: brandName,
        product_count: products.length,
        val_stock_taxable: valStockTaxable.toFixed(2),
        val_total_bought: valTotalBought.toFixed(2),
        products: products.sort((a,b) => a.product_name.localeCompare(b.product_name))
    };
}).sort((a,b) => a.brand_name.localeCompare(b.brand_name));