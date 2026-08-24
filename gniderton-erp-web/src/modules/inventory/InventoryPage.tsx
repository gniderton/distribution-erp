import { useState, useMemo, useEffect } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { 
  usePurchaseOrders, 
  usePurchaseInvoices, 
  useVendors, 
  useProducts, 
  useCreatePO, 
  useUpdatePO, 
  useCreateGRN,
  useReverseGRN
} from './hooks'
import { GRNBatchUpdateModal } from './components/GRNBatchUpdateModal'
import { inventoryApi } from './api'
import { api } from '@/lib/axios'
import { 
  Search, Plus, FileText, CheckCircle2, AlertCircle, X, Download, Upload, 
  ShoppingCart, Truck, FileDown, Eye
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface POLine {
  _product_id: number
  product_name: string
  ean_code: string
  mrp: number
  price: number
  qty: number
  sch: number
  disc_pct: number
  gst_pct: number
  gross: number
  disc_amt: number
  taxable: number
  gst_amt: number
  net: number
  current_stock: number
}

interface GRNLine extends POLine {
  batch_no: string
  expiry: string
}

export default function InventoryPage() {
  // React Query Hooks
  const { data: posRaw, isLoading: loadingPOs, refetch: refetchPOs } = usePurchaseOrders()
  const { data: grnsRaw, isLoading: loadingGRNs, refetch: refetchGRNs } = usePurchaseInvoices()
  const { data: vendorsRaw } = useVendors()
  const { data: productsRaw } = useProducts()

  const createPOMutation = useCreatePO()
  const updatePOMutation = useUpdatePO()
  const createGRNMutation = useCreateGRN()
  const reverseGRNMutation = useReverseGRN()

  // Unwrapping arrays from Axios wrappers
  const pos: any[] = (Array.isArray(posRaw) ? posRaw : (posRaw as any)?.data) || []
  const grns: any[] = (Array.isArray(grnsRaw) ? grnsRaw : (grnsRaw as any)?.data) || []
  const vendors: any[] = (Array.isArray(vendorsRaw) ? vendorsRaw : (vendorsRaw as any)?.data) || []
  const products: any[] = (Array.isArray(productsRaw) ? productsRaw : (productsRaw as any)?.data) || []

  // UI state variables
  const [activeTab, setActiveTab] = useState<'po' | 'grn'>('po')
  const [searchTerm, setSearchTerm] = useState('')
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  // PO Modal/Drawer state
  const [showPODrawer, setShowPODrawer] = useState(false)
  const [poMode, setPoMode] = useState<'CREATE' | 'EDIT' | 'VIEW'>('CREATE')
  const [selectedPO, setSelectedPO] = useState<any>(null)
  const [selectedPOId, setSelectedPOId] = useState<number | null>(null)
  
  const [poVendorId, setPoVendorId] = useState<string>('')
  const [poDate, setPoDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [poRemarks, setPoRemarks] = useState<string>('')
  const [poLines, setPoLines] = useState<POLine[]>([])

  // GRN Modal state
  const [showGRNModal, setShowGRNModal] = useState(false)
  const [grnVendorId, setGrnVendorId] = useState<string>('')
  const [grnPOId, setGrnPOId] = useState<string>('')
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0])
  const [grnRemarks, setGrnRemarks] = useState('')
  const [grnLines, setGrnLines] = useState<GRNLine[]>([])

  // View GRN details Modal state
  const [showViewGRNModal, setShowViewGRNModal] = useState(false)
  const [selectedGRN, setSelectedGRN] = useState<any>(null)
  const [showReverseConfirm, setShowReverseConfirm] = useState(false)
  const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false)

  // Dynamic Company Settings from DB company_settings table
  const [companySettings, setCompanySettings] = useState<any>(null)
  useEffect(() => {
    api.get('/api/company-settings')
      .then(res => {
        setCompanySettings(res.data)
      })
      .catch(err => {
        console.error('Failed loading company settings:', err)
      })
  }, [])

  // Filters for POs & GRNs
  const filteredPOs = useMemo(() => {
    return pos.filter(p => 
      (p.po_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [pos, searchTerm])

  const filteredGRNs = useMemo(() => {
    return grns.filter(g => 
      (g.vendor_invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.po_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [grns, searchTerm])

  // Recalculates PO sums
  const poTotals = useMemo(() => {
    return poLines.reduce((acc, line) => {
      acc.gross += line.gross
      acc.disc += line.disc_amt
      acc.taxable += line.taxable
      acc.gst += line.gst_amt
      acc.net += line.net
      return acc
    }, { gross: 0, disc: 0, taxable: 0, gst: 0, net: 0 })
  }, [poLines])

  // Recalculates GRN sums and groupings
  const grnTotals = useMemo(() => {
    return grnLines.reduce((acc, line) => {
      acc.gross += line.gross
      acc.disc += line.disc_amt
      acc.taxable += line.taxable
      acc.gst += line.gst_amt
      acc.net += line.net
      acc.qty += line.qty
      return acc
    }, { gross: 0, disc: 0, taxable: 0, gst: 0, net: 0, qty: 0 })
  }, [grnLines])

  const grnTaxSummary = useMemo(() => {
    const summaryMap: { [key: number]: any } = {}
    grnLines.forEach(line => {
      if (line.qty <= 0) return
      const rate = line.gst_pct
      if (!summaryMap[rate]) {
        summaryMap[rate] = { particulars: `${rate}% GST`, pcs: 0, gross: 0, sch: 0, disc: 0, taxable: 0, tax: 0, net: 0 }
      }
      summaryMap[rate].pcs += line.qty
      summaryMap[rate].gross += line.gross
      summaryMap[rate].sch += line.sch
      summaryMap[rate].disc += line.disc_amt
      summaryMap[rate].taxable += line.taxable
      summaryMap[rate].tax += line.gst_amt
      summaryMap[rate].net += line.net
    })
    return Object.values(summaryMap)
  }, [grnLines])

  // ----------------------------------------------------
  // Actions: CSV Template Downloads
  // ----------------------------------------------------
  const handleDownloadPOTemplate = () => {
    if (!poVendorId) {
      setAlertMsg({ type: 'error', text: 'Please select a Vendor first to download their PO product sheet.' })
      return
    }
    const vendorObj = vendors.find(v => Number(v.id) === Number(poVendorId))
    const vendorName = vendorObj ? vendorObj.vendor_name : 'Vendor'
    const vendorProds = products.filter(p => Number(p.vendor_id) === Number(poVendorId))
    
    if (vendorProds.length === 0) {
      setAlertMsg({ type: 'error', text: 'No products found for the selected vendor.' })
      return
    }

    const templateData = vendorProds.map(p => ({
      "product_id": p.id,
      "EAN Code": p.ean_code || "",
      "Item Name": p.product_name,
      "MRP": p.mrp || "0.00",
      "Price": p.purchase_rate || "0.00",
      "Qty": 0,
      "Disc %": 0,
      "Sch": 0
    }))

    const headers = Object.keys(templateData[0])
    const csvHeader = headers.join(",")
    const csvRows = templateData.map(row => 
      headers.map(h => {
        const val = (row as any)[h]
        return `"${String(val ?? '').replace(/"/g, '""')}"`
      }).join(",")
    )
    const csvString = [csvHeader, ...csvRows].join("\n")
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `PO_Template_${vendorName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadGRNTemplate = () => {
    if (!grnVendorId) {
      setAlertMsg({ type: 'error', text: 'Please select a Vendor first to download their GRN product sheet.' })
      return
    }
    const vendorObj = vendors.find(v => Number(v.id) === Number(grnVendorId))
    const vendorName = vendorObj ? vendorObj.vendor_name : 'Vendor'
    const vendorProds = products.filter(p => Number(p.vendor_id) === Number(grnVendorId))
    
    if (vendorProds.length === 0) {
      setAlertMsg({ type: 'error', text: 'No products found for the selected vendor.' })
      return
    }

    const templateData = vendorProds.map(p => ({
      "product_id": p.id,
      "EAN Code": p.ean_code || "",
      "Item Name": p.product_name,
      "MRP": p.mrp || "0.00",
      "Price": p.purchase_rate || "0.00",
      "Qty": 0,
      "Disc %": 0,
      "Sch": 0,
      "Batch No": "DEFAULT-BATCH",
      "Expiry": ""
    }))

    const headers = Object.keys(templateData[0])
    const csvHeader = headers.join(",")
    const csvRows = templateData.map(row => 
      headers.map(h => {
        const val = (row as any)[h]
        return `"${String(val ?? '').replace(/"/g, '""')}"`
      }).join(",")
    )
    const csvString = [csvHeader, ...csvRows].join("\n")
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `GRN_Template_${vendorName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ----------------------------------------------------
  // Actions: CSV Template Uploads
  // ----------------------------------------------------
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const linesStr = text.split('\n')
        const header = linesStr[0].split(',').map(h => h.replace(/^"|"₹/g, '').trim())

        const idIdx = header.findIndex(h => h.toLowerCase().includes('id') || h.toLowerCase() === 'product_id')
        const codeIdx = header.findIndex(h => h.toLowerCase().includes('ean') || h.toLowerCase().includes('code'))
        const qtyIdx = header.findIndex(h => h.toLowerCase().includes('qty') || h.toLowerCase().includes('quantity'))
        const priceIdx = header.findIndex(h => h.toLowerCase().includes('price') || h.toLowerCase().includes('rate'))
        const discIdx = header.findIndex(h => h.toLowerCase().includes('disc'))
        const schIdx = header.findIndex(h => h.toLowerCase().includes('sch'))

        if (idIdx === -1 && codeIdx === -1) {
          setAlertMsg({ type: 'error', text: 'CSV must contain product_id or EAN Code.' })
          return
        }

        const linesMap = new Map<string, any>()
        for (let i = 1; i < linesStr.length; i++) {
          const row = linesStr[i].split(',').map(cell => cell.replace(/^"|"₹/g, '').trim())
          if (row.length <= 1) continue
          const key = idIdx !== -1 ? row[idIdx] : row[codeIdx]
          const qty = parseInt(row[qtyIdx] || '0')
          const price = priceIdx !== -1 ? parseFloat(row[priceIdx] || '0') : null
          const disc = discIdx !== -1 ? parseFloat(row[discIdx] || '0') : 0
          const scheme = schIdx !== -1 ? parseFloat(row[schIdx] || '0') : 0
          
          if (key) {
            linesMap.set(key, { qty, price, disc, scheme })
          }
        }

        const updatedLines = poLines.map(line => {
          const key = idIdx !== -1 ? String(line._product_id) : line.ean_code
          const val = linesMap.get(key)
          if (val && val.qty > 0) {
            const finalPrice = val.price !== null ? val.price : line.price
            const gross = val.qty * finalPrice
            const disc_amt = (gross - val.scheme) * (val.disc / 100)
            const taxable = gross - val.scheme - disc_amt
            const gst_amt = taxable * (line.gst_pct / 100)
            return {
              ...line,
              qty: val.qty,
              price: finalPrice,
              sch: val.scheme,
              disc_pct: val.disc,
              gross,
              disc_amt,
              taxable,
              gst_amt,
              net: taxable + gst_amt
            }
          }
          return line
        })

        setPoLines(updatedLines)
        setAlertMsg({ type: 'success', text: `Uploaded and populated PO from CSV!` })
      } catch (err: any) {
        setAlertMsg({ type: 'error', text: `Failed parsing CSV: ${err.message}` })
      }
    }
    reader.readAsText(file)
  }

  const handleGRNCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const linesStr = text.split('\n')
        const header = linesStr[0].split(',').map(h => h.replace(/^"|"₹/g, '').trim())

        const idIdx = header.findIndex(h => h.toLowerCase().includes('id') || h.toLowerCase() === 'product_id')
        const codeIdx = header.findIndex(h => h.toLowerCase().includes('ean') || h.toLowerCase().includes('code'))
        const qtyIdx = header.findIndex(h => h.toLowerCase().includes('qty') || h.toLowerCase().includes('quantity'))
        const priceIdx = header.findIndex(h => h.toLowerCase().includes('price') || h.toLowerCase().includes('rate'))
        const discIdx = header.findIndex(h => h.toLowerCase().includes('disc'))
        const schIdx = header.findIndex(h => h.toLowerCase().includes('sch'))
        const batchIdx = header.findIndex(h => h.toLowerCase().includes('batch'))
        const expIdx = header.findIndex(h => h.toLowerCase().includes('exp') || h.toLowerCase().includes('date'))

        if (idIdx === -1 && codeIdx === -1) {
          setAlertMsg({ type: 'error', text: 'CSV must contain product_id or EAN Code.' })
          return
        }

        const linesMap = new Map<string, any>()
        for (let i = 1; i < linesStr.length; i++) {
          const row = linesStr[i].split(',').map(cell => cell.replace(/^"|"₹/g, '').trim())
          if (row.length <= 1) continue
          const key = idIdx !== -1 ? row[idIdx] : row[codeIdx]
          const qty = parseInt(row[qtyIdx] || '0')
          const price = priceIdx !== -1 ? parseFloat(row[priceIdx] || '0') : null
          const disc = discIdx !== -1 ? parseFloat(row[discIdx] || '0') : 0
          const scheme = schIdx !== -1 ? parseFloat(row[schIdx] || '0') : 0
          const batch = batchIdx !== -1 ? row[batchIdx] : 'DEFAULT-BATCH'
          const expiry = expIdx !== -1 ? row[expIdx] : ''
          
          if (key) {
            linesMap.set(key, { qty, price, disc, scheme, batch, expiry })
          }
        }

        const updatedLines = grnLines.map(line => {
          const key = idIdx !== -1 ? String(line._product_id) : line.ean_code
          const val = linesMap.get(key)
          if (val && val.qty > 0) {
            const finalPrice = val.price !== null ? val.price : line.price
            const gross = val.qty * finalPrice
            const disc_amt = (gross - val.scheme) * (val.disc / 100)
            const taxable = gross - val.scheme - disc_amt
            const gst_amt = taxable * (line.gst_pct / 100)
            return {
              ...line,
              qty: val.qty,
              price: finalPrice,
              sch: val.scheme,
              disc_pct: val.disc,
              batch_no: val.batch,
              expiry: val.expiry,
              gross,
              disc_amt,
              taxable,
              gst_amt,
              net: taxable + gst_amt
            }
          }
          return line
        })

        setGrnLines(updatedLines)
        setAlertMsg({ type: 'success', text: `Uploaded and populated GRN from CSV!` })
      } catch (err: any) {
        setAlertMsg({ type: 'error', text: `Failed parsing CSV: ${err.message}` })
      }
    }
    reader.readAsText(file)
  }

  // ----------------------------------------------------
  // Actions: PO Save / Update
  // ----------------------------------------------------
  const handleOpenCreatePO = () => {
    setPoMode('CREATE')
    setPoVendorId('')
    setPoDate(new Date().toISOString().split('T')[0])
    setPoRemarks('')
    setPoLines([])
    setShowPODrawer(true)
  }

  const handleOpenViewPO = async (poRecord: any) => {
    try {
      setPoMode('VIEW')
      setSelectedPO(poRecord)
      setSelectedPOId(poRecord.id)
      setPoVendorId(poRecord.vendor_id.toString())
      setPoDate(poRecord.po_date?.split('T')[0] || '')
      setPoRemarks(poRecord.remarks || '')

      const rawDetails = await inventoryApi.getPurchaseOrders2(poRecord.id)
      const data = rawDetails.data || rawDetails
      
      const mappedLines = (data.lines || []).map((line: any) => {
        const qty = Number(line.ordered_qty || 0)
        const price = Number(line.rate || 0)
        const sch = Number(line.scheme_amount || 0)
        const disc_pct = Number(line.discount_percent || 0)
        const gst_pct = Number(line.tax_percent || 5)

        const gross = qty * price
        const disc_amt = (gross - sch) * (disc_pct / 100)
        const taxable = gross - sch - disc_amt
        const gst_amt = taxable * (gst_pct / 100)

        const pMatch = products.find(p => Number(p.id) === Number(line.product_id))

        return {
          _product_id: line.product_id,
          product_name: line.product_name,
          ean_code: line.ean_code,
          mrp: Number(line.mrp || 0),
          price,
          qty,
          sch,
          disc_pct,
          gst_pct,
          gross,
          disc_amt,
          taxable,
          gst_amt,
          net: taxable + gst_amt,
          current_stock: pMatch ? parseFloat(pMatch.current_stock || 0) : 0
        }
      })

      setPoLines(mappedLines)
      setShowPODrawer(true)
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: `Failed loading PO: ${err.message}` })
    }
  }

  const handleOpenEditPO = () => {
    setPoMode('EDIT')
    // Augment poLines with all products from this vendor that aren't currently in the PO
    const vendorProds = products.filter(p => Number(p.vendor_id) === Number(poVendorId))
    const existingIds = new Set(poLines.map(line => Number(line._product_id)))
    
    const additionalLines = vendorProds
      .filter(p => !existingIds.has(Number(p.id)))
      .map(p => ({
        _product_id: p.id,
        product_name: p.product_name,
        ean_code: p.ean_code || '',
        mrp: Number(p.mrp || 0),
        price: Number(p.purchase_rate || 0),
        qty: 0,
        sch: 0,
        disc_pct: 0,
        gst_pct: Number(p.tax_percentage || 5),
        gross: 0,
        disc_amt: 0,
        taxable: 0,
        gst_amt: 0,
        net: 0,
        current_stock: parseFloat(p.current_stock || 0)
      }))

    if (additionalLines.length > 0) {
      setPoLines(prev => [...prev, ...additionalLines])
    }
  }

  const handleVendorChange = (vId: string) => {
    setPoVendorId(vId)
    const vendorProds = products.filter(p => Number(p.vendor_id) === Number(vId))
    const freshLines = vendorProds.map(p => ({
      _product_id: p.id,
      product_name: p.product_name,
      ean_code: p.ean_code || '',
      mrp: Number(p.mrp || 0),
      price: Number(p.purchase_rate || 0),
      qty: 0,
      sch: 0,
      disc_pct: 0,
      gst_pct: Number(p.tax_percentage || 5),
      gross: 0,
      disc_amt: 0,
      taxable: 0,
      gst_amt: 0,
      net: 0,
      current_stock: parseFloat(p.current_stock || 0)
    }))
    setPoLines(freshLines)
  }

  const handlePOLineChange = (idx: number, field: keyof POLine, value: number) => {
    const updated = [...poLines]
    const line = { ...updated[idx], [field]: value }

    const qty = Number(line.qty) || 0
    const price = Number(line.price) || 0
    const sch = Number(line.sch) || 0
    const disc_pct = Number(line.disc_pct) || 0
    const gst_pct = Number(line.gst_pct) || 5

    const gross = qty * price
    const disc_amt = (gross - sch) * (disc_pct / 100)
    const taxable = gross - sch - disc_amt
    const gst_amt = taxable * (gst_pct / 100)

    line.gross = gross
    line.disc_amt = disc_amt
    line.taxable = taxable
    line.gst_amt = gst_amt
    line.net = taxable + gst_amt

    updated[idx] = line
    setPoLines(updated)
  }

  const handleSavePO = async () => {
    const validLines = poLines.filter(line => line.qty > 0)
    if (validLines.length === 0) {
      setAlertMsg({ type: 'error', text: 'Cannot save PO with zero quantities.' })
      return
    }

    const payload = {
      vendor_id: parseInt(poVendorId),
      remarks: poRemarks,
      lines: validLines.map(l => ({
        product_id: l._product_id,
        ordered_qty: l.qty,
        mrp: l.mrp,
        price: l.price,
        scheme_amount: l.sch,
        discount_percent: l.disc_pct,
        tax_percent: l.gst_pct
      }))
    }

    try {
      if (poMode === 'CREATE') {
        await createPOMutation.mutateAsync(payload)
        setAlertMsg({ type: 'success', text: 'Purchase Order created successfully!' })
      } else if (poMode === 'EDIT' && selectedPOId) {
        await updatePOMutation.mutateAsync({ id: selectedPOId, payload })
        setAlertMsg({ type: 'success', text: 'Purchase Order updated successfully!' })
      }
      setShowPODrawer(false)
      refetchPOs()
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: `Failed: ${err.message}` })
    }
  }

  // ----------------------------------------------------
  // Actions: GRN Save / Reverse
  // ----------------------------------------------------
  const handleOpenCreateGRN = (poRecord?: any) => {
    setGrnVendorId(poRecord ? poRecord.vendor_id.toString() : '')
    setGrnPOId(poRecord ? poRecord.id.toString() : '')
    setVendorInvoiceNo('')
    setInvoiceDate(new Date().toISOString().split('T')[0])
    setReceivedDate(new Date().toISOString().split('T')[0])
    setGrnRemarks('')
    setGrnLines([])
    
    if (poRecord) {
      handleGRNPOSelected(poRecord.id.toString(), poRecord.vendor_id.toString())
    }
    setShowGRNModal(true)
  }

  const handleGRNVendorChange = (vId: string) => {
    setGrnVendorId(vId)
    setGrnPOId('')
    const vendorProds = products.filter(p => Number(p.vendor_id) === Number(vId))
    const freshLines = vendorProds.map(p => ({
      _product_id: p.id,
      product_name: p.product_name,
      ean_code: p.ean_code || '',
      mrp: Number(p.mrp || 0),
      price: Number(p.purchase_rate || 0),
      qty: 0,
      sch: 0,
      disc_pct: 0,
      gst_pct: Number(p.tax_percentage || 5),
      gross: 0,
      disc_amt: 0,
      taxable: 0,
      gst_amt: 0,
      net: 0,
      current_stock: parseFloat(p.current_stock || 0),
      batch_no: '',
      expiry: ''
    }))
    setGrnLines(freshLines)
  }

  const handleGRNPOSelected = async (poId: string, customVendorId?: string) => {
    if (!poId) return
    setGrnPOId(poId)
    try {
      const rawDetails = await inventoryApi.getPurchaseOrders2(poId)
      const data = rawDetails.data || rawDetails
      
      const vId = customVendorId || data.header.vendor_id.toString()
      setGrnVendorId(vId)

      const transformedLines = (data.lines || []).map((line: any) => {
        const qty = Number(line.ordered_qty || 0)
        const price = Number(line.rate || 0)
        const sch = Number(line.scheme_amount || 0)
        const disc_pct = Number(line.discount_percent || 0)
        const gst_pct = Number(line.tax_percent || 5)

        const gross = qty * price
        const disc_amt = (gross - sch) * (disc_pct / 100)
        const taxable = gross - sch - disc_amt
        const gst_amt = taxable * (gst_pct / 100)

        const pMatch = products.find(p => Number(p.id) === Number(line.product_id))

        return {
          _product_id: line.product_id,
          product_name: line.product_name,
          ean_code: line.ean_code,
          mrp: Number(line.mrp || 0),
          price,
          qty,
          sch,
          disc_pct,
          gst_pct,
          gross,
          disc_amt,
          taxable,
          gst_amt,
          net: taxable + gst_amt,
          batch_no: '',
          expiry: '',
          current_stock: pMatch ? parseFloat(pMatch.current_stock || 0) : 0
        }
      })
      setGrnLines(transformedLines)
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: `Failed loading PO details for GRN: ${err.message}` })
    }
  }

  const handleAddOtherProductsToGRN = () => {
    if (!grnVendorId) return
    const vendorProds = products.filter(p => Number(p.vendor_id) === Number(grnVendorId))
    const missing = vendorProds.filter(p => !grnLines.find(row => row._product_id === p.id))
    
    if (missing.length === 0) {
      setAlertMsg({ type: 'info', text: 'All products for this vendor are already in the list!' })
      return
    }

    const newRows = missing.map((p, i) => ({
      _product_id: p.id,
      product_name: p.product_name,
      ean_code: p.ean_code || '',
      mrp: Number(p.mrp || 0),
      price: Number(p.purchase_rate || 0),
      qty: 0,
      sch: 0,
      disc_pct: 0,
      gst_pct: Number(p.tax_percentage || 5),
      gross: 0,
      disc_amt: 0,
      taxable: 0,
      gst_amt: 0,
      net: 0,
      current_stock: parseFloat(p.current_stock || 0),
      batch_no: '',
      expiry: ''
    }))

    setGrnLines([...grnLines, ...newRows])
    setAlertMsg({ type: 'success', text: `Added ${newRows.length} other products to the GRN list.` })
  }

  const handleGRNLineChange = (idx: number, field: keyof GRNLine, value: any) => {
    const updated = [...grnLines]
    const line = { ...updated[idx], [field]: value }

    if (field !== 'batch_no' && field !== 'expiry') {
      const qty = Number(line.qty) || 0
      const price = Number(line.price) || 0
      const sch = Number(line.sch) || 0
      const disc_pct = Number(line.disc_pct) || 0
      const gst_pct = Number(line.gst_pct) || 5

      const gross = qty * price
      const disc_amt = (gross - sch) * (disc_pct / 100)
      const taxable = gross - sch - disc_amt
      const gst_amt = taxable * (gst_pct / 100)

      line.gross = gross
      line.disc_amt = disc_amt
      line.taxable = taxable
      line.gst_amt = gst_amt
      line.net = taxable + gst_amt
    }

    updated[idx] = line
    setGrnLines(updated)
  }

  const handleSaveGRN = async () => {
    if (!vendorInvoiceNo.trim()) {
      setAlertMsg({ type: 'error', text: 'Vendor Invoice Number is required.' })
      return
    }

    const validLines = grnLines.filter(l => l.qty > 0)
    if (validLines.length === 0) {
      setAlertMsg({ type: 'error', text: 'Please add items with quantity.' })
      return
    }

    const total_net = validLines.reduce((sum, l) => sum + (l.taxable || 0), 0)
    const tax_amount = validLines.reduce((sum, l) => sum + (l.gst_amt || 0), 0)
    const grand_total = validLines.reduce((sum, l) => sum + (l.net || 0), 0)

    const payload = {
      vendor_id: parseInt(grnVendorId),
      purchase_order_id: grnPOId ? parseInt(grnPOId) : null,
      invoice_number: vendorInvoiceNo,
      invoice_date: invoiceDate,
      received_date: receivedDate,
      total_net,
      tax_amount,
      grand_total,
      lines: validLines.map(l => ({
        product_id: l._product_id,
        accepted_qty: l.qty,
        rate: l.price,
        scheme_amount: l.sch,
        discount_percent: l.disc_pct,
        discount_amount: l.disc_amt,
        tax_amount: l.gst_amt,
        amount: l.net,
        mrp: l.mrp,
        batch_number: l.batch_no || 'DEFAULT-BATCH',
        expiry_date: l.expiry || null
      }))
    }

    try {
      await createGRNMutation.mutateAsync(payload)
      setAlertMsg({ type: 'success', text: 'Goods Received Note (GRN) created successfully!' })
      setShowGRNModal(false)
      refetchGRNs()
      refetchPOs()
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: `Failed saving GRN: ${err.message}` })
    }
  }

  const handleOpenViewGRN = (grnRecord: any) => {
    setSelectedGRN(grnRecord)
    const rawLines = typeof grnRecord.lines_json === 'string' ? JSON.parse(grnRecord.lines_json || '[]') : (grnRecord.lines_json || [])
    const mapped = rawLines.map((l: any, i: number) => {
      const qty = Number(l.received_qty || l.Qty || l.qty || 0)
      const price = Number(l.rate || l.Price || l.price || 0)
      const sch = Number(l.scheme_amount || l.Sch || l.sch || 0)
      const disc_pct = Number(l.discount_percent || l['Disc %'] || l.disc_pct || 0)
      const gst_pct = Number(l.tax_percent || l['GST %'] || l.gst_pct || 5)

      const gross = qty * price
      const disc_amt = (gross - sch) * (disc_pct / 100)
      const taxable = gross - sch - disc_amt
      const gst_amt = taxable * (gst_pct / 100)

      return {
        _product_id: l._product_id || l.product_id,
        product_name: l['Item Name'] || l.product_name || `Product ID: ${l.product_id}`,
        ean_code: l['Ean code'] || l.ean_code || '-',
        mrp: Number(l.MRP || l.mrp || 0),
        price,
        qty,
        sch,
        disc_pct,
        gst_pct,
        gross,
        disc_amt,
        taxable,
        gst_amt,
        net: taxable + gst_amt,
        batch_no: l['Batch No'] || l.batch_number || '-',
        expiry: l.Expiry?.split('T')[0] || l.expiry_date?.split('T')[0] || '-'
      }
    })

    setGrnLines(mapped)
    setShowViewGRNModal(true)
  }

  const handleConfirmReverseGRN = async () => {
    if (!selectedGRN) return
    try {
      await reverseGRNMutation.mutateAsync({ id: selectedGRN.id, payload: {} })
      setAlertMsg({ type: 'success', text: 'GRN Reversed successfully. Stock returned.' })
      setShowReverseConfirm(false)
      setShowViewGRNModal(false)
      refetchGRNs()
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: `Reverse failed: ${err.message}` })
    }
  }

  // ----------------------------------------------------
  // Actions: PDF Generation (Landscape - Appsmith Exact Replica)
  // ----------------------------------------------------
  const handleDownloadPOPDF = (poRecord: any) => {
    try {
      const doc = new jsPDF('l', 'pt', 'a4')
      const margin = 20
      const pageWidth = doc.internal.pageSize.width

      const brand = {
        regt_name: companySettings?.company_name || "GNIDERTON DISTRIBUTIONS PVT LTD",
        address: companySettings?.address || "Industrial Development Area, Kozhikode, Kerala",
        District: companySettings?.district || "Kozhikode",
        gst: companySettings?.gstin || "32AAACG1924D1ZS"
      }

      const toWords = (num: number) => {
        const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen ']
        const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety']
        const n = ("000000000" + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})₹/)
        if (!n) return ''
        let str = ''
        str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : ''
        str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : ''
        str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : ''
        str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : ''
        str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) + 'Only ' : 'Only '
        return str
      }

      const drawSimpleBox = (docObj: any, x: number, y: number, width: number, height: number, rows: string[][]) => {
        docObj.setDrawColor(0, 0, 0)
        docObj.setLineWidth(0.5)
        docObj.rect(x, y, width, height)
        let rowY = y + 11

        rows.forEach(r => {
          docObj.setFontSize(7.5)
          docObj.setFont("helvetica", "bold")
          docObj.text(String(r[0]) + ":", x + 5, rowY)
          docObj.setFont("helvetica", "normal")
          
          const val = String(r[1] || "-")
          const splitVal = docObj.splitTextToSize(val, width - 60)
          docObj.text(splitVal, x + 55, rowY)
          rowY += (splitVal.length * 9.5) + 1
        })
      }

      const drawMainHeader = (currentPage: number, totalPages: number) => {
        const headerY = margin
        try {
          if (companySettings?.logo) {
            const logoData = companySettings.logo.startsWith('data:image') 
              ? companySettings.logo 
              : `data:image/png;base64,${companySettings.logo}`;
            doc.addImage(logoData, 'PNG', margin, headerY, 90, 30)
          }
        } catch (e) {}
        doc.setTextColor(0, 0, 0)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(16)
        doc.text("PURCHASE ORDER", pageWidth / 2, headerY + 15, { align: "center" })
        doc.setFontSize(11)
        doc.text(String(poRecord.po_number || "-"), pageWidth / 2, headerY + 30, { align: "center" })

        const boxesY = headerY + 40
        const gap = 10
        const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3
        const boxHeight = 60

        drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
          ["PO NUMBER", String(poRecord.po_number || "-")],
          ["PO DATE", poRecord.po_date?.split('T')[0] || '-'],
          ["TOTAL QTY", String(poRecord.total_qty || 0)],
          ["PAGE", `${currentPage} / ${totalPages}`]
        ])

        drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
          ["Bill To", String(brand.regt_name)],
          ["Address", String(brand.address)],
          ["District", String(brand.District)],
          ["GST", String(brand.gst)]
        ])

        drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
          ["Vendor", String(poRecord.vendor_name)],
          ["Code", String(poRecord.vendor_code || "-")],
          ["Address", String(poRecord.vendor_city || "-")],
          ["GST", String(poRecord.vendor_gst || "-")]
        ])
        return boxesY + boxHeight
      }

      const body = poLines.map((row, index) => {
        const qty = Number(row.qty || 0)
        const rate = Number(row.price || 0)
        const schemeAmt = Number(row.sch || 0)
        const discPct = Number(row.disc_pct || 0)
        const gross = qty * rate
        const valForDisc = Math.max(0, gross - schemeAmt)
        const derivedDiscAmt = valForDisc * (discPct / 100)
        const derivedTaxable = Math.max(0, gross - schemeAmt - derivedDiscAmt)
        return [
          index + 1, row.ean_code || "-", "-", row.product_name || "Item",
          Number(row.mrp || 0).toFixed(2), qty, rate.toFixed(2),
          gross.toFixed(2), schemeAmt.toFixed(2), discPct + "%",
          derivedDiscAmt.toFixed(2), derivedTaxable.toFixed(2), 
          row.gst_pct + "%", Number(row.gst_amt || 0).toFixed(2),
          Number(row.net || 0).toFixed(2)
        ]
      })

      autoTable(doc, {
        startY: margin + 40 + 60 + 8,
        margin: { left: margin, right: margin, top: margin + 120 },
        head: [["S.N", "EAN", "CODE", "ITEM NAME", "MRP", "QTY", "PRICE", "GROSS", "SCH", "D%", "D.AMT", "TXBL", "GST%", "GST₹", "NET₹"]],
        body,
        didDrawPage: (data) => {
          drawMainHeader(data.pageNumber, doc.getNumberOfPages())
        },
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.5 },
        columnStyles: { 0: { cellWidth: 20 }, 3: { cellWidth: 'auto', minCellWidth: 150 } }
      })

      const finalY = (doc as any).lastAutoTable.finalY + 15
      const totalBoxWidth = 150
      const totalBoxX = pageWidth - margin - totalBoxWidth
      doc.setDrawColor(0)
      doc.rect(totalBoxX, finalY, totalBoxWidth, 20)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("GRAND TOTAL:", totalBoxX + 5, finalY + 14)
      
      const grandTotalVal = parseFloat(poRecord.total_net || 0) > 0 
        ? parseFloat(poRecord.total_net) 
        : parseFloat(poRecord.grand_total || 0)

      doc.text(grandTotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), totalBoxX + totalBoxWidth - 5, finalY + 14, { align: "right" })

      const wordsY = finalY + 35
      doc.setFontSize(9)
      doc.text("Total Amount (in words):", margin, wordsY)
      doc.setFont("helvetica", "normal")
      doc.text(toWords(Math.round(grandTotalVal)), margin + 110, wordsY)

      const notesY = wordsY + 20
      doc.setFontSize(8.5)
      doc.setFont("helvetica", "bold")
      doc.text("Notes / Terms:", margin, notesY)
      doc.setFont("helvetica", "normal")
      doc.text("Please supply the items in good condition according to the specifications above.", margin, notesY + 12)

      doc.save(`PO_${poRecord.po_number}.pdf`)
      setAlertMsg({ type: 'success', text: 'Purchase Order PDF (Landscape Exact Replica) downloaded!' })
    } catch (e: any) {
      setAlertMsg({ type: 'error', text: `PDF Download failed: ${e.message}` })
    }
  }

  const handleDownloadGRNPDF = (grnRecord: any) => {
    try {
      const doc = new jsPDF('p', 'pt', 'a4')
      const margin = 17.5
      const pageWidth = 595

      const brand = {
        regt_name: companySettings?.company_name || "GNIDERTON DISTRIBUTIONS PVT LTD",
        address: companySettings?.address || "Industrial Development Area, Kozhikode, Kerala",
        District: companySettings?.district || "Kozhikode",
        gst: companySettings?.gstin || "32AAACG1924D1ZS"
      }

      const toWords = (num: number) => {
        const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen ']
        const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety']
        const n = ("000000000" + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})₹/)
        if (!n) return ''
        let str = ''
        str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : ''
        str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : ''
        str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : ''
        str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : ''
        str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) + 'Only ' : 'Only '
        return str
      }

      const drawSimpleBox = (docObj: any, x: number, y: number, width: number, height: number, rows: string[][]) => {
        docObj.setDrawColor(0, 0, 0)
        docObj.setLineWidth(0.5)
        docObj.rect(x, y, width, height)
        let rowY = y + 11
        rows.forEach(r => {
          docObj.setFontSize(7.5)
          docObj.setFont("helvetica", "bold")
          docObj.text(String(r[0]) + ":", x + 5, rowY)
          docObj.setFont("helvetica", "normal")
          const val = String(r[1] || "-")
          const splitVal = docObj.splitTextToSize(val, width - 60)
          docObj.text(splitVal, x + 55, rowY)
          rowY += (splitVal.length * 9.5) + 1
        })
      }

      const drawMainHeader = (currentPage: number, totalPages: number) => {
        const headerY = margin
        try {
          if (companySettings?.logo) {
            const logoData = companySettings.logo.startsWith('data:image') 
              ? companySettings.logo 
              : `data:image/png;base64,${companySettings.logo}`;
            doc.addImage(logoData, 'PNG', margin, headerY, 90, 30)
          }
        } catch(e) {}
        
        doc.setTextColor(0, 0, 0)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(16)
        doc.text("GOODS RECEIPT NOTE (GRN)", pageWidth / 2, headerY + 15, { align: "center" })
        doc.setFontSize(11)
        doc.text(String(grnRecord.invoice_number || grnRecord.vendor_invoice_number || 'N/A'), pageWidth / 2, headerY + 30, { align: "center" })
        
        const boxesY = headerY + 40
        const gap = 8
        const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3
        const boxHeight = 70
        
        drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
          ["GRN NO", String(grnRecord.invoice_number || grnRecord.id || "-")],
          ["DATE", grnRecord.received_date ? grnRecord.received_date.split('T')[0] : "-"],
          ["VND INV", String(grnRecord.vendor_invoice_number || "-")],
          ["PAGE", `${currentPage} / ${totalPages}`]
        ])
        
        drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
          ["Bill From", String(brand.regt_name)],
          ["Address", String(brand.address)],
          ["District", String(brand.District)],
          ["GST", String(brand.gst)]
        ])
        
        drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
          ["Vendor", String(grnRecord.vendor_name || "-")],
          ["Code", String(grnRecord.vendor_code || "-")],
          ["Address", `${grnRecord.vendor_address_1 || ""} ${grnRecord.vendor_address_2 || ""}`.trim()],
          ["GST / PAN", `${grnRecord.vendor_gst || "-"} / ${grnRecord.vendor_pan || "-"}`]
        ])
        
        return boxesY + boxHeight
      }

      const body = grnLines.map((row, index) => {
        const gross = Number(row.gross || (Number(row.qty || 0) * Number(row.price || 0)))
        const sch = Number(row.sch || 0)
        const discPct = Number(row.disc_pct || 0)
        const discAmt = (gross - sch) * (discPct / 100)
        return [
          index + 1,
          row.product_name,
          row.batch_no || "DEFAULT",
          row.expiry ? row.expiry.split('T')[0] : "-",
          Number(row.mrp || 0).toFixed(2),
          row.qty || 0,
          Number(row.price || 0).toFixed(2),
          gross.toFixed(2),
          sch.toFixed(2),
          discPct + "%",
          discAmt.toFixed(2),
          Number(row.taxable || 0).toFixed(2),
          Number(row.gst_pct || 5) + "%",
          Number(row.gst_amt || 0).toFixed(2),
          Number(row.net || 0).toFixed(2)
        ]
      })

      autoTable(doc, {
        startY: margin + 40 + 70 + 10,
        margin: { left: margin, right: margin, top: margin + 140 },
        head: [["S.N", "ITEM NAME", "BATCH", "EXPIRY", "MRP", "QTY", "PRICE", "GROSS", "SCH", "D%", "D.AMT", "TXBL", "GST%", "GST₹", "NET₹"]],
        body,
        didDrawPage: (data: any) => {
          const totalPages = (doc.internal as any).getNumberOfPages()
          drawMainHeader(data.pageNumber, totalPages)
        },
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.5 },
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 'auto', minCellWidth: 100 } }
      })

      const summaryBody = grnTaxSummary.map(row => [
        row.particulars, row.pcs, row.gross.toFixed(2), row.sch.toFixed(2),
        row.disc.toFixed(2), row.taxable.toFixed(2), row.tax.toFixed(2), row.net.toFixed(2)
      ])

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 8,
        margin: { left: margin, right: margin },
        head: [["TAX SUMMARY", "PCS", "GROSS", "SCH", "DISC", "TAXABLE", "TAX", "NET"]],
        body: summaryBody,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.5, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0] },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.5 },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.row.raw[0] === 'Total') {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = [250, 250, 250]
          }
        }
      } as any)

      const wordsY = (doc as any).lastAutoTable.finalY + 20
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text("Total Amount (in words):", margin, wordsY)
      doc.setFont("helvetica", "normal")
      const netTotalForWords = grnRecord.grand_total ? Number(grnRecord.grand_total) : (grnRecord.total_net ? Number(grnRecord.total_net) : grnTotals.net)
      doc.text(toWords(Math.round(netTotalForWords)), margin + 150, wordsY)

      const notesY = wordsY + 20
      doc.setFontSize(8.5)
      doc.setFont("helvetica", "bold")
      doc.text("Notes / Terms:", margin, notesY)
      doc.setFont("helvetica", "normal")
      doc.text("1. Payments will be made as per the GRN accepted amount.", margin, notesY + 14)
      doc.text("2. This is a computer generated document and does not require a physical signature.", margin, notesY + 26)

      doc.save(`GRN_${grnRecord.vendor_invoice_number || grnRecord.id}.pdf`)
      setAlertMsg({ type: 'success', text: 'GRN PDF Receipt downloaded!' })
    } catch (e: any) {
      setAlertMsg({ type: 'error', text: `PDF Download failed: ${e.message}` })
    }
  }

  return (
    <div className="space-y-6 w-full pb-12">
      <PageHeader
        eyebrow="PUR · Buy"
        title="Inventory"
        description="Create Purchase Orders (POs) and track Goods Received Notes (GRNs) inside the supplier ledger."
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleOpenCreatePO}
              className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus size={14} />
              Create New PO
            </button>
            <button
              onClick={() => handleOpenCreateGRN()}
              className="bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm"
            >
              <ShoppingCart size={14} />
              Create New GRN
            </button>
          </div>
        }
      />

      {/* Alert Component */}
      {alertMsg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${
          alertMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          alertMsg.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {alertMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span className="text-xs font-medium">{alertMsg.text}</span>
          <button onClick={() => setAlertMsg(null)} className="ml-auto">
            <X size={14} className="opacity-75 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card bg-white p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-center">
          <p className="text-xs text-ink-500 font-semibold mb-1 uppercase tracking-wider">Total Taxable Value</p>
          <p className="text-2xl font-bold text-ink-900">
            ₹{grns.reduce((sum: number, g: any) => sum + (parseFloat(g.total_taxable) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-card bg-white p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-center">
          <p className="text-xs text-ink-500 font-semibold mb-1 uppercase tracking-wider">This Month Purchase</p>
          <p className="text-2xl font-bold text-ink-900">
            ₹{grns.reduce((sum: number, g: any) => {
              if (g.received_date) {
                const date = new Date(g.received_date);
                const now = new Date();
                if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
                  return sum + (parseFloat(g.grand_total) || 0);
                }
              }
              return sum;
            }, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-card bg-white p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-center">
          <p className="text-xs text-ink-500 font-semibold mb-1 uppercase tracking-wider">Total Received Value</p>
          <p className="text-2xl font-bold text-brand-600">
            ₹{grns.reduce((sum: number, g: any) => sum + (parseFloat(g.grand_total) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-card bg-white p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col justify-center">
          <p className="text-xs text-ink-500 font-semibold mb-1 uppercase tracking-wider">Outstanding Payables</p>
          <p className="text-2xl font-bold text-rose-600">
            ₹{grns.reduce((sum: number, g: any) => sum + (parseFloat(g.balance) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-y border-border-subtle mt-4 mb-4">
        <button
          onClick={() => { setActiveTab('po'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 -mb-[2px] transition-all ${
            activeTab === 'po' ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-600 hover:text-ink-900'
          }`}
        >
          <ShoppingCart size={14} />
          Purchase Orders ({pos.length})
        </button>
        <button
          onClick={() => { setActiveTab('grn'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 -mb-[2px] transition-all ${
            activeTab === 'grn' ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-600 hover:text-ink-900'
          }`}
        >
          <Truck size={14} />
          Goods Received Notes / Invoices ({grns.length})
        </button>
      </div>

      {/* Search Filter Box */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-400">
          <Search size={14} />
        </span>
        <input 
          type="text"
          placeholder={activeTab === 'po' ? "Search PO number, vendor name..." : "Search invoice number, PO ref, vendor name..."}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-sm"
        />
      </div>

      {/* TAB 1: PO LISTING */}
      {activeTab === 'po' && (
        <div className="bg-white border border-border-subtle rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs divide-y divide-border-subtle">
            <thead className="bg-surface text-ink-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-3.5">PO Number</th>
                <th className="px-6 py-3.5">PO Date</th>
                <th className="px-6 py-3.5">Vendor</th>
                <th className="px-6 py-3.5">Quantity</th>
                <th className="px-6 py-3.5">Net (₹)</th>
                <th className="px-6 py-3.5">Grand Total (₹)</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-ink-800">
              {loadingPOs ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-ink-600">Loading purchase orders...</td>
                </tr>
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-ink-600">No purchase orders found.</td>
                </tr>
              ) : (
                filteredPOs.map((p: any) => (
                  <tr key={p.id} className="hover:bg-surface/50 transition">
                    <td className="px-6 py-3.5 font-mono font-semibold">{p.po_number}</td>
                    <td className="px-6 py-3.5">{p.po_date?.split('T')[0]}</td>
                    <td className="px-6 py-3.5 font-medium">{p.vendor_name}</td>
                    <td className="px-6 py-3.5">{p.total_qty || 0}</td>
                    <td className="px-6 py-3.5">₹{Number(p.total_net || 0).toFixed(2)}</td>
                    <td className="px-6 py-3.5 font-bold">₹{Number(parseFloat(p.total_net || 0) > 0 ? p.total_net : p.grand_total || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-semibold uppercase ${
                        p.status === 'Completed' || p.status === 'Received' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-1">
                      <button
                        onClick={() => handleOpenViewPO(p)}
                        className="bg-white border border-border-subtle hover:bg-ink-50 text-ink-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
                      >
                        <Eye size={12} className="inline mr-1" />
                        View
                      </button>
                      <button
                        disabled={p.status === 'Completed' || p.status === 'Received'}
                        onClick={() => handleOpenCreateGRN(p)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                          p.status === 'Completed' || p.status === 'Received' 
                            ? 'bg-ink-200 text-ink-400 cursor-not-allowed' 
                            : 'bg-ink-900 hover:bg-ink-800 text-white'
                        }`}
                      >
                        <Truck size={12} className="inline mr-1" />
                        {p.status === 'Completed' || p.status === 'Received' ? 'Received' : 'GRN'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: GRN LISTING */}
      {activeTab === 'grn' && (
        <div className="bg-white border border-border-subtle rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs divide-y divide-border-subtle">
            <thead className="bg-surface text-ink-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-6 py-3.5">Received Date</th>
                <th className="px-6 py-3.5">PO Ref</th>
                <th className="px-6 py-3.5">Vendor</th>
                <th className="px-6 py-3.5">Grand Total (₹)</th>
                <th className="px-6 py-3.5">Paid Amount (₹)</th>
                <th className="px-6 py-3.5">Balance (₹)</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-ink-800">
              {loadingGRNs ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-ink-600">Loading goods received notes...</td>
                </tr>
              ) : filteredGRNs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-ink-600">No GRNs recorded yet.</td>
                </tr>
              ) : (
                filteredGRNs.map((g: any) => (
                  <tr key={g.id} className="hover:bg-surface/50 transition">
                    <td className="px-6 py-3.5 font-semibold">{g.vendor_invoice_number || `GRN-${g.id}`}</td>
                    <td className="px-6 py-3.5">{g.received_date?.split('T')[0]}</td>
                    <td className="px-6 py-3.5 font-mono text-ink-500">{g.po_number || '-'}</td>
                    <td className="px-6 py-3.5 font-medium">{g.vendor_name}</td>
                    <td className="px-6 py-3.5 font-bold">₹{Number(g.grand_total || 0).toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-emerald-600">₹{Number(g.paid_amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-rose-600 font-bold">₹{Number(g.balance || 0).toFixed(2)}</td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-semibold uppercase ${
                        g.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 
                        g.status === 'Partial' ? 'bg-amber-100 text-amber-800' : 
                        g.status === 'Reversed' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {g.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenViewGRN(g)}
                        className="bg-white border border-border-subtle hover:bg-ink-50 text-ink-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
                      >
                        <Eye size={12} className="inline mr-1" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PO DRAWER (CREATE / EDIT / VIEW) */}
      {showPODrawer && (
        <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-5xl bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-surface">
              <div>
                <h3 className="text-sm font-extrabold text-ink-900">
                  {poMode === 'CREATE' ? 'Create New Purchase Order' : 
                   poMode === 'EDIT' ? `Edit Purchase Order (${selectedPO?.po_number})` : 
                   `View Purchase Order Details (${selectedPO?.po_number})`}
                </h3>
                <p className="text-[10px] text-ink-600">Draft PO items and save to queue.</p>
              </div>
              <div className="flex items-center gap-2">
                {poMode === 'VIEW' && selectedPO?.status !== 'Completed' && selectedPO?.status !== 'Received' && (
                  <button
                    onClick={handleOpenEditPO}
                    className="border border-border-subtle hover:bg-ink-100 text-ink-900 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  >
                    Edit Order
                  </button>
                )}
                {poMode !== 'VIEW' && (
                  <div className="flex items-center gap-2 mr-4">
                    {/* CSV Template Download */}
                    <button
                      onClick={handleDownloadPOTemplate}
                      className="border border-border-subtle bg-white hover:bg-ink-50 text-ink-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Download size={12} />
                      Template
                    </button>
                    {/* CSV Upload */}
                    <label className="border border-border-subtle bg-white hover:bg-ink-50 text-ink-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer">
                      <Upload size={12} />
                      Upload CSV
                      <input 
                        type="file"
                        accept=".csv"
                        onChange={handleCSVUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
                {poMode === 'VIEW' && (
                  <button
                    onClick={() => handleDownloadPOPDF(selectedPO)}
                    className="border border-border-subtle hover:bg-ink-100 text-ink-900 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition mr-4"
                  >
                    <FileDown size={12} />
                    Download PDF
                  </button>
                )}
                <button onClick={() => setShowPODrawer(false)} className="text-ink-600 hover:text-ink-900">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Form Info Body */}
            <div className="p-6 border-b border-border-subtle bg-surface/30 grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-ink-600 uppercase font-semibold">Select Vendor</label>
                <select
                  disabled={poMode === 'VIEW'}
                  value={poVendorId}
                  onChange={e => handleVendorChange(e.target.value)}
                  className="w-full bg-white border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">-- Choose Vendor --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.vendor_name} ({v.vendor_code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-ink-600 uppercase font-semibold">PO Order Date</label>
                <input 
                  type="date"
                  disabled={poMode === 'VIEW'}
                  value={poDate}
                  onChange={e => setPoDate(e.target.value)}
                  className="w-full bg-white border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-ink-600 uppercase font-semibold">Remarks & Notes</label>
                <input 
                  type="text"
                  placeholder="Optional internal PO notes..."
                  disabled={poMode === 'VIEW'}
                  value={poRemarks}
                  onChange={e => setPoRemarks(e.target.value)}
                  className="w-full bg-white border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Editable Items Table */}
            <div className="flex-1 overflow-auto p-6">
              {poVendorId === '' ? (
                <div className="text-center py-20 text-ink-500">Please choose a Vendor above to edit Purchase Order lines.</div>
              ) : (
                <div className="border border-border-subtle rounded-xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left text-xs divide-y divide-border-subtle">
                    <thead className="bg-surface text-ink-600 font-semibold uppercase text-[9px] tracking-wider">
                      <tr>
                        <th className="px-4 py-2">Item Name</th>
                        <th className="px-4 py-2 w-20">Stock</th>
                        <th className="px-4 py-2 min-w-[100px]">MRP</th>
                        <th className="px-4 py-2 min-w-[120px]">Purchase Rate</th>
                        <th className="px-4 py-2 min-w-[100px]">Qty</th>
                        <th className="px-4 py-2 min-w-[100px]">Scheme</th>
                        <th className="px-4 py-2 min-w-[100px]">Disc %</th>
                        <th className="px-4 py-2 min-w-[100px]">GST %</th>
                        <th className="px-4 py-2 min-w-[120px] text-right">Net Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle text-ink-800">
                      {poLines.map((line, idx) => (
                        <tr key={line._product_id} className="hover:bg-surface/30 transition">
                          <td className="px-4 py-2 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            <span className="font-semibold block truncate">{line.product_name}</span>
                            <span className="text-[10px] text-ink-500 font-mono truncate">{line.ean_code}</span>
                          </td>
                          <td className="px-4 py-2 font-semibold text-ink-600">{line.current_stock}</td>
                          <td className="px-4 py-2 font-medium">₹{line.mrp.toFixed(2)}</td>
                          <td className="px-4 py-2">
                            <input 
                              type="number"
                              disabled={poMode === 'VIEW'}
                              value={line.price}
                              onChange={e => handlePOLineChange(idx, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full bg-surface border border-border-subtle rounded px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="number"
                              disabled={poMode === 'VIEW'}
                              value={line.qty || ''}
                              placeholder="0"
                              onChange={e => handlePOLineChange(idx, 'qty', parseInt(e.target.value) || 0)}
                              className={`w-full border rounded px-2 py-1 text-xs font-bold ${
                                line.qty > 0 ? 'border-brand-500 bg-brand-50/50' : 'border-border-subtle bg-surface'
                              }`}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="number"
                              disabled={poMode === 'VIEW'}
                              value={line.sch || ''}
                              placeholder="0"
                              onChange={e => handlePOLineChange(idx, 'sch', parseFloat(e.target.value) || 0)}
                              className="w-full bg-surface border border-border-subtle rounded px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="number"
                              disabled={poMode === 'VIEW'}
                              value={line.disc_pct || ''}
                              placeholder="0"
                              onChange={e => handlePOLineChange(idx, 'disc_pct', parseFloat(e.target.value) || 0)}
                              className="w-full bg-surface border border-border-subtle rounded px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="px-4 py-2 font-mono text-ink-500">{line.gst_pct}%</td>
                          <td className="px-4 py-2 text-right font-extrabold text-ink-900">₹{line.net.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Summary & Actions */}
            <div className="px-6 py-4 border-t border-border-subtle bg-surface flex justify-between items-center">
              <div className="flex gap-6">
                <div>
                  <span className="text-[9px] text-ink-600 block uppercase font-semibold">Total Gross</span>
                  <span className="text-sm font-bold text-ink-955">₹{poTotals.gross.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-ink-600 block uppercase font-semibold">Total Taxable</span>
                  <span className="text-sm font-bold text-ink-955">₹{poTotals.taxable.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-ink-600 block uppercase font-semibold">Total GST</span>
                  <span className="text-sm font-bold text-ink-955">₹{poTotals.gst.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-ink-600 block uppercase font-semibold">Grand Net Total</span>
                  <span className="text-base font-extrabold text-brand-600">₹{poTotals.net.toFixed(2)}</span>
                </div>
              </div>
              {poMode !== 'VIEW' && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setShowPODrawer(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSavePO}
                    loading={poMode === 'CREATE' ? createPOMutation.isPending : updatePOMutation.isPending}
                  >
                    {poMode === 'CREATE' ? 'Save Purchase Order' : 'Update Purchase Order'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GRN CREATION MODAL */}
      {showGRNModal && (
        <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-[90vw] max-w-none bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-surface">
              <div>
                <h3 className="text-sm font-extrabold text-ink-900">Inward Supplier Stock (Create GRN)</h3>
                <p className="text-[10px] text-ink-600">Select active PO to import items or record direct purchase.</p>
              </div>
              <div className="flex items-center gap-2">
                {grnVendorId && (
                  <button
                    onClick={handleAddOtherProductsToGRN}
                    className="bg-white border border-border-subtle hover:bg-ink-100 text-ink-900 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  >
                    Add Other Products
                  </button>
                )}
                {/* GRN CSV Template Download */}
                <button
                  onClick={handleDownloadGRNTemplate}
                  className="border border-border-subtle bg-white hover:bg-ink-50 text-ink-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download size={12} />
                  Template
                </button>
                {/* GRN CSV Upload */}
                <label className="border border-border-subtle bg-white hover:bg-ink-50 text-ink-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer">
                  <Upload size={12} />
                  Upload CSV
                  <input 
                    type="file"
                    accept=".csv"
                    onChange={handleGRNCSVUpload}
                    className="hidden"
                  />
                </label>
                <button onClick={() => setShowGRNModal(false)} className="text-ink-600 hover:text-ink-900 ml-4">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* GRN Form Selection */}
            <div className="p-6 border-b border-border-subtle bg-surface/30 grid grid-cols-5 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-ink-600 uppercase font-semibold">Vendor</label>
                <select
                  value={grnVendorId}
                  onChange={e => handleGRNVendorChange(e.target.value)}
                  className="w-full bg-white border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">-- Choose Vendor --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.vendor_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-ink-600 uppercase font-semibold">Purchase Order Ref</label>
                <select
                  value={grnPOId}
                  onChange={e => handleGRNPOSelected(e.target.value)}
                  className="w-full bg-white border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none"
                >
                  <option value="">-- Direct Purchase (No PO) --</option>
                  {pos.filter(p => p.status !== 'Completed' && p.status !== 'Received' && (!grnVendorId || p.vendor_id.toString() === grnVendorId)).map(p => (
                    <option key={p.id} value={p.id}>{p.po_number} ({p.po_date?.split('T')[0]})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-ink-600 uppercase font-semibold">Vendor Invoice No</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. INV-92429"
                  value={vendorInvoiceNo}
                  onChange={e => setVendorInvoiceNo(e.target.value)}
                  className="w-full bg-white border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-ink-600 uppercase font-semibold">Bill Date</label>
                <input 
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full bg-white border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-ink-600 uppercase font-semibold">Received Date</label>
                <input 
                  type="date"
                  value={receivedDate}
                  onChange={e => setReceivedDate(e.target.value)}
                  className="w-full bg-white border border-border-subtle rounded-lg px-3 py-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* GRN Lines Grid */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {grnVendorId === '' ? (
                <div className="text-center py-20 text-ink-500">Please choose a Vendor or PO above to populate goods receipt lines.</div>
              ) : (
                <div className="border border-border-subtle rounded-xl overflow-x-auto bg-white shadow-sm">
                  <table className="text-left text-xs divide-y divide-border-subtle table-fixed w-full min-w-[1300px]">
                    <thead className="bg-surface text-ink-600 font-semibold uppercase text-[9px] tracking-wider">
                      <tr>
                        <th className="px-4 py-2 w-[280px] sticky left-0 bg-surface z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Item Name</th>
                        <th className="px-4 py-2 w-[70px]">MRP</th>
                        <th className="px-4 py-2 w-[80px]">Rate</th>
                        <th className="px-4 py-2 w-[80px]">Inward Qty</th>
                        <th className="px-4 py-2 w-[80px]">Gross ₹</th>
                        <th className="px-4 py-2 w-[70px]">Scheme</th>
                        <th className="px-4 py-2 w-[70px]">Disc %</th>
                        <th className="px-4 py-2 w-[70px]">Disc. ₹</th>
                        <th className="px-4 py-2 w-[90px]">Taxable ₹</th>
                        <th className="px-4 py-2 w-[60px]">Tax %</th>
                        <th className="px-4 py-2 w-[70px]">Tax ₹</th>
                        <th className="px-4 py-2 w-[110px]">Batch No</th>
                        <th className="px-4 py-2 w-[110px]">Expiry</th>
                        <th className="px-4 py-2 w-[90px] text-right">Net ₹</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle text-ink-800">
                      {grnLines.map((line, idx) => (
                        <tr key={line._product_id} className="hover:bg-surface/30 transition">
                          <td className="px-4 py-2 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] align-top">
                            <span className="font-semibold block leading-tight">{line.product_name}</span>
                            <span className="text-[10px] text-ink-500 font-mono mt-1 block">{line.ean_code}</span>
                          </td>
                          <td className="px-4 py-2">₹{line.mrp.toFixed(2)}</td>
                          <td className="px-4 py-2">
                            <input 
                              type="number"
                              value={line.price}
                              onChange={e => handleGRNLineChange(idx, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full bg-surface border border-border-subtle rounded px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="number"
                              value={line.qty || ''}
                              placeholder="0"
                              onChange={e => handleGRNLineChange(idx, 'qty', parseInt(e.target.value) || 0)}
                              className={`w-full border rounded px-2 py-1 text-xs font-bold ${
                                line.qty > 0 ? 'border-brand-500 bg-brand-50/50' : 'border-border-subtle bg-surface'
                              }`}
                            />
                          </td>
                          <td className="px-4 py-2">₹{(line.gross || 0).toFixed(2)}</td>
                          <td className="px-4 py-2">
                            <input 
                              type="number"
                              value={line.sch || ''}
                              placeholder="0.00"
                              onChange={e => handleGRNLineChange(idx, 'sch', parseFloat(e.target.value) || 0)}
                              className="w-full bg-surface border border-border-subtle rounded px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="number"
                              value={line.disc_pct || ''}
                              placeholder="0.00"
                              onChange={e => handleGRNLineChange(idx, 'disc_pct', parseFloat(e.target.value) || 0)}
                              className="w-full bg-surface border border-border-subtle rounded px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="px-4 py-2">₹{(line.disc_amt || 0).toFixed(2)}</td>
                          <td className="px-4 py-2">₹{(line.taxable || 0).toFixed(2)}</td>
                          <td className="px-4 py-2">{line.gst_pct || 5}%</td>
                          <td className="px-4 py-2 text-rose-500">₹{(line.gst_amt || 0).toFixed(2)}</td>
                          <td className="px-4 py-2">
                            <input 
                              type="text"
                              required
                              placeholder="B-101"
                              value={line.batch_no}
                              onChange={e => handleGRNLineChange(idx, 'batch_no', e.target.value)}
                              className="w-full bg-surface border border-border-subtle rounded px-2 py-1 text-xs font-semibold"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="date"
                              value={line.expiry}
                              onChange={e => handleGRNLineChange(idx, 'expiry', e.target.value)}
                              className="w-full bg-surface border border-border-subtle rounded px-2 py-0.5 text-[10px]"
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-extrabold">₹{line.net.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tax Breakup summary block */}
              {grnLines.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] text-ink-600 font-extrabold uppercase tracking-wider">GST Tax Summary Breakup</h4>
                  <div className="border border-border-subtle rounded-xl overflow-hidden bg-surface/20 shadow-sm">
                    <table className="w-full text-left text-xs divide-y divide-border-subtle">
                      <thead className="bg-surface text-ink-600 font-bold uppercase text-[9px]">
                        <tr>
                          <th className="px-4 py-2">Particulars</th>
                          <th className="px-4 py-2">Pcs</th>
                          <th className="px-4 py-2">Gross (₹)</th>
                          <th className="px-4 py-2">Scheme (₹)</th>
                          <th className="px-4 py-2">Disc (₹)</th>
                          <th className="px-4 py-2">Taxable (₹)</th>
                          <th className="px-4 py-2">Tax (₹)</th>
                          <th className="px-4 py-2 text-right">Net (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle text-ink-800">
                        {grnTaxSummary.map(row => (
                          <tr key={row.particulars} className="hover:bg-white/40">
                            <td className="px-4 py-2 font-semibold">{row.particulars}</td>
                            <td className="px-4 py-2">{row.pcs}</td>
                            <td className="px-4 py-2">₹{row.gross.toFixed(2)}</td>
                            <td className="px-4 py-2">₹{row.sch.toFixed(2)}</td>
                            <td className="px-4 py-2">₹{row.disc.toFixed(2)}</td>
                            <td className="px-4 py-2">₹{row.taxable.toFixed(2)}</td>
                            <td className="px-4 py-2 text-rose-500 font-medium">₹{row.tax.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-bold">₹{row.net.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="px-6 py-4 border-t border-border-subtle bg-surface flex justify-between items-center">
              <div className="flex gap-6">
                <div>
                  <span className="text-[9px] text-ink-600 block uppercase font-semibold">Total Items</span>
                  <span className="text-sm font-bold text-ink-955">{grnTotals.qty} pcs</span>
                </div>
                <div>
                  <span className="text-[9px] text-ink-600 block uppercase font-semibold">Invoice Taxable</span>
                  <span className="text-sm font-bold text-ink-955">₹{grnTotals.taxable.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-ink-600 block uppercase font-semibold">Invoice GST</span>
                  <span className="text-sm font-bold text-ink-955">₹{grnTotals.gst.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-ink-600 block uppercase font-semibold">Invoice Total Value</span>
                  <span className="text-base font-extrabold text-brand-600">₹{grnTotals.net.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowGRNModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveGRN}
                  loading={createGRNMutation.isPending}
                  disabled={createGRNMutation.isPending || !vendorInvoiceNo.trim()}
                >
                  Confirm GRN
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW GRN DETAIL SUMMARY MODAL */}
      {showViewGRNModal && selectedGRN && (
        <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-5xl bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-surface">
              <div>
                <h3 className="text-sm font-extrabold text-ink-900">GRN Summary details ({selectedGRN.vendor_invoice_number || `GRN-${selectedGRN.id}`})</h3>
                <p className="text-[10px] text-ink-600">Audit trail, items inward list, and payment allocation status.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadGRNPDF(selectedGRN)}
                  className="border border-border-subtle hover:bg-ink-900 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition mr-2"
                >
                  <FileDown size={12} />
                  Download PDF
                </button>
                <button
                  onClick={() => setShowBatchUpdateModal(true)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition mr-2"
                >
                  Update Batches
                </button>
                {selectedGRN.status !== 'Reversed' && (
                  <button
                    onClick={() => setShowReverseConfirm(true)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition mr-4 animate-pulse"
                  >
                    Reverse GRN
                  </button>
                )}
                <button onClick={() => setShowViewGRNModal(false)} className="text-ink-600 hover:text-ink-900">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* GRN Record Info Grid */}
            <div className="p-6 border-b border-border-subtle bg-surface/30 grid grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[9px] text-ink-600 block uppercase">Supplier</span>
                <span className="font-bold text-ink-900">{selectedGRN.vendor_name}</span>
              </div>
              <div>
                <span className="text-[9px] text-ink-600 block uppercase">Inward Date</span>
                <span>{selectedGRN.received_date?.split('T')[0]}</span>
              </div>
              <div>
                <span className="text-[9px] text-ink-600 block uppercase">Linked PO</span>
                <span className="font-mono text-ink-500">{selectedGRN.po_number || '-'}</span>
              </div>
              <div>
                <span className="text-[9px] text-ink-600 block uppercase">Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  selectedGRN.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}>{selectedGRN.status}</span>
              </div>
            </div>

            {/* Items Listing */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              <div className="border border-border-subtle rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left text-xs divide-y divide-border-subtle">
                  <thead className="bg-surface text-ink-600 font-semibold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="px-4 py-2">Item Name</th>
                      <th className="px-4 py-2">EAN Code</th>
                      <th className="px-4 py-2">Qty Received</th>
                      <th className="px-4 py-2">Cost Price</th>
                      <th className="px-4 py-2">Batch No</th>
                      <th className="px-4 py-2">Expiry</th>
                      <th className="px-4 py-2 text-right">Net Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle text-ink-800">
                    {grnLines.map((l: any, i: number) => (
                      <tr key={i} className="hover:bg-surface/30">
                        <td className="px-4 py-2 font-semibold">{l.product_name}</td>
                        <td className="px-4 py-2 font-mono text-[10px] text-ink-500">{l.ean_code}</td>
                        <td className="px-4 py-2 font-bold">{l.qty}</td>
                        <td className="px-4 py-2">₹{Number(l.price).toFixed(2)}</td>
                        <td className="px-4 py-2 font-mono">{l.batch_no}</td>
                        <td className="px-4 py-2">{l.expiry}</td>
                        <td className="px-4 py-2 text-right font-extrabold text-ink-900">₹{l.net.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary calculations */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface/10 border border-border-subtle rounded-xl p-4 space-y-2">
                  <h4 className="text-[10px] text-ink-600 font-extrabold uppercase">Payment Reconciliation Status</h4>
                  <div className="flex justify-between items-center text-xs">
                    <span>Total Bill Value:</span>
                    <span className="font-bold">₹{Number(selectedGRN.grand_total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>Paid Amount:</span>
                    <span className="font-semibold text-emerald-600">₹{Number(selectedGRN.paid_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-border-subtle pt-2">
                    <span className="font-semibold">Remaining Balance:</span>
                    <span className="font-extrabold text-rose-600">₹{Number(selectedGRN.balance || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reverse Warning Confirm Overlay */}
            {showReverseConfirm && (
              <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                  <div className="flex items-center gap-3 text-rose-600">
                    <AlertCircle size={24} />
                    <h4 className="font-extrabold text-sm">Caution: Reverse Stock Entry?</h4>
                  </div>
                  <p className="text-xs text-ink-700 leading-relaxed">
                    This will delete all stock entries associated with this Goods Received Note and adjust vendor balances. This action is irreversible.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => setShowReverseConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleConfirmReverseGRN}
                      loading={reverseGRNMutation.isPending}
                    >
                      Confirm Reversal
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Batch Update Modal */}
      {showBatchUpdateModal && selectedGRN && (
        <GRNBatchUpdateModal 
          open={showBatchUpdateModal} 
          onClose={() => setShowBatchUpdateModal(false)}
          grnId={selectedGRN.id}
          poNumber={selectedGRN.po_number}
        />
      )}
    </div>
  )
}
