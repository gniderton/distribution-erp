import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { DataTable } from '@/components/shared/DataTable'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerApi } from '../api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CheckCircle2, XCircle } from 'lucide-react'

export function CustomerVerifyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  
  // Use the specific pending verification endpoint, or just filter customers if not working
  const { data, isLoading } = useQuery({
    queryKey: ['customers', 'pending'],
    queryFn: () => customerApi.list().then(res => res.filter(c => c.verification_status?.toLowerCase() === 'pending'))
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: any }) => 
      customerApi.update(id, { verification_status: status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customers', 'pending'] })
    }
  })

  const columns = [
    { accessorKey: 'customer_name', header: 'Customer', cell: (c: any) => <span className="font-semibold text-ink-900">{c.getValue() as string}</span> },
    { accessorKey: 'customer_phone', header: 'Phone', cell: (c: any) => c.getValue() || '—' },
    { accessorKey: 'route_name', header: 'Route', cell: (c: any) => c.getValue() || '—' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="secondary"
            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            onClick={() => updateMutation.mutate({ id: row.original.id, status: 'verified' })}
            disabled={updateMutation.isPending}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" /> Verify
          </Button>
          <Button 
            size="sm" 
            variant="secondary"
            className="text-rose-600 border-rose-200 hover:bg-rose-50"
            onClick={() => updateMutation.mutate({ id: row.original.id, status: 'rejected' })}
            disabled={updateMutation.isPending}
          >
            <XCircle className="w-4 h-4 mr-1" /> Reject
          </Button>
        </div>
      ),
    }
  ]

  const footer = (
    <Button variant="secondary" onClick={onClose}>Close</Button>
  )

  return (
    <Dialog open={open} onClose={onClose} title="Verify Customers" footer={footer} widthClass="max-w-4xl">
      <div className="mt-2">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-border">
          <DataTable
            data={data || []}
            columns={columns}
            isLoading={isLoading}
            emptyTitle="No Pending Verifications"
            emptyDescription="All customers have been verified!"
          />
        </div>
      </div>
    </Dialog>
  )
}
