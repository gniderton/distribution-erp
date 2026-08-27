import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { useQuery } from '@tanstack/react-query'
import { assetsApi } from '../api'
import { DataTable } from '@/components/shared/DataTable'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { Building2, Mail, Phone, MapPin, Hash, Briefcase } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  vendor: any
}

export function AssetVendorProfileDrawer({ open, onClose, vendor }: Props) {
  const { data: ledger, isLoading } = useQuery({
    queryKey: ['asset-entity-ledger', vendor?.id],
    queryFn: () => assetsApi.getAssetEntitiesLedger(vendor!.id),
    enabled: !!vendor?.id
  })

  const ledgerCols = [
    { header: 'Date', accessorKey: 'date', cell: (i: any) => format(new Date(i.getValue()), 'MMM dd, yyyy') },
    { header: 'Particulars', accessorKey: 'particulars' },
    { header: 'Voucher Type', accessorKey: 'voucher_type' },
    { header: 'Voucher No', accessorKey: 'voucher_no' },
    { header: 'Debit', accessorKey: 'debit', cell: (i: any) => i.getValue() > 0 ? formatCurrency(i.getValue()) : '-' },
    { header: 'Credit', accessorKey: 'credit', cell: (i: any) => i.getValue() > 0 ? formatCurrency(i.getValue()) : '-' },
    { header: 'Balance', accessorKey: 'balance', cell: (i: any) => formatCurrency(i.getValue()) },
  ]

  if (!vendor) return null

  return (
    <Drawer 
      open={open} 
      onClose={onClose} 
      title={vendor.entity_name}
      description={`Asset ${vendor.entity_type} Profile & Ledger`}
      widthClass="max-w-4xl"
    >
      <div className="flex flex-col h-full -mx-6 -my-5">
        
        {/* Profile Header Block */}
        <div className="bg-brand-50 border-b border-brand-100 p-6 shrink-0">
          <div className="flex gap-4 items-start">
            <div className="h-16 w-16 bg-white rounded-xl shadow-sm border border-brand-100 flex items-center justify-center text-brand-600">
              <Building2 size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-900">{vendor.entity_name}</h2>
              <div className="flex items-center gap-3 mt-2 text-sm text-brand-700">
                <span className="flex items-center gap-1"><Briefcase size={14} /> {vendor.entity_type}</span>
                <span className="flex items-center gap-1"><Hash size={14} /> {vendor.entity_code}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white p-3 rounded-lg border border-brand-100 shadow-sm text-sm">
              <div className="text-brand-600 mb-1 flex items-center gap-1.5"><Mail size={14}/> Email</div>
              <div className="font-medium">{vendor.email || '-'}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-brand-100 shadow-sm text-sm">
              <div className="text-brand-600 mb-1 flex items-center gap-1.5"><Phone size={14}/> Contact</div>
              <div className="font-medium">{vendor.contact_number || '-'}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-brand-100 shadow-sm text-sm">
              <div className="text-brand-600 mb-1 flex items-center gap-1.5"><Hash size={14}/> GSTIN</div>
              <div className="font-medium">{vendor.gst_number || '-'}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-brand-100 shadow-sm text-sm">
              <div className="text-brand-600 mb-1 flex items-center gap-1.5"><MapPin size={14}/> State</div>
              <div className="font-medium">{vendor.state || '-'}</div>
            </div>
          </div>
        </div>

        {/* Ledger Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <h3 className="text-lg font-semibold text-ink-900 mb-4">Account Ledger</h3>
          <div className="bg-white border border-border-subtle rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-ink-500">Loading ledger entries...</div>
            ) : (
              <DataTable data={ledger || []} columns={ledgerCols} />
            )}
          </div>
        </div>
        
      </div>
    </Drawer>
  )
}
