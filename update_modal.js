const fs = require('fs');

let content = fs.readFileSync('gniderton-erp-web/src/modules/credit-note/components/CreateCreditNoteModal.tsx', 'utf8');

content = content.replace(/const handleLoadFromInvoice = \(\) => \{[\s\S]*?toast\.success\('Loaded items from invoice'\)\n  \}/, `const handleLoadFromInvoice = () => {
    if (!invoiceDetail || !invoiceDetail.lines) {
      toast.error('No invoice details found')
      return
    }

    const newLines = invoiceDetail.lines.map((l: any) => {
      const p = products.find((prod: any) => String(prod.id) === String(l.product_id))
      return {
        _row_id: Math.random().toString(36).substr(2, 9),
        product_id: l.product_id,
        item_name: l.product_name || p?.product_name || 'Unknown',
        batch_id: l.batch_id,
        batch_code: l.batch_code || 'Unknown',
        inventory_status: 'Good',
        return_to_stock: true,
        qty: Number(l.shipped_qty || l.qty || 1),
        max_qty: Number(l.shipped_qty || l.qty || 1),
        mrp: Number(l.mrp || 0),
        rate: Number(l.rate || l.mrp || 0),
        gross: Number(l.gross_amount || 0),
        scheme: Number(l.scheme_amount || 0),
        disc_percent: Number(l.discount_percent || 0),
        disc_amount: Number(l.discount_amount || 0),
        taxable: Number(l.taxable_amount || 0),
        tax_percentage: Number(l.tax_percent || 0),
        tax_amount: Number(l.tax_amount || 0),
        amount: Number(l.amount || 0)
      }
    })
    setLines(newLines)
    setIsExactInvoiceReturn(true)
    toast.success('Loaded items from invoice')
  }`);

content = content.replace(/const handleAddLine = \(\) => \{[\s\S]*?setLines\(newLines\)\n  \}/, `const handleAddLine = () => {
    setLines([
      ...lines,
      {
        _row_id: Math.random().toString(36).substr(2, 9),
        product_id: '',
        item_name: '',
        batch_id: '',
        batch_code: '',
        inventory_status: 'Good',
        return_to_stock: true,
        qty: 1,
        max_qty: 9999,
        mrp: 0,
        rate: 0,
        gross: 0,
        scheme: 0,
        disc_percent: 0,
        disc_amount: 0,
        taxable: 0,
        tax_percentage: 0,
        tax_amount: 0,
        amount: 0
      }
    ])
  }

  const handleLineChange = (index: number, field: string, value: any) => {
    if (['product_id', 'batch_id'].includes(field)) {
      setIsExactInvoiceReturn(false)
    }

    const newLines = [...lines]
    newLines[index][field] = value

    if (field === 'product_id') {
      const p = products.find((prod: any) => String(prod.id) === String(value))
      if (p) {
        newLines[index].item_name = p.product_name
        newLines[index].tax_percentage = Number(p.tax_percentage || 0)
        newLines[index].batch_id = ''
        newLines[index].batch_code = ''
        newLines[index].mrp = 0
        newLines[index].rate = 0
      }
    }

    if (field === 'batch_id') {
      const b = batches.find((bat: any) => String(bat.id) === String(value))
      if (b) {
        newLines[index].batch_code = b.batch_code
        newLines[index].mrp = Number(b.mrp || 0)
        newLines[index].rate = Number(b.mrp || 0)
      }
    }

    if (['qty', 'rate', 'product_id', 'batch_id', 'mrp', 'scheme', 'disc_percent', 'disc_amount'].includes(field)) {
      let qty = Number(newLines[index].qty) || 0
      const max = newLines[index].max_qty
      if (qty > max) qty = max
      if (qty < 0) qty = 0
      newLines[index].qty = qty
      
      const rate = Number(newLines[index].rate) || 0
      const taxPct = Number(newLines[index].tax_percentage) || 0
      const scheme = Number(newLines[index].scheme) || 0
      const discPct = Number(newLines[index].disc_percent) || 0
      let discAmt = Number(newLines[index].disc_amount) || 0
      
      const gross = qty * rate
      
      if (field === 'disc_percent') {
         discAmt = (gross - scheme) * (discPct / 100)
         newLines[index].disc_amount = discAmt
      } else if (field === 'disc_amount') {
         newLines[index].disc_percent = (gross - scheme) > 0 ? (discAmt / (gross - scheme)) * 100 : 0
      } else {
         discAmt = (gross - scheme) * (discPct / 100)
         newLines[index].disc_amount = discAmt
      }

      const taxable = gross - scheme - discAmt
      const taxAmt = taxable * (taxPct / 100)
      
      newLines[index].gross = gross
      newLines[index].taxable = taxable
      newLines[index].tax_amount = taxAmt
      newLines[index].amount = taxable + taxAmt
    }

    setLines(newLines)
  }`);

