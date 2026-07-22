import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { DataTable } from '@/components/shared/DataTable'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerApi } from '../api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CheckCircle2, XCircle, PlusCircle } from 'lucide-react'

export function CustomerVerifyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  
  const { data, isLoading } = useQuery({
    queryKey: ['customers', 'pending'],
    queryFn: () => customerApi.pendingVerification()
  })

  // Queries for the assignment form
  const { data: channels } = useQuery({ queryKey: ['channels'], queryFn: customerApi.channels, enabled: open })
  const { data: routes } = useQuery({ queryKey: ['routes'], queryFn: customerApi.routes, enabled: open })
  const { data: routeTypes } = useQuery({ queryKey: ['routeTypes'], queryFn: customerApi.routeTypes, enabled: open })

  const [assigningRow, setAssigningRow] = useState<any>(null)

  const approveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload?: any }) => customerApi.approveVerification(id, payload),
    onSuccess: () => {
      setAssigningRow(null)
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
      id: 'type',
      header: 'Type',
      cell: ({ row }: any) => {
        const isNew = !row.original.customer_id;
        return isNew ? <Badge tone="neutral">NEW</Badge> : <Badge tone="brand">UPDATE</Badge>;
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => {
        const isNew = !row.original.customer_id;
        return (
          <div className="flex gap-2">
            {isNew ? (
              <Button 
                size="sm" 
                variant="secondary"
                className="text-brand-600 border-brand-200 hover:bg-brand-50"
                onClick={() => setAssigningRow(row.original)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                <PlusCircle className="w-4 h-4 mr-1" /> Assign & Verify
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="secondary"
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                onClick={() => approveMutation.mutate({ id: row.original.id })}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Verify
              </Button>
            )}
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
        )
      },
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

      {assigningRow && (
        <AssignDetailsModal 
          row={assigningRow}
          onClose={() => setAssigningRow(null)}
          onConfirm={(payload: any) => approveMutation.mutate({ id: assigningRow.id, payload })}
          isPending={approveMutation.isPending}
          channels={Array.isArray(channels) ? channels : channels?.data || []}
          routes={Array.isArray(routes) ? routes : routes?.data || []}
          routeTypes={Array.isArray(routeTypes) ? routeTypes : routeTypes?.data || []}
        />
      )}
    </Dialog>
  )
}

function AssignDetailsModal({ row, onClose, onConfirm, isPending, channels, routes, routeTypes }: any) {
  const [routeId, setRouteId] = useState('')
  const [channelId, setChannelId] = useState('')
  const [routeTypeId, setRouteTypeId] = useState('')
  const [creditLimit, setCreditLimit] = useState(0)
  const [creditDays, setCreditDays] = useState(0)

  const handleSubmit = () => {
    onConfirm({
      route_id: routeId || null,
      channel_id: channelId || null,
      route_type_id: routeTypeId || null,
      credit_limit: creditLimit,
      credit_days: creditDays
    })
  }

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
      <Button onClick={handleSubmit} disabled={isPending || !routeId || !channelId}>
        {isPending ? 'Verifying...' : 'Assign & Verify'}
      </Button>
    </>
  )

  return (
    <Dialog open={true} onClose={onClose} title="Assign Customer Details" footer={footer} widthClass="max-w-md">
      <div className="space-y-4 mt-4">
        <div className="bg-surface p-3 rounded-lg border border-border-subtle text-sm">
          You are verifying a new customer: <strong>{row.proposed_customer_name || row.customer_name}</strong>.
          <br/>Please assign the following details before approval.
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-700">Route <span className="text-rose-500">*</span></label>
          <select className="w-full h-10 px-3 rounded-md border border-border bg-white" value={routeId} onChange={e => setRouteId(e.target.value)}>
            <option value="">Select Route...</option>
            {routes.map((r: any) => <option key={r.id} value={r.id}>{r.route_name}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-700">Channel <span className="text-rose-500">*</span></label>
          <select className="w-full h-10 px-3 rounded-md border border-border bg-white" value={channelId} onChange={e => setChannelId(e.target.value)}>
            <option value="">Select Channel...</option>
            {channels.map((c: any) => <option key={c.id} value={c.id}>{c.channel_name}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink-700">Route Type / Frequency</label>
          <select className="w-full h-10 px-3 rounded-md border border-border bg-white" value={routeTypeId} onChange={e => setRouteTypeId(e.target.value)}>
            <option value="">Select Frequency...</option>
            {routeTypes.map((t: any) => <option key={t.id} value={t.id}>{t.type_name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-700">Credit Limit (₹)</label>
            <input type="number" className="w-full h-10 px-3 rounded-md border border-border bg-white" value={creditLimit} onChange={e => setCreditLimit(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-700">Credit Days</label>
            <input type="number" className="w-full h-10 px-3 rounded-md border border-border bg-white" value={creditDays} onChange={e => setCreditDays(Number(e.target.value))} />
          </div>
        </div>
      </div>
    </Dialog>
  )
}
