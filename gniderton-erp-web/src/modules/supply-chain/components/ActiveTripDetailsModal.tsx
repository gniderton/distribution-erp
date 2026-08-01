import React, { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useTripManifest, useTripPicklist, useDeleteTrip, useInvoiceDetails, useProductBreakdown, useGenerateEwayBills, useUploadEwayBillResponse } from '../hooks'
import { generatePicklistPDF, generateManifestPDF, downloadCSV } from '../utils/pdfGenerator'
import { generateInvoicePDF } from '@/modules/invoice/utils/pdfGenerator'
import { supply_chainApi } from '../api'
import { format } from 'date-fns'
import { Activity, Truck, Users, FileText, IndianRupee, ChevronDown, ChevronRight, Download, FileDown, Trash2, LayoutList, Search, Upload } from 'lucide-react'
import { useRef } from 'react'

function ManifestRowExpanded({ salesOrderId }: { salesOrderId: number }) {
  const { data, isLoading } = useInvoiceDetails(salesOrderId)
  if (isLoading) return <div className="p-4 text-center text-ink-500">Loading items...</div>
  if (!data?.invoice_lines?.length) return <div className="p-4 text-center text-ink-500">No items found.</div>
  
  return (
    <div className="p-4 bg-surface/50 border-t border-border-subtle">
      <h4 className="text-sm font-semibold mb-2 text-ink-700">Invoice Items</h4>
      <table className="w-full text-xs text-left">
        <thead className="text-ink-500 border-b border-border-subtle">
          <tr>
            <th className="pb-1">Product</th>
            <th className="pb-1">Batch</th>
            <th className="pb-1 text-right">Qty</th>
            <th className="pb-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {data.invoice_lines.map((item: any) => (
            <tr key={item.id}>
              <td className="py-2 font-medium">{item.product_name}</td>
              <td className="py-2">{item.batch_code || '-'}</td>
              <td className="py-2 text-right">{item.shipped_qty}</td>
              <td className="py-2 text-right">₹{Number(item.amount || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PicklistRowExpanded({ tripId, productId, mrp }: { tripId: number, productId: number, mrp: number }) {
  const { data, isLoading } = useProductBreakdown(tripId, productId, mrp)
  if (isLoading) return <div className="p-4 text-center text-ink-500">Loading breakdown...</div>
  if (!data?.length) return <div className="p-4 text-center text-ink-500">No customers found.</div>
  
  return (
    <div className="p-4 bg-surface/50 border-t border-border-subtle">
      <h4 className="text-sm font-semibold mb-2 text-ink-700">Customer Breakdown</h4>
      <table className="w-full text-xs text-left">
        <thead className="text-ink-500 border-b border-border-subtle">
          <tr>
            <th className="pb-1">Customer Name</th>
            <th className="pb-1">Invoice #</th>
            <th className="pb-1 text-right">Qty to Deliver</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {data.map((row: any, i: number) => (
            <tr key={i}>
              <td className="py-2 font-medium">{row.customer_name}</td>
              <td className="py-2">{row.invoice_number}</td>
              <td className="py-2 text-right font-semibold text-brand-700">{row.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ActiveTripDetailsModal({ 
  open, 
  onClose, 
  tripId, 
  tripStatus,
  onEdit 
}: { 
  open: boolean, 
  onClose: () => void, 
  tripId: number | null,
  tripStatus: string,
  onEdit: (id: number) => void
}) {
  const { data: manifestData, isLoading: manifestLoading } = useTripManifest(tripId)
  const { data: picklistData, isLoading: picklistLoading } = useTripPicklist(tripId)
  const deleteMutation = useDeleteTrip()
  const generateEwayBillsMutation = useGenerateEwayBills()
  const uploadEwayBillMutation = useUploadEwayBillResponse()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [activeTab, setActiveTab] = useState<'manifest' | 'picklist'>('manifest')
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadEwayBillMutation.mutate(file)
    e.target.value = ''
  }
  const [printThreshold, setPrintThreshold] = useState<number>(50000)
  const [isPrinting, setIsPrinting] = useState(false)
  const [expandedManifest, setExpandedManifest] = useState<number | null>(null)
  const [expandedPicklist, setExpandedPicklist] = useState<number | null>(null)
  const [manifestSearch, setManifestSearch] = useState('')
  const [picklistSearch, setPicklistSearch] = useState('')

  const tripInfo = manifestData?.trip_info || {}
  
  const invoices = [...(manifestData?.items || [])].sort((a, b) => 
    (a.customer_name || '').localeCompare(b.customer_name || '')
  )
  const picklist = [...(picklistData?.items || [])].sort((a, b) => 
    (a.product_name || '').localeCompare(b.product_name || '')
  )

  const filteredInvoices = invoices.filter((inv: any) => 
    (inv.customer_name || '').toLowerCase().includes(manifestSearch.toLowerCase()) ||
    (inv.invoice_number || '').toLowerCase().includes(manifestSearch.toLowerCase()) ||
    (inv.address || '').toLowerCase().includes(manifestSearch.toLowerCase())
  )

  const filteredPicklist = picklist.filter((item: any) => 
    (item.product_name || '').toLowerCase().includes(picklistSearch.toLowerCase()) ||
    (item.batches || '').toLowerCase().includes(picklistSearch.toLowerCase())
  )

  const handleDownloadPicklistPDF = async () => await generatePicklistPDF(tripInfo, picklist)
  const handleDownloadPicklistCSV = () => {
    downloadCSV(
      `${tripInfo.trip_number || 'Trip'}_Picklist`, 
      ['S.NO', 'ITEM NAME', 'BATCHES', 'TOTAL QTY'],
      picklist.map((row: any, i: number) => [
        i + 1, row.product_name, row.batches, row.total_qty
      ])
    )
  }

  const handleDownloadManifestPDF = async () => await generateManifestPDF(tripInfo, invoices)
  const handleDownloadManifestCSV = () => {
    downloadCSV(
      `${tripInfo.trip_number || 'Trip'}_Manifest`, 
      ['S.NO', 'INV NO', 'CUSTOMER', 'ADDRESS', 'PHONE', 'AMOUNT'],
      invoices.map((row: any, i: number) => [
        i + 1, row.invoice_number, row.customer_name, row.address, row.phone, row.grand_total
      ])
    )
  }

  const handleDownloadInvoices = async () => {
    setIsPrinting(true)
    try {
      for (const inv of invoices) {
        if (!inv.sales_order_id) continue
        const fullInv = await supply_chainApi.getSalesUnified2(inv.sales_order_id)
        const amt = Number(fullInv.grand_total || 0)
        
        const copies = amt >= printThreshold ? 2 : 1
        
        for (let i = 0; i < copies; i++) {
          await generateInvoicePDF(fullInv)
          await new Promise(r => setTimeout(r, 500))
        }
      }
    } catch (err) {
      console.error(err)
      alert("Failed to download some invoices. Please check console for details.")
    } finally {
      setIsPrinting(false)
    }
  }

  const handleDelete = () => {
    if (confirm("Are you sure you want to abort this trip? All invoices will be returned to the pending pool.")) {
      deleteMutation.mutate(tripId!, {
        onSuccess: () => onClose()
      })
    }
  }

  const isScheduled = tripStatus === 'Scheduled'

  const footer = (
    <div className="flex items-center justify-between w-full">
      <div className="flex gap-2">
        {isScheduled && (
          <Button variant="danger" onClick={handleDelete} loading={deleteMutation.isPending}>
            <Trash2 size={16} className="mr-2" />
            Abort Trip
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {isScheduled && (
          <Button onClick={() => onEdit(tripId!)}>Edit Trip</Button>
        )}
      </div>
    </div>
  )

  const toggleManifestRow = (id: number) => setExpandedManifest(p => p === id ? null : id)
  const togglePicklistRow = (idx: number) => setExpandedPicklist(p => p === idx ? null : idx)

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Trip Details - ${tripInfo.trip_number || ''}`}
      description={`Manage documents and status for ${tripInfo.driver_name || 'Driver'}`}
      widthClass="max-w-6xl"
      footer={footer}
    >
      <div className="mt-4 grid grid-cols-6 gap-4 border-b border-border-subtle pb-6">
        <div className="bg-surface/50 border border-border-subtle rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-1 text-ink-500">
            <Activity size={14} />
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Status</h3>
          </div>
          <div className="mt-auto"><Badge tone={isScheduled ? 'neutral' : 'success'}>{tripStatus}</Badge></div>
        </div>
        <div className="bg-surface/50 border border-border-subtle rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-1 text-ink-500">
            <Truck size={14} />
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Vehicle</h3>
          </div>
          <p className="mt-auto font-semibold text-ink-900">{tripInfo.vehicle_number || '-'}</p>
        </div>
        <div className="bg-surface/50 border border-border-subtle rounded-xl p-4 shadow-sm flex flex-col col-span-2">
          <div className="flex items-center gap-2 mb-1 text-ink-500">
            <Users size={14} />
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Team / Driver</h3>
          </div>
          <p className="mt-auto font-semibold text-ink-900 truncate">{tripInfo.team_name || '-'} / {tripInfo.driver_name || '-'}</p>
        </div>
        <div className="bg-surface/50 border border-border-subtle rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-1 text-ink-500">
            <FileText size={14} />
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Invoices</h3>
          </div>
          <div className="mt-auto font-semibold text-ink-900">{invoices.length} <span className="text-xs font-normal text-ink-500">inv</span></div>
        </div>
        <div className="bg-surface/50 border border-border-subtle rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-1 text-ink-500">
            <IndianRupee size={14} />
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Trip Value</h3>
          </div>
          <div className="mt-auto font-semibold text-ink-900">
            ₹{invoices.reduce((sum: number, i: any) => sum + Number(i.grand_total || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end border-b border-border-subtle mt-4 px-2">
        <div className="flex gap-4">
          <button
            className={`flex items-center gap-2 pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'manifest' ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-700'}`}
            onClick={() => setActiveTab('manifest')}
          >
            <LayoutList size={16} />
            Delivery Manifest
          </button>
          <button
            className={`flex items-center gap-2 pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'picklist' ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-700'}`}
            onClick={() => setActiveTab('picklist')}
          >
            <FileText size={16} />
            Picklist
          </button>
        </div>

        <div className="flex items-center gap-3 pb-2">
          <div className="flex items-center gap-2 border-r border-border-subtle pr-3">
            <div className="flex items-center gap-2 bg-white border border-border-subtle rounded-md px-2 py-1 h-[34px]">
              <span className="text-xs font-medium text-ink-600 whitespace-nowrap">Print Copies {'>'} ₹</span>
              <input 
                type="number"
                value={printThreshold}
                onChange={(e) => setPrintThreshold(Number(e.target.value))}
                className="w-16 h-6 px-1 text-sm border-none bg-surface rounded focus:ring-0 text-center font-medium"
              />
            </div>
            <Button 
              size="sm" 
              onClick={handleDownloadInvoices} 
              loading={isPrinting}
              disabled={manifestLoading || invoices.length === 0}
              className="h-[34px]"
            >
              <FileDown size={14} className="mr-1.5" />
              Invoices
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => generateEwayBillsMutation.mutate(tripId!)}
              loading={generateEwayBillsMutation.isPending}
              className="h-[34px]"
            >
              <Download size={14} className="mr-1.5" />
              Download EWB JSON
            </Button>
            
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload}
            />
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              loading={uploadEwayBillMutation.isPending}
              className="h-[34px]"
            >
              <Upload size={14} className="mr-1.5" />
              Upload EWB Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex-1 flex flex-col min-h-0">
        {activeTab === 'manifest' && (
          <div className="flex-1 flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-border-subtle shadow-sm">
              <div className="flex gap-6 items-center">
                <div>
                  <p className="text-[10px] text-ink-500 uppercase font-bold tracking-wider">Total Invoices</p>
                  <p className="text-lg font-semibold text-ink-900">{invoices.length}</p>
                </div>
                <div>
                  <p className="text-[10px] text-ink-500 uppercase font-bold tracking-wider">Trip Value</p>
                  <p className="text-lg font-semibold text-ink-900">₹{invoices.reduce((sum: number, i: any) => sum + Number(i.grand_total || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={manifestSearch}
                    onChange={e => setManifestSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 w-48 text-sm border border-border-subtle rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                
                <div className="flex items-center gap-2 border-l border-border-subtle pl-3">

                  <Button variant="secondary" size="sm" onClick={handleDownloadManifestCSV} className="h-[34px]">
                    <Download size={14} className="mr-1.5" />
                    CSV
                  </Button>
                  <Button size="sm" onClick={handleDownloadManifestPDF} className="h-[34px]">
                    <FileText size={14} className="mr-1.5" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>

            <div className="border border-border-subtle rounded-md overflow-hidden bg-white flex-1 min-h-[300px] flex flex-col">
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface text-ink-700 text-xs uppercase font-medium sticky top-0 border-b border-border-subtle z-10">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Inv #</th>
                    <th className="px-4 py-3">E-Way Bill #</th>
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {manifestLoading ? (
                    <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr><td colSpan={5} className="p-4 text-center text-ink-500">No invoices match your search.</td></tr>
                  ) : filteredInvoices.map((inv: any) => (
                    <React.Fragment key={inv.invoice_id}>
                      <tr 
                        className="hover:bg-surface cursor-pointer transition-colors"
                        onClick={() => toggleManifestRow(inv.invoice_id)}
                      >
                        <td className="px-4 py-3 font-medium">{inv.customer_name}</td>
                        <td className="px-4 py-3">{inv.invoice_number}</td>
                        <td className="px-4 py-3 text-brand-600 font-mono-figures">{inv.eway_bill_number || '-'}</td>
                        <td className="px-4 py-3 text-ink-600 truncate max-w-xs">{inv.address}</td>
                        <td className="px-4 py-3 text-right font-medium">₹{Number(inv.grand_total).toFixed(2)}</td>
                      </tr>
                      {expandedManifest === inv.invoice_id && (
                        <tr>
                          <td colSpan={5} className="p-0">
                            <ManifestRowExpanded salesOrderId={inv.sales_order_id} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'picklist' && (
          <div className="flex-1 flex flex-col space-y-4">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-border-subtle shadow-sm">
                <div className="flex gap-6 items-center">
                  <div>
                    <p className="text-[10px] text-ink-500 uppercase font-bold tracking-wider">Unique Items</p>
                    <p className="text-lg font-semibold text-ink-900">{picklist.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-500 uppercase font-bold tracking-wider">Total Qty To Load</p>
                    <p className="text-lg font-semibold text-ink-900">{picklist.reduce((sum: number, r: any) => sum + Number(r.total_qty || 0), 0)} Units</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={picklistSearch}
                      onChange={e => setPicklistSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 w-48 text-sm border border-border-subtle rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  
                  <div className="flex gap-2 border-l border-border-subtle pl-3">
                    <Button size="sm" variant="secondary" onClick={handleDownloadPicklistCSV} className="h-[34px]">
                      <Download size={14} className="mr-1.5" />
                      CSV
                    </Button>
                    <Button size="sm" onClick={handleDownloadPicklistPDF} className="h-[34px]">
                      <FileText size={14} className="mr-1.5" />
                      PDF
                    </Button>
                  </div>
                </div>
            </div>

            <div className="border border-border-subtle rounded-md overflow-hidden bg-white flex-1 min-h-[300px] flex flex-col">
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface text-ink-700 text-xs uppercase font-medium sticky top-0 border-b border-border-subtle z-10">
                  <tr>
                    <th className="px-4 py-3 w-8"></th>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">Batches</th>
                    <th className="px-4 py-3 text-right">Total Qty To Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {picklistLoading ? (
                    <tr><td colSpan={4} className="p-4 text-center">Loading...</td></tr>
                  ) : filteredPicklist.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-center text-ink-500">No items match your search.</td></tr>
                  ) : filteredPicklist.map((row: any, i: number) => (
                    <React.Fragment key={i}>
                      <tr 
                        className="hover:bg-surface cursor-pointer transition-colors"
                        onClick={() => togglePicklistRow(i)}
                      >
                        <td className="px-4 py-3 text-ink-400">
                          {expandedPicklist === i ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                        <td className="px-4 py-3 font-medium">{row.product_name}</td>
                        <td className="px-4 py-3">{row.batches || '-'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-brand-700">{row.total_qty}</td>
                      </tr>
                      {expandedPicklist === i && (
                        <tr>
                          <td colSpan={4} className="p-0">
                            <PicklistRowExpanded tripId={tripId!} productId={row.product_id} mrp={row.mrp} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  )
}
