import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { DataTable } from '@/components/shared/DataTable'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerApi } from '../api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CheckCircle2, XCircle, PlusCircle } from 'lucide-react'

import { CustomerDetailsTab } from './CustomerDetailsTab'

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
    { accessorFn: (row: any) => row.proposed_customer_name || row.customer_name || '—', id: 'customer_name', header: 'Customer', cell: (info: any) => <span className="font-semibold text-ink-900">{info.getValue()}</span> },
    { accessorFn: (row: any) => row.proposed_phone || row.customer_phone || '—', id: 'customer_phone', header: 'Phone', cell: (info: any) => info.getValue() },
    { accessorFn: (row: any) => row.proposed_gstin || row.gstin || '—', id: 'gstin', header: 'GST No', cell: (info: any) => <span className="font-mono-figures text-xs">{info.getValue()}</span> },
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
                className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200"
                onClick={() => setAssigningRow(row.original)}
                loading={approveMutation.isPending && row.original.id === assigningRow?.id}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                <PlusCircle className="w-4 h-4 mr-1" /> Assign & Verify
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="secondary" 
                className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200"
                onClick={() => approveMutation.mutate({ id: row.original.id })}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                loading={approveMutation.isPending && !assigningRow}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Verify
              </Button>
            )}
            <Button 
              size="sm" 
              variant="secondary" 
              className="bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200"
              onClick={() => rejectMutation.mutate(row.original.id)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              loading={rejectMutation.isPending}
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
    <>
      <Dialog open={open && !assigningRow} onClose={onClose} title="Verify Customers" footer={footer} widthClass="max-w-4xl">
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

      {assigningRow && (
        <Dialog open={true} onClose={() => setAssigningRow(null)} title={assigningRow.customer_id ? "Verify Customer Update" : "Verify New Customer"} widthClass="max-w-4xl">
          <div className="p-1 -m-6 bg-white rounded-b-xl overflow-hidden">
            <CustomerDetailsTab 
              customer={{
                id: assigningRow.customer_id,
                customer_name: assigningRow.proposed_customer_name || assigningRow.customer_name || '',
                customer_phone: assigningRow.proposed_phone || assigningRow.customer_phone || '',
                gstin: assigningRow.proposed_gstin || assigningRow.gstin || '',
                dse_id: assigningRow.dse_id,
                route_id: assigningRow.route_id,
                channel_id: assigningRow.channel_id,
                route_type_id: assigningRow.route_type_id,
                credit_limit: assigningRow.credit_limit || 0,
                credit_days: assigningRow.credit_days || 0,
                addresses: [{
                  address_line1: '',
                  address_line2: '',
                  city: '',
                  state: '',
                  pincode: '',
                  location_lat: assigningRow.latitude || '',
                  location_lng: assigningRow.longitude || '',
                  is_default_billing: true,
                  is_default_shipping: true
                }]
              } as any}
              onClose={() => setAssigningRow(null)}
              submitLabel="Verify & Save"
              onSuccessCreate={(newCustomer: any) => {
                approveMutation.mutate({ id: assigningRow.id, payload: { customer_id: newCustomer.id } })
              }}
            />
          </div>
        </Dialog>
      )}
    </>
  )
}

// AssignDetailsModal has been replaced by the full CustomerDetailsTab form.
