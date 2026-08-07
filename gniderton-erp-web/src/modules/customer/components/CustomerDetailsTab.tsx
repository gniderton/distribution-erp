import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Input, Label, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Edit2 } from 'lucide-react'
import { useCreateCustomer, useUpdateCustomer } from '../hooks'
import { customerApi } from '../api'
import type { Customer } from '../types'

const schema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().optional(),
  email: z.string().optional(),
  whatsapp_number: z.string().optional(),
  is_active: z.boolean().optional(),
  
  gstin: z.string().optional(),
  pan: z.string().optional(),
  credit_limit: z.number().optional(),
  credit_days: z.number().optional(),
  channel_id: z.string().optional(),
  default_price_tier: z.string().optional(),
  
  route_id: z.string().optional(),
  dse_id: z.string().optional(),
  route_type_id: z.string().optional(),
  route_sequence: z.number().optional(),
  
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  location_lat: z.string().optional(),
  location_lng: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const STATES = ['Kerala', 'Tamil Nadu', 'Karnataka', 'Maharashtra']
const KERALA_DISTRICTS = ['Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod']

export function CustomerDetailsTab({ customer, onClose, onSuccessCreate, submitLabel }: { customer?: Customer | null; onClose: () => void; onSuccessCreate?: (data: any) => void; submitLabel?: string }) {
  const isEdit = !!customer?.id 
  const [isEditing, setIsEditing] = useState(!isEdit) 
  
  const create = useCreateCustomer()
  const update = useUpdateCustomer()
  
  const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: customerApi.channels })
  const { data: routes = [] } = useQuery({ queryKey: ['routes'], queryFn: customerApi.routes })
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: customerApi.employees })
  const { data: routeTypes = [] } = useQuery({ queryKey: ['routeTypes'], queryFn: customerApi.routeTypes })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { 
      customer_name: '', customer_phone: '', email: '', whatsapp_number: '', is_active: true,
      gstin: '', pan: '', credit_limit: 0, credit_days: 0, channel_id: '', default_price_tier: '',
      route_id: '', dse_id: '', route_type_id: '', route_sequence: 0,
      address_line1: '', address_line2: '', city: '', state: '', pincode: '', location_lat: '', location_lng: ''
    },
  })

  useEffect(() => {
    if (customer) {
      reset({
        customer_name: customer.customer_name ?? '',
        customer_phone: customer.customer_phone ?? '',
        email: customer.email ?? '',
        whatsapp_number: customer.whatsapp_number ?? '',
        is_active: customer.is_active ?? true,
        
        gstin: customer.gstin ?? '',
        pan: customer.pan ?? '',
        credit_limit: customer.credit_limit ?? 0,
        credit_days: customer.credit_days ?? 0,
        channel_id: customer.channel_id?.toString() ?? '',
        default_price_tier: customer.default_price_tier ?? '',
        
        route_id: customer.route_id?.toString() ?? '',
        dse_id: customer.dse_id?.toString() ?? '',
        route_type_id: customer.route_type_id?.toString() ?? '',
        route_sequence: customer.route_sequence ?? 0,
        
        address_line1: customer.addresses?.[0]?.address_line1 ?? (customer as any).address_line1 ?? (customer as any).Default_Address?.address_line1 ?? '',
        address_line2: customer.addresses?.[0]?.address_line2 ?? (customer as any).address_line2 ?? (customer as any).Default_Address?.address_line2 ?? '',
        city: customer.addresses?.[0]?.city ?? (customer as any).city ?? (customer as any).Default_Address?.city ?? '',
        state: customer.addresses?.[0]?.state ?? (customer as any).state ?? (customer as any).Default_Address?.state ?? '',
        pincode: customer.addresses?.[0]?.pincode ?? (customer as any).pincode ?? (customer as any).Default_Address?.pincode ?? '',
        location_lat: customer.addresses?.[0]?.location_lat ?? (customer as any).location_lat ?? (customer as any).Default_Address?.location_lat ?? '',
        location_lng: customer.addresses?.[0]?.location_lng ?? (customer as any).location_lng ?? (customer as any).Default_Address?.location_lng ?? '',
      })
    }
  }, [customer, reset])

  async function onSubmit(values: FormValues) {
    if (isEdit && customer) {
      // Backend expects nested structure for PUT updates matching Appsmith form
      const payload = {
        Basic_Info: {
          customer_name: values.customer_name,
          whatsapp_number: values.whatsapp_number,
          email: values.email,
          is_active: values.is_active
        },
        Tax_and_Accounting: {
          gstin: values.gstin,
          pan: values.pan,
          credit_limit: values.credit_limit,
          credit_days: values.credit_days,
          channel_id: values.channel_id,
          default_price_tier: values.default_price_tier
        },
        Logistics_Assignment: {
          route_id: values.route_id,
          dse_id: values.dse_id,
          route_type_id: values.route_type_id,
          route_sequence: values.route_sequence
        },
        Default_Address: {
          address_line1: values.address_line1,
          address_line2: values.address_line2,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
          location_lat: values.location_lat,
          location_lng: values.location_lng
        }
      }
      await update.mutateAsync({ id: customer.id, payload })
      if (onSuccessCreate) {
        onSuccessCreate({ id: customer.id })
        return
      }
    } else {
      // Backend expects flattened structure for POST creates
      const payload = {
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        email: values.email,
        whatsapp_number: values.whatsapp_number,
        is_active: values.is_active,
        gstin: values.gstin,
        pan: values.pan,
        credit_limit: values.credit_limit,
        credit_days: values.credit_days,
        channel_id: values.channel_id,
        route_id: values.route_id,
        dse_id: values.dse_id,
        route_type_id: values.route_type_id,
        addresses: [{
          address_line1: values.address_line1,
          address_line2: values.address_line2,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
          location_lat: values.location_lat,
          location_lng: values.location_lng,
          is_default_billing: true,
          is_default_shipping: true
        }]
      }
      const newCustomer = await create.mutateAsync(payload)
      if (onSuccessCreate) {
        onSuccessCreate(newCustomer)
        return
      }
    }
    onClose()
  }

  const saving = create.isPending || update.isPending

  return (
    <form className="max-w-4xl" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-white">
        <h3 className="font-semibold text-ink-900">{isEdit ? 'Customer Profile' : (submitLabel || 'New Customer Profile')}</h3>
        <div className="flex gap-3">
          {isEdit && !isEditing && (
            <Button variant="secondary" onClick={() => setIsEditing(true)} type="button">
              <Edit2 className="w-4 h-4 mr-2" /> Edit Details
            </Button>
          )}
          {(!isEdit || isEditing) && <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>}
          {(!isEdit || isEditing) && <Button loading={saving} type="submit">{submitLabel || (isEdit ? 'Save Changes' : 'Create Customer')}</Button>}
        </div>
      </div>
      
      <fieldset disabled={!isEditing} className="p-6 space-y-8 bg-surface overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        
        {/* Basic Info */}
        <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm space-y-4">
          <h4 className="text-sm font-semibold text-ink-900 border-b border-border-subtle pb-2">Basic Info</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Customer Name <span className="text-danger-500">*</span></Label>
              <Input {...register('customer_name')} placeholder="e.g. Sunrise General Store" />
              {errors.customer_name && <p className="text-[10px] text-danger-600 mt-1">{errors.customer_name.message}</p>}
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input {...register('customer_phone')} placeholder="Primary contact" />
            </div>
            <div>
              <Label>WhatsApp Number</Label>
              <Input {...register('whatsapp_number')} placeholder="For automated messages" />
            </div>
            <div>
              <Label>Email Address</Label>
              <Input {...register('email')} type="email" placeholder="contact@example.com" />
            </div>
            <div className="flex items-center gap-2 pt-2 md:col-span-2">
              <input type="checkbox" id="is_active" {...register('is_active')} className="rounded border-border-subtle text-brand-600 focus:ring-brand-500" />
              <Label htmlFor="is_active" className="mb-0">Active Customer</Label>
            </div>
          </div>
        </div>

        {/* Tax & Accounting */}
        <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm space-y-4">
          <h4 className="text-sm font-semibold text-ink-900 border-b border-border-subtle pb-2">Tax & Accounting</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>GSTIN</Label>
              <Input {...register('gstin')} placeholder="29XXXXX0000X1Z5" />
            </div>
            <div>
              <Label>PAN</Label>
              <Input {...register('pan')} placeholder="ABCDE1234F" />
            </div>
            <div>
              <Label>Credit Limit (₹)</Label>
              <Input type="number" {...register('credit_limit', { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Credit Days</Label>
              <Input type="number" {...register('credit_days', { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Channel</Label>
              <Select {...register('channel_id')}>
                <option value="">Select Channel...</option>
                {channels.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.channel_name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Default Price Tier</Label>
              <Input {...register('default_price_tier')} placeholder="e.g. Dealer" />
            </div>
          </div>
        </div>

        {/* Logistics Assignment */}
        <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm space-y-4">
          <h4 className="text-sm font-semibold text-ink-900 border-b border-border-subtle pb-2">Logistics Assignment</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Route</Label>
              <Select {...register('route_id')}>
                <option value="">Select Route...</option>
                {routes.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.route_name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>DSE (Delivery Executive)</Label>
              <Select {...register('dse_id')}>
                <option value="">Select Executive...</option>
                {employees.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Route Type / Frequency</Label>
              <Select {...register('route_type_id')}>
                <option value="">Select Frequency...</option>
                {routeTypes.map((rt: any) => (
                  <option key={rt.id} value={rt.id}>{rt.frequency_name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Route Sequence</Label>
              <Input type="number" {...register('route_sequence', { valueAsNumber: true })} />
            </div>
          </div>
        </div>

        {/* Default Address */}
        <div className="bg-white p-5 rounded-xl border border-border-subtle shadow-sm space-y-4">
          <h4 className="text-sm font-semibold text-ink-900 border-b border-border-subtle pb-2">Default Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Address Line 1</Label>
              <Input {...register('address_line1')} placeholder="Building/Shop No., Street Name" />
            </div>
            <div className="md:col-span-2">
              <Label>Address Line 2</Label>
              <Input {...register('address_line2')} placeholder="Landmark, Area" />
            </div>
            <div>
              <Label>State</Label>
              <Select {...register('state')}>
                <option value="">Select State...</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <Label>City / District</Label>
              <Select {...register('city')}>
                <option value="">Select City/District...</option>
                {KERALA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </Select>
            </div>
            <div>
              <Label>Pincode</Label>
              <Input {...register('pincode')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Latitude</Label>
                <Input {...register('location_lat')} placeholder="e.g. 11.25875" />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input {...register('location_lng')} placeholder="e.g. 75.78041" />
              </div>
            </div>
          </div>
        </div>

      </fieldset>
    </form>
  )
}
