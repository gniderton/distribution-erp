import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { AutoTable } from '@/components/shared/AutoTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useTrips, useSyncLogs, useSyncLogsHistory } from './hooks'
import { SyncVerificationModal } from './components/SyncVerificationModal'
import { SyncHistoryModal } from './components/SyncHistoryModal'
import { CreateTripModal } from './components/CreateTripModal'
import { ActiveTripDetailsModal } from './components/ActiveTripDetailsModal'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'
import { Input } from '@/components/ui/Input'
import { Dialog } from '@/components/ui/Dialog'
import DeliveryCycleTimeline from './components/DeliveryCycleTimeline'
import { Plus, Activity, Truck, History, CheckCircle2, ClipboardCheck, LayoutList, Search, MapPin } from 'lucide-react'

export default function SupplyChainPage() {
  const [activeTab, setActiveTab] = useState<'verifications' | 'trips' | 'history'>('verifications')
  
  const { data: tripsData, isLoading: tripsLoading } = useTrips()
  const { data: syncsData, isLoading: syncsLoading } = useSyncLogs()
  const { data: historyData, isLoading: historyLoading } = useSyncLogsHistory()

  const [selectedSyncId, setSelectedSyncId] = useState<number | null>(null)
  const [selectedHistorySyncId, setSelectedHistorySyncId] = useState<number | null>(null)
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false)
  const [editTripId, setEditTripId] = useState<number | null>(null)
  
  // State for Trip Details Modal
  const [selectedTripDetailsId, setSelectedTripDetailsId] = useState<number | null>(null)
  const [selectedTripStatus, setSelectedTripStatus] = useState<string>('')
  
  const [historySearch, setHistorySearch] = useState('')
  const [trackInvoiceId, setTrackInvoiceId] = useState('')
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false)
  
  const filteredHistory = useMemo(() => {
    if (!historyData) return []
    if (!historySearch) return historyData
    const lower = historySearch.toLowerCase()
    return historyData.filter((h: any) => 
      String(h.trip_number || '').toLowerCase().includes(lower) ||
      String(h.driver_name || '').toLowerCase().includes(lower) ||
      String(h.status || '').toLowerCase().includes(lower)
    )
  }, [historyData, historySearch])

  const tabs = [
    { id: 'verifications', label: `Pending Verifications (${syncsData?.length || 0})`, icon: ClipboardCheck },
    { id: 'trips', label: `Active Trips (${tripsData?.length || 0})`, icon: Truck },
    { id: 'history', label: 'History', icon: History },
  ] as const

  const verificationCols: ColumnDef<any>[] = [
    { header: 'Trip #', accessorKey: 'trip_number' },
    { header: 'Driver', accessorKey: 'driver_name' },
    { header: 'Date', accessorKey: 'created_at', cell: (c) => format(new Date(c.getValue() as string), 'MMM d, h:mm a') },
    { header: 'Manifest Items', accessorKey: 'manifest_count' },
    { header: 'Returns', accessorKey: 'return_count' },
    { 
      header: 'Action', 
      id: 'action',
      cell: (c) => (
        <Button size="sm" onClick={(e) => { e.stopPropagation(); setSelectedSyncId(c.row.original.id); }}>Review</Button>
      )
    }
  ]

  const tripsCols: ColumnDef<any>[] = [
    { header: 'Trip #', accessorKey: 'trip_number' },
    { header: 'Driver', accessorKey: 'driver_name' },
    { header: 'Vehicle', accessorKey: 'vehicle_number' },
    { header: 'Status', accessorKey: 'status', cell: (c) => <Badge tone="neutral">{c.getValue() as string}</Badge> },
    { header: 'Created', accessorKey: 'created_at', cell: (c) => format(new Date(c.getValue() as string), 'MMM d, yyyy') },
    { header: 'Invoices', accessorKey: 'invoice_count' },
  ]

  const historyCols: ColumnDef<any>[] = [
    { header: 'Trip #', accessorKey: 'trip_number' },
    { header: 'Driver', accessorKey: 'driver_name' },
    { header: 'Date', accessorKey: 'created_at', cell: (c) => format(new Date(c.getValue() as string), 'MMM d, h:mm a') },
    { header: 'Status', accessorKey: 'status', cell: (c) => <Badge tone="success">{c.getValue() as string}</Badge> },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="TRK · Ops"
        title="Supply Chain"
        description="Verify delivery syncs, monitor active trips, and review settlement history."
        actions={
          <Button onClick={() => setIsCreateTripOpen(true)} className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-md shadow-brand-500/10">
            <Plus size={14} />
            Create New Trip
          </Button>
        }
      />

      {/* 📊 Useful Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="glass-card p-5 rounded-xl border border-border-subtle bg-white flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-ink-500 uppercase font-semibold tracking-wider">Pending Verifications</span>
            <h4 className="text-2xl font-bold text-ink-900 mt-1">{syncsData?.length || 0}</h4>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-lg">
            <Activity size={20} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-border-subtle bg-white flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-ink-500 uppercase font-semibold tracking-wider">Active Trips</span>
            <h4 className="text-2xl font-bold text-ink-900 mt-1">{tripsData?.length || 0}</h4>
          </div>
          <div className="p-3 bg-brand-500/10 text-brand-600 rounded-lg">
            <Truck size={20} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-border-subtle bg-white flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-ink-500 uppercase font-semibold tracking-wider">Vehicles On Route</span>
            <h4 className="text-2xl font-bold text-ink-900 mt-1">{new Set(tripsData?.map((t: any) => t.vehicle_number)).size || 0}</h4>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-lg">
            <Truck size={20} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-border-subtle bg-white flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-ink-500 uppercase font-semibold tracking-wider">Settled History</span>
            <h4 className="text-2xl font-bold text-ink-900 mt-1">{historyData?.length || 0}</h4>
          </div>
          <div className="p-3 bg-success-500/10 text-success-600 rounded-lg">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-y border-border-subtle mt-6 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 -mb-[2px] transition-all ${
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-ink-600 hover:text-ink-900'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'verifications' && (
        <DataTable
          data={syncsData}
          columns={verificationCols}
          isLoading={syncsLoading}
          emptyTitle="No Pending Verifications"
          emptyDescription="All syncs from mobile field agents have been processed."
        />
      )}

      {activeTab === 'trips' && (
        <DataTable
          data={tripsData}
          columns={tripsCols}
          isLoading={tripsLoading}
          emptyTitle="No Active Trips"
          emptyDescription="Create a trip from the pending invoices pool to get started."
          onRowClick={(row) => {
            setSelectedTripDetailsId(row.id)
            setSelectedTripStatus(row.status)
          }}
        />
      )}

      {activeTab === 'history' && (
        <>
          <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 text-ink-400 w-4 h-4" />
              <Input 
                placeholder="Search history (Trip, Driver, Status)..." 
                className="pl-9"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                placeholder="Enter Invoice #"
                value={trackInvoiceId}
                onChange={(e) => setTrackInvoiceId(e.target.value)}
                className="w-full sm:w-48"
              />
              <Button 
                variant="secondary" 
                onClick={() => trackInvoiceId && setIsTrackModalOpen(true)}
                className="flex items-center gap-2"
                disabled={!trackInvoiceId}
              >
                <MapPin size={16} /> Track Invoice
              </Button>
            </div>
          </div>
          <DataTable
            data={filteredHistory}
            columns={historyCols}
            isLoading={historyLoading}
            emptyTitle="No History"
            emptyDescription="Completed or rejected syncs will appear here."
            onRowClick={(row) => setSelectedHistorySyncId(row.id)}
          />
        </>
      )}

      <SyncVerificationModal
        open={!!selectedSyncId}
        onClose={() => setSelectedSyncId(null)}
        syncId={selectedSyncId}
      />

      <SyncHistoryModal
        open={!!selectedHistorySyncId}
        onClose={() => setSelectedHistorySyncId(null)}
        syncId={selectedHistorySyncId}
      />

      <CreateTripModal 
        open={isCreateTripOpen} 
        onClose={() => { setIsCreateTripOpen(false); setEditTripId(null); }} 
        editTripId={editTripId}
      />

      <ActiveTripDetailsModal
        open={!!selectedTripDetailsId}
        onClose={() => setSelectedTripDetailsId(null)}
        tripId={selectedTripDetailsId}
        tripStatus={selectedTripStatus}
        onEdit={(id) => {
          setSelectedTripDetailsId(null);
          setEditTripId(id);
          setIsCreateTripOpen(true);
        }}
      />

      {/* Track Invoice Modal */}
      <Dialog 
        open={isTrackModalOpen} 
        onClose={() => setIsTrackModalOpen(false)}
        title={`Delivery Tracking: Invoice #${trackInvoiceId}`}
        widthClass="max-w-md"
      >
        <div className="p-2">
          {isTrackModalOpen && <DeliveryCycleTimeline invoiceId={trackInvoiceId} />}
        </div>
      </Dialog>
    </div>
  )
}
