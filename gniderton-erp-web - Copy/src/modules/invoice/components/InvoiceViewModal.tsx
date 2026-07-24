import { useState, useEffect } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/shared/DataTable'
import { useUnlockInvoice } from '../hooks'
import { api } from '@/lib/axios'
import type { Invoice, InvoiceLine } from '../types'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Trash2, Plus, List, Truck, Edit3 } from 'lucide-react'
import { differenceInDays } from 'date-fns'
import { Input } from '@/components/ui/Input'
import DeliveryCycleTimeline from '@/modules/supply-chain/components/DeliveryCycleTimeline'

export function InvoiceViewModal({ invoice, onClose }: { invoice: Invoice, onClose: () => void }) {
  const [fullInvoice, setFullInvoice] = useState<Invoice | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [editableLines, setEditableLines] = useState<InvoiceLine[]>([])
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'original' | 'edit' | 'delivery'>('original')
  
  // State for new line
  const [newProductId, setNewProductId] = useState<string>('')
  const [newQty, setNewQty] = useState<number>(1)

  const unlock = useUnlockInvoice()

  useEffect(() => {
    // Fetch full details
    api.get(`/api/sales/unified/${invoice.id}`)
      .then(res => setFullInvoice(res.data))
      .catch(err => toast.error('Failed to load invoice details: ' + err.message))
      
    // Fetch products for new line additions
    api.get('/api/products')
      .then(res => {
        const prodData = res.data?.data || res.data || []
        setProducts(Array.isArray(prodData) ? prodData : [])
      })
      .catch(console.error)
  }, [invoice.id])

  const handleUnlock = async () => {
    if (!fullInvoice?.invoice_id) return
    try {
      await unlock.mutateAsync(fullInvoice.invoice_id)
      setIsEditMode(true)
      setActiveTab('edit')
      setEditableLines([...(fullInvoice.order_lines || [])])
      toast.success('Invoice Unlocked! You may now edit the Sales Order lines.')
    } catch (err: any) {
      toast.error('Unlock failed: ' + err.message)
    }
  }

  const handleRemoveLine = (index: number) => {
    setEditableLines(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpdateLineQty = (index: number, newQty: number) => {
    setEditableLines(prev => {
      const clone = [...prev]
      const line = clone[index]
      const qty = newQty || 0
      const rate = line.rate || 0
      clone[index] = { ...line, ordered_qty: qty, amount: qty * rate, gross_amount: qty * rate }
      return clone
    })
  }

  const handleAddLine = () => {
    if (!newProductId) return toast.error("Please select a product")
    const product = products.find(p => p.id.toString() === newProductId)
    if (!product) return
    
    const rate = parseFloat(product.retail_rate || product.mrp || 0)
    const newLine: InvoiceLine = {
      product_id: product.id,
      product_name: product.product_name,
      ordered_qty: newQty,
      rate: rate,
      gross_amount: newQty * rate,
      amount: newQty * rate
    }
    setEditableLines(prev => [...prev, newLine])
    setNewProductId('')
    setNewQty(1)
  }

  const handleRegenerate = async () => {
    if (!fullInvoice) return
    setIsRegenerating(true)
    try {
      // 1. Update SO Lines
      await api.put(`/api/sales/orders/${fullInvoice.id}`, { lines: editableLines })
      // 2. Regenerate Invoice
      const regenRes = await api.post('/api/sales/invoices/regenerate', {
        sales_order_id: fullInvoice.id,
        original_invoice_number: fullInvoice.invoice_number,
        original_invoice_date: fullInvoice.invoice_date
      })
      toast.success('Invoice Successfully Regenerated: ' + (regenRes.data?.invoice_number || ''))
      onClose()
      window.location.reload() // Or invalidate query
    } catch (err: any) {
      toast.error('Regeneration failed: ' + err.message)
    } finally {
      setIsRegenerating(false)
    }
  }

  const isUnlockDisabled = 
    isEditMode ||
    (Number(fullInvoice?.paid_amount || 0) !== 0) ||
    ['Delivered', 'In Transit'].includes(fullInvoice?.delivery_status || '') ||
    // @ts-ignore
    fullInvoice?.is_gst_filed ||
    (fullInvoice?.invoice_date ? differenceInDays(new Date(), new Date(fullInvoice.invoice_date)) > 10 : false)

  return (
    <Drawer 
      open={true} 
      onClose={onClose} 
      widthClass="max-w-4xl"
      title={
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold">Invoice {fullInvoice?.invoice_number || invoice.display_number || ''}</span>
          {fullInvoice?.invoice_status && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              ['paid', 'fully paid'].includes(fullInvoice.invoice_status.toLowerCase()) ? 'bg-green-100 text-green-700' :
              ['unpaid'].includes(fullInvoice.invoice_status.toLowerCase()) ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {fullInvoice.invoice_status.toUpperCase()}
            </span>
          )}
        </div>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {!isEditMode && (
            <div title={isUnlockDisabled ? "Cannot edit: Invoice is paid, delivered, GST filed, or older than 10 days" : ""}>
              <Button onClick={handleUnlock} loading={unlock.isPending} disabled={isUnlockDisabled}>
                Unlock for Edit
              </Button>
            </div>
          )}
          {isEditMode && (
            <Button variant="primary" onClick={handleRegenerate} loading={isRegenerating}>
              Regenerate Invoice
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-8 mt-2">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row gap-6 justify-between items-start bg-surface p-5 rounded-xl">
          <div>
            <div className="text-sm font-medium text-ink-500 mb-1">Customer</div>
            <div className="text-lg font-semibold text-ink-900">{fullInvoice?.customer_name || invoice.customer_name || '-'}</div>
            <div className="text-sm text-ink-600 mt-1">{fullInvoice?.customer_address || '-'}</div>
          </div>
          
          <div className="flex flex-wrap gap-8">
            <div>
              <div className="text-sm font-medium text-ink-500 mb-1">Total Amount</div>
              <div className="text-xl font-bold text-ink-900">{formatCurrency(fullInvoice?.display_amount || invoice.display_amount || 0)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-ink-500 mb-1">Balance Due</div>
              <div className="text-xl font-bold text-red-600">{formatCurrency(fullInvoice?.balance_amount || invoice.balance_amount || 0)}</div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-surface rounded-xl">
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Paid Amount</div>
            <div className="text-lg font-medium">{formatCurrency(fullInvoice?.paid_amount || 0)}</div>
          </div>
          <div className="p-4 bg-surface rounded-xl">
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Delivery Status</div>
            <div className="text-lg font-medium capitalize">{fullInvoice?.delivery_status || '-'}</div>
          </div>
          <div className="p-4 bg-surface rounded-xl">
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Invoice Date</div>
            <div className="text-lg font-medium">{fullInvoice?.invoice_date ? new Date(fullInvoice.invoice_date).toLocaleDateString() : '-'}</div>
          </div>
          <div className="p-4 bg-surface rounded-xl">
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">Order Date</div>
            <div className="text-lg font-medium">{fullInvoice?.order_date ? new Date(fullInvoice.order_date).toLocaleDateString() : '-'}</div>
          </div>
        </div>

        {/* Custom Tabs */}
        <div>
          <div className="flex border-y border-border-subtle mt-4 mb-4">
            <button
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 -mb-[2px] transition-all ${activeTab === 'original' ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-600 hover:text-ink-900'}`}
              onClick={() => setActiveTab('original')}
            >
              <List size={14} />
              Original Lines
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 -mb-[2px] transition-all ${activeTab === 'delivery' ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-600 hover:text-ink-900'}`}
              onClick={() => setActiveTab('delivery')}
            >
              <Truck size={14} />
              Delivery Cycle
            </button>
            {isEditMode && (
              <button
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 -mb-[2px] transition-all ${activeTab === 'edit' ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-600 hover:text-ink-900'}`}
                onClick={() => setActiveTab('edit')}
              >
                <Edit3 size={14} />
                Editable Lines
              </button>
            )}
          </div>
          
          <div className="pt-4">
            {activeTab === 'original' && (
              <DataTable 
                data={fullInvoice?.invoice_lines || []}
                columns={[
                  { accessorKey: 'product_name', header: 'Product' },
                  { accessorKey: 'shipped_qty', header: 'Qty' },
                  { accessorKey: 'rate', header: 'Rate', cell: (c) => formatCurrency(c.getValue() as number) },
                  { accessorKey: 'gross_amount', header: 'Gross', cell: (c) => formatCurrency(c.getValue() as number) },
                  { accessorKey: 'discount_amount', header: 'Discount', cell: (c) => formatCurrency(c.getValue() as number) },
                  { accessorKey: 'taxable_amount', header: 'Taxable', cell: (c) => formatCurrency(c.getValue() as number) },
                  { accessorKey: 'tax_amount', header: 'Tax', cell: (c) => formatCurrency(c.getValue() as number) },
                  { accessorKey: 'amount', header: 'Net', cell: (c) => formatCurrency(c.getValue() as number) },
                ]}
                isLoading={!fullInvoice}
              />
            )}

            {activeTab === 'delivery' && (
              <div className="bg-surface rounded-xl p-6">
                <DeliveryCycleTimeline invoiceId={fullInvoice?.invoice_id || invoice.invoice_id || invoice.id} />
              </div>
            )}

            {activeTab === 'edit' && isEditMode && (
              <div className="space-y-4">
                <DataTable 
                  data={editableLines}
                  columns={[
                    { accessorKey: 'product_name', header: 'Product' },
                    { 
                      accessorKey: 'ordered_qty', 
                      header: 'Ordered Qty',
                      cell: ({ row, getValue }) => (
                        <Input 
                          type="number" 
                          min={1}
                          value={getValue() as number} 
                          onChange={(e) => handleUpdateLineQty(row.index, parseInt(e.target.value) || 0)}
                          className="w-24 h-8"
                        />
                      )
                    },
                    { accessorKey: 'rate', header: 'Rate', cell: (c) => formatCurrency(c.getValue() as number) },
                    { accessorKey: 'amount', header: 'Net', cell: (c) => formatCurrency(c.getValue() as number) },
                    {
                      id: 'actions',
                      header: 'Actions',
                      cell: ({ row }) => (
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveLine(row.index)} title="Remove Line">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )
                    }
                  ]}
                />

                <div className="flex items-end gap-3 p-4 bg-ink-50 rounded-lg border border-ink-200">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-ink-700 mb-1">Add Product</label>
                    <select 
                      className="w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brand-400"
                      value={newProductId}
                      onChange={(e) => setNewProductId(e.target.value)}
                    >
                      <option value="">-- Select Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.product_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-ink-700 mb-1">Qty</label>
                    <Input 
                      type="number" 
                      min={1}
                      value={newQty}
                      onChange={(e) => setNewQty(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <Button variant="primary" onClick={handleAddLine}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  )
}
