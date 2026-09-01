import { useState, useMemo, useEffect } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { useTeams, useInvoicesPool, useCreateTrip, useUpdateTrip, useTripManifest } from '../hooks'
import { format } from 'date-fns'
import { FileText, IndianRupee, Store, Sparkles } from 'lucide-react'
import { api } from '@/lib/axios'
import axios from 'axios'
import { PickupAtOfficeModal } from './PickupAtOfficeModal'

export function CreateTripModal({ open, onClose, editTripId }: { open: boolean, onClose: () => void, editTripId?: number | null }) {
  const { data: teamsData, isLoading: teamsLoading } = useTeams()
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoicesPool()
  const { data: manifestData, isLoading: manifestLoading } = useTripManifest(editTripId || null)
  
  const createTripMutation = useCreateTrip()
  const updateTripMutation = useUpdateTrip()
  
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>([])
  const [pickupInvoice, setPickupInvoice] = useState<any | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [warehouse, setWarehouse] = useState<{warehouse_lat: number, warehouse_lng: number}|null>(null)

  useEffect(() => {
    api.get('/api/delivery/warehouse-location').then(res => setWarehouse(res.data)).catch(console.error)
  }, [])

  useEffect(() => {
    if (editTripId && manifestData && open) {
      setSelectedTeamId(String(manifestData.trip_info.team_id || ''))
      setSelectedInvoiceIds(manifestData.items.map((i: any) => i.invoice_id))
    }
  }, [editTripId, manifestData, open])

  // Combine pool invoices with invoices already in the trip (if editing)
  const allInvoices = useMemo(() => {
    const pool = invoicesData || []
    if (!editTripId || !manifestData?.items) return pool
    
    const manifestItems = manifestData.items.map((i: any) => ({
      id: i.invoice_id,
      invoice_number: i.invoice_number,
      invoice_date: i.invoice_date,
      grand_total: i.grand_total,
      customer_name: i.customer_name,
      route_name: i.route_name || '-',
      dse_name: 'Assigned to this Trip',
    }))

    const poolIds = new Set(pool.map((p: any) => p.id))
    const uniqueManifestItems = manifestItems.filter((m: any) => !poolIds.has(m.id))
    
    return [...uniqueManifestItems, ...pool]
  }, [invoicesData, manifestData, editTripId])

  // Filters
  const [dseFilter, setDseFilter] = useState<string>('')
  const [routeFilter, setRouteFilter] = useState<string>('')

  // Derive unique filters
  const uniqueDses = useMemo(() => {
    if (!allInvoices) return []
    return Array.from(new Set(allInvoices.map((i: any) => i.dse_name || 'Unassigned'))).sort()
  }, [allInvoices])

  const uniqueRoutes = useMemo(() => {
    if (!allInvoices) return []
    return Array.from(new Set(allInvoices.map((i: any) => i.route_name || 'Unassigned'))).sort()
  }, [allInvoices])

  // Filtered Data
  const filteredInvoices = useMemo(() => {
    if (!allInvoices) return []
    return allInvoices.filter((inv: any) => {
      const matchDse = dseFilter ? (inv.dse_name || 'Unassigned') === dseFilter : true
      const matchRoute = routeFilter ? (inv.route_name || 'Unassigned') === routeFilter : true
      return matchDse && matchRoute
    })
  }, [allInvoices, dseFilter, routeFilter])

  // Stats
  const selectedCount = selectedInvoiceIds.length
  const selectedValue = useMemo(() => {
    if (!allInvoices) return 0
    return allInvoices
      .filter((i: any) => selectedInvoiceIds.includes(i.id))
      .reduce((sum: number, i: any) => sum + Number(i.grand_total), 0)
  }, [allInvoices, selectedInvoiceIds])

  const filteredValue = useMemo(() => {
    return filteredInvoices.reduce((sum: number, i: any) => sum + Number(i.grand_total), 0)
  }, [filteredInvoices])


  const handleToggleInvoice = (id: number) => {
    const newSet = new Set(selectedInvoiceIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedInvoiceIds(newSet)
  }

  const handleOptimizeRoute = async () => {
    if (selectedInvoiceIds.length === 0) return;
    if (!warehouse || !warehouse.warehouse_lat || !warehouse.warehouse_lng) {
      alert("Warehouse location not configured.");
      return;
    }

    setIsOptimizing(true);
    try {
      const validJobs = selectedInvoiceIds.map(id => {
        return allInvoices.find((i: any) => i.id === id);
      }).filter((inv: any) => inv && inv.latitude && inv.longitude);

      if (validJobs.length === 0) {
        alert("None of the selected invoices have GPS coordinates.");
        setIsOptimizing(false);
        return;
      }

      const API_KEY = "5b3ce3597851110001cf62489812f22b7a9f4c399a9a3b680d2822a9"; // Temporary test key
      
      const payload = {
        vehicles: [{
          id: 1,
          profile: "driving-car",
          start: [Number(warehouse.warehouse_lng), Number(warehouse.warehouse_lat)],
          end: [Number(warehouse.warehouse_lng), Number(warehouse.warehouse_lat)]
        }],
        jobs: validJobs.map((inv: any) => ({
          id: inv.id,
          location: [Number(inv.longitude), Number(inv.latitude)]
        }))
      };

      const res = await axios.post("https://api.openrouteservice.org/optimization", payload, {
        headers: {
          'Authorization': API_KEY,
          'Content-Type': 'application/json'
        }
      });

      const steps = res.data.routes[0].steps;
      const orderedJobIds = steps.filter((s: any) => s.type === 'job').map((s: any) => s.job);
      const unmappedIds = selectedInvoiceIds.filter(id => !orderedJobIds.includes(id));
      
      setSelectedInvoiceIds([...orderedJobIds, ...unmappedIds]);
    } catch (err) {
      console.error(err);
      alert("Route optimization failed. Ensure locations are valid.");
    } finally {
      setIsOptimizing(false);
    }
  }

  const handleSave = () => {
    if (!selectedTeamId || selectedInvoiceIds.length === 0) return

    const team = teamsData?.find((t: any) => String(t.id) === selectedTeamId)
    
    const payload = {
      team_id: team?.id || null,
      driver_id: team?.driver_id,
      vehicle_number: team?.vehicle_number,
      invoice_ids: selectedInvoiceIds,
      created_by: 1 // Default Admin ID for now
    }

    const onSuccess = () => {
      if (!editTripId) {
        setSelectedTeamId('')
        setSelectedInvoiceIds([])
        setDseFilter('')
        setRouteFilter('')
      }
      onClose()
    }

    if (editTripId) {
      updateTripMutation.mutate({ id: editTripId, payload }, { onSuccess })
    } else {
      createTripMutation.mutate(payload, { onSuccess })
    }
  }

  const footer = (
    <div className="flex items-center justify-between w-full">
      <div className="text-sm">
        <span className="text-ink-500">Selected: </span>
        <span className="font-semibold text-brand-600">{selectedCount} Invoices </span>
        <span className="text-ink-400 mx-1">|</span>
        <span className="font-semibold text-brand-600">₹{selectedValue.toFixed(2)}</span>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave}
          loading={createTripMutation.isPending || updateTripMutation.isPending}
          disabled={!selectedTeamId || selectedInvoiceIds.length === 0}
        >
          {editTripId ? 'Save Changes' : 'Dispatch Trip'}
        </Button>
      </div>
    </div>
  )

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editTripId ? `Edit Trip ${manifestData?.trip_info?.trip_number || ''}` : "Create New Delivery Trip"}
      description={editTripId ? "Update assigned invoices or delivery team." : "Select a delivery team and assign invoices from the pending pool."}
      widthClass="max-w-4xl"
      footer={footer}
    >
      <div className="flex flex-col h-full space-y-6 mt-2">
        {/* Team Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-ink-700">Assign Delivery Team</label>
          <select 
            className="w-full h-10 px-3 rounded-md border border-border-subtle bg-white"
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
          >
            <option value="">-- Select Team --</option>
            {teamsData?.map((team: any) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.driver_name} - {team.vehicle_number})
              </option>
            ))}
          </select>
        </div>

        {/* Filters and Stats */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-surface/50 border border-border-subtle rounded-xl shadow-sm">
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-600 uppercase tracking-wider">Filter DSE</label>
            <select 
              className="w-full h-8 px-2 text-sm rounded border border-border-subtle bg-white"
              value={dseFilter}
              onChange={(e) => setDseFilter(e.target.value)}
            >
              <option value="">All Executives</option>
              {uniqueDses.map(dse => (
                <option key={dse as string} value={dse as string}>{dse as string}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-600 uppercase tracking-wider">Filter Route</label>
            <select 
              className="w-full h-8 px-2 text-sm rounded border border-border-subtle bg-white"
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
            >
              <option value="">All Routes</option>
              {uniqueRoutes.map(route => (
                <option key={route as string} value={route as string}>{route as string}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <div className="flex items-center gap-2 mb-1 text-ink-500">
              <FileText size={14} />
              <div className="text-[10px] uppercase tracking-wider font-bold">Filtered Count</div>
            </div>
            <div className="text-xl font-semibold text-ink-900">{filteredInvoices.length} <span className="text-xs font-normal text-ink-500">inv</span></div>
          </div>
          <div className="flex flex-col justify-end">
            <div className="flex items-center gap-2 mb-1 text-ink-500">
              <IndianRupee size={14} />
              <div className="text-[10px] uppercase tracking-wider font-bold">Filtered Value</div>
            </div>
            <div className="text-xl font-semibold text-ink-900">₹{filteredValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Invoice Selection */}
        <div className="flex flex-col flex-1 min-h-0 space-y-2">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-ink-700">
                Select Invoices
              </label>
              <Button 
                variant="secondary" 
                size="sm"
                className="text-xs h-7 px-2 border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100"
                onClick={handleOptimizeRoute}
                loading={isOptimizing}
                disabled={selectedInvoiceIds.length === 0}
              >
                <Sparkles size={12} className="mr-1" />
                Optimize Sequence
              </Button>
            </div>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => {
                const isAllSelected = filteredInvoices.every((i: any) => selectedInvoiceIds.includes(i.id))
                const newSet = new Set(selectedInvoiceIds)
                if (isAllSelected && filteredInvoices.length > 0) {
                  // Deselect all filtered
                  filteredInvoices.forEach((i: any) => newSet.delete(i.id))
                } else {
                  // Select all filtered
                  filteredInvoices.forEach((i: any) => newSet.add(i.id))
                }
                setSelectedInvoiceIds(newSet)
              }}
            >
              {filteredInvoices.length > 0 && filteredInvoices.every((i: any) => selectedInvoiceIds.includes(i.id)) 
                ? 'Deselect Filtered' 
                : 'Select All Filtered'}
            </Button>
          </div>

          <div className="flex-1 min-h-0 border border-border-subtle rounded-md bg-white flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm text-left relative">
                <thead className="bg-surface text-ink-700 text-xs uppercase font-medium sticky top-0 z-10 shadow-sm border-b border-border-subtle">
                  <tr>
                    <th className="px-4 py-3 w-10"></th>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">DSE</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 w-32 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {invoicesLoading || manifestLoading ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-500">Loading invoices...</td></tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-500">No pending invoices match filters.</td></tr>
                  ) : (
                    filteredInvoices.map((inv: any) => (
                      <tr 
                        key={inv.id} 
                        className={`hover:bg-surface cursor-pointer ${selectedInvoiceIds.includes(inv.id) ? 'bg-brand-50' : ''}`}
                        onClick={() => handleToggleInvoice(inv.id)}
                      >
                        <td className="px-4 py-3">
                          <input 
                            type="checkbox" 
                            className="rounded border-border-subtle text-brand-600 focus:ring-brand-500"
                            checked={selectedInvoiceIds.includes(inv.id)}
                            readOnly
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            {selectedInvoiceIds.includes(inv.id) && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-100 text-brand-700">
                                Stop {selectedInvoiceIds.indexOf(inv.id) + 1}
                              </span>
                            )}
                            {inv.invoice_number}
                          </div>
                          <div className="text-xs text-ink-500 font-normal">{format(new Date(inv.invoice_date), 'MMM d, yyyy')}</div>
                        </td>
                        <td className="px-4 py-3">{inv.customer_name}</td>
                        <td className="px-4 py-3 text-ink-600">{inv.dse_name || '-'}</td>
                        <td className="px-4 py-3 text-ink-600">{inv.route_name || '-'}</td>
                        <td className="px-4 py-3 text-right font-medium">₹{Number(inv.grand_total).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            className="text-xs h-7 px-2 border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPickupInvoice(inv)
                            }}
                          >
                            <Store size={12} className="mr-1" />
                            Pick Up
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <PickupAtOfficeModal 
        open={!!pickupInvoice} 
        onClose={() => setPickupInvoice(null)} 
        invoice={pickupInvoice} 
      />
    </Drawer>
  )
}
