import { useState, useMemo, useEffect } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAllBatches, useBulkUpdateBatches, useProducts } from '@/modules/items/hooks'
import toast from 'react-hot-toast'
import { Save, AlertCircle } from 'lucide-react'

export function GRNBatchUpdateModal({ open, onClose, grnId, poNumber }: { open: boolean, onClose: () => void, grnId: number, poNumber: string }) {
  const { data: allBatches, isLoading: batchesLoading } = useAllBatches()
  const { data: products, isLoading: productsLoading } = useProducts()
  const bulkUpdateMutation = useBulkUpdateBatches()

  const [edits, setEdits] = useState<Record<number, { batch_code: string; expiry_date: string }>>({})

  // Find batches associated with this GRN
  const grnBatches = useMemo(() => {
    if (!allBatches || !products || !grnId) return []
    return allBatches
      .filter((b: any) => b.grn_id === grnId)
      .map((b: any) => {
        const p = products.find((prod: any) => prod.id === b.product_id)
        return {
          ...b,
          product_name: p ? (p.product_name || p.name) : 'Unknown Product',
          is_placeholder: !b.batch_code || b.batch_code === 'UNKNOWN' || b.batch_code === 'PENDING' || !b.expiry_date
        }
      })
  }, [allBatches, products, grnId])

  // Pre-fill edits for placeholder batches
  useEffect(() => {
    if (grnBatches.length > 0) {
      const initialEdits: Record<number, { batch_code: string; expiry_date: string }> = {}
      grnBatches.forEach((b: any) => {
        initialEdits[b.id] = {
          batch_code: b.batch_code === 'UNKNOWN' || b.batch_code === 'PENDING' ? '' : b.batch_code,
          expiry_date: b.expiry_date ? b.expiry_date.split('T')[0] : ''
        }
      })
      setEdits(initialEdits)
    }
  }, [grnBatches])

  const handleEdit = (batchId: number, field: 'batch_code' | 'expiry_date', value: string) => {
    setEdits(prev => ({
      ...prev,
      [batchId]: {
        ...(prev[batchId] || { batch_code: '', expiry_date: '' }),
        [field]: value
      }
    }))
  }

  const handleSave = async () => {
    const batchesToUpdate = Object.keys(edits).map(id => ({
      id: parseInt(id, 10),
      batch_code: edits[parseInt(id, 10)].batch_code,
      expiry_date: edits[parseInt(id, 10)].expiry_date || null
    })).filter(b => b.batch_code || b.expiry_date) // Only send ones that have actual values

    if (batchesToUpdate.length === 0) {
      toast.error('No changes to save')
      return
    }

    try {
      await bulkUpdateMutation.mutateAsync({ batches: batchesToUpdate })
      toast.success('Successfully updated batches for GRN')
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update batches')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Update Batches for GRN (PO: ${poNumber || '-'})`} widthClass="max-w-4xl">
      <div className="space-y-4">
        {batchesLoading || productsLoading ? (
          <div className="p-8 text-center text-ink-500">Loading batches...</div>
        ) : grnBatches.length === 0 ? (
          <div className="p-8 text-center text-ink-500">No batches found for this GRN.</div>
        ) : (
          <>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-blue-800 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                Update the batch codes and expiry dates for the items received in this shipment. 
                Any row with a <span className="font-semibold text-rose-600">red tag</span> indicates it was created as a placeholder.
              </div>
            </div>

            <div className="border border-border-subtle rounded-xl overflow-hidden bg-white shadow-sm max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-sm divide-y divide-border-subtle">
                <thead className="bg-surface sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-ink-600">Product</th>
                    <th className="px-4 py-3 font-semibold text-ink-600">Qty</th>
                    <th className="px-4 py-3 font-semibold text-ink-600 w-48">Batch Code</th>
                    <th className="px-4 py-3 font-semibold text-ink-600 w-40">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {grnBatches.map((batch: any) => (
                    <tr key={batch.id} className={batch.is_placeholder ? "bg-rose-50/30 hover:bg-rose-50/50" : "hover:bg-ink-50/50"}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink-900 flex items-center gap-2">
                          {batch.product_name}
                          {batch.is_placeholder && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                              Placeholder
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-ink-500">MRP: ₹{Number(batch.mrp).toFixed(2)}</div>
                      </td>
                      <td className="px-4 py-3 font-medium">{batch.quantity_initial}</td>
                      <td className="px-4 py-2">
                        <Input 
                          value={edits[batch.id]?.batch_code !== undefined ? edits[batch.id].batch_code : ''}
                          onChange={(e) => handleEdit(batch.id, 'batch_code', e.target.value)}
                          placeholder="Batch Code"
                          className="bg-white border-border-subtle hover:border-brand-300 focus:border-brand-400 text-sm h-8"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input 
                          type="date"
                          value={edits[batch.id]?.expiry_date !== undefined ? edits[batch.id].expiry_date : ''}
                          onChange={(e) => handleEdit(batch.id, 'expiry_date', e.target.value)}
                          className="bg-white border-border-subtle hover:border-brand-300 focus:border-brand-400 text-sm h-8 text-ink-600"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} loading={bulkUpdateMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Save Batch Information
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
