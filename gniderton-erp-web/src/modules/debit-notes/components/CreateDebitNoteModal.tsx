import { useState, useMemo, useEffect } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useCreateDebitNote, useVendors, useProducts, useProductsBatches, usePurchaseInvoices } from '../hooks'
import { CheckCircle2, Package } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function CreateDebitNoteModal({ isOpen, onClose }: Props) {
  const { mutateAsync: createDebitNote } = useCreateDebitNote()
  const { data: vendors } = useVendors()
  const { data: invoices } = usePurchaseInvoices()

  const [mode, setMode] = useState<'Financial' | 'Return Slip' | 'Item Debit Note'>('Financial')
  const [vendorId, setVendorId] = useState<number | string>('')
  const [invoiceId, setInvoiceId] = useState<number | string>('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['Good', 'Damage', 'Expiry'])
  const [searchQuery, setSearchQuery] = useState('')

  const { data: productsData, isLoading: isLoadingProducts } = useProducts(
    vendorId ? { vendor_id: vendorId, limit: 1000 } : undefined
  )
  
  const products = useMemo(() => {
    if (!productsData) return []
    return Array.isArray(productsData) ? productsData : (productsData.data || [])
  }, [productsData])

  const productIdsStr = useMemo(() => products.map((p: any) => p.id).join(','), [products])

  const { data: batchesData, isLoading: isLoadingBatches } = useProductsBatches(
    productIdsStr ? { product_ids: productIdsStr, stock_type: 'non-zero' } : undefined
  )

  const [lines, setLines] = useState<any[]>([])

  const vendorOptions = useMemo(() => {
    if (!Array.isArray(vendors)) return []
    return vendors.map((v: any) => ({ value: v.id, label: v.vendor_name }))
  }, [vendors])

  const invoiceOptions = useMemo(() => {
    if (!Array.isArray(invoices) || !vendorId) return []
    return invoices
      .filter((i: any) => String(i.vendor_id) === String(vendorId))
      .map((i: any) => ({ value: i.id, label: i.invoice_number }))
  }, [invoices, vendorId])

  useEffect(() => {
    if (mode === 'Financial') return
    if (!vendorId) {
      setLines([])
      return
    }
    
    if (!batchesData || !products.length) {
      setLines([])
      return
    }

    const eligibleBatches = batchesData.filter((b: any) => {
      const qty = Number(b.quantity_remaining) || 0
      return qty > 0 && selectedStatuses.includes(b.status || 'Good')
    })

    const tableData = eligibleBatches.map((batch: any) => {
      const p = products.find((prod: any) => String(prod.id) === String(batch.product_id))
      if (!p) return null

      const availableQty = Number(batch.quantity_remaining) || 0
      const price = Number(batch.purchase_rate || 0)
      const gstPct = Number(p.tax_percentage || 0)
      const mrp = Number(batch.mrp || 0)
      
      const gross = availableQty * price
      const taxable = gross
      const gstAmt = taxable * (gstPct / 100)
      const net = taxable + gstAmt

      return {
        _row_id: batch.id + "_" + Math.random().toString(36).substr(2, 9),
        product_id: p.id,
        item_name: p.product_name,
        batch_number: batch.batch_code,
        return_type: batch.status || 'Good',
        max_qty: availableQty,
        qty: availableQty,
        mrp: mrp,
        rate: price,
        tax_percentage: gstPct,
        taxable: taxable,
        amount: net
      }
    }).filter(Boolean)

    setLines(tableData)
  }, [mode, vendorId, batchesData, products, selectedStatuses])

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    )
  }

  const handleLineChange = (rowId: string, field: string, value: any) => {
    const newLines = [...lines]
    const index = newLines.findIndex(l => l._row_id === rowId)
    if (index === -1) return
    
    let newValue = value

    if (field === 'qty') {
      const numVal = Number(value) || 0
      const max = newLines[index].max_qty
      newValue = numVal > max ? max : (numVal < 0 ? 0 : numVal)
    }

    newLines[index][field] = newValue

    if (field === 'qty') {
      const qty = Number(newValue) || 0
      const rate = Number(newLines[index].rate) || 0
      const taxPct = Number(newLines[index].tax_percentage) || 0
      const gross = qty * rate
      const tax = gross * (taxPct / 100)
      newLines[index].taxable = gross
      newLines[index].amount = gross + tax
    }

    setLines(newLines)
  }

  const handleRemoveLine = (rowId: string) => {
    setLines(lines.filter(l => l._row_id !== rowId))
  }

  const totals = useMemo(() => {
    return lines.reduce((acc, line) => {
      acc.taxable += (Number(line.taxable) || 0)
      acc.net += (Number(line.amount) || 0)
      return acc
    }, { taxable: 0, net: 0 })
  }, [lines])

  const handleSubmit = async () => {
    const finalAmount = mode !== 'Financial' ? totals.net : Number(amount)
    
    if (!vendorId || !finalAmount || finalAmount <= 0) {
      alert('Please fill all required fields and ensure amount is greater than 0.')
      return
    }

    const validLines = lines.filter(l => Number(l.qty) > 0)

    if (mode !== 'Financial' && validLines.length === 0) {
      alert('No valid items to return. Ensure at least one item has Qty > 0.')
      return
    }

    const payload = {
      vendor_id: vendorId,
      amount: finalAmount,
      debit_note_date: date,
      reason,
      linked_invoice_id: invoiceId || null,
      note_type: mode === 'Return Slip' ? 'Return Slip' : 'Debit Note',
      lines: mode !== 'Financial' ? validLines.map(l => ({
        product_id: l.product_id,
        qty: Number(l.qty),
        rate: Number(l.rate),
        batch_number: l.batch_number,
        return_type: l.return_type,
        amount: Number(l.amount),
        tax_percentage: Number(l.tax_percentage)
      })) : []
    }

    try {
      await createDebitNote(payload)
      handleClose()
    } catch (e: any) {
      alert('Error: ' + e.message)
    }
  }

  const handleClose = () => {
    setVendorId('')
    setInvoiceId('')
    setReason('')
    setAmount('')
    setSelectedStatuses(['Good', 'Damage', 'Expiry'])
    setLines([])
    setMode('Financial')
    onClose()
  }

  return (
    <Dialog 
      open={isOpen} 
      onClose={handleClose} 
      title="Create Debit Note"
      widthClass={mode !== 'Financial' ? 'max-w-6xl' : 'max-w-xl'}
      footer={
        <div className="flex w-full justify-between items-center">
          {/* Summary moved to footer */}
          {mode !== 'Financial' ? (
            <div className="flex gap-6 items-center">
              <div className="flex gap-2 items-baseline">
                <span className="text-[10px] uppercase font-bold text-ink-500 tracking-wider">Lines:</span>
                <span className="text-sm font-bold text-ink-900">{lines.length}</span>
              </div>
              <div className="flex gap-2 items-baseline">
                <span className="text-[10px] uppercase font-bold text-ink-500 tracking-wider">Taxable:</span>
                <span className="text-sm font-bold text-ink-900">₹{totals.taxable.toFixed(2)}</span>
              </div>
              <div className="flex gap-2 items-baseline">
                <span className="text-[10px] uppercase font-bold text-brand-600 tracking-wider">Net Return:</span>
                <span className="text-lg font-black text-brand-600">₹{totals.net.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div /> // empty div to push buttons right
          )}
          
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>Create Note</Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5 py-1">
        {/* Compact Segmented Control */}
        <div className="flex bg-surface p-1 rounded-md border border-border-subtle shadow-sm w-full max-w-lg mx-auto">
          <button 
            onClick={() => setMode('Financial')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-semibold rounded transition-all ${
              mode === 'Financial' ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-50'
            }`}
          >
            <CheckCircle2 size={14} /> Financial
          </button>
          <button 
            onClick={() => setMode('Return Slip')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-semibold rounded transition-all ${
              mode === 'Return Slip' ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-50'
            }`}
          >
            <Package size={14} /> Return Slip
          </button>
          <button 
            onClick={() => setMode('Item Debit Note')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-semibold rounded transition-all ${
              mode === 'Item Debit Note' ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-50'
            }`}
          >
            <CheckCircle2 size={14} /> Itemized Debit Note
          </button>
        </div>

        {/* Improved Form Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg border border-border-subtle shadow-sm">
          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-bold text-ink-900 mb-1 block tracking-wide uppercase">Vendor *</label>
            <SearchableSelect 
              options={vendorOptions} 
              value={vendorId} 
              onChange={setVendorId} 
              placeholder="Select Vendor" 
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-bold text-ink-900 mb-1 block tracking-wide uppercase">Linked Bill</label>
            <SearchableSelect 
              options={invoiceOptions} 
              value={invoiceId} 
              onChange={setInvoiceId} 
              placeholder="Select Invoice" 
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-ink-900 mb-1 block tracking-wide uppercase">Date *</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          {mode === 'Financial' && (
            <div>
              <label className="text-[10px] font-bold text-ink-900 mb-1 block tracking-wide uppercase">Amount *</label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
          )}
          <div className={`${mode === 'Financial' ? 'col-span-4' : 'col-span-2 md:col-span-1'}`}>
            <label className="text-[10px] font-bold text-ink-900 mb-1 block tracking-wide uppercase">Reason</label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="E.g. Damage..." />
          </div>
        </div>

        {mode !== 'Financial' && (
          <div className="border border-border-subtle rounded-lg p-4 bg-white shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-ink-900">Return Items</h4>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-ink-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </div>
                  <Input 
                    placeholder="Search item or batch..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs w-64 bg-surface"
                  />
                </div>
                <div className="flex gap-3 items-center bg-surface px-3 py-1.5 rounded-md border border-border-subtle h-8">
                  <span className="text-[10px] font-bold text-ink-500 uppercase tracking-wide">Basket:</span>
                  {['Good', 'Damage', 'Expiry'].map(status => (
                    <label key={status} className="flex items-center gap-1.5 text-xs font-medium text-ink-700 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={selectedStatuses.includes(status)}
                        onChange={() => handleStatusToggle(status)}
                        className="w-3.5 h-3.5 rounded border-ink-300 text-brand-500 focus:ring-brand-500 transition-colors"
                      />
                      {status}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            {(isLoadingProducts || isLoadingBatches) ? (
              <div className="text-center py-12 text-sm font-medium text-ink-400 animate-pulse border border-dashed border-border-subtle rounded-lg">Loading inventory...</div>
            ) : !vendorId ? (
              <div className="text-center py-12 text-sm font-medium text-ink-400 border border-dashed border-border-subtle rounded-lg">Please select a vendor to load items.</div>
            ) : lines.length === 0 ? (
              <div className="text-center py-12 text-sm font-medium text-ink-400 border border-dashed border-border-subtle rounded-lg">No available stock found for the selected basket types.</div>
            ) : (
              <div className="border border-border-subtle rounded-md overflow-hidden shadow-sm">
                <div className="max-h-[50vh] overflow-y-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-surface sticky top-0 z-10 shadow-sm text-[10px] uppercase tracking-wider text-ink-500 font-bold">
                      <tr>
                        <th className="px-3 py-2.5 border-b border-border-subtle w-10">S.No</th>
                        <th className="px-3 py-2.5 border-b border-border-subtle max-w-xs truncate">Item Name</th>
                        <th className="px-3 py-2.5 border-b border-border-subtle">Batch</th>
                        <th className="px-3 py-2.5 border-b border-border-subtle">Reason</th>
                        <th className="px-3 py-2.5 border-b border-border-subtle text-right text-brand-600">Avail Qty</th>
                        <th className="px-3 py-2.5 border-b border-border-subtle w-24">Return Qty</th>
                        <th className="px-3 py-2.5 border-b border-border-subtle text-right">MRP</th>
                        <th className="px-3 py-2.5 border-b border-border-subtle text-right">Rate</th>
                        <th className="px-3 py-2.5 border-b border-border-subtle text-right">Amount</th>
                        <th className="px-3 py-2.5 border-b border-border-subtle w-10 text-center">Act</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {lines.filter(l => 
                        l.item_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        l.batch_number.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map((line, idx) => (
                        <tr key={line._row_id} className={`hover:bg-ink-50/50 transition-colors ${Number(line.qty) === 0 ? 'opacity-40 grayscale' : ''}`}>
                          <td className="px-3 py-1.5 text-ink-400 font-medium text-xs">{idx + 1}</td>
                          <td className="px-3 py-1.5 font-semibold text-ink-900 max-w-[200px] truncate text-xs" title={line.item_name}>{line.item_name}</td>
                          <td className="px-3 py-1.5 font-mono text-[10px] text-ink-600 bg-ink-50 rounded px-1">{line.batch_number}</td>
                          <td className="px-3 py-1.5">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                              line.return_type === 'Damage' ? 'bg-red-100 text-red-700 border border-red-200' :
                              line.return_type === 'Expiry' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                              'bg-green-100 text-green-700 border border-green-200'
                            }`}>
                              {line.return_type}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right font-bold text-brand-600 text-xs">{line.max_qty}</td>
                          <td className="px-3 py-1">
                            <Input 
                              type="number" 
                              value={line.qty} 
                              onChange={(e) => handleLineChange(line._row_id, 'qty', e.target.value)}
                              className="h-7 text-xs px-2 py-0.5 text-right font-semibold bg-white focus:ring-brand-500"
                              max={line.max_qty}
                              min={0}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right text-ink-600 font-medium text-xs">{line.mrp.toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-right text-ink-600 font-medium text-xs">{line.rate.toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-right font-bold text-ink-900 text-xs">₹{line.amount.toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-center">
                            <button 
                              onClick={() => handleRemoveLine(line._row_id)}
                              className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                              title="Remove Line"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}
