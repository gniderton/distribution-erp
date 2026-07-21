import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import type { Product } from '../types'
import { itemsApi } from '../api'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  products: Product[]
}

export function BulkPriceEditModal({ open, onClose, products }: Props) {
  const qc = useQueryClient()
  const [loading, setLoading] = useState(false)
  
  // Create a localized state for editing prices
  const [edits, setEdits] = useState<Record<string | number, Partial<Product>>>({})

  const handleChange = (id: string | number, field: keyof Product, value: string) => {
    const num = parseFloat(value)
    setEdits(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: isNaN(num) ? 0 : num
      }
    }))
  }

  const handleSave = async () => {
    const updates = Object.keys(edits).map(id => ({
      id,
      ...edits[id]
    }))

    if (updates.length === 0) {
      toast.error('No changes made')
      return
    }

    setLoading(true)
    try {
      await itemsApi.bulkUpdate({ updates })
      toast.success(`Successfully updated ${updates.length} products`)
      qc.invalidateQueries({ queryKey: ['products'] })
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update prices')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Bulk Price Edit" widthClass="max-w-6xl">
      <div className="mb-4 text-sm text-ink-600">
        Update pricing for multiple products quickly. Changes are only saved when you click "Save Changes".
      </div>
      
      <div className="max-h-[60vh] overflow-auto border border-border-subtle rounded-lg">
        <table className="w-full text-left text-sm text-ink-700">
          <thead className="sticky top-0 bg-ink-50 font-medium text-ink-900 border-b border-border-subtle shadow-sm z-10">
            <tr>
              <th className="px-4 py-3 min-w-[200px]">Product Name</th>
              <th className="px-4 py-3 w-28">MRP</th>
              <th className="px-4 py-3 w-28">Retail</th>
              <th className="px-4 py-3 w-28">Wholesale</th>
              <th className="px-4 py-3 w-28">Dealer</th>
              <th className="px-4 py-3 w-28">Distributor</th>
              <th className="px-4 py-3 w-28">Purchase</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle bg-white">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-ink-50/50">
                <td className="px-4 py-2 truncate max-w-[200px]" title={p.product_name}>
                  {p.product_name}
                  <div className="text-xs text-ink-400">{p.product_code || p.brand_name}</div>
                </td>
                <td className="px-4 py-2">
                  <input 
                    type="number" step="0.01" 
                    className="w-full rounded border border-border-subtle px-2 py-1 outline-none focus:ring-1 focus:ring-brand-400 text-right"
                    defaultValue={p.mrp}
                    onChange={e => handleChange(p.id, 'mrp', e.target.value)}
                  />
                </td>
                <td className="px-4 py-2">
                  <input 
                    type="number" step="0.01" 
                    className="w-full rounded border border-border-subtle px-2 py-1 outline-none focus:ring-1 focus:ring-brand-400 text-right"
                    defaultValue={p.retail_rate}
                    onChange={e => handleChange(p.id, 'retail_rate', e.target.value)}
                  />
                </td>
                <td className="px-4 py-2">
                  <input 
                    type="number" step="0.01" 
                    className="w-full rounded border border-border-subtle px-2 py-1 outline-none focus:ring-1 focus:ring-brand-400 text-right"
                    defaultValue={p.wholesale_rate}
                    onChange={e => handleChange(p.id, 'wholesale_rate', e.target.value)}
                  />
                </td>
                <td className="px-4 py-2">
                  <input 
                    type="number" step="0.01" 
                    className="w-full rounded border border-border-subtle px-2 py-1 outline-none focus:ring-1 focus:ring-brand-400 text-right"
                    defaultValue={p.dealer_rate}
                    onChange={e => handleChange(p.id, 'dealer_rate', e.target.value)}
                  />
                </td>
                <td className="px-4 py-2">
                  <input 
                    type="number" step="0.01" 
                    className="w-full rounded border border-border-subtle px-2 py-1 outline-none focus:ring-1 focus:ring-brand-400 text-right"
                    defaultValue={p.distributor_rate}
                    onChange={e => handleChange(p.id, 'distributor_rate', e.target.value)}
                  />
                </td>
                <td className="px-4 py-2">
                  <input 
                    type="number" step="0.01" 
                    className="w-full rounded border border-border-subtle px-2 py-1 outline-none focus:ring-1 focus:ring-brand-400 text-right"
                    defaultValue={p.purchase_rate}
                    onChange={e => handleChange(p.id, 'purchase_rate', e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm font-medium text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full">
          {Object.keys(edits).length} products modified
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || Object.keys(edits).length === 0}>
            Save Changes
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
