import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import type { Product } from '../types'
import { itemsApi } from '../api'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Download, Upload } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  products: Product[]
}

export function BulkPriceEditModal({ open, onClose, products }: Props) {
  const qc = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  
  // Get unique brands for the filter
  const uniqueBrands = Array.from(new Set(products.map(p => p.brand_name).filter(Boolean))).sort()

  const filteredProducts = products.filter(p => {
    const matchSearch = p.product_name.toLowerCase().includes(search.toLowerCase()) || 
                        (p.product_code && p.product_code.toLowerCase().includes(search.toLowerCase()))
    const matchBrand = selectedBrand ? p.brand_name === selectedBrand : true
    return matchSearch && matchBrand
  })
  
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
      await itemsApi.bulkUpdate({ items: updates })
      toast.success(`Successfully updated ${updates.length} products`)
      qc.invalidateQueries({ queryKey: ['products'] })
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update prices')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    const headers = ['Product ID', 'Product Name', 'MRP', 'Purchase Rate', 'Distributor', 'Wholesale', 'Dealer', 'Retail']
    const rows = filteredProducts.map(p => {
      const e = edits[p.id] || {}
      return [
        p.id,
        `"${p.product_name.replace(/"/g, '""')}"`,
        e.mrp ?? p.mrp ?? 0,
        e.purchase_rate ?? p.purchase_rate ?? 0,
        e.distributor_rate ?? p.distributor_rate ?? 0,
        e.wholesale_rate ?? p.wholesale_rate ?? 0,
        e.dealer_rate ?? p.dealer_rate ?? 0,
        e.retail_rate ?? p.retail_rate ?? 0
      ].join(',')
    })
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "bulk_prices_template.csv")
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
      
      const newEdits: Record<string | number, Partial<Product>> = {}
      
      // Skip header, parse lines
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        // Basic CSV split ignoring commas inside quotes
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        if (parts.length >= 8) {
          const id = parts[0].replace(/"/g, '')
          newEdits[id] = {
            mrp: parseFloat(parts[2]) || 0,
            purchase_rate: parseFloat(parts[3]) || 0,
            distributor_rate: parseFloat(parts[4]) || 0,
            wholesale_rate: parseFloat(parts[5]) || 0,
            dealer_rate: parseFloat(parts[6]) || 0,
            retail_rate: parseFloat(parts[7]) || 0,
          }
        }
      }
      
      setEdits(prev => ({ ...prev, ...newEdits }))
      toast.success(`Loaded prices for ${Object.keys(newEdits).length} products from CSV`)
    }
    reader.readAsText(file)
    e.target.value = '' // reset
  }

  const calcMargin = (rate: number, purchase: number) => {
    if (!purchase || purchase === 0) return '0%'
    const margin = ((rate - purchase) / purchase) * 100
    return `${margin > 0 ? '+' : ''}${margin.toFixed(1)}%`
  }

  return (
    <Dialog open={open} onClose={onClose} title="Bulk Price Edit" widthClass="max-w-6xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="text-sm text-ink-600 flex-1">
          Update pricing for multiple products. Changes are only saved when you click "Save Changes".
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
        <input 
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-border-subtle rounded-md px-3 py-1.5 text-sm w-64 focus:ring-1 focus:ring-brand-500 outline-none"
        />
        <select
          value={selectedBrand}
          onChange={e => setSelectedBrand(e.target.value)}
          className="border border-border-subtle rounded-md px-3 py-1.5 text-sm w-48 focus:ring-1 focus:ring-brand-500 outline-none"
        >
          <option value="">All Brands</option>
          {uniqueBrands.map(b => (
            <option key={b as string} value={b as string}>{b as string}</option>
          ))}
        </select>
      </div>
      
      <div className="max-h-[60vh] overflow-auto border border-border-subtle rounded-lg">
        <table className="w-full text-left text-sm text-ink-700 min-w-max">
          <thead className="sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="bg-ink-50 px-4 py-3 min-w-[250px] font-medium text-ink-900 border-b border-border-subtle">Product Name</th>
              <th className="bg-ink-50 px-4 py-3 min-w-[100px] font-medium text-ink-900 border-b border-border-subtle">MRP</th>
              <th className="bg-ink-50 px-4 py-3 min-w-[120px] font-medium text-ink-900 border-b border-border-subtle">Purchase</th>
              <th className="bg-ink-50 px-4 py-3 min-w-[120px] font-medium text-ink-900 border-b border-border-subtle">Distributor</th>
              <th className="bg-ink-50 px-4 py-3 min-w-[120px] font-medium text-ink-900 border-b border-border-subtle">Wholesale</th>
              <th className="bg-ink-50 px-4 py-3 min-w-[120px] font-medium text-ink-900 border-b border-border-subtle">Dealer</th>
              <th className="bg-ink-50 px-4 py-3 min-w-[120px] font-medium text-ink-900 border-b border-border-subtle">Retail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle bg-white">
            {filteredProducts.map(p => {
              const currentPurchase = Number(edits[p.id]?.purchase_rate ?? p.purchase_rate ?? 0)
              return (
              <tr key={p.id} className="hover:bg-ink-50/50 group">
                <td className="px-4 py-2" title={p.product_name}>
                  <div className="font-medium truncate max-w-[250px]">{p.product_name}</div>
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
                    className="w-full rounded border border-border-subtle px-2 py-1 outline-none focus:ring-1 focus:ring-brand-400 text-right font-medium"
                    value={edits[p.id]?.purchase_rate ?? p.purchase_rate ?? ''}
                    onChange={e => handleChange(p.id, 'purchase_rate', e.target.value)}
                  />
                </td>
                <td className="px-4 py-2 relative">
                  <input 
                    type="number" step="0.01" 
                    className="w-full rounded border border-border-subtle px-2 py-1 outline-none focus:ring-1 focus:ring-brand-400 text-right"
                    value={edits[p.id]?.distributor_rate ?? p.distributor_rate ?? ''}
                    onChange={e => handleChange(p.id, 'distributor_rate', e.target.value)}
                  />
                  <div className="text-[10px] text-brand-600 text-right mt-0.5 font-medium">
                    Margin: {calcMargin(Number(edits[p.id]?.distributor_rate ?? p.distributor_rate ?? 0), currentPurchase)}
                  </div>
                </td>
                <td className="px-4 py-2 relative">
                  <input 
                    type="number" step="0.01" 
                    className="w-full rounded border border-border-subtle px-2 py-1 outline-none focus:ring-1 focus:ring-brand-400 text-right"
                    value={edits[p.id]?.wholesale_rate ?? p.wholesale_rate ?? ''}
                    onChange={e => handleChange(p.id, 'wholesale_rate', e.target.value)}
                  />
                  <div className="text-[10px] text-brand-600 text-right mt-0.5 font-medium">
                    Margin: {calcMargin(Number(edits[p.id]?.wholesale_rate ?? p.wholesale_rate ?? 0), currentPurchase)}
                  </div>
                </td>
                <td className="px-4 py-2 relative">
                  <input 
                    type="number" step="0.01" 
                    className="w-full rounded border border-border-subtle px-2 py-1 outline-none focus:ring-1 focus:ring-brand-400 text-right"
                    value={edits[p.id]?.dealer_rate ?? p.dealer_rate ?? ''}
                    onChange={e => handleChange(p.id, 'dealer_rate', e.target.value)}
                  />
                  <div className="text-[10px] text-brand-600 text-right mt-0.5 font-medium">
                    Margin: {calcMargin(Number(edits[p.id]?.dealer_rate ?? p.dealer_rate ?? 0), currentPurchase)}
                  </div>
                </td>
                <td className="px-4 py-2 relative">
                  <input 
                    type="number" step="0.01" 
                    className="w-full rounded border border-border-subtle px-2 py-1 outline-none focus:ring-1 focus:ring-brand-400 text-right"
                    value={edits[p.id]?.retail_rate ?? p.retail_rate ?? ''}
                    onChange={e => handleChange(p.id, 'retail_rate', e.target.value)}
                  />
                  <div className="text-[10px] text-brand-600 text-right mt-0.5 font-medium">
                    Margin: {calcMargin(Number(edits[p.id]?.retail_rate ?? p.retail_rate ?? 0), currentPurchase)}
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm font-medium text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full">
          {Object.keys(edits).length} products modified
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || Object.keys(edits).length === 0} loading={loading}>
            Update Prices
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
