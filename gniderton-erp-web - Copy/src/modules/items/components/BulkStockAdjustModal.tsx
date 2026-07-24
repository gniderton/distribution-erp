import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import type { Product } from '../types'
import { useCreateStockAdjustment, useAllBatches } from '../hooks'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Download, Upload } from 'lucide-react'
import { Input, Select } from '@/components/ui/Input'

interface Props {
  open: boolean
  onClose: () => void
  products: Product[]
}

interface AdjustState {
  qty: number | ''
  reason: string
  batch_code: string
}

export function BulkStockAdjustModal({ open, onClose, products }: Props) {
  const qc = useQueryClient()
  const adjustMutation = useCreateStockAdjustment()
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  
  // We need to fetch global batches for the dropdowns
  const { data: allBatches } = useAllBatches()
  
  // Get unique brands for the filter
  const uniqueBrands = Array.from(new Set(products.map(p => p.brand_name).filter(Boolean))).sort()

  const filteredProducts = products.filter(p => {
    const matchSearch = p.product_name.toLowerCase().includes(search.toLowerCase()) || 
                        (p.product_code && p.product_code.toLowerCase().includes(search.toLowerCase()))
    const matchBrand = selectedBrand ? p.brand_name === selectedBrand : true
    return matchSearch && matchBrand
  })
  
  // Localized state for editing adjustments
  const [edits, setEdits] = useState<Record<string | number, AdjustState>>({})

  const handleChange = (id: string | number, field: keyof AdjustState, value: any) => {
    setEdits(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { qty: '', reason: 'Damage', batch_code: '' }),
        [field]: value
      }
    }))
  }

  const handleSave = async () => {
    const items = Object.keys(edits)
      .filter(id => {
        const e = edits[id]
        return e.qty !== '' && Number(e.qty) > 0
      })
      .map(id => ({
        product_id: id,
        qty: Number(edits[id].qty),
        reason: edits[id].reason,
        batch_code: edits[id].batch_code || undefined
      }))

    if (items.length === 0) {
      toast.error('No valid adjustments to save. Ensure quantities are greater than zero.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        date: new Date().toISOString(),
        notes: 'Bulk Stock Adjustment',
        items
      }
      await adjustMutation.mutateAsync(payload)
      toast.success(`Successfully adjusted stock for ${items.length} products`)
      qc.invalidateQueries({ queryKey: ['products'] })
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to adjust stock')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    const headers = ['Product ID', 'Product Name', 'Batch Code', 'Adjustment Qty', 'Reason']
    const rows = filteredProducts.map(p => {
      const e = edits[p.id] || { qty: '', reason: 'Damage', batch_code: '' }
      return [
        p.id,
        `"${p.product_name.replace(/"/g, '""')}"`,
        e.batch_code,
        e.qty,
        e.reason
      ].join(',')
    })
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "bulk_stock_adjust_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n')
      
      const newEdits: Record<string | number, AdjustState> = {}
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        if (parts.length >= 5) {
          const id = parts[0].replace(/"/g, '')
          const qtyStr = parts[3].trim()
          const reasonStr = parts[4].trim()
          
          if (qtyStr && Number(qtyStr) > 0) {
            newEdits[id] = {
              batch_code: parts[2].replace(/"/g, ''),
              qty: Number(qtyStr),
              reason: ['Found', 'Damage', 'Expiry', 'Lost'].includes(reasonStr) ? reasonStr : 'Damage'
            }
          }
        }
      }
      
      setEdits(prev => ({ ...prev, ...newEdits }))
      toast.success(`Loaded adjustments for ${Object.keys(newEdits).length} products from CSV`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <Dialog open={open} onClose={onClose} title="Bulk Stock Adjustment" widthClass="max-w-6xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="text-sm text-ink-600 flex-1">
          Adjust stock for multiple products simultaneously. Quantities must be positive. Reason determines direction.
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleDownload} className="text-xs">
            <Download className="w-4 h-4 mr-1" /> Template
          </Button>
          <label className="cursor-pointer">
            <input type="file" accept=".csv" className="hidden" onChange={handleUpload} />
            <div className="inline-flex items-center justify-center rounded-md text-xs font-medium bg-white text-ink-700 border border-border-subtle hover:bg-ink-50 h-8 px-3 transition-colors">
              <Upload className="w-4 h-4 mr-1" /> Upload
            </div>
          </label>
        </div>
      </div>

      <div className="mb-4 flex gap-4">
        <Input 
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64"
        />
        <Select
          value={selectedBrand}
          onChange={e => setSelectedBrand(e.target.value)}
          className="w-48"
        >
          <option value="">All Brands</option>
          {uniqueBrands.map(b => (
            <option key={b as string} value={b as string}>{b as string}</option>
          ))}
        </Select>
      </div>
      
      <div className="max-h-[60vh] overflow-auto border border-border-subtle rounded-lg">
        <table className="w-full text-left text-sm text-ink-700">
          <thead className="sticky top-0 bg-ink-50 font-medium text-ink-900 border-b border-border-subtle shadow-sm z-10">
            <tr>
              <th className="px-4 py-3 min-w-[200px]">Product Name</th>
              <th className="px-4 py-3 w-32">Current Stock</th>
              <th className="px-4 py-3 w-48">Batch Code</th>
              <th className="px-4 py-3 w-32">Adjustment Qty</th>
              <th className="px-4 py-3 w-48">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle bg-white">
            {filteredProducts.map(p => {
              const productBatches = allBatches?.filter((b: any) => b.product_id === p.id) || []
              return (
              <tr key={p.id} className="hover:bg-ink-50/50 group">
                <td className="px-4 py-2 truncate max-w-[200px]" title={p.product_name}>
                  {p.product_name}
                  <div className="text-xs text-ink-400">{p.product_code || p.brand_name}</div>
                </td>
                <td className="px-4 py-2">
                  {p.current_stock}
                </td>
                <td className="px-4 py-2">
                  <Select 
                    className="w-full"
                    value={edits[p.id]?.batch_code ?? ''}
                    onChange={e => handleChange(p.id, 'batch_code', e.target.value)}
                  >
                    <option value="">-- Optional --</option>
                    {productBatches.map((b: any) => (
                      <option key={b.id} value={b.batch_code}>{b.batch_code} (Qty: {b.quantity_remaining})</option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-2">
                  <Input 
                    type="number" step="1" placeholder="0" min="1"
                    className="w-full text-right"
                    value={edits[p.id]?.qty ?? ''}
                    onChange={e => handleChange(p.id, 'qty', e.target.value)}
                  />
                </td>
                <td className="px-4 py-2">
                  <Select 
                    className="w-full"
                    value={edits[p.id]?.reason ?? 'Damage'}
                    onChange={e => handleChange(p.id, 'reason', e.target.value)}
                  >
                    <option value="Found">Found (+)</option>
                    <option value="Damage">Damage (-)</option>
                    <option value="Expiry">Expiry (-)</option>
                    <option value="Lost">Lost (-)</option>
                  </Select>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm font-medium text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full">
          {Object.values(edits).filter(e => e.qty !== '' && Number(e.qty) > 0).length} products to adjust
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || Object.values(edits).filter(e => e.qty !== '' && Number(e.qty) > 0).length === 0} loading={loading}>
            Apply Adjustments
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
