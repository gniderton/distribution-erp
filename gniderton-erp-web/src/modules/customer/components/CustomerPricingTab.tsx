import { useState } from 'react'
import { useCustomerPricing, useSetCustomerPricing } from '../hooks'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function CustomerPricingTab({ customerId }: { customerId: string | number }) {
  const { data: pricingRules, isLoading } = useCustomerPricing(customerId)
  const setPricing = useSetCustomerPricing()
  
  const [brandId, setBrandId] = useState('')
  const [channelId, setChannelId] = useState('')

  if (isLoading) {
    return <div className="p-8 text-center text-ink-500 animate-pulse">Loading pricing rules...</div>
  }

  const rules = Array.isArray(pricingRules) ? pricingRules : pricingRules?.rules || []

  const handleAddRule = async () => {
    if (!brandId || !channelId) {
      toast.error('Please fill in both fields')
      return
    }
    
    try {
      await setPricing.mutateAsync({
        id: customerId,
        payload: {
          brand_id: parseInt(brandId),
          channel_id: parseInt(channelId)
        }
      })
      toast.success('Pricing rule added!')
      setBrandId('')
      setChannelId('')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add rule')
    }
  }

  const handleDeleteRule = async (ruleId: number) => {
    // In a real app, you'd likely have a specific delete endpoint, 
    // or you just set the discount to 0 to remove it, or there's a dedicated hook.
    // For now we'll just show a toast as this depends on the backend delete implementation.
    toast.error('Delete functionality requires backend DELETE endpoint which takes rule ID.')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-ink-900">Special Pricing</h3>
          <p className="text-sm text-ink-500 mt-1">Assign custom brand-level discounts for this customer.</p>
        </div>
      </div>
      
      {/* Add New Rule Form */}
      <div className="bg-white p-4 rounded-xl border border-border flex items-end gap-4 shadow-sm">
        <div className="flex-1">
          <Label>Brand ID</Label>
          <Input 
            type="number" 
            placeholder="e.g. 1" 
            value={brandId} 
            onChange={(e) => setBrandId(e.target.value)} 
          />
        </div>
        <div className="flex-1">
          <Label>Channel ID</Label>
          <Input 
            type="number" 
            placeholder="e.g. 2" 
            value={channelId} 
            onChange={(e) => setChannelId(e.target.value)} 
          />
        </div>
        <Button onClick={handleAddRule} loading={setPricing.isPending} className="mb-[2px]">
          <Plus className="w-4 h-4 mr-2" /> Add Rule
        </Button>
      </div>

      <DataTable 
        data={rules}
        emptyTitle="No custom pricing"
        emptyDescription="This customer uses standard system pricing."
        columns={[
          { accessorKey: 'brand_name', header: 'Brand' },
          { accessorKey: 'override_channel', header: 'Assigned Channel', cell: c => <span className="font-medium text-brand-600">{c.getValue() as string}</span> },
          { 
            id: 'actions', 
            header: '', 
            cell: ({ row }) => (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => handleDeleteRule((row.original as any).id)} className="text-danger-600 hover:text-danger-700 hover:bg-danger-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ) 
          }
        ]}
      />
    </div>
  )
}
