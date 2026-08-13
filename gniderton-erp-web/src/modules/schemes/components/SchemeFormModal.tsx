import { useState, useMemo } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { MultiSearchableSelect } from '@/components/ui/MultiSearchableSelect'
import { Plus, Trash, Zap } from 'lucide-react'
import { useCreateScheme, useUpdateScheme } from '../hooks'
import { useProducts, useBrands, useCategories } from '@/modules/items/hooks'
import { useCustomers } from '@/modules/customer/hooks'
import toast from 'react-hot-toast'

interface Props {
  isOpen: boolean
  onClose: () => void
  editScheme?: any
}

export function SchemeFormModal({ isOpen, onClose, editScheme }: Props) {
  const { mutateAsync: createScheme, isPending: isCreating } = useCreateScheme()
  const { mutateAsync: updateScheme, isPending: isUpdating } = useUpdateScheme()

  const { data: products } = useProducts()
  const { data: brands } = useBrands()
  const { data: categories } = useCategories()
  const { data: customers } = useCustomers()

  const [schemeName, setSchemeName] = useState(editScheme?.scheme_name || '')
  const [description, setDescription] = useState(editScheme?.description || '')
  const [startDate, setStartDate] = useState(editScheme?.start_date ? editScheme.start_date.split('T')[0] : '')
  const [endDate, setEndDate] = useState(editScheme?.end_date ? editScheme.end_date.split('T')[0] : '')
  const [noExpiry, setNoExpiry] = useState(editScheme ? !editScheme.end_date : false)
  const [isActive, setIsActive] = useState(editScheme?.is_active ?? true)
  
  const [schemeType, setSchemeType] = useState(editScheme?.rules?.[0]?.scheme_type || 'BUY_GET_FREE')
  const [rules, setRules] = useState<any[]>(editScheme?.rules || [])

  // Rule Builder State
  const [triggerType, setTriggerType] = useState('Product')
  const [triggerId, setTriggerId] = useState<string>('')
  const [freeItemType, setFreeItemType] = useState<'Same' | 'Different'>('Same')
  const [rewardProductId, setRewardProductId] = useState<string>('')
  const [channel, setChannel] = useState<string>('')
  const [minQty, setMinQty] = useState('')
  const [rewardQty, setRewardQty] = useState('')
  const [specialPrice, setSpecialPrice] = useState('')
  const [comboProducts, setComboProducts] = useState<any[]>([])
  const [comboSelectedProduct, setComboSelectedProduct] = useState<string>('')
  
  // Flat MRP Discount State
  const [flatCustomers, setFlatCustomers] = useState<(string | number)[]>([])
  const [flatBrand, setFlatBrand] = useState<string>('')
  const [flatProducts, setFlatProducts] = useState<(string | number)[]>([])

  const isSubmitting = isCreating || isUpdating

  const isFormValid = schemeName.trim() !== '' && rules.length > 0

  const handleAddComboProduct = () => {
    if (!comboSelectedProduct) return
    const prod = products?.find((p: any) => p.id == comboSelectedProduct)
    if (!prod) return
    // Prevent duplicates
    if (!comboProducts.some(p => p.product_id == prod.id)) {
      setComboProducts([...comboProducts, { product_id: prod.id, product_name: prod.product_name, product_code: prod.product_code }])
    }
    setComboSelectedProduct('')
  }

  const handleAddComboSlab = () => {
    if (comboProducts.length === 0) return toast.error('Add at least one product to the combo group')
    const newRule = {
      scheme_type: 'COMBO',
      trigger_type: 'Product',
      trigger_id: null,
      trigger_name: `Combo Group (${comboProducts.length})`,
      min_qty: Number(minQty) || 0,
      reward_product_id: freeItemType === 'Different' ? (rewardProductId || null) : null,
      reward_qty: Number(rewardQty) || 0,
      channel_tier: channel || 'Dealer',
      special_price: null,
      combo_products: comboProducts.map(p => ({ product_id: p.product_id, product_name: p.product_name, product_code: p.product_code }))
    }
    setRules([...rules, newRule])
    setMinQty('')
    setRewardQty('')
  }

  const handleAddRule = () => {
    const triggerName = triggerType === 'Product' 
        ? products?.find((p: any) => p.id == triggerId)?.product_name 
        : triggerType === 'Brand'
        ? brands?.find((b: any) => b.id == triggerId)?.brand_name
        : categories?.find((c: any) => c.id == triggerId)?.category_name;

    const newRule = {
      scheme_type: schemeType,
      trigger_type: schemeType === 'FLAT_MRP_DISCOUNT' ? 'Brand' : triggerType,
      trigger_id: schemeType === 'FLAT_MRP_DISCOUNT' ? flatBrand : (triggerId || null),
      trigger_name: schemeType === 'FLAT_MRP_DISCOUNT' 
        ? brands?.find((b: any) => b.id == flatBrand)?.brand_name || 'Brand'
        : (triggerName || triggerId),
      min_qty: Number(minQty) || 0,
      reward_product_id: freeItemType === 'Same' ? (triggerType === 'Product' ? triggerId : null) : (rewardProductId || null),
      reward_qty: Number(rewardQty) || 0,
      channel_tier: channel || 'Dealer',
      special_price: specialPrice ? Number(specialPrice) : null,
      combo_products: comboProducts,
      // Custom fields for FLAT_MRP_DISCOUNT
      targeted_customer_ids: flatCustomers,
      targeted_product_ids: flatProducts
    }
    setRules([...rules, newRule])
    setMinQty('')
    setRewardQty('')
    setSpecialPrice('')
    setFlatCustomers([])
    setFlatBrand('')
    setFlatProducts([])
  }

  const handleSave = async () => {
    if (!schemeName) return toast.error("Scheme Name is required")
    if (rules.length === 0) return toast.error("At least one rule/slab is required")

    const payload = {
      scheme_name: schemeName,
      description,
      start_date: startDate || new Date(),
      end_date: noExpiry ? null : (endDate || null),
      is_active: isActive,
      targeted_customer_ids: rules.length > 0 && rules[0].scheme_type === 'FLAT_MRP_DISCOUNT' ? (rules[0].targeted_customer_ids || []) : [],
      rules
    }

    try {
      if (editScheme) {
        await updateScheme({ id: editScheme.id, data: payload })
        toast.success("Scheme updated successfully")
      } else {
        await createScheme(payload)
        toast.success("Scheme created successfully")
      }
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} title={editScheme ? "Edit Scheme" : "Create New Scheme"} widthClass="max-w-4xl">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ink-600 mb-1">Scheme Name</label>
            <Input placeholder="Scheme Name" value={schemeName} onChange={e => setSchemeName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-ink-600 mb-1">Description</label>
            <Input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs text-ink-600 mb-1">From</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-ink-600 mb-1">To</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={noExpiry} />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="noExpiry" checked={noExpiry} onChange={e => setNoExpiry(e.target.checked)} className="rounded border-ink-300 text-brand-600 focus:ring-brand-600" />
            <label htmlFor="noExpiry" className="text-sm text-ink-700">No Expiry</label>
          </div>
        </div>

        <div className="pt-2">
          <h3 className="text-sm text-ink-600 mb-3">Type</h3>
          <div className="flex gap-6">
            {['BUY_GET_FREE', 'COMBO', 'PRICE_SLAB', 'FLAT_MRP_DISCOUNT'].map(t => (
              <label key={t} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="radio" name="stype" checked={schemeType === t} onChange={() => { setSchemeType(t); setRules([]) }} className="text-brand-600 focus:ring-brand-600" />
                {t.replace(/_/g, ' ')}
              </label>
            ))}
          </div>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-[#e6e9ee]">
          <div className="space-y-4">
            {schemeType === 'BUY_GET_FREE' && (
              <>
                <div>
                  <h4 className="text-xs font-medium text-ink-600 mb-2">Group</h4>
                  <div className="flex gap-6 mb-4">
                    {['Product', 'Brand', 'Category'].map(g => (
                      <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="gtype" checked={triggerType === g} onChange={() => setTriggerType(g)} className="text-brand-600 focus:ring-brand-600" />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="w-1/2">
                  <label className="block text-xs text-ink-600 mb-1">Choose</label>
                  <SearchableSelect 
                    value={triggerId} 
                    onChange={val => setTriggerId(String(val))}
                    placeholder="Select option"
                    options={
                      triggerType === 'Product' ? (products?.map((p: any) => ({ value: p.id, label: p.product_name })) || []) :
                      triggerType === 'Brand' ? (brands?.map((b: any) => ({ value: b.id, label: b.brand_name })) || []) :
                      (categories?.map((c: any) => ({ value: c.id, label: c.category_name })) || [])
                    }
                  />
                </div>

                <div className="pt-2">
                  <div className="flex gap-6 mb-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="ftype" checked={freeItemType === 'Same'} onChange={() => setFreeItemType('Same')} className="text-brand-600 focus:ring-brand-600" />
                      Same Product
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="ftype" checked={freeItemType === 'Different'} onChange={() => setFreeItemType('Different')} className="text-brand-600 focus:ring-brand-600" />
                      Different Product
                    </label>
                  </div>
                  {freeItemType === 'Different' && (
                    <div className="w-1/2">
                      <select className="w-full text-sm p-2 rounded-lg border border-[#e6e9ee]" value={rewardProductId} onChange={e => setRewardProductId(e.target.value)}>
                        <option value="">Choose Free Product</option>
                        {products?.map((p: any) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-4 items-end mt-4">
                  <div>
                    <label className="block text-xs text-ink-600 mb-1">Channel</label>
                    <select className="w-full text-sm p-2.5 rounded-lg border border-[#e6e9ee]" value={channel} onChange={e => setChannel(e.target.value)}>
                      <option value="">Select option</option>
                      <option value="Distributor">Distributor</option>
                      <option value="Wholesale">Wholesale</option>
                      <option value="Dealer">Dealer</option>
                      <option value="Retail">Retail</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-ink-600 mb-1">Min Qty</label>
                    <Input type="number" placeholder="0" value={minQty} onChange={e => setMinQty(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-600 mb-1">Free Qty</label>
                    <Input type="number" placeholder="0" value={rewardQty} onChange={e => setRewardQty(e.target.value)} />
                  </div>
                  <div>
                    <Button onClick={handleAddRule} variant="secondary" className="w-10 h-10 p-0 rounded-lg flex items-center justify-center"><Plus className="w-5 h-5 text-ink-600"/></Button>
                  </div>
                </div>
              </>
            )}

            {schemeType === 'PRICE_SLAB' && (
              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-2">
                  <label className="block text-xs text-ink-600 mb-1">Channel</label>
                  <select className="w-full text-sm p-2 rounded-lg border border-border-subtle bg-white" value={channel} onChange={e => setChannel(e.target.value)}>
                    <option value="">Select</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Dealer">Dealer</option>
                    <option value="Retail">Retail</option>
                  </select>
                </div>
                <div className="col-span-4">
                  <label className="block text-xs text-ink-600 mb-1">Product</label>
                  <SearchableSelect 
                    value={triggerId} 
                    onChange={val => setTriggerId(String(val))}
                    placeholder="Select..."
                    options={products?.map((p: any) => ({ value: p.id, label: p.product_name })) || []}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-ink-600 mb-1">Min Qty</label>
                  <Input type="number" placeholder="0" value={minQty} onChange={e => setMinQty(e.target.value)} />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-ink-600 mb-1">Special Net Rate (₹)</label>
                  <Input type="number" placeholder="0" value={specialPrice} onChange={e => setSpecialPrice(e.target.value)} />
                </div>
                <div className="col-span-1">
                  <Button onClick={handleAddRule} variant="secondary" className="w-10 h-10 p-0 rounded-lg flex items-center justify-center"><Plus className="w-5 h-5 text-ink-600"/></Button>
                </div>
              </div>
            )}
            
            {schemeType === 'COMBO' && (
              <div className="col-span-4 space-y-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-ink-600 mb-1">Choose a Product</label>
                    <SearchableSelect 
                      value={comboSelectedProduct} 
                      onChange={val => setComboSelectedProduct(String(val))}
                      placeholder="Select option"
                      options={products?.map((p: any) => ({ value: p.id, label: p.product_name })) || []}
                    />
                  </div>
                  <Button onClick={handleAddComboProduct} variant="secondary" className="w-10 h-10 p-0 rounded-lg flex items-center justify-center shrink-0">
                    <Plus className="w-5 h-5 text-ink-600" />
                  </Button>
                </div>

                {comboProducts.length > 0 && (
                  <div className="border border-[#e6e9ee] rounded-xl overflow-hidden mt-2">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-surface text-ink-600 text-xs font-medium border-b border-[#e6e9ee]">
                        <tr>
                          <th className="px-4 py-3">product_name</th>
                          <th className="px-4 py-3">product_code</th>
                          <th className="px-4 py-3 w-10">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e6e9ee]">
                        {comboProducts.map((p, i) => (
                          <tr key={i} className="hover:bg-brand-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium">{p.product_name}</td>
                            <td className="px-4 py-3">{p.product_code}</td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => setComboProducts(comboProducts.filter((_, idx) => idx !== i))} className="text-danger-500 hover:text-danger-700 p-1 rounded-lg hover:bg-danger-50 transition-colors">
                                <Trash className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="pt-2">
                  <div className="flex gap-6 mb-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="ftypeCombo" checked={freeItemType === 'Same'} onChange={() => setFreeItemType('Same')} className="text-brand-600 focus:ring-brand-600" />
                      From the Same Group
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="ftypeCombo" checked={freeItemType === 'Different'} onChange={() => setFreeItemType('Different')} className="text-brand-600 focus:ring-brand-600" />
                      Different Product
                    </label>
                  </div>
                  {freeItemType === 'Different' && (
                    <div className="w-1/2">
                      <label className="block text-xs text-ink-600 mb-1">Free Product</label>
                      <SearchableSelect 
                        value={rewardProductId} 
                        onChange={val => setRewardProductId(String(val))}
                        placeholder="Choose Free Product"
                        options={products?.map((p: any) => ({ value: p.id, label: p.product_name })) || []}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-4 items-end mt-4">
                  <div>
                    <label className="block text-xs text-ink-600 mb-1">Channel</label>
                    <select className="w-full text-sm p-2.5 rounded-lg border border-[#e6e9ee]" value={channel} onChange={e => setChannel(e.target.value)}>
                      <option value="">Select option</option>
                      <option value="Distributor">Distributor</option>
                      <option value="Wholesale">Wholesale</option>
                      <option value="Dealer">Dealer</option>
                      <option value="Retail">Retail</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-ink-600 mb-1">Min Qty</label>
                    <Input type="number" placeholder="0" value={minQty} onChange={e => setMinQty(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-600 mb-1">Free Qty</label>
                    <Input type="number" placeholder="0" value={rewardQty} onChange={e => setRewardQty(e.target.value)} />
                  </div>
                  <div>
                    <Button onClick={handleAddComboSlab} variant="secondary" className="w-10 h-10 p-0 rounded-lg flex items-center justify-center"><Plus className="w-5 h-5 text-ink-600"/></Button>
                  </div>
                </div>
              </div>
            )}

            {schemeType === 'FLAT_MRP_DISCOUNT' && (
              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-3">
                  <label className="block text-xs text-ink-600 mb-1">Select Customers</label>
                  <MultiSearchableSelect 
                    value={flatCustomers}
                    onChange={setFlatCustomers}
                    placeholder="Select option(s)"
                    options={customers?.map((c: any) => ({ value: c.id, label: c.customer_name })) || []}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-ink-600 mb-1">Select Brand</label>
                  <SearchableSelect 
                    value={flatBrand} 
                    onChange={val => setFlatBrand(String(val))}
                    placeholder="Select option"
                    options={brands?.map((b: any) => ({ value: b.id, label: b.brand_name })) || []}
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-ink-600 mb-1">Products</label>
                  <MultiSearchableSelect 
                    value={flatProducts}
                    onChange={setFlatProducts}
                    placeholder="Select option(s)"
                    options={products?.map((p: any) => ({ value: p.id, label: p.product_name })) || []}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs text-ink-600 mb-1">Min Qty</label>
                  <Input type="number" placeholder="0" value={minQty} onChange={e => setMinQty(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-ink-600 mb-1">Discount Perc</label>
                  <Input type="number" placeholder="0" value={specialPrice} onChange={e => setSpecialPrice(e.target.value)} />
                </div>
                <div className="col-span-1 pb-1">
                  <Button onClick={handleAddRule} variant="secondary" className="w-10 h-10 p-0 rounded-lg flex items-center justify-center"><Plus className="w-5 h-5 text-ink-600"/></Button>
                </div>
              </div>
            )}

          </div>
        </div>

        {rules.length > 0 && (
          <div className="border border-[#e6e9ee] rounded-xl overflow-hidden mt-4">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface text-ink-600 text-xs font-medium border-b border-[#e6e9ee]">
                <tr>
                  <th className="px-4 py-3">scheme_type</th>
                  <th className="px-4 py-3">trigger_type</th>
                  <th className="px-4 py-3">trigger_name</th>
                  <th className="px-4 py-3">min_qty</th>
                  <th className="px-4 py-3">reward_qty</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e9ee]">
                {rules.map((r, i) => (
                  <tr key={i} className="hover:bg-brand-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{r.scheme_type}</td>
                    <td className="px-4 py-3">{r.trigger_type}</td>
                    <td className="px-4 py-3">{r.trigger_name || r.trigger_id}</td>
                    <td className="px-4 py-3">{r.min_qty}</td>
                    <td className="px-4 py-3">
                      {r.reward_qty}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setRules(rules.filter((_, idx) => idx !== i))} className="text-danger-500 hover:text-danger-700 p-1 rounded-lg hover:bg-danger-50 transition-colors">
                        <Trash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#e6e9ee]">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" className="gap-2" onClick={handleSave} disabled={!isFormValid || isSubmitting}>
          <Zap className="w-4 h-4" /> {editScheme ? 'Save Changes' : 'Create Scheme'}
        </Button>
      </div>
    </Dialog>
  )
}
