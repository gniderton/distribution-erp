import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { MultiSearchableSelect } from '@/components/ui/MultiSearchableSelect'
import { Plus, Trash, Zap, Gift, Tag, Percent, ArrowRight, ArrowLeft, CheckCircle2, Box, X } from 'lucide-react'
import { useCreateScheme, useUpdateScheme } from '../hooks'
import { useProducts, useBrands, useCategories } from '@/modules/items/hooks'
import { useCustomers } from '@/modules/customer/hooks'
import toast from 'react-hot-toast'

interface Props {
  isOpen: boolean
  onClose: () => void
  editScheme?: any
}

const SCHEME_TYPES = [
  { id: 'BUY_GET_FREE', label: 'Buy Get Free', icon: Gift, desc: 'Offer free items when buying specific products' },
  { id: 'COMBO', label: 'Combo', icon: Zap, desc: 'Bundle products together for special deals' },
  { id: 'PRICE_SLAB', label: 'Price Slab', icon: Tag, desc: 'Set volume-based pricing tiers' },
  { id: 'FLAT_MRP_DISCOUNT', label: 'Flat MRP Discount', icon: Percent, desc: 'Apply flat percentage discounts' }
]

export function SchemeFormModal({ isOpen, onClose, editScheme }: Props) {
  const { mutateAsync: createScheme, isPending: isCreating } = useCreateScheme()
  const { mutateAsync: updateScheme, isPending: isUpdating } = useUpdateScheme()

  const { data: products } = useProducts()
  const { data: brands } = useBrands()
  const { data: categories } = useCategories()
  const { data: customers } = useCustomers()

  const [step, setStep] = useState(1)

  // Step 1: Config
  const [schemeName, setSchemeName] = useState(editScheme?.scheme_name || '')
  const [description, setDescription] = useState(editScheme?.description || '')
  const [startDate, setStartDate] = useState(editScheme?.start_date ? editScheme.start_date.split('T')[0] : '')
  const [endDate, setEndDate] = useState(editScheme?.end_date ? editScheme.end_date.split('T')[0] : '')
  const [noExpiry, setNoExpiry] = useState(editScheme ? !editScheme.end_date : false)
  const [isActive, setIsActive] = useState(editScheme?.is_active ?? true)
  
  // Step 2: Rules
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

  const isStep1Valid = schemeName.trim() !== '' && startDate !== '' && (noExpiry || endDate !== '')

  const handleAddComboProduct = () => {
    if (!comboSelectedProduct) return
    const prod = products?.find((p: any) => p.id == comboSelectedProduct)
    if (!prod) return
    if (!comboProducts.some(p => p.product_id == prod.id)) {
      setComboProducts([...comboProducts, { product_id: prod.id, product_name: prod.product_name, product_code: prod.product_code }])
    }
    setComboSelectedProduct('')
  }

  const handleAddComboSlab = () => {
    if (comboProducts.length === 0) return toast.error('Add at least one product to the combo group')
    if (!minQty) return toast.error('Min Qty is required')
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
    if (schemeType === 'BUY_GET_FREE' && (!triggerId || !minQty)) return toast.error('Please fill required fields')
    if (schemeType === 'PRICE_SLAB' && (!triggerId || !minQty || !specialPrice)) return toast.error('Please fill required fields')
    if (schemeType === 'FLAT_MRP_DISCOUNT' && (!flatBrand || !minQty || !specialPrice)) return toast.error('Please fill required fields')

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
    const payload = {
      scheme_name: schemeName,
      description,
      start_date: startDate,
      end_date: noExpiry ? null : endDate,
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

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
            step === s ? 'bg-brand-600 text-white shadow-md' : 
            step > s ? 'bg-brand-100 text-brand-600' : 'bg-surface text-ink-400'
          }`}>
            {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
          </div>
          {i < 2 && (
            <div className={`w-16 h-1 mx-2 rounded-full transition-colors ${step > s ? 'bg-brand-200' : 'bg-surface'}`} />
          )}
        </div>
      ))}
    </div>
  )

  const footer = (
    <>
      {step > 1 && (
        <Button variant="ghost" onClick={() => setStep(step - 1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      )}
      {step < 3 ? (
        <Button 
          variant="primary" 
          onClick={() => {
            if (step === 1 && !isStep1Valid) {
              toast.error('Please fill required fields')
              return
            }
            if (step === 2 && rules.length === 0) {
              toast.error('Please add at least one rule')
              return
            }
            setStep(step + 1)
          }}
          disabled={step === 1 ? !isStep1Valid : rules.length === 0}
        >
          Next <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      ) : (
        <Button variant="primary" onClick={handleSave} disabled={isSubmitting} className="gap-2">
          <Zap className="w-4 h-4" /> {editScheme ? 'Save Changes' : 'Publish Scheme'}
        </Button>
      )}
    </>
  )

  return (
    <Drawer 
      open={isOpen} 
      onClose={onClose} 
      title={editScheme ? "Edit Scheme" : "Create New Scheme"} 
      description="Configure scheme rules, slabs, and targeting"
      widthClass="max-w-3xl"
      footer={footer}
    >
      {renderStepIndicator()}

      <div className="transition-opacity duration-300">
        {/* STEP 1: CONFIGURATION */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">Scheme Name <span className="text-danger-500">*</span></label>
              <Input placeholder="e.g. Summer Bonanza 2026" value={schemeName} onChange={e => setSchemeName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">Description</label>
              <textarea 
                className="w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition placeholder:text-ink-600/40 min-h-[100px]"
                placeholder="Optional details about this scheme..." 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1.5">Start Date <span className="text-danger-500">*</span></label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-medium text-ink-700">End Date</label>
                  <label className="flex items-center gap-1.5 text-xs text-ink-600 cursor-pointer">
                    <input type="checkbox" checked={noExpiry} onChange={e => setNoExpiry(e.target.checked)} className="rounded border-ink-300 text-brand-600 focus:ring-brand-600" />
                    No Expiry
                  </label>
                </div>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={noExpiry} className={noExpiry ? 'opacity-50' : ''} />
              </div>
            </div>
            <div className="pt-4 border-t border-border-subtle">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-ink-300 text-brand-600 focus:ring-brand-600" />
                <div>
                  <div className="text-sm font-medium text-ink-900">Active Scheme</div>
                  <div className="text-xs text-ink-500">Scheme will be immediately available if within date range</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* STEP 2: RULE BUILDER */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <h3 className="text-sm font-medium text-ink-900 mb-3">Scheme Type</h3>
              <div className="grid grid-cols-2 gap-3">
                {SCHEME_TYPES.map(type => (
                  <div 
                    key={type.id}
                    onClick={() => { setSchemeType(type.id); setRules([]) }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      schemeType === type.id ? 'border-brand-500 bg-brand-50/50 shadow-sm' : 'border-border-subtle hover:border-ink-300 bg-white'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${schemeType === type.id ? 'bg-brand-100 text-brand-600' : 'bg-surface text-ink-500'}`}>
                      <type.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${schemeType === type.id ? 'text-brand-900' : 'text-ink-900'}`}>{type.label}</div>
                      <div className="text-xs text-ink-500 mt-0.5">{type.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface/50 border border-border-subtle p-5 rounded-xl">
              <h4 className="text-sm font-medium text-ink-900 mb-4 flex items-center gap-2">
                <Box className="w-4 h-4 text-ink-500" /> Builder Configuration
              </h4>
              
              <div className="space-y-4">
                {schemeType === 'BUY_GET_FREE' && (
                  <>
                    <div className="flex gap-6 mb-4">
                      {['Product', 'Brand', 'Category'].map(g => (
                        <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" checked={triggerType === g} onChange={() => setTriggerType(g)} className="text-brand-600 focus:ring-brand-600" />
                          <span className="font-medium text-ink-700">{g}</span>
                        </label>
                      ))}
                    </div>
                    <div className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-6">
                        <label className="block text-xs font-medium text-ink-700 mb-1.5">Target {triggerType}</label>
                        <SearchableSelect 
                          value={triggerId} 
                          onChange={val => setTriggerId(String(val))}
                          placeholder={`Select ${triggerType.toLowerCase()}...`}
                          options={
                            triggerType === 'Product' ? (products?.map((p: any) => ({ value: p.id, label: p.product_name })) || []) :
                            triggerType === 'Brand' ? (brands?.map((b: any) => ({ value: b.id, label: b.brand_name })) || []) :
                            (categories?.map((c: any) => ({ value: c.id, label: c.category_name })) || [])
                          }
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-ink-700 mb-1.5">Channel</label>
                        <select className="w-full text-sm p-1.5 min-h-[36px] rounded-lg border border-border-subtle bg-white" value={channel} onChange={e => setChannel(e.target.value)}>
                          <option value="">Any</option>
                          <option value="Distributor">Distributor</option>
                          <option value="Wholesale">Wholesale</option>
                          <option value="Dealer">Dealer</option>
                          <option value="Retail">Retail</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-ink-700 mb-1.5">Min Qty</label>
                        <Input type="number" placeholder="0" value={minQty} onChange={e => setMinQty(e.target.value)} />
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-border-subtle mt-4">
                      <div className="flex gap-6 mb-3 pt-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" checked={freeItemType === 'Same'} onChange={() => setFreeItemType('Same')} className="text-brand-600 focus:ring-brand-600" />
                          <span className="font-medium text-ink-700">Same Product Free</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" checked={freeItemType === 'Different'} onChange={() => setFreeItemType('Different')} className="text-brand-600 focus:ring-brand-600" />
                          <span className="font-medium text-ink-700">Different Product</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-12 gap-4 items-end">
                        {freeItemType === 'Different' ? (
                          <div className="col-span-6">
                            <label className="block text-xs font-medium text-ink-700 mb-1.5">Free Product</label>
                            <SearchableSelect 
                              value={rewardProductId} 
                              onChange={val => setRewardProductId(String(val))}
                              placeholder="Choose Free Product"
                              options={products?.map((p: any) => ({ value: p.id, label: p.product_name })) || []}
                            />
                          </div>
                        ) : <div className="col-span-6" />}
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-ink-700 mb-1.5">Free Qty</label>
                          <Input type="number" placeholder="0" value={rewardQty} onChange={e => setRewardQty(e.target.value)} />
                        </div>
                        <div className="col-span-3">
                          <Button onClick={handleAddRule} variant="secondary" className="w-full h-9 rounded-lg flex items-center justify-center gap-2 text-ink-700 bg-white border border-border-subtle hover:bg-surface">
                            <Plus className="w-4 h-4"/> Add Rule
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {schemeType === 'PRICE_SLAB' && (
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-ink-700 mb-1.5">Channel</label>
                      <select className="w-full text-sm p-1.5 min-h-[36px] rounded-lg border border-border-subtle bg-white" value={channel} onChange={e => setChannel(e.target.value)}>
                        <option value="">Any</option>
                        <option value="Distributor">Distributor</option>
                        <option value="Wholesale">Wholesale</option>
                        <option value="Dealer">Dealer</option>
                        <option value="Retail">Retail</option>
                      </select>
                    </div>
                    <div className="col-span-9">
                      <label className="block text-xs font-medium text-ink-700 mb-1.5">Target Product</label>
                      <SearchableSelect 
                        value={triggerId} 
                        onChange={val => setTriggerId(String(val))}
                        placeholder="Select..."
                        options={products?.map((p: any) => ({ value: p.id, label: p.product_name })) || []}
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-ink-700 mb-1.5">Min Qty Trigger</label>
                      <Input type="number" placeholder="0" value={minQty} onChange={e => setMinQty(e.target.value)} />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-ink-700 mb-1.5">Special Net Rate (₹)</label>
                      <Input type="number" placeholder="0" value={specialPrice} onChange={e => setSpecialPrice(e.target.value)} />
                    </div>
                    <div className="col-span-4">
                      <Button onClick={handleAddRule} variant="secondary" className="w-full h-9 rounded-lg flex items-center justify-center gap-2 text-ink-700 bg-white border border-border-subtle hover:bg-surface">
                        <Plus className="w-4 h-4"/> Add Slab
                      </Button>
                    </div>
                  </div>
                )}
                
                {schemeType === 'COMBO' && (
                  <div className="space-y-4">
                    <div className="flex gap-3 items-end bg-white p-3 rounded-lg border border-border-subtle">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-ink-700 mb-1.5">Build Combo Group</label>
                        <SearchableSelect 
                          value={comboSelectedProduct} 
                          onChange={val => setComboSelectedProduct(String(val))}
                          placeholder="Select product to add..."
                          options={products?.map((p: any) => ({ value: p.id, label: p.product_name })) || []}
                        />
                      </div>
                      <Button onClick={handleAddComboProduct} variant="secondary" className="w-10 h-9 p-0 rounded-lg flex items-center justify-center shrink-0">
                        <Plus className="w-4 h-4 text-ink-600" />
                      </Button>
                    </div>

                    {comboProducts.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {comboProducts.map((p, i) => (
                          <div key={i} className="inline-flex items-center gap-2 bg-brand-50 border border-brand-100 text-brand-700 px-2.5 py-1 rounded-md text-xs">
                            {p.product_name}
                            <button onClick={() => setComboProducts(comboProducts.filter((_, idx) => idx !== i))} className="text-brand-400 hover:text-brand-700">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-12 gap-4 items-end pt-2 border-t border-border-subtle">
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-ink-700 mb-1.5">Channel</label>
                        <select className="w-full text-sm p-1.5 min-h-[36px] rounded-lg border border-border-subtle bg-white" value={channel} onChange={e => setChannel(e.target.value)}>
                          <option value="">Any</option>
                          <option value="Distributor">Distributor</option>
                          <option value="Dealer">Dealer</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-ink-700 mb-1.5">Min Qty</label>
                        <Input type="number" placeholder="0" value={minQty} onChange={e => setMinQty(e.target.value)} />
                      </div>
                      <div className="col-span-6">
                        <label className="block text-xs font-medium text-ink-700 mb-1.5">Free Product</label>
                        <div className="flex items-center gap-2">
                          <select className="w-1/3 text-sm p-1.5 min-h-[36px] rounded-lg border border-border-subtle bg-white" value={freeItemType} onChange={e => setFreeItemType(e.target.value as any)}>
                            <option value="Same">From Group</option>
                            <option value="Different">Different</option>
                          </select>
                          {freeItemType === 'Different' ? (
                            <div className="flex-1">
                              <SearchableSelect 
                                value={rewardProductId} 
                                onChange={val => setRewardProductId(String(val))}
                                placeholder="Choose Free"
                                options={products?.map((p: any) => ({ value: p.id, label: p.product_name })) || []}
                              />
                            </div>
                          ) : <div className="flex-1 text-xs text-ink-500 italic">User chooses from combo</div>}
                        </div>
                      </div>
                      <div className="col-span-6" />
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-ink-700 mb-1.5">Free Qty</label>
                        <Input type="number" placeholder="0" value={rewardQty} onChange={e => setRewardQty(e.target.value)} />
                      </div>
                      <div className="col-span-3">
                        <Button onClick={handleAddComboSlab} variant="secondary" className="w-full h-9 rounded-lg flex items-center justify-center gap-2 text-ink-700 bg-white border border-border-subtle hover:bg-surface">
                          <Plus className="w-4 h-4"/> Add Combo
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {schemeType === 'FLAT_MRP_DISCOUNT' && (
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-12">
                      <label className="block text-xs font-medium text-ink-700 mb-1.5">Target Customers (Global)</label>
                      <MultiSearchableSelect 
                        value={flatCustomers}
                        onChange={setFlatCustomers}
                        placeholder="Select customers..."
                        options={customers?.map((c: any) => ({ value: c.id, label: c.customer_name })) || []}
                      />
                    </div>
                    <div className="col-span-6">
                      <label className="block text-xs font-medium text-ink-700 mb-1.5">Target Brand</label>
                      <SearchableSelect 
                        value={flatBrand} 
                        onChange={val => setFlatBrand(String(val))}
                        placeholder="Select Brand"
                        options={brands?.map((b: any) => ({ value: b.id, label: b.brand_name })) || []}
                      />
                    </div>
                    <div className="col-span-6">
                      <label className="block text-xs font-medium text-ink-700 mb-1.5">Included Products (Optional)</label>
                      <MultiSearchableSelect 
                        value={flatProducts}
                        onChange={setFlatProducts}
                        placeholder="All if empty"
                        options={products?.map((p: any) => ({ value: p.id, label: p.product_name })) || []}
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-ink-700 mb-1.5">Min Qty</label>
                      <Input type="number" placeholder="0" value={minQty} onChange={e => setMinQty(e.target.value)} />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-ink-700 mb-1.5">Discount %</label>
                      <Input type="number" placeholder="0" value={specialPrice} onChange={e => setSpecialPrice(e.target.value)} />
                    </div>
                    <div className="col-span-4">
                      <Button onClick={handleAddRule} variant="secondary" className="w-full h-9 rounded-lg flex items-center justify-center gap-2 text-ink-700 bg-white border border-border-subtle hover:bg-surface">
                        <Plus className="w-4 h-4"/> Add Rule
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RULE CARDS */}
            {rules.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-semibold text-ink-900 mb-2">Configured Rules ({rules.length})</h4>
                {rules.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white border border-border-subtle rounded-xl hover:shadow-sm transition-shadow group relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-400" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                          {r.scheme_type.replace(/_/g, ' ')}
                        </span>
                        {r.channel_tier && <span className="text-xs text-ink-500">• {r.channel_tier}</span>}
                      </div>
                      <div className="text-sm text-ink-900 font-medium">
                        {r.scheme_type === 'PRICE_SLAB' ? (
                          <>Buy <span className="font-bold">{r.min_qty}</span> of {r.trigger_name}, rate is <span className="text-success-600 font-bold">₹{r.special_price}</span></>
                        ) : r.scheme_type === 'FLAT_MRP_DISCOUNT' ? (
                          <>Min <span className="font-bold">{r.min_qty}</span> on {r.trigger_name}, get <span className="text-success-600 font-bold">{r.special_price}% OFF</span></>
                        ) : r.scheme_type === 'COMBO' ? (
                          <>Buy <span className="font-bold">{r.min_qty}</span> from {r.trigger_name}, get <span className="font-bold">{r.reward_qty}</span> free</>
                        ) : (
                          <>Buy <span className="font-bold">{r.min_qty}</span> of {r.trigger_name}, get <span className="font-bold">{r.reward_qty}</span> free</>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setRules(rules.filter((_, idx) => idx !== i))} className="p-2 text-ink-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: REVIEW */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-5 text-center">
              <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-brand-900">Ready to Publish</h3>
              <p className="text-sm text-brand-600/80 mt-1">Review the scheme details below before saving.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-border-subtle rounded-xl p-5">
                <h4 className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-4">Basic Details</h4>
                <div className="grid grid-cols-2 gap-y-4">
                  <div>
                    <div className="text-xs text-ink-500">Name</div>
                    <div className="text-sm font-medium text-ink-900">{schemeName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-500">Status</div>
                    <div className="text-sm font-medium text-ink-900">{isActive ? 'Active' : 'Inactive'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-500">Duration</div>
                    <div className="text-sm font-medium text-ink-900">{startDate} to {noExpiry ? 'No Expiry' : endDate}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-ink-500">Description</div>
                    <div className="text-sm font-medium text-ink-900">{description || '—'}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-border-subtle rounded-xl p-5">
                <h4 className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-4">Configured Rules ({rules.length})</h4>
                <div className="space-y-3">
                  {rules.map((r, i) => (
                    <div key={i} className="text-sm text-ink-800 pb-3 border-b border-border-subtle last:border-0 last:pb-0">
                      <span className="font-semibold text-ink-900">{i+1}. </span> 
                      {r.scheme_type === 'PRICE_SLAB' ? (
                        <>Buy <span className="font-medium">{r.min_qty}</span> of {r.trigger_name} at rate <span className="text-success-600 font-medium">₹{r.special_price}</span></>
                      ) : r.scheme_type === 'FLAT_MRP_DISCOUNT' ? (
                        <>Min <span className="font-medium">{r.min_qty}</span> on {r.trigger_name}, get <span className="text-success-600 font-medium">{r.special_price}% OFF</span></>
                      ) : (
                        <>Buy <span className="font-medium">{r.min_qty}</span> of {r.trigger_name}, get <span className="font-medium">{r.reward_qty}</span> free</>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  )
}
