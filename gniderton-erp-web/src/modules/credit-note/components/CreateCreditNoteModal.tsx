import { useState, useMemo, useEffect } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useCreateCreditNote, useCustomers, useCustomerPendingBills, useUnifiedInvoiceDetail, useProducts, useProductsBatches } from '../hooks'
import { CheckCircle2, Package, Plus, Trash, Download, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function CreateCreditNoteModal({ isOpen, onClose }: Props) {
  const { mutateAsync: createCreditNote, isPending: isSubmitting } = useCreateCreditNote()
  const { data: customers } = useCustomers()

  const [mode, setMode] = useState<'Itemized' | 'Flat'>('Itemized')
  const [customerId, setCustomerId] = useState<number | string>('')
  const [invoiceId, setInvoiceId] = useState<number | string>('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [remarks, setRemarks] = useState('')
  const [flatAmount, setFlatAmount] = useState('')
  const [isFlatGst, setIsFlatGst] = useState(true)
  const [isExactInvoiceReturn, setIsExactInvoiceReturn] = useState(false)
  const [isManualOverride, setIsManualOverride] = useState(false)

  const { data: pendingBills } = useCustomerPendingBills(customerId)
  const { data: invoiceDetail, isFetching: isFetchingInvoice } = useUnifiedInvoiceDetail(invoiceId)

  const { data: productsData } = useProducts()
  const { data: batchesData } = useProductsBatches()

  const [lines, setLines] = useState<any[]>([])

  const products = useMemo(() => Array.isArray(productsData) ? productsData : (productsData?.data || []), [productsData])
  const batches = useMemo(() => Array.isArray(batchesData) ? batchesData : (batchesData?.data || []), [batchesData])

  const customerOptions = useMemo(() => {
    if (!Array.isArray(customers)) return []
    return customers.map((c: any) => ({ value: c.id, label: c.customer_name }))
  }, [customers])

  const invoiceOptions = useMemo(() => {
    if (!Array.isArray(pendingBills)) return []
    return pendingBills.map((i: any) => ({ value: i.id, label: i.invoice_number }))
  }, [pendingBills])

  const productOptions = useMemo(() => {
    return products.map((p: any) => ({ value: p.id, label: p.product_name }))
  }, [products])

  const handleLoadFromInvoice = () => {
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
  }

  const handle1ClickReturn = async () => {
    if (!invoiceDetail || !invoiceDetail.lines) {
      toast.error('No invoice details found')
      return
    }

    const loadedLines = invoiceDetail.lines.map((l: any) => {
      const p = products.find((prod: any) => String(prod.id) === String(l.product_id))
      return {
        product_id: l.product_id,
        batch_id: l.batch_id,
        inventory_status: 'Good',
        return_to_stock: true,
        qty: Number(l.shipped_qty || l.qty || 1),
        rate: Number(l.rate || l.mrp || 0),
        tax_percentage: Number(l.tax_percent || 0),
        taxable: Number(l.taxable_amount || 0)
      }
    })

    const itemsPayload = loadedLines.filter((l: any) => Number(l.qty) > 0).map((l: any) => ({
      _product_id: l.product_id,
      batch_id: l.batch_id,
      inventory_status: l.inventory_status,
      Qty: Number(l.qty),
      Price: Number(l.rate),
      'GST %': Number(l.tax_percentage),
      'Taxable $': Number(l.taxable),
      return_to_stock: l.return_to_stock,
      reason: remarks
    }))

    const payload = {
      customer_id: customerId,
      invoice_id: invoiceId || null,
      type: 'Sales Return',
      remarks,
      return_date: date,
      items: itemsPayload,
      is_exact_invoice_return: true
    }

    try {
      await createCreditNote(payload)
      toast.success('Exact Bill Return completed successfully')
      handleClose()
    } catch (e: any) {
      toast.error('Failed to return bill: ' + (e.response?.data?.error || e.message))
    }
  }

  const handleAddLine = () => {
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
  }

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const totals = useMemo(() => {
    return lines.reduce((acc, line) => {
      acc.taxable += (Number(line.taxable) || 0)
      acc.net += (Number(line.amount) || 0)
      return acc
    }, { taxable: 0, net: 0 })
  }, [lines])

  const handleSubmit = async () => {
    if (!customerId) {
      toast.error('Please select a customer')
      return
    }

    if (mode === 'Flat' && (!flatAmount || Number(flatAmount) <= 0)) {
      toast.error('Please enter a valid flat amount')
      return
    }

    if (mode === 'Itemized' && lines.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    let itemsPayload: any[] = []

    if (mode === 'Flat') {
      const amountNum = Number(flatAmount)
      const taxPct = isFlatGst ? 18 : 0
      const taxable = isFlatGst ? (amountNum / 1.18) : amountNum
      
      itemsPayload = [{
        _product_id: 'FLAT_RETURN',
        Qty: 1,
        Price: taxable,
        'GST %': taxPct,
        'Taxable $': taxable,
        return_to_stock: false,
        reason: remarks
      }]
    } else {
      itemsPayload = lines.filter(l => Number(l.qty) > 0).map(l => ({
        _product_id: l.product_id,
        batch_id: l.batch_id,
        inventory_status: l.inventory_status,
        Qty: Number(l.qty),
        Price: Number(l.rate),
        'GST %': Number(l.tax_percentage),
        'Taxable $': Number(l.taxable),
        return_to_stock: l.return_to_stock,
        reason: remarks
      }))

      if (itemsPayload.length === 0) {
        toast.error('All items have 0 quantity')
        return
      }
    }

    const payload = {
      customer_id: customerId,
      invoice_id: invoiceId || null,
      type: mode === 'Itemized' ? 'Sales Return' : 'Rate Adjustment',
      remarks,
      return_date: date,
      items: itemsPayload,
      is_exact_invoice_return: isExactInvoiceReturn,
      is_manual_override: isManualOverride
    }

    try {
      await createCreditNote(payload)
      toast.success('Credit note created successfully')
      handleClose()
    } catch (e: any) {
      toast.error('Failed to create credit note: ' + (e.response?.data?.error || e.message))
    }
  }

  const handleClose = () => {
    setCustomerId('')
    setInvoiceId('')
    setRemarks('')
    setFlatAmount('')
    setIsFlatGst(true)
    setIsExactInvoiceReturn(false)
    setLines([])
    setMode('Itemized')
    onClose()
  }
  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onClose={handleClose} title="Create Credit Note / Sales Return" widthClass="max-w-[95vw] 2xl:max-w-[1600px]">
      <div className="flex flex-col gap-5 py-1">
        
        {/* Compact Segmented Control */}
        <div className="flex bg-surface p-1 rounded-md border border-border-subtle shadow-sm w-full max-w-lg mx-auto">
          <button 
            onClick={() => setMode('Itemized')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-semibold rounded transition-all ${
              mode === 'Itemized' ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-50'
            }`}
          >
            <Package size={14} /> Itemized Return
          </button>
          <button 
            onClick={() => setMode('Flat')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-semibold rounded transition-all ${
              mode === 'Flat' ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-50'
            }`}
          >
            <CheckCircle2 size={14} /> Flat Discount
          </button>
        </div>

        {/* Header Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg border border-border-subtle shadow-sm">
          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-bold text-ink-900 mb-1 block tracking-wide uppercase">Customer *</label>
            <SearchableSelect
              options={customerOptions}
              value={customerId}
              onChange={setCustomerId}
              placeholder="Select Customer..."
            />
          </div>
          
          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-bold text-ink-900 mb-1 block tracking-wide uppercase">Linked Invoice (Optional)</label>
            <div className="flex gap-1 items-center">
              <div className="flex-1 min-w-0">
                <SearchableSelect
                  options={invoiceOptions}
                  value={invoiceId}
                  onChange={setInvoiceId}
                  placeholder={customerId ? "Select an Invoice..." : "Select Customer First"}
                  disabled={!customerId}
                />
              </div>
              {mode === 'Itemized' && invoiceId && (
                <Button 
                  variant="secondary" 
                  onClick={handleLoadFromInvoice}
                  disabled={isFetchingInvoice}
                  className="px-2"
                  title="Load Items"
                >
                  <Download size={14} />
                </Button>
              )}
            </div>
          </div>
          
          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-bold text-ink-900 mb-1 block tracking-wide uppercase">Return Date</label>
            <Input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
            />
          </div>
          
          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-bold text-ink-900 mb-1 block tracking-wide uppercase">Remarks / Reason</label>
            <Input 
              value={remarks} 
              onChange={e => setRemarks(e.target.value)} 
              placeholder="Enter reason for return..." 
            />
          </div>

          {mode === 'Itemized' && (
            <div className="col-span-2 md:col-span-4 flex justify-end items-center mt-2 border-t border-border-subtle pt-3">
              <label className="flex items-center gap-2 text-sm font-medium text-ink-900 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isManualOverride} 
                  onChange={e => setIsManualOverride(e.target.checked)} 
                  className="w-4 h-4 rounded border-[#e6e9ee] text-brand-500 focus:ring-brand-500"
                />
                Enable Manual Pricing Override
              </label>
            </div>
          )}
        </div>

        {/* Lines Section */}
        {mode === 'Itemized' ? (
          <div className="bg-surface rounded-xl border border-[#e6e9ee] flex flex-col">
            <div className="px-4 py-3 border-b border-[#e6e9ee] flex justify-between items-center bg-white rounded-t-xl">
              <h3 className="font-semibold text-sm text-ink-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-brand-500" />
                Return Items
              </h3>
              <div className="flex gap-2">
                {invoiceId && (
                  <Button 
                    size="sm"
                    variant="primary" 
                    onClick={handle1ClickReturn}
                    disabled={isFetchingInvoice || isSubmitting}
                    className="gap-2 bg-amber-500 hover:bg-amber-600 text-white border-amber-500 hover:border-amber-600"
                    title="1-Click Return Full Bill"
                  >
                    {isSubmitting ? <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : <Zap size={14} />}
                    1-Click Return Full Bill
                  </Button>
                )}
                <Button size="sm" onClick={handleAddLine} variant="secondary" className="gap-2">
                  <Plus className="w-4 h-4" /> Add Row
                </Button>
              </div>
            </div>
            
            <div className="overflow-x-auto flex-1 pb-4">
              <table className="w-full text-xs min-w-[1400px]">
                <thead className="bg-surface border-b border-[#e6e9ee]">
                  <tr className="text-left text-ink-600">
                    <th className="px-3 py-3 font-medium min-w-[200px]">Product</th>
                    <th className="px-3 py-3 font-medium w-[160px]">Batch</th>
                    <th className="px-3 py-3 font-medium w-[110px]">Condition</th>
                    <th className="px-3 py-3 font-medium w-[100px] text-right">Qty</th>
                    <th className="px-3 py-3 font-medium w-[110px] text-right">MRP</th>
                    <th className="px-3 py-3 font-medium w-[120px] text-right">Rate</th>
                    <th className="px-3 py-3 font-medium w-[120px] text-right">Gross</th>
                    <th className="px-3 py-3 font-medium w-[110px] text-right">Scheme</th>
                    <th className="px-3 py-3 font-medium w-[90px] text-right">Disc %</th>
                    <th className="px-3 py-3 font-medium w-[110px] text-right">Disc Amt</th>
                    <th className="px-3 py-3 font-medium w-[120px] text-right">Taxable</th>
                    <th className="px-3 py-3 font-medium w-[80px] text-right">Tax %</th>
                    <th className="px-3 py-3 font-medium w-[110px] text-right">Tax Amt</th>
                    <th className="px-3 py-3 font-medium w-[120px] text-right">Net</th>
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
                      .map((b: any) => ({ value: b.id, label: `${b.batch_code} (₹${b.mrp})` }))

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
            </div>

            {lines.length > 0 && (
              <div className="px-4 py-3 bg-surface border-t border-[#e6e9ee] flex justify-end gap-6 text-sm rounded-b-xl">
                <div className="text-ink-600">
                  Taxable: <span className="font-medium text-ink-900 ml-1">₹{totals.taxable.toFixed(2)}</span>
                </div>
                <div className="text-ink-600">
                  Total: <span className="font-bold text-ink-900 ml-1 text-base">₹{totals.net.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-[#e6e9ee] p-6 flex flex-col items-center justify-center min-h-[250px]">
            <div className="max-w-sm w-full space-y-6">
              <div>
                <label className="block text-xs font-medium text-ink-900 mb-1 text-center">Flat Adjustment Amount (₹)</label>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={flatAmount} 
                  onChange={e => setFlatAmount(e.target.value)}
                  className="text-center text-lg h-12"
                />
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <input 
                  type="checkbox" 
                  id="gstToggle"
                  checked={isFlatGst}
                  onChange={e => setIsFlatGst(e.target.checked)}
                  className="w-4 h-4 rounded border-[#e6e9ee] text-brand-500 focus:ring-brand-500"
                />
                <label htmlFor="gstToggle" className="text-sm font-medium text-ink-900 cursor-pointer">
                  Amount is inclusive of 18% GST
                </label>
              </div>

              <p className="text-xs text-ink-600 text-center">
                This will create a pure financial credit note without returning any items to inventory. It will be immediately available as a Customer Advance.
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#e6e9ee]">
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} className="gap-2" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isSubmitting ? 'Processing...' : 'Create Credit Note'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
