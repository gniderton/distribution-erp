import { useState, useMemo } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useCreateDebitNote, useVendors, useProducts, usePurchaseInvoices } from '../hooks'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function CreateDebitNoteModal({ isOpen, onClose }: Props) {
  const { mutateAsync: createDebitNote } = useCreateDebitNote()
  const { data: vendors } = useVendors()
  const { data: products } = useProducts()
  const { data: invoices } = usePurchaseInvoices()

  const [mode, setMode] = useState<'Financial' | 'Item Return'>('Financial')
  const [vendorId, setVendorId] = useState<number | string>('')
  const [invoiceId, setInvoiceId] = useState<number | string>('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')

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

  const productOptions = useMemo(() => {
    if (!Array.isArray(products)) return []
    return products.map((p: any) => ({ value: p.id, label: p.product_name }))
  }, [products])

  const handleAddLine = () => {
    setLines([...lines, { product_id: '', qty: 1, rate: 0, batch_number: '', return_type: 'Damage', tax_percentage: 0 }])
  }

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...lines]
    newLines[index][field] = value
    setLines(newLines)
  }

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const calculateItemAmount = (line: any) => {
    const qty = Number(line.qty) || 0
    const rate = Number(line.rate) || 0
    const taxPct = Number(line.tax_percentage) || 0
    const gross = qty * rate
    const tax = gross * (taxPct / 100)
    return gross + tax
  }

  const totalCalculatedAmount = useMemo(() => {
    return lines.reduce((sum, line) => sum + calculateItemAmount(line), 0)
  }, [lines])

  const handleSubmit = async () => {
    const finalAmount = mode === 'Item Return' ? totalCalculatedAmount : Number(amount)
    
    if (!vendorId || !finalAmount || finalAmount <= 0) {
      alert('Please fill all required fields and ensure amount is greater than 0.')
      return
    }

    const payload = {
      vendor_id: vendorId,
      amount: finalAmount,
      debit_note_date: date,
      reason,
      linked_invoice_id: invoiceId || null,
      note_type: mode === 'Item Return' ? 'Return Slip' : 'Debit Note',
      lines: mode === 'Item Return' ? lines.map(l => ({
        product_id: l.product_id,
        qty: Number(l.qty),
        rate: Number(l.rate),
        batch_number: l.batch_number,
        return_type: l.return_type,
        amount: calculateItemAmount(l),
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
    setLines([])
    setMode('Financial')
    onClose()
  }

  return (
    <Dialog 
      open={isOpen} 
      onClose={handleClose} 
      title="Create Debit Note"
      widthClass={mode === 'Item Return' ? 'max-w-5xl' : 'max-w-md'}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>Create</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 py-2">
        <div className="flex gap-2">
          <Button 
            variant={mode === 'Financial' ? 'primary' : 'secondary'} 
            onClick={() => setMode('Financial')}
            className="flex-1"
          >
            Financial Adjustment
          </Button>
          <Button 
            variant={mode === 'Item Return' ? 'primary' : 'secondary'} 
            onClick={() => setMode('Item Return')}
            className="flex-1"
          >
            Item Return (Return Slip)
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold mb-1 block">Vendor *</label>
            <SearchableSelect 
              options={vendorOptions} 
              value={vendorId} 
              onChange={setVendorId} 
              placeholder="Select Vendor" 
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block">Linked Bill (Optional)</label>
            <SearchableSelect 
              options={invoiceOptions} 
              value={invoiceId} 
              onChange={setInvoiceId} 
              placeholder="Select Invoice" 
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block">Date *</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          {mode === 'Financial' && (
            <div>
              <label className="text-xs font-semibold mb-1 block">Amount *</label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
          )}
        </div>
        
        <div>
          <label className="text-xs font-semibold mb-1 block">Reason</label>
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="E.g. Rate difference, Damage..." />
        </div>

        {mode === 'Item Return' && (
          <div className="mt-4 border border-border-subtle rounded-md p-4 bg-ink-50/50">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-sm">Return Items</h4>
              <Button size="sm" variant="secondary" onClick={handleAddLine}>Add Item</Button>
            </div>
            
            {lines.length === 0 ? (
              <div className="text-center py-4 text-xs text-ink-600">No items added yet.</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lines.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[10px] text-ink-500">Product</label>
                      <SearchableSelect 
                        options={productOptions} 
                        value={line.product_id} 
                        onChange={(v) => handleLineChange(idx, 'product_id', v)} 
                      />
                    </div>
                    <div className="w-16">
                      <label className="text-[10px] text-ink-500">Qty</label>
                      <Input type="number" value={line.qty} onChange={(e) => handleLineChange(idx, 'qty', e.target.value)} />
                    </div>
                    <div className="w-20">
                      <label className="text-[10px] text-ink-500">Rate</label>
                      <Input type="number" value={line.rate} onChange={(e) => handleLineChange(idx, 'rate', e.target.value)} />
                    </div>
                    <div className="w-16">
                      <label className="text-[10px] text-ink-500">Tax %</label>
                      <Input type="number" value={line.tax_percentage} onChange={(e) => handleLineChange(idx, 'tax_percentage', e.target.value)} />
                    </div>
                    <div className="w-24">
                      <label className="text-[10px] text-ink-500">Batch</label>
                      <Input value={line.batch_number} onChange={(e) => handleLineChange(idx, 'batch_number', e.target.value)} />
                    </div>
                    <div className="w-24">
                      <label className="text-[10px] text-ink-500">Type</label>
                      <select 
                        className="w-full text-xs h-9 border border-border-subtle rounded px-2"
                        value={line.return_type} 
                        onChange={(e) => handleLineChange(idx, 'return_type', e.target.value)}
                      >
                        <option value="Damage">Damage</option>
                        <option value="Good">Good</option>
                      </select>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-500 mb-[2px]" onClick={() => handleRemoveLine(idx)}>X</Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-right mt-4 font-bold text-sm">
              Total Amount: ₹{totalCalculatedAmount.toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
