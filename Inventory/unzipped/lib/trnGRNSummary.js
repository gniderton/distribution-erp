const lines = {{ tblViewLines.data }} || [];
const groups = {};
// 1. Group by Tax Name
lines.forEach(row => {
    const taxName = row['Tax Name'] || 'No Tax';
    if (!groups[taxName]) {
        groups[taxName] = { 
            PARTICULARS: taxName, 
            Pcs: 0, 
            Gross: 0, 
            Sch: 0, 
            Disc: 0, 
            Taxable: 0, 
            Tax: 0, 
            Net: 0 
        };
    }
    
    const g = groups[taxName];
    g.Pcs     += Number(row['Qty'] || 0);
    g.Gross   += Number(row['Gross'] || 0);
    g.Sch     += Number(row['Sch'] || 0);
    g.Disc    += (Number(row['Disc %'] || 0) / 100 * Number(row['Gross'] || 0));
    g.Taxable += Number(row['Taxable'] || 0);
    
    // Handle Tax Amount Mapping
    const taxAmt = Number(row['GST $'] || row['tax_amount'] || 0);
    g.Tax     += taxAmt;
    g.Net     += Math.round(Number(row['Net $'] || 0)); // Or Taxable + Tax
});
// 2. Convert to Array
const resultRows = Object.values(groups);
// 3. Calculate Grand Total Row
const totalRow = resultRows.reduce((acc, curr) => {
    acc.Pcs += curr.Pcs;
    acc.Gross += curr.Gross;
    acc.Sch += curr.Sch;
    acc.Disc += curr.Disc;
    acc.Taxable += curr.Taxable;
    acc.Tax += curr.Tax;
    acc.Net += curr.Net;
    return acc;
}, { PARTICULARS: 'Total', Pcs: 0, Gross: 0, Sch: 0, Disc: 0, Taxable: 0, Tax: 0, Net: 0 });
// 4. Return Final List (Groups + Total Row)
resultRows.push(totalRow);
return resultRows;