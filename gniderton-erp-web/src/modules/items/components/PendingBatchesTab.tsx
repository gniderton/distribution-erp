import { useState, useMemo } from 'react'
import { useAllBatches, useBulkUpdateBatches, useProducts } from '../hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import { Save, AlertCircle } from 'lucide-react'

export function PendingBatchesTab() {
  const { data: allBatches, isLoading: batchesLoading } = useAllBatches()
  const { data: products, isLoading: productsLoading } = useProducts()
  const bulkUpdateMutation = useBulkUpdateBatches()

  const [edits, setEdits] = useState<Record<number, { batch_code: string; expiry_date: string }>>({})

  // Filter batches to only show those that are "UNKNOWN", "PENDING", or missing expiry
  const pendingBatches = useMemo(() => {
    if (!allBatches || !products) return []
    return allBatches
      .filter((b: any) => !b.batch_code || b.batch_code === 'UNKNOWN' || b.batch_code === 'PENDING' || !b.expiry_date)
      .map((b: any) => {
        const p = products.find((prod: any) => prod.id === b.product_id)
        return {
          ...b,
          product_name: p ? p.name : 'Unknown Product'
        }
      })
  }, [allBatches, products])

  const handleEdit = (batchId: number, field: 'batch_code' | 'expiry_date', value: string) => {
    setEdits(prev => ({
      ...prev,
      [batchId]: {
        ...(prev[batchId] || { 
          batch_code: pendingBatches.find((b: any) => b.id === batchId)?.batch_code || '', 
          expiry_date: pendingBatches.find((b: any) => b.id === batchId)?.expiry_date?.split('T')[0] || ''
        }),
        [field]: value
      }
    }))
  }

  const handleSaveAll = async () => {
    const batchesToUpdate = Object.keys(edits).map(id => ({
      id: parseInt(id, 10),
      batch_code: edits[parseInt(id, 10)].batch_code,
      expiry_date: edits[parseInt(id, 10)].expiry_date || null
    }))

    if (batchesToUpdate.length === 0) {
      toast.error('No changes to save')
      return
    }

    try {
      await bulkUpdateMutation.mutateAsync({ batches: batchesToUpdate })
      toast.success('Successfully updated pending batches')
      setEdits({})
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update batches')
    }
  }

  if (batchesLoading || productsLoading) {
    return <div className="p-8 text-center text-ink-500">Loading pending batches...</div>
  }

  if (pendingBatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-ink-500">
        <AlertCircle className="w-12 h-12 mb-4 text-success-500" />
        <h3 className="text-lg font-medium text-ink-900">All Caught Up!</h3>
        <p className="mt-1 text-sm">There are no pending batches missing information.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-warning-50 p-4 rounded-lg border border-warning-200">
        <div className="flex items-start space-x-3 text-warning-800">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div>
            <h3 className="font-semibold">Action Required: {pendingBatches.length} Incomplete Batches</h3>
            <p className="text-sm mt-1">These batches were created with missing information (likely during GRN). Update their codes and expiry dates below.</p>
          </div>
        </div>
        <Button 
          variant="primary" 
          onClick={handleSaveAll}
          loading={bulkUpdateMutation.isPending}
          disabled={Object.keys(edits).length === 0}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes ({Object.keys(edits).length})
        </Button>
      </div>

      <div className="glass-card bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm divide-y divide-border-subtle">
            <thead className="bg-ink-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-ink-600">Product</th>
                <th className="px-4 py-3 font-semibold text-ink-600">Current Qty</th>
                <th className="px-4 py-3 font-semibold text-ink-600">Purchase Rate</th>
                <th className="px-4 py-3 font-semibold text-ink-600 w-64">Batch Code</th>
                <th className="px-4 py-3 font-semibold text-ink-600 w-48">Expiry Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {pendingBatches.map((batch: any) => (
                <tr key={batch.id} className="hover:bg-ink-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">{batch.product_name}</div>
                    <div className="text-xs text-ink-500">Batch ID: {batch.id}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">{batch.quantity_remaining}</td>
                  <td className="px-4 py-3 font-medium">₹{Number(batch.purchase_rate).toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <Input 
                      value={edits[batch.id]?.batch_code !== undefined ? edits[batch.id].batch_code : (batch.batch_code === 'UNKNOWN' || batch.batch_code === 'PENDING' ? '' : batch.batch_code)}
                      onChange={(e) => handleEdit(batch.id, 'batch_code', e.target.value)}
                      placeholder="Enter Batch Code"
                      className="bg-white"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input 
                      type="date"
                      value={edits[batch.id]?.expiry_date !== undefined ? edits[batch.id].expiry_date : (batch.expiry_date ? batch.expiry_date.split('T')[0] : '')}
                      onChange={(e) => handleEdit(batch.id, 'expiry_date', e.target.value)}
                      className="bg-white"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
