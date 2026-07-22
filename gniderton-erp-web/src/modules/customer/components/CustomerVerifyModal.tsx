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
  
  const { data, isLoading } = useQuery({
    queryKey: ['customers', 'pending'],
    queryFn: () => customerApi.pendingVerification()
  })

  const approveMutation = useMutation({
    mutationFn: (id: string | number) => customerApi.approveVerification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customers', 'pending'] })
    }
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string | number) => customerApi.rejectVerification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', 'pending'] })
    }
  })

  const columns = [
    { accessorKey: 'customer_name', header: 'Customer', cell: (c: any) => <span className="font-semibold text-ink-900">{c.getValue() as string}</span> },
    { accessorKey: 'customer_phone', header: 'Phone', cell: (c: any) => c.getValue() || '—' },
    { accessorKey: 'gstin', header: 'GST No', cell: (c: any) => <span className="font-mono-figures text-xs">{c.getValue() as string || '—'}</span> },
    { id: 'location', header: 'Location', cell: ({ row }: any) => {
      const lat = row.original.latitude;
      const lng = row.original.longitude;
      if (lat && lng) return <span className="font-mono-figures text-xs">{lat}, {lng}</span>;
      return '—';
    }},
    { accessorKey: 'dse_name', header: 'DSE', cell: (c: any) => c.getValue() || '—' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="secondary"
            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            onClick={() => approveMutation.mutate(row.original.id)}
            disabled={approveMutation.isPending || rejectMutation.isPending}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" /> Verify
          </Button>
          <Button 
            size="sm" 
            variant="secondary"
            className="text-rose-600 border-rose-200 hover:bg-rose-50"
            onClick={() => rejectMutation.mutate(row.original.id)}
            disabled={approveMutation.isPending || rejectMutation.isPending}
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
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-border-subtle">
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
