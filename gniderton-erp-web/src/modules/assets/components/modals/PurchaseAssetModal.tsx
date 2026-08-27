import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'
import { assetsApi } from '../../api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function PurchaseAssetModal({ open, onClose, onSuccess }: Props) {
  const { data: categories = [] } = useQuery({ queryKey: ['asset-categories'], queryFn: () => assetsApi.getAssetsCategories() })
  const { data: accounts = [] } = useQuery({ queryKey: ['asset-accounts'], queryFn: () => assetsApi.getAssetsAccounts() })
  const { data: entities = [] } = useQuery({ queryKey: ['asset-entities'], queryFn: () => assetsApi.getAssetEntities() })

  const [formData, setFormData] = useState({
    asset_name: '',
    category: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_cost: '', // Grand Total
    useful_life_years: '5',
    salvage_value: '0',
    vendor_id: '',
    asset_account_code: '',
    is_gst_purchase: false,
    taxable_amount: '',
    tax_amount: '',
    bill_no: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => {
        const newData = { ...prev, [name]: checked }
        if (name === 'is_gst_purchase' && checked) {
          const total = parseFloat(prev.purchase_cost) || 0;
          if (total > 0) {
             const taxable = total / 1.18;
             const tax = total - taxable;
             newData.taxable_amount = taxable.toFixed(2);
             newData.tax_amount = tax.toFixed(2);
          }
        }
        return newData;
      })
      return
    }

    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (newData.is_gst_purchase) {
        if (name === 'taxable_amount' || name === 'tax_amount') {
          const taxable = parseFloat(newData.taxable_amount) || 0;
          const tax = parseFloat(newData.tax_amount) || 0;
          newData.purchase_cost = (taxable + tax).toFixed(2);
        } else if (name === 'purchase_cost') {
          const total = parseFloat(value) || 0;
          const taxable = total / 1.18;
          const tax = total - taxable;
          newData.taxable_amount = taxable.toFixed(2);
          newData.tax_amount = tax.toFixed(2);
        }
      }
      return newData;
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await assetsApi.createAssets(formData)
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      alert("Failed to purchase asset")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Purchase New Asset">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Asset Name</Label>
            <Input 
              name="asset_name"
              required
              value={formData.asset_name}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <Label>Category</Label>
            <Select 
              name="category"
              required
              value={formData.category}
              onChange={handleChange}
            >
              <option value="">-- Select Category --</option>
              {categories.map((c: string) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
          
          <div>
            <Label>Asset Account</Label>
            <Select 
              name="asset_account_code"
              required
              value={formData.asset_account_code}
              onChange={handleChange}
            >
              <option value="">-- Select Account --</option>
              {accounts.map((a: any) => (
                <option key={a.code} value={a.code}>{a.name} ({a.code})</option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Vendor</Label>
            <Select 
              name="vendor_id"
              required
              value={formData.vendor_id}
              onChange={handleChange}
            >
              <option value="">-- Select Vendor --</option>
              {entities.map((e: any) => (
                <option key={e.id} value={e.id}>{e.entity_name}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Purchase Date</Label>
            <Input 
              type="date"
              name="purchase_date"
              required
              value={formData.purchase_date}
              onChange={handleChange}
            />
          </div>

          <div>
            <Label>Bill No (Optional)</Label>
            <Input 
              name="bill_no"
              value={formData.bill_no}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="p-4 bg-surface border border-border-subtle rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              name="is_gst_purchase"
              id="is_gst_purchase"
              checked={formData.is_gst_purchase}
              onChange={handleChange}
              className="rounded border-border-base text-brand-600 focus:ring-brand-500"
            />
            <Label htmlFor="is_gst_purchase" className="mb-0">Is GST Purchase?</Label>
          </div>

          {formData.is_gst_purchase ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Taxable</Label>
                <Input name="taxable_amount" type="number" step="0.01" required value={formData.taxable_amount} onChange={handleChange} />
              </div>
              <div>
                <Label>Tax</Label>
                <Input name="tax_amount" type="number" step="0.01" required value={formData.tax_amount} onChange={handleChange} />
              </div>
              <div>
                <Label>Total (₹)</Label>
                <Input name="purchase_cost" type="number" step="0.01" required value={formData.purchase_cost} onChange={handleChange} />
              </div>
            </div>
          ) : (
            <div>
              <Label>Purchase Cost (₹)</Label>
              <Input name="purchase_cost" type="number" step="0.01" required value={formData.purchase_cost} onChange={handleChange} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Useful Life (Years)</Label>
            <Input 
              type="number"
              name="useful_life_years"
              required
              min="1"
              value={formData.useful_life_years}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label>Salvage Value (₹)</Label>
            <Input 
              type="number"
              name="salvage_value"
              required
              min="0"
              value={formData.salvage_value}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Register Purchase'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
