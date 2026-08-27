import { useState, useEffect } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { useQuery } from '@tanstack/react-query'
import { assetsApi } from '../api'
import { api } from '@/lib/axios'
import { DataTable } from '@/components/shared/DataTable'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { Building2, Mail, Phone, MapPin, Hash, Briefcase, FileDown, FileText, Edit2 } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { EditAssetEntityModal } from './modals/EditAssetEntityModal'

interface Props {
  open: boolean
  onClose: () => void
  vendor: any
}

export function AssetVendorProfileDrawer({ open, onClose, vendor }: Props) {
  const [ledgerStartDate, setLedgerStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [ledgerEndDate, setLedgerEndDate] = useState(new Date().toISOString().split('T')[0])
  const [companySettings, setCompanySettings] = useState<any>(null)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    api.get('/api/company-settings').then(res => setCompanySettings(res.data)).catch(() => {})
  }, [])

  const { data: ledger, isLoading } = useQuery({
    queryKey: ['asset-entity-ledger', vendor?.id, ledgerStartDate, ledgerEndDate],
    queryFn: () => assetsApi.getAssetEntitiesLedger(vendor!.id, { start_date: ledgerStartDate, end_date: ledgerEndDate }),
    enabled: !!vendor?.id
  })

  const ledgerCols = [
    { header: 'Date', accessorKey: 'date', cell: (i: any) => i.getValue() ? format(new Date(i.getValue()), 'MMM dd, yyyy') : '-' },
    { header: 'Particulars', accessorKey: 'particulars' },
    { header: 'Debit', accessorKey: 'debit', cell: (i: any) => Number(i.getValue()) > 0 ? formatCurrency(i.getValue()) : '-' },
    { header: 'Credit', accessorKey: 'credit', cell: (i: any) => Number(i.getValue()) > 0 ? formatCurrency(i.getValue()) : '-' },
    { header: 'Balance', accessorKey: 'running_balance', cell: (i: any) => formatCurrency(i.getValue() || 0) },
  ]

  const handleDownloadExcel = () => {
    if (!vendor || !ledger) return
    try {
      const escapeCSV = (str: any) => `"${String(str || '').replace(/"/g, '""')}"`
      let csv = "ASSET VENDOR LEDGER STATEMENT\n"
      csv += `Vendor:,${escapeCSV(vendor.entity_name)}\n`
      csv += `Code:,${escapeCSV(vendor.entity_code)}\n`
      csv += `Period:,${ledgerStartDate} to ${ledgerEndDate}\n\n`
      csv += `DATE,PARTICULARS,DEBIT,CREDIT,BALANCE\n`

      ledger.forEach((r: any) => {
        const d = r.date ? format(new Date(r.date), 'yyyy-MM-dd') : ''
        csv += `${d},${escapeCSV(r.particulars)},${Number(r.debit || 0).toFixed(2)},${Number(r.credit || 0).toFixed(2)},${Number(r.running_balance || 0).toFixed(2)}\n`
      })

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `Ledger_${vendor.entity_name}.csv`
      link.click()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDownloadPDF = () => {
    if (!vendor || !ledger) return
    try {
      const doc = new jsPDF('p', 'pt', 'a4')
      const margin = 20
      const brand = {
        name: companySettings?.company_name || "GNIDERTON DISTRIBUTIONS PVT LTD",
        address: [companySettings?.address, companySettings?.district].filter(Boolean).join(', '),
        gst: companySettings?.gstin || "32AAACG1924D1ZS",
      }

      doc.setFontSize(16)
      doc.text("ASSET VENDOR LEDGER", 595/2, margin + 20, { align: 'center' })
      doc.setFontSize(10)
      doc.text(`${ledgerStartDate} to ${ledgerEndDate}`, 595/2, margin + 35, { align: 'center' })

      doc.setFontSize(9)
      doc.text(`Vendor: ${vendor.entity_name}`, margin, margin + 60)
      doc.text(`Code: ${vendor.entity_code || '-'}`, margin, margin + 75)
      doc.text(`GSTIN: ${vendor.gst_number || '-'}`, margin, margin + 90)

      doc.text(`Company: ${brand.name}`, 595 - margin, margin + 60, { align: 'right' })
      doc.text(`GST: ${brand.gst}`, 595 - margin, margin + 75, { align: 'right' })

      const body = ledger.map((r: any) => [
        r.date ? format(new Date(r.date), 'MMM dd, yyyy') : '',
        r.particulars || '',
        Number(r.debit) > 0 ? formatCurrency(r.debit) : '-',
        Number(r.credit) > 0 ? formatCurrency(r.credit) : '-',
        formatCurrency(r.running_balance || 0)
      ])

      autoTable(doc, {
        startY: margin + 110,
        head: [['Date', 'Particulars', 'Debit', 'Credit', 'Balance']],
        body,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [63, 63, 70] },
      })

      doc.save(`Ledger_${vendor.entity_name}.pdf`)
    } catch (e) {
      console.error(e)
    }
  }

  if (!vendor) return null

  // Calculate opening/closing natively since we don't have a ledgerData wrapper object here
  const firstBal = ledger?.length ? Number(ledger[0].running_balance || 0) - Number(ledger[0].debit || 0) + Number(ledger[0].credit || 0) : 0
  const lastBal = ledger?.length ? Number(ledger[ledger.length - 1].running_balance || 0) : 0

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
        <div className="bg-brand-50 border-b border-brand-100 p-6 shrink-0 relative">
          
          <button 
            onClick={() => setEditOpen(true)}
            className="absolute top-6 right-6 flex items-center gap-1.5 bg-white border border-brand-200 text-brand-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-brand-100 transition-colors shadow-sm"
          >
            <Edit2 size={14} /> Edit Profile
          </button>

          <div className="flex gap-4 items-start">
            <div className="h-16 w-16 bg-white rounded-xl shadow-sm border border-brand-100 flex items-center justify-center text-brand-600">
              <Building2 size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-900 pr-24">{vendor.entity_name}</h2>
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
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-end bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
            <div className="flex gap-3 items-center">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-ink-600 uppercase font-semibold">Start Date</span>
                <input 
                  type="date"
                  value={ledgerStartDate}
                  onChange={e => setLedgerStartDate(e.target.value)}
                  className="bg-surface border border-border-subtle rounded px-2.5 py-1.5 text-xs focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-ink-600 uppercase font-semibold">End Date</span>
                <input 
                  type="date"
                  value={ledgerEndDate}
                  onChange={e => setLedgerEndDate(e.target.value)}
                  className="bg-surface border border-border-subtle rounded px-2.5 py-1.5 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 border border-border-subtle bg-white text-ink-700 hover:bg-ink-100 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
              >
                <FileDown size={13} />
                Download PDF
              </button>
              <button
                onClick={handleDownloadExcel}
                className="flex items-center gap-1.5 border border-border-subtle bg-white text-ink-700 hover:bg-ink-100 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
              >
                <FileText size={13} />
                Download Excel
              </button>
            </div>

            <div className="flex gap-6 text-right pb-1">
              <div>
                <span className="text-[9px] text-ink-600 block uppercase">Opening Balance</span>
                <span className="text-sm font-bold text-ink-900">{formatCurrency(firstBal)}</span>
              </div>
              <div>
                <span className="text-[9px] text-ink-600 block uppercase">Closing Balance</span>
                <span className="text-sm font-bold text-ink-900">{formatCurrency(lastBal)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border-subtle rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-ink-500">Loading ledger entries...</div>
            ) : (
              <DataTable data={ledger || []} columns={ledgerCols} />
            )}
          </div>
        </div>
        
      </div>
      
      <EditAssetEntityModal 
        open={editOpen} 
        onClose={() => setEditOpen(false)} 
        entity={vendor}
      />
    </Drawer>
  )
}