content = content.replace(/<div className="overflow-visible flex-1">[\s\S]*?<\/table>\n            <\/div>/, `<div className="overflow-x-auto flex-1 pb-4">
              <table className="w-full text-xs min-w-[1200px]">
                <thead className="bg-surface border-b border-[#e6e9ee]">
                  <tr className="text-left text-ink-600">
                    <th className="px-3 py-3 font-medium min-w-[200px]">Product</th>
                    <th className="px-3 py-3 font-medium w-[160px]">Batch</th>
                    <th className="px-3 py-3 font-medium w-[110px]">Condition</th>
                    <th className="px-3 py-3 font-medium w-[80px] text-right">Qty</th>
                    <th className="px-3 py-3 font-medium w-[80px] text-right">MRP</th>
                    <th className="px-3 py-3 font-medium w-[90px] text-right">Rate</th>
                    <th className="px-3 py-3 font-medium w-[90px] text-right">Gross</th>
                    <th className="px-3 py-3 font-medium w-[80px] text-right">Scheme</th>
                    <th className="px-3 py-3 font-medium w-[70px] text-right">Disc %</th>
                    <th className="px-3 py-3 font-medium w-[80px] text-right">Disc Amt</th>
                    <th className="px-3 py-3 font-medium w-[90px] text-right">Taxable</th>
                    <th className="px-3 py-3 font-medium w-[60px] text-right">Tax %</th>
                    <th className="px-3 py-3 font-medium w-[80px] text-right">Tax Amt</th>
                    <th className="px-3 py-3 font-medium w-[100px] text-right">Net</th>
                    <th className="px-3 py-3 font-medium w-[50px] text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e9ee]">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-4 py-8 text-center text-ink-600">
                        No items added. Click "Add Row" or "Load Items".
                      </td>
                    </tr>
                  ) : lines.map((line, idx) => {
                    const batchOptions = batches
                      .filter((b: any) => String(b.product_id) === String(line.product_id))
                      .map((b: any) => ({ value: b.id, label: \`\${b.batch_code} (₹\${b.mrp})\` }))

                    return (
                      <tr key={line._row_id} className="bg-white hover:bg-surface/50 transition-colors">
                        <td className="px-3 py-2">
                          <SearchableSelect
                            options={productOptions}
                            value={line.product_id}
                            onChange={(val) => handleLineChange(idx, 'product_id', val)}
                            placeholder="Product"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <SearchableSelect
                            options={batchOptions}
                            value={line.batch_id}
                            onChange={(val) => handleLineChange(idx, 'batch_id', val)}
                            placeholder="Batch"
                            disabled={!line.product_id}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select 
                            className="w-full bg-surface border border-[#e6e9ee] rounded-md px-2 py-1.5 focus:outline-none"
                            value={line.inventory_status}
                            onChange={e => handleLineChange(idx, 'inventory_status', e.target.value)}
                          >
                            <option value="Good">Good</option>
                            <option value="Damage">Damage</option>
                            <option value="Expiry">Expiry</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            max={line.max_qty}
                            className="text-right h-8 px-2"
                            value={line.qty}
                            onChange={e => handleLineChange(idx, 'qty', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" min="0" className="text-right h-8 px-2" value={line.mrp} onChange={e => handleLineChange(idx, 'mrp', e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" min="0" className="text-right h-8 px-2" value={line.rate} onChange={e => handleLineChange(idx, 'rate', e.target.value)} />
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-ink-600 align-middle">
                          ₹{(Number(line.gross) || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" min="0" className="text-right h-8 px-2" value={line.scheme} onChange={e => handleLineChange(idx, 'scheme', e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" min="0" max="100" className="text-right h-8 px-2" value={line.disc_percent} onChange={e => handleLineChange(idx, 'disc_percent', e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" min="0" className="text-right h-8 px-2" value={line.disc_amount} onChange={e => handleLineChange(idx, 'disc_amount', e.target.value)} />
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-ink-900 align-middle">
                          ₹{(Number(line.taxable) || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right text-ink-600 align-middle">
                          {(Number(line.tax_percentage) || 0)}%
                        </td>
                        <td className="px-3 py-2 text-right text-ink-600 align-middle">
                          ₹{(Number(line.tax_amount) || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-ink-900 align-middle">
                          ₹{(Number(line.amount) || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center align-middle">
                          <button 
                            onClick={() => handleRemoveLine(idx)}
                            className="text-ink-400 hover:text-danger p-1 rounded transition-colors"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>`);

fs.writeFileSync('gniderton-erp-web/src/modules/credit-note/components/CreateCreditNoteModal.tsx', content);
