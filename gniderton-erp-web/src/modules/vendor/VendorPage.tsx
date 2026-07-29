import { useState, useMemo, useEffect } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { 
  useVendors, 
  useVendorAddresses, 
  useVendorPaymentHistory, 
  usePurchaseInvoices, 
  useBankAccounts, 
  useCreateVendor, 
  useUpdateVendor, 
  useAddAddress, 
  useRecordPayment,
  useVendorLedger,
  useUnconsumedDebits
} from './hooks'
import { vendorApi } from './api'
import { api } from '@/lib/axios'
import type { Vendor, VendorAddress, VendorPayment } from './types'
import { 
  Search, Plus, MapPin, RefreshCw, Send, DollarSign, 
  User, CheckCircle2, AlertCircle, FileText, X, Phone, BookOpen, History, Download, FileDown
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function VendorPage() {
  // Queries
  const { data: vendorsRaw, isLoading: loadingVendors, refetch: refetchVendors } = useVendors()
  const { data: invoicesRaw } = usePurchaseInvoices()
  const { data: bankAccountsRaw } = useBankAccounts()
  const { data: unconsumedDebitsRaw } = useUnconsumedDebits()

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

  // Mutations
  const createVendorMutation = useCreateVendor()
  const updateVendorMutation = useUpdateVendor()
  const addAddressMutation = useAddAddress()
  const recordPaymentMutation = useRecordPayment()

  // Support wrappers (Axios returns the unwrapped data or wrapped array, handle both safely)
  const vendors: Vendor[] = (Array.isArray(vendorsRaw) ? vendorsRaw : (vendorsRaw as any)?.data) || []
  const invoices: any[] = (Array.isArray(invoicesRaw) ? invoicesRaw : (invoicesRaw as any)?.data) || []
  const bankAccounts: any[] = (Array.isArray(bankAccountsRaw) ? bankAccountsRaw : (bankAccountsRaw as any)?.data) || []
  const unconsumedDebits: any[] = (Array.isArray(unconsumedDebitsRaw) ? unconsumedDebitsRaw : (unconsumedDebitsRaw as any)?.data) || []

  // Component State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  
  // Drawer/Modal states
  const [showProfileDrawer, setShowProfileDrawer] = useState(false) // drawerVendorProfile
  const [showCreateModal, setShowCreateModal] = useState(false) // ModalCreateVendor
  const [showAddAddressModal, setShowAddAddressModal] = useState(false) // modalAddAddress
  const [showPaymentModal, setShowPaymentModal] = useState(false) // modalMakePayment

  // Tab State inside drawer ('profile', 'invoices', 'ledger', 'history')
  const [activeTab, setActiveTab] = useState<'profile' | 'invoices' | 'ledger' | 'history'>('profile')

  // Profile Edit fields
  const [profileEditing, setProfileEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Vendor>>({})

  // Ledger Filter states
  const [ledgerStartDate, setLedgerStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [ledgerEndDate, setLedgerEndDate] = useState(new Date().toISOString().split('T')[0])

  // Payment Form states
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_mode: 'Bank Transfer',
    transaction_type: 'PAYMENT',
    bank_account_id: '',
    remarks: '',
    reference_no: '',
    cheque_no: '',
    cheque_date: '',
    cheque_bank: ''
  })
  
  // Address Form state
  const [addressForm, setAddressForm] = useState({
    address_line: '',
    city: '',
    state_code: 'Kerala',
    district: 'Kozhikode',
    pin_code: '',
    is_default: false
  })

  // Selected invoices for payment allocations
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<(string | number)[]>([])

  // Create Vendor Form state
  const [createForm, setCreateForm] = useState({
    vendor_name: '',
    vendor_code: '',
    gst: '',
    pan: '',
    contact_no: '',
    email: '',
    address_line1: '',
    state: 'Kerala',
    district: 'Kozhikode',
    pin_code: '',
    bank_name: '',
    bank_account_no: '',
    bank_ifsc: ''
  })

  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Sub-queries enabled dynamically on selected vendor
  const { data: addressesRaw, refetch: refetchAddresses } = useVendorAddresses(selectedVendor?.id || null)
  const { data: paymentHistoryRaw, refetch: refetchHistory } = useVendorPaymentHistory(selectedVendor?.id || null)
  const { data: ledgerRaw, refetch: refetchLedger } = useVendorLedger(selectedVendor?.id || null)

  const addresses: VendorAddress[] = (Array.isArray(addressesRaw) ? addressesRaw : (addressesRaw as any)?.data) || []
  const paymentHistory: VendorPayment[] = (Array.isArray(paymentHistoryRaw) ? paymentHistoryRaw : (paymentHistoryRaw as any)?.data) || []
  const ledgerTransactions: any[] = (Array.isArray(ledgerRaw) ? ledgerRaw : (ledgerRaw as any)?.data) || []

  // 1. Dynamic Pending Bills logic (getVendorPendingBills)
  const pendingInvoices = useMemo(() => {
    if (!selectedVendor) return []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return invoices
      .filter(bill => bill && Number(bill.vendor_id) === Number(selectedVendor.id) && Number(bill.balance) > 0)
      .map(bill => {
        const receivedDate = new Date(bill.received_date || bill.invoice_date)
        receivedDate.setHours(0, 0, 0, 0)
        const diffTime = today.getTime() - receivedDate.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        return {
          ...bill,
          ar_days: diffDays >= 0 ? diffDays : 0
        }
      })
  }, [invoices, selectedVendor])

  // 2. Dynamic Ledger statements calculations (Ledger_Logic)
  const ledgerData = useMemo(() => {
    const emptyResult = { opening_balance: 0, transactions: [] as any[], closing_balance: 0 }
    if (!selectedVendor || ledgerTransactions.length === 0) return emptyResult

    const start = new Date(ledgerStartDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(ledgerEndDate)
    end.setHours(23, 59, 59, 999)

    let openingBalance = 0
    const filteredTxns: any[] = []

    // Sort transactions chronologically
    const sorted = [...ledgerTransactions].sort((a, b) => {
      const dateA = new Date(a.date || a.created_at).getTime()
      const dateB = new Date(b.date || b.created_at).getTime()
      return dateA - dateB
    })

    sorted.forEach(txn => {
      const txnDate = new Date(txn.date || txn.created_at)
      const netChange = (Number(txn.credit_amount) || 0) - (Number(txn.debit_amount) || 0)

      if (txnDate.getTime() < start.getTime()) {
        openingBalance += netChange
      } else if (txnDate.getTime() <= end.getTime() && txnDate.getTime() >= start.getTime()) {
        filteredTxns.push({
          ...txn,
          net_change: netChange
        })
      }
    })

    let running = openingBalance
    const finalTxns = filteredTxns.map(t => {
      running += t.net_change
      return {
        ...t,
        running_balance: Number(running.toFixed(2))
      }
    })

    return {
      opening_balance: Number(openingBalance.toFixed(2)),
      transactions: finalTxns,
      closing_balance: Number(running.toFixed(2))
    }
  }, [ledgerTransactions, selectedVendor, ledgerStartDate, ledgerEndDate])

  // Sum of checked pending bills balance
  const selectedBillsBalance = useMemo(() => {
    return pendingInvoices
      .filter(b => selectedInvoiceIds.includes(b.id))
      .reduce((acc, b) => acc + (Number(b.balance) || 0), 0)
  }, [pendingInvoices, selectedInvoiceIds])

  // Trigger Profile drawer
  const handleOpenProfile = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setEditForm(vendor)
    setProfileEditing(false)
    setSelectedInvoiceIds([])
    setActiveTab('profile')
    setShowProfileDrawer(true)
  };

  const handleStartEditProfile = () => {
    if (selectedVendor) {
      setEditForm(selectedVendor)
      setProfileEditing(true)
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVendor) return
    try {
      await updateVendorMutation.mutateAsync({
        id: selectedVendor.id,
        payload: editForm
      })
      setProfileEditing(false)
      setSelectedVendor(prev => prev ? { ...prev, ...editForm } : null)
      refetchVendors()
      setAlertMsg({ type: 'success', text: 'Supplier profile updated successfully!' })
    } catch (err) {
      setAlertMsg({ type: 'error', text: 'Failed to update vendor.' })
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVendor) return
    try {
      await addAddressMutation.mutateAsync({
        vendorId: selectedVendor.id,
        payload: addressForm
      })
      setAddressForm({
        address_line: '',
        city: '',
        state_code: 'Kerala',
        district: 'Kozhikode',
        pin_code: '',
        is_default: false
      })
      setShowAddAddressModal(false)
      refetchAddresses()
      setAlertMsg({ type: 'success', text: 'Location address registered!' })
    } catch (err) {
      setAlertMsg({ type: 'error', text: 'Failed to register address.' })
    }
  };

  const handleOpenMakePayment = () => {
    setPaymentForm({
      amount: selectedBillsBalance > 0 ? selectedBillsBalance.toFixed(2) : '',
      payment_mode: 'Bank Transfer',
      transaction_type: 'PAYMENT',
      bank_account_id: bankAccounts[0]?.id ? bankAccounts[0].id.toString() : '',
      remarks: '',
      reference_no: '',
      cheque_no: '',
      cheque_date: '',
      cheque_bank: ''
    })
    setShowPaymentModal(true)
  };

  const handlePaymentModeChange = (mode: string) => {
    setPaymentForm(prev => ({
      ...prev,
      payment_mode: mode,
      bank_account_id: mode === 'Cash' ? '1' : (bankAccounts[0]?.id ? bankAccounts[0].id.toString() : ''),
      reference_no: ''
    }))
  };

  const handleUtrSelectChange = (val: string) => {
    const entry = unconsumedDebits.find(d => String(d.id) === String(val))
    setPaymentForm(prev => ({
      ...prev,
      reference_no: val,
      amount: entry ? parseFloat(entry.debit_amount || 0).toFixed(2) : prev.amount
    }))
  };

  // savePaymentJS.submitPayment (FIFO Allocator)
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVendor) return
    const totalAmount = Number(paymentForm.amount || 0)
    if (!totalAmount || totalAmount <= 0) {
      setAlertMsg({ type: 'error', text: 'Please enter a valid billing amount.' })
      return
    }

    let allocations = []
    if (paymentForm.transaction_type !== 'REFUND') {
      const selectedBills = pendingInvoices.filter(b => selectedInvoiceIds.includes(b.id))
      let remaining = totalAmount
      for (const bill of selectedBills) {
        if (remaining <= 0) break
        const balance = Number(bill.balance || 0)
        const alloc = Math.min(balance, remaining)
        if (alloc > 0) {
          allocations.push({
            invoice_id: bill.id,
            amount: Number(alloc.toFixed(2))
          })
          remaining -= alloc
        }
      }
    }

    try {
      const selectedDebitEntry = unconsumedDebits.find(d => String(d.id) === String(paymentForm.reference_no))
      const refNo = selectedDebitEntry ? selectedDebitEntry.bank_ref_id : (paymentForm.reference_no === 'CUSTOM' ? '' : paymentForm.reference_no)
      const statementId = selectedDebitEntry ? selectedDebitEntry.id : null

      const payload = {
        vendor_id: Number(selectedVendor.id),
        amount: totalAmount,
        payment_date: new Date().toISOString().split('T')[0],
        mode: paymentForm.payment_mode,
        transaction_type: paymentForm.transaction_type,
        remarks: paymentForm.remarks,
        bank_account_id: paymentForm.bank_account_id ? parseInt(paymentForm.bank_account_id) : undefined,
        allocations: paymentForm.transaction_type === 'REFUND' ? [] : allocations,
        transaction_ref: paymentForm.payment_mode === 'Bank Transfer' ? refNo : paymentForm.payment_mode === 'Cheque' ? paymentForm.cheque_no : paymentForm.reference_no,
        bank_statement_entry_id: paymentForm.payment_mode === 'Bank Transfer' ? statementId : null,
        cheque_no: paymentForm.cheque_no || undefined,
        cheque_date: paymentForm.cheque_date || undefined,
        bank_name: paymentForm.cheque_bank || undefined
      }

      await recordPaymentMutation.mutateAsync(payload)
      setShowPaymentModal(false)
      setSelectedInvoiceIds([])
      setAlertMsg({ type: 'success', text: 'Supplier payment voucher logged successfully!' })
      refetchLedger()
      refetchHistory()
    } catch (err) {
      setAlertMsg({ type: 'error', text: 'Voucher logging failed.' })
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createVendorMutation.mutateAsync(createForm)
      setCreateForm({
        vendor_name: '',
        vendor_code: '',
        gst: '',
        pan: '',
        contact_no: '',
        email: '',
        address_line1: '',
        state: 'Kerala',
        district: 'Kozhikode',
        pin_code: '',
        bank_name: '',
        bank_account_no: '',
        bank_ifsc: ''
      })
      setShowCreateModal(false)
      refetchVendors()
      setAlertMsg({ type: 'success', text: 'Supplier registered successfully!' })
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Failed to register vendor.' })
    }
  };

  // PDF slip generator previewPaymentSlip using jsPDF (replicated from original Appsmith blueprint)
  const handleDownloadPaymentSlip = async (payment: VendorPayment) => {
    if (!selectedVendor) return
    try {
      const data = await vendorApi.paymentSlip(payment.id)
      if (!data || !data.header) throw new Error("Payment data not found.")
      const header = data.header
      const allocations = data.allocations || []
      const reconciliations = data.invoice_reconciliation || []
      const pageWidth = 595
      const margin = 17.5

      const toWordsIndian = (num: number) => {
        const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen ']
        const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
        const n = ("000000000" + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/)
        if (!n) return ''
        let str = ''
        str += Number(n[1]) != 0 ? (a[Number(n[1])] || b[parseInt(n[1][0])] + ' ' + a[parseInt(n[1][1])]) + 'Crore ' : ''
        str += Number(n[2]) != 0 ? (a[Number(n[2])] || b[parseInt(n[2][0])] + ' ' + a[parseInt(n[2][1])]) + 'Lakh ' : ''
        str += Number(n[3]) != 0 ? (a[Number(n[3])] || b[parseInt(n[3][0])] + ' ' + a[parseInt(n[3][1])]) + 'Thousand ' : ''
        str += Number(n[4]) != 0 ? (a[Number(n[4])] || b[parseInt(n[4][0])] + ' ' + a[parseInt(n[4][1])]) + 'Hundred ' : ''
        str += Number(n[5]) != 0 ? (str != '' ? 'and ' : '') + (a[Number(n[5])] || b[parseInt(n[5][0])] + ' ' + a[parseInt(n[5][1])]) + 'Only' : 'Only'
        return str
      }

      const doc = new jsPDF('p', 'pt', 'a4')
      
      // Default fallback brand values matching ERP defaults
      const brand = {
        regt_name: companySettings?.company_name || companySettings?.regt_name || "GNIDERTON DISTRIBUTIONS PVT LTD",
        address: [companySettings?.address, companySettings?.district].filter(Boolean).join(', ') || "Industrial Development Area, Kozhikode, Kerala",
        gst: companySettings?.gstin || companySettings?.gst || "32AAACG1924D1ZS"
      }

      try {
        if (companySettings?.logo) {
          const logoData = companySettings.logo.startsWith('data:image') 
            ? companySettings.logo 
            : `data:image/png;base64,${companySettings.logo}`;
          doc.addImage(logoData, 'PNG', margin, 30, 110, 35)
        }
      } catch (e) {}

      doc.setFontSize(16)
      doc.setTextColor(0)
      doc.setFont("helvetica", "bold")
      doc.text("PAYMENT VOUCHER", pageWidth / 2, 55, { align: 'center' })
      doc.setLineWidth(1.5)
      doc.line(230, 60, 365, 60)

      const boxWidth = (pageWidth - margin * 2 - 10) / 3
      const boxY = 85
      doc.setLineWidth(1)
      doc.setDrawColor(0)
      doc.rect(margin, boxY, boxWidth, 100)
      doc.setFontSize(8)
      doc.text("VOUCHER DETAILS", margin + 5, boxY + 12)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.text(`Slip No: ${header.payment_number || '-'}`, margin + 5, boxY + 30)
      doc.text(`Date: ${header.payment_date ? new Date(header.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '-'}`, margin + 5, boxY + 45)
      doc.text(`Mode: ${header.payment_mode || '-'}`, margin + 5, boxY + 60)
      doc.text(`Ref: ${header.final_ref || '-'}`, margin + 5, boxY + 75)

      // Box 2: Issued By
      doc.rect(margin + boxWidth + 5, boxY, boxWidth, 100)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.text("ISSUED BY", margin + boxWidth + 10, boxY + 12)
      doc.setFontSize(9)
      doc.text(brand.regt_name, margin + boxWidth + 10, boxY + 28, { maxWidth: boxWidth - 15 })
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.text(brand.address, margin + boxWidth + 10, boxY + 40, { maxWidth: boxWidth - 15 })
      doc.text(`GST: ${brand.gst}`, margin + boxWidth + 10, boxY + 70)
      doc.text(`Bank: ${header.bank_name || 'N/A'}`, margin + boxWidth + 10, boxY + 92)

      // Box 3: Paid To
      doc.rect(margin + boxWidth * 2 + 10, boxY, boxWidth, 100)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.text("PAID TO", margin + boxWidth * 2 + 15, boxY + 12)
      doc.setFontSize(9)
      doc.text(header.vendor_name || selectedVendor.vendor_name, margin + boxWidth * 2 + 15, boxY + 28, { maxWidth: boxWidth - 15 })
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.text(`Code: ${header.vendor_code || selectedVendor.vendor_code || '-'}`, margin + boxWidth * 2 + 15, boxY + 45)
      doc.text(`GST: ${header.vendor_gst || selectedVendor.gst || '-'}`, margin + boxWidth * 2 + 15, boxY + 58)
      doc.text(`Location: ${header.vendor_city || selectedVendor.district || ''}`, margin + boxWidth * 2 + 15, boxY + 84)

      const mainBody = allocations.map((a: any) => [
        a.invoice_date ? new Date(a.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '-',
        a.bill_no_vendor || a.invoice_number || '-',
        Number(a.bill_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        Number(a.amount_paid || a.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
      ])

      autoTable(doc, {
        startY: 195,
        head: [['Bill Date', 'Vendor Bill No', 'Bill Amount', 'Paid Now']],
        body: mainBody,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: 0,
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          lineWidth: 0.5,
          lineColor: [0, 0, 0]
        },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right', fontStyle: 'bold' }
        },
        styles: {
          fontSize: 8,
          cellPadding: 5,
          lineColor: [0, 0, 0],
          lineWidth: 0.5
        },
        margin: { left: margin, right: margin }
      })

      let reconY = (doc as any).lastAutoTable.finalY + 30
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0)
      doc.text("SETTLEMENT RECONCILIATION:", margin, reconY)
      reconY += 10

      reconciliations.forEach((recon: any) => {
        if (reconY > 730) {
          doc.addPage()
          reconY = 40
        }
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(0)
        doc.text(`Audit Trail for Bill: ${recon.bill_no_vendor || recon.invoice_number}`, margin, reconY + 12)

        const historyRows = (recon.full_history || []).map((h: any) => [
          `Debit: ${h.type} (${h.ref_no})`,
          Number(h.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })
        ])

        const reconData = [
          [
            { content: 'Total Bill Value (Credit)', styles: { fontStyle: 'bold' as const } },
            { content: Number(recon.bill_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' as const } }
          ],
          ...historyRows,
          [
            { content: 'Closing Balance', styles: { fontStyle: 'bold' as const } },
            { content: Number(recon.balance_remaining).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' as const } }
          ]
        ]

        autoTable(doc, {
          startY: reconY + 15,
          body: reconData,
          theme: 'grid',
          styles: {
            fontSize: 7,
            cellPadding: 3,
            lineColor: [0, 0, 0],
            lineWidth: 0.5,
            fillColor: [255, 255, 255]
          },
          columnStyles: {
            1: { halign: 'right', cellWidth: 80 }
          },
          margin: { left: margin, right: margin + 200 }
        })
        reconY = (doc as any).lastAutoTable.finalY + 15
      })

      if (reconY > 750) {
        doc.addPage()
        reconY = 40
      }

      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0)
      doc.text(`TOTAL PAID: Rs.${Number(header.amount || payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, margin, reconY + 20)

      const wordString = toWordsIndian(header.amount || payment.amount)
      doc.setFontSize(9)
      doc.setFont("helvetica", "italic")
      doc.setTextColor(50)
      doc.text(`Rupees: ${wordString}`, margin, reconY + 35)

      doc.setFont("helvetica", "normal")
      doc.setTextColor(0)
      doc.setFontSize(9)
      doc.text("Remarks: " + (header.remarks || payment.remarks || '-'), margin, reconY + 55)

      doc.setFont("helvetica", "bold")
      doc.text("For " + brand.regt_name, pageWidth - margin, reconY + 75, { align: 'right' })
      doc.line(pageWidth - margin - 150, reconY + 110, pageWidth - margin, reconY + 110)
      doc.text("Authorized Signatory", pageWidth - margin, reconY + 125, { align: 'right' })

      doc.save(`Voucher_${header.payment_number || 'Draft'}.pdf`)
      setAlertMsg({ type: 'success', text: 'Voucher statement PDF downloaded!' })
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: `Voucher PDF failed: ${err.message}` })
    }
  };

  const handleDownloadLedgerExcel = () => {
    if (!selectedVendor) return
    try {
      const escapeCSV = (str: any) => {
        if (str === null || str === undefined) return '""'
        const s = String(str)
        return `"${s.replace(/"/g, '""')}"`
      }

      let csvContent = "VENDOR LEDGER STATEMENT\n"
      csvContent += `Vendor:,${escapeCSV(selectedVendor.vendor_name)}\n`
      csvContent += `Code:,${escapeCSV(selectedVendor.vendor_code)}\n`
      csvContent += `Period:,${ledgerStartDate} to ${ledgerEndDate}\n`
      csvContent += `Opening Balance:,${ledgerData.opening_balance.toFixed(2)}\n`
      csvContent += `Closing Balance:,${ledgerData.closing_balance.toFixed(2)}\n`
      csvContent += `\n`

      csvContent += `DATE,TYPE,REFERENCE,DESCRIPTION,DEBIT,CREDIT,BALANCE\n`

      ledgerData.transactions.forEach(row => {
        const date = row.date?.split('T')[0] || row.created_at?.split('T')[0] || ''
        const type = row.type || ''
        const ref = row.reference_number || ''
        const desc = row.description || ''
        const deb = Number(row.debit_amount || 0).toFixed(2)
        const cred = Number(row.credit_amount || 0).toFixed(2)
        const bal = Number(row.running_balance || 0).toFixed(2)

        csvContent += `${date},${escapeCSV(type)},${escapeCSV(ref)},${escapeCSV(desc)},${deb},${cred},${bal}\n`
      })

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `Ledger_${selectedVendor.vendor_name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setAlertMsg({ type: 'success', text: 'Ledger statement Excel (CSV) downloaded!' })
    } catch (e: any) {
      setAlertMsg({ type: 'error', text: `Excel export failed: ${e.message}` })
    }
  }

  const handleDownloadLedgerPDF = () => {
    if (!selectedVendor) return
    try {
      const doc = new jsPDF('p', 'pt', 'a4')
      const margin = 17.5
      const pageWidth = 595
      const downloadTimestamp = new Date().toLocaleString()

      const brand = {
        regt_name: companySettings?.company_name || companySettings?.regt_name || "GNIDERTON DISTRIBUTIONS PVT LTD",
        address: [companySettings?.address, companySettings?.district].filter(Boolean).join(', ') || "Industrial Development Area, Kozhikode, Kerala",
        gst: companySettings?.gstin || companySettings?.gst || "32AAACG1924D1ZS",
        email: companySettings?.email || "accounts@gniderton.com",
        contact_no: companySettings?.contact_no || "+91 495 272 1924"
      }

      const drawMainHeader = (currentPage: number, totalPages: number) => {
        try {
          if (companySettings?.logo) {
            const logoData = companySettings.logo.startsWith('data:image') 
              ? companySettings.logo 
              : `data:image/png;base64,${companySettings.logo}`;
            doc.addImage(logoData, 'PNG', margin, margin, 75, 25)
          }
        } catch(e) {}

        doc.setTextColor(0, 0, 0)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(16)
        doc.text("VENDOR LEDGER STATEMENT", pageWidth / 2, margin + 15, { align: "center" })
        doc.setFontSize(11)
        doc.text(`${ledgerStartDate} to ${ledgerEndDate}`, pageWidth / 2, margin + 30, { align: "center" })

        const boxesY = margin + 40
        const gap = 8
        const boxWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3
        const boxHeight = 95

        // BOX 1: Our Details
        drawSimpleBox(doc, margin, boxesY, boxWidth, boxHeight, [
          ["From", brand.regt_name],
          ["Address", brand.address],
          ["GST", brand.gst],
          ["Email", brand.email],
          ["Phone", brand.contact_no]
        ])

        // BOX 2: Vendor Details
        const vAddr = [selectedVendor.address_line1, selectedVendor.address_line2, selectedVendor.district, selectedVendor.state].filter(Boolean).join(", ")
        drawSimpleBox(doc, margin + boxWidth + gap, boxesY, boxWidth, boxHeight, [
          ["To", selectedVendor.vendor_name],
          ["Address", vAddr || "-"],
          ["Code", selectedVendor.vendor_code || "-"],
          ["GSTIN", selectedVendor.gst || "-"],
          ["Phone", selectedVendor.contact_no || "-"]
        ], 50)

        // BOX 3: Summary
        const totalDebit = ledgerData.transactions.reduce((acc, t) => acc + (Number(t.debit_amount) || 0), 0)
        const totalCredit = ledgerData.transactions.reduce((acc, t) => acc + (Number(t.credit_amount) || 0), 0)
        drawSimpleBox(doc, margin + (boxWidth * 2) + (gap * 2), boxesY, boxWidth, boxHeight, [
          ["Opening Bal", `$${ledgerData.opening_balance.toFixed(2)}`, true],
          ["Total Debit", `$${totalDebit.toFixed(2)}`, true],
          ["Total Credit", `$${totalCredit.toFixed(2)}`, true],
          ["Closing Bal", `$${ledgerData.closing_balance.toFixed(2)}`, true],
          ["Printed On", downloadTimestamp],
          ["PAGE", `${currentPage} / ${totalPages}`]
        ], 65)

        return boxesY + boxHeight
      }

      const drawSimpleBox = (docObj: any, x: number, y: number, width: number, height: number, rows: any[], labelWidth = 58) => {
        docObj.setDrawColor(0, 0, 0)
        docObj.setLineWidth(0.5)
        docObj.rect(x, y, width, height)
        let rowY = y + 11

        rows.forEach(r => {
          docObj.setFontSize(8)
          docObj.setFont("helvetica", "bold")
          docObj.setTextColor(0, 0, 0)
          const label = String(r[0]) + ":"
          docObj.text(label, x + 5, rowY)
          docObj.setFont("helvetica", "normal")

          const val = String(r[1] || "-")
          const isRightAlign = r[2] === true

          if (isRightAlign) {
            docObj.text(val, x + width - 5, rowY, { align: 'right' })
            rowY += 11
          } else {
            const splitVal = docObj.splitTextToSize(val, width - labelWidth - 5)
            docObj.text(splitVal, x + labelWidth, rowY)
            rowY += (splitVal.length * 9.5) + 1.5
          }
        })
      }

      const tableStartY = margin + 40 + 95 + 10
      const bodyRows = ledgerData.transactions.map(row => [
        row.date?.split('T')[0] || row.created_at?.split('T')[0] || '',
        row.type || 'Transaction',
        row.reference_number || '-',
        row.description || '-',
        Number(row.debit_amount || 0).toFixed(2),
        Number(row.credit_amount || 0).toFixed(2),
        Number(row.running_balance || 0).toFixed(2)
      ])

      autoTable(doc, {
        startY: tableStartY,
        margin: { left: margin, right: margin, top: 157, bottom: 15 },
        head: [["DATE", "TYPE", "REFERENCE #", "DESCRIPTION", "DEBIT", "CREDIT", "BALANCE"]],
        body: bodyRows.length > 0 ? bodyRows : [['-', '-', '-', 'No transactions in this period', '0.00', '0.00', ledgerData.opening_balance.toFixed(2)]],
        didDrawPage: (data) => {
          drawMainHeader(data.pageNumber, doc.getNumberOfPages())
        },
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.5, textColor: [0, 0, 0], overflow: 'linebreak', valign: 'middle' },
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.5 },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 55 },
          2: { cellWidth: 80 },
          3: { cellWidth: 'auto', minCellWidth: 100 },
          4: { halign: 'right', cellWidth: 60 },
          5: { halign: 'right', cellWidth: 60 },
          6: { halign: 'right', cellWidth: 70, fontStyle: 'bold' }
        }
      })

      doc.save(`Ledger_${selectedVendor.vendor_name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
      setAlertMsg({ type: 'success', text: 'Ledger statement PDF downloaded!' })
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: `Ledger PDF failed: ${err.message}` })
    }
  }

  const filteredVendors = vendors.filter(v => 
    (v.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.vendor_code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        eyebrow="VEN · Buy"
        title="Supplier Directory"
        description="Verify supplier ledger balances, reconcile accounts, and record payment actions."
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-md shadow-brand-500/10"
          >
            <Plus size={14} />
            Create New Vendor
          </button>
        }
      />

      {alertMsg && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs ${
          alertMsg.type === 'error' ? 'bg-danger-500/10 text-danger-600 border border-danger-500/20' : 
          'bg-success-500/10 text-success-600 border border-success-500/20'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span className="font-medium">{alertMsg.text}</span>
          </div>
          <button onClick={() => setAlertMsg(null)} className="text-ink-600 font-bold text-sm">&times;</button>
        </div>
      )}

      {/* Primary supplier list table */}
      {loadingVendors ? (
        <div className="h-64 flex items-center justify-center text-xs text-ink-600/60 gap-2">
          <RefreshCw className="animate-spin" size={14} />
          Loading supplier register...
        </div>
      ) : (
        <div className="space-y-4 w-full">
          <div className="glass-card p-4 rounded-xl border border-border-subtle bg-white shadow-sm flex items-center w-full">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-3 text-ink-600" size={15} />
              <input 
                type="text" 
                placeholder="Search vendor directory by name or code..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-surface border border-border-subtle rounded-lg pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-brand-400 text-ink-900 placeholder:text-ink-600"
              />
            </div>
          </div>

          <div className="glass-card rounded-xl border border-border-subtle overflow-hidden w-full shadow-sm bg-white">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs divide-y divide-border-subtle">
                <thead className="bg-surface text-ink-600 font-semibold">
                  <tr>
                    <th className="p-3">Vendor Code</th>
                    <th className="p-3">Vendor Name</th>
                    <th className="p-3">Contact Person</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">GST No</th>
                    <th className="p-3">Active</th>
                    <th className="p-3 text-right">Credit Terms</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-white">
                  {filteredVendors.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-ink-600/50 italic">
                        No vendors matched the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredVendors.map((v) => (
                      <tr key={v.id} className="hover:bg-surface/30 transition-colors">
                        <td className="p-3 font-semibold text-ink-900">{v.vendor_code || 'N/A'}</td>
                        <td className="p-3 font-medium text-ink-900">{v.vendor_name}</td>
                        <td className="p-3 text-ink-600">{v.contact_person || '—'}</td>
                        <td className="p-3">
                          {v.contact_no ? (
                            <a 
                              href={`whatsapp://send?phone=${v.contact_no}`}
                              className="text-brand-600 hover:underline flex items-center gap-1 font-medium"
                            >
                              <Phone size={12} />
                              {v.contact_no}
                            </a>
                          ) : '—'}
                        </td>
                        <td className="p-3 text-ink-600 font-mono">{v.gst || '—'}</td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            v.is_active !== false ? 'bg-success-500/10 text-success-600' : 'bg-danger-500/10 text-danger-600'
                          }`}>
                            {v.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-medium text-ink-900">
                          {v.credit_period_days || 30} Days
                        </td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => handleOpenProfile(v)}
                            className="text-[10px] text-brand-600 hover:underline font-bold"
                          >
                            View Profile
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: drawerVendorProfile */}
      {showProfileDrawer && selectedVendor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="glass-panel w-full max-w-6xl h-screen flex flex-col shadow-2xl border-l border-border-subtle animate-slide-in bg-surface">
            
            {/* Profile Slider Header */}
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-white">
              <div>
                <h3 className="font-bold text-sm text-ink-900">{selectedVendor.vendor_name}</h3>
                <p className="text-[10px] text-ink-600 mt-0.5">Code: {selectedVendor.vendor_code || 'N/A'}</p>
              </div>
              <button onClick={() => setShowProfileDrawer(false)} className="text-ink-600 hover:text-ink-900">
                <X size={18} />
              </button>
            </div>

            {/* Sub-tabs selector bar */}
            <div className="flex border-b border-border-subtle bg-white px-6">
              {[
                { id: 'profile', label: 'Supplier Profile', icon: User },
                { id: 'invoices', label: 'Outstanding Bills', icon: FileText },
                { id: 'ledger', label: 'Ledger Statement', icon: BookOpen },
                { id: 'history', label: 'Payment Vouchers', icon: History }
              ].map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all -mb-px ${
                      activeTab === t.id 
                        ? 'border-brand-600 text-brand-600' 
                        : 'border-transparent text-ink-600 hover:text-ink-900'
                    }`}
                  >
                    <Icon size={14} />
                    {t.label}
                  </button>
                )
              })}
            </div>

            {/* Dynamic tabs window */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* TAB 1: Profile & Locations */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-xs text-ink-900 uppercase tracking-wider">General Information</h4>
                    {!profileEditing ? (
                      <button 
                        onClick={handleStartEditProfile}
                        className="text-xs text-brand-600 font-semibold hover:underline"
                      >
                        Edit Profile
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setProfileEditing(false)}
                          className="text-xs text-ink-600 hover:underline"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleSaveProfile}
                          className="text-xs text-brand-600 font-semibold hover:underline"
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-border-subtle bg-white">
                      <span className="text-[10px] text-ink-500 uppercase font-semibold">Contact Phone</span>
                      {profileEditing ? (
                        <input 
                          type="text" 
                          value={editForm.contact_no || ''} 
                          onChange={e => setEditForm({ ...editForm, contact_no: e.target.value })}
                          className="w-full mt-1 border border-border-subtle bg-surface px-2 py-1 rounded text-xs"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-ink-900 mt-1">{selectedVendor.contact_no || '—'}</p>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-border-subtle bg-white">
                      <span className="text-[10px] text-ink-500 uppercase font-semibold">Contact Email</span>
                      {profileEditing ? (
                        <input 
                          type="email" 
                          value={editForm.email || ''} 
                          onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full mt-1 border border-border-subtle bg-surface px-2 py-1 rounded text-xs"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-ink-900 mt-1">{selectedVendor.email || '—'}</p>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-border-subtle bg-white">
                      <span className="text-[10px] text-ink-500 uppercase font-semibold">GSTIN Tax Registration</span>
                      {profileEditing ? (
                        <input 
                          type="text" 
                          value={editForm.gst || ''} 
                          onChange={e => setEditForm({ ...editForm, gst: e.target.value })}
                          className="w-full mt-1 border border-border-subtle bg-surface px-2 py-1 rounded text-xs font-mono"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-ink-900 mt-1 font-mono">{selectedVendor.gst || '—'}</p>
                      )}
                    </div>
                  </div>

                  {/* Bank detail cards */}
                  <div className="p-5 rounded-xl border border-border-subtle bg-white space-y-4 shadow-sm">
                    <h4 className="font-semibold text-xs text-ink-900 uppercase tracking-wider">Settlement Bank account</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-[10px] text-ink-500 block">Bank Name</span>
                        {profileEditing ? (
                          <input 
                            type="text" 
                            value={editForm.bank_name || ''} 
                            onChange={e => setEditForm({ ...editForm, bank_name: e.target.value })}
                            className="w-full mt-1 border border-border-subtle bg-surface px-2 py-1 rounded text-xs"
                          />
                        ) : (
                          <span className="font-semibold text-ink-900">{selectedVendor.bank_name || '—'}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-500 block">Account Number</span>
                        {profileEditing ? (
                          <input 
                            type="text" 
                            value={editForm.bank_account_no || ''} 
                            onChange={e => setEditForm({ ...editForm, bank_account_no: e.target.value })}
                            className="w-full mt-1 border border-border-subtle bg-surface px-2 py-1 rounded text-xs font-mono"
                          />
                        ) : (
                          <span className="font-semibold text-ink-900 font-mono">{selectedVendor.bank_account_no || '—'}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-500 block">Bank IFSC Code</span>
                        {profileEditing ? (
                          <input 
                            type="text" 
                            value={editForm.bank_ifsc || ''} 
                            onChange={e => setEditForm({ ...editForm, bank_ifsc: e.target.value })}
                            className="w-full mt-1 border border-border-subtle bg-surface px-2 py-1 rounded text-xs font-mono"
                          />
                        ) : (
                          <span className="font-semibold text-ink-900 font-mono">{selectedVendor.bank_ifsc || '—'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Registered Locations List */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-xs text-ink-900 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin size={14} />
                        Vendor Dispatch Locations
                      </h4>
                      <button
                        onClick={() => setShowAddAddressModal(true)}
                        className="text-xs text-brand-600 hover:underline font-semibold"
                      >
                        + Register Address
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {addresses.length === 0 ? (
                        <p className="text-xs text-ink-600/60 italic p-4">No secondary addresses registered.</p>
                      ) : (
                        addresses.map((addr, idx) => (
                          <div key={idx} className="p-4 rounded-xl border border-border-subtle bg-white space-y-2 shadow-sm">
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] bg-brand-500/10 text-brand-700 px-2 py-0.5 rounded font-medium">
                                Location {idx + 1}
                              </span>
                              {addr.is_default && (
                                <span className="text-[9px] bg-success-500/10 text-success-700 px-1.5 py-0.5 rounded font-medium">
                                  Default Dispatch Address
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-ink-900 font-medium">{addr.address_line}</p>
                            <p className="text-xs text-ink-600">{addr.city}, {addr.district}, {addr.state_code} - {addr.pin_code}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Outstanding Invoices (Pending Bills) */}
              {activeTab === 'invoices' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-ink-600">Pending un-reconciled supply bills</span>
                    <button
                      onClick={handleOpenMakePayment}
                      disabled={selectedInvoiceIds.length === 0}
                      className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
                    >
                      <DollarSign size={14} />
                      Pay Checked Invoices (${selectedBillsBalance.toFixed(2)})
                    </button>
                  </div>

                  <div className="border border-border-subtle rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs divide-y divide-border-subtle">
                      <thead className="bg-surface text-ink-600 font-semibold">
                        <tr>
                          <th className="p-3 w-10 text-center">
                            <input 
                              type="checkbox"
                              checked={pendingInvoices.length > 0 && selectedInvoiceIds.length === pendingInvoices.length}
                              onChange={() => {
                                if (selectedInvoiceIds.length === pendingInvoices.length) {
                                  setSelectedInvoiceIds([])
                                } else {
                                  setSelectedInvoiceIds(pendingInvoices.map(b => b.id))
                                }
                              }}
                              className="rounded text-brand-600 focus:ring-brand-400"
                            />
                          </th>
                          <th className="p-3">Our Reference No</th>
                          <th className="p-3">Supplier Invoice No</th>
                          <th className="p-3">Invoice Date</th>
                          <th className="p-3 text-right">Bill Value</th>
                          <th className="p-3 text-right">Balance Due</th>
                          <th className="p-3 text-right">AR Days Outstanding</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {pendingInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-ink-600/50 italic">
                              All bills are fully reconciled for this vendor.
                            </td>
                          </tr>
                        ) : (
                          pendingInvoices.map((bill) => (
                            <tr key={bill.id} className="hover:bg-surface/30">
                              <td className="p-3 text-center">
                                <input 
                                  type="checkbox"
                                  checked={selectedInvoiceIds.includes(bill.id)}
                                  onChange={() => {
                                    setSelectedInvoiceIds(prev => 
                                      prev.includes(bill.id) ? prev.filter(id => id !== bill.id) : [...prev, bill.id]
                                    )
                                  }}
                                  className="rounded text-brand-600 focus:ring-brand-400"
                                />
                              </td>
                              <td className="p-3 font-semibold text-brand-600">{bill.invoice_number}</td>
                              <td className="p-3 font-mono text-ink-900">{bill.vendor_invoice_number || 'N/A'}</td>
                              <td className="p-3 text-ink-600">{bill.vendor_invoice_date || bill.invoice_date}</td>
                              <td className="p-3 text-right font-medium text-ink-600">
                                ${parseFloat(bill.grand_total).toFixed(2)}
                              </td>
                              <td className="p-3 text-right font-bold text-ink-900">
                                ${parseFloat(bill.balance).toFixed(2)}
                              </td>
                              <td className={`p-3 text-right font-bold ${bill.ar_days >= 30 ? 'text-danger-600' : 'text-ink-900'}`}>
                                {bill.ar_days} Days
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: Ledger Statement */}
              {activeTab === 'ledger' && (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-border-subtle shadow-sm">
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
                        onClick={handleDownloadLedgerPDF}
                        className="flex items-center gap-1.5 border border-border-subtle bg-white text-ink-700 hover:bg-ink-100 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                      >
                        <FileDown size={13} />
                        Download PDF
                      </button>
                      <button
                        onClick={handleDownloadLedgerExcel}
                        className="flex items-center gap-1.5 border border-border-subtle bg-white text-ink-700 hover:bg-ink-100 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                      >
                        <FileText size={13} />
                        Download Excel
                      </button>
                    </div>

                    {/* Summary Balances */}
                    <div className="flex gap-6 text-right">
                      <div>
                        <span className="text-[9px] text-ink-600 block uppercase">Opening Balance</span>
                        <span className="text-sm font-bold text-ink-900">${ledgerData.opening_balance.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-ink-600 block uppercase">Closing Balance</span>
                        <span className={`text-sm font-extrabold ${ledgerData.closing_balance > 0 ? 'text-brand-600' : 'text-ink-900'}`}>
                          ${ledgerData.closing_balance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-border-subtle rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs divide-y divide-border-subtle">
                      <thead className="bg-surface text-ink-600 font-semibold">
                        <tr>
                          <th className="p-3">Transaction Date</th>
                          <th className="p-3">Voucher Details</th>
                          <th className="p-3">Ref Code</th>
                          <th className="p-3 text-right">Debit ($)</th>
                          <th className="p-3 text-right">Credit ($)</th>
                          <th className="p-3 text-right">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {ledgerData.transactions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-ink-600/50 italic">
                              No statement entries registered in this date range.
                            </td>
                          </tr>
                        ) : (
                          ledgerData.transactions.map((txn, idx) => (
                            <tr key={idx} className="hover:bg-surface/30">
                              <td className="p-3 text-ink-600">{txn.date?.split('T')[0] || txn.created_at?.split('T')[0]}</td>
                              <td className="p-3 font-medium text-ink-900">{txn.description}</td>
                              <td className="p-3 font-mono text-ink-600">{txn.reference_number || '—'}</td>
                              <td className="p-3 text-right text-danger-600 font-semibold">
                                {txn.debit_amount > 0 ? `$${parseFloat(txn.debit_amount).toFixed(2)}` : '—'}
                              </td>
                              <td className="p-3 text-right text-success-600 font-semibold">
                                {txn.credit_amount > 0 ? `$${parseFloat(txn.credit_amount).toFixed(2)}` : '—'}
                              </td>
                              <td className="p-3 text-right font-bold text-ink-900">
                                ${txn.running_balance.toFixed(2)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: Payment Vouchers History */}
              {activeTab === 'history' && (
                <div className="border border-border-subtle rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs divide-y divide-border-subtle">
                    <thead className="bg-surface text-ink-600 font-semibold">
                      <tr>
                        <th className="p-3">Payment ID</th>
                        <th className="p-3">Payment Date</th>
                        <th className="p-3">Method</th>
                        <th className="p-3 text-right">Voucher Amount</th>
                        <th className="p-3">Ref Details</th>
                        <th className="p-3">Remarks</th>
                        <th className="p-3 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {paymentHistory.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-ink-600/50 italic">
                            No historical payment records.
                          </td>
                        </tr>
                      ) : (
                        paymentHistory.map((pay) => (
                          <tr key={pay.id} className="hover:bg-surface/30">
                            <td className="p-3 font-semibold text-brand-600">PAY-{pay.id}</td>
                            <td className="p-3 text-ink-600">{pay.payment_date}</td>
                            <td className="p-3 text-ink-950 font-medium">{pay.payment_mode}</td>
                            <td className="p-3 text-right font-bold text-success-600">
                              ${parseFloat(String(pay.amount)).toFixed(2)}
                            </td>
                            <td className="p-3 font-mono text-ink-600">{pay.transaction_ref || 'N/A'}</td>
                            <td className="p-3 text-ink-600 max-w-xs truncate">{pay.remarks || '—'}</td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => handleDownloadPaymentSlip(pay)}
                                className="p-1 rounded bg-brand-500/10 hover:bg-brand-500/20 text-brand-700 transition"
                                title="Download PDF Voucher Slip"
                              >
                                <Download size={13} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: modalMakePayment */}
      {showPaymentModal && selectedVendor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-xl overflow-hidden shadow-2xl border border-border-subtle flex flex-col bg-white">
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-surface">
              <h3 className="font-semibold text-sm text-ink-900">Record Supplier Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-ink-600 hover:text-ink-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-ink-600 uppercase font-semibold">Payment Amount ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 text-ink-600" size={15} />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full bg-surface border border-border-subtle rounded-lg pl-9 pr-4 py-2.5 text-xs text-ink-900 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase font-semibold">Transaction Type</label>
                  <select
                    value={paymentForm.transaction_type}
                    onChange={e => setPaymentForm({ ...paymentForm, transaction_type: e.target.value })}
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2.5 text-xs focus:outline-none"
                  >
                    <option value="PAYMENT">PAYMENT</option>
                    <option value="REFUND">REFUND</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase font-semibold">Payment Mode</label>
                  <select
                    value={paymentForm.payment_mode}
                    onChange={e => handlePaymentModeChange(e.target.value)}
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2.5 text-xs focus:outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              {paymentForm.payment_mode === 'Bank Transfer' && (
                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase font-semibold">Source bank Account</label>
                  <select
                    value={paymentForm.bank_account_id}
                    onChange={e => setPaymentForm({ ...paymentForm, bank_account_id: e.target.value })}
                    required
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2.5 text-xs focus:outline-none"
                  >
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.account_number})</option>
                    ))}
                  </select>
                </div>
              )}

              {paymentForm.payment_mode === 'Cheque' ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-ink-600 uppercase">Cheque No</label>
                    <input 
                      type="text"
                      required
                      value={paymentForm.cheque_no}
                      onChange={e => setPaymentForm({ ...paymentForm, cheque_no: e.target.value })}
                      className="w-full bg-surface border border-border-subtle rounded-lg px-2 py-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-ink-600">Cheque Date</label>
                    <input 
                      type="date"
                      required
                      value={paymentForm.cheque_date}
                      onChange={e => setPaymentForm({ ...paymentForm, cheque_date: e.target.value })}
                      className="w-full bg-surface border border-border-subtle rounded-lg px-2 py-1.5 text-[10px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-ink-600">Bank Name</label>
                    <input 
                      type="text"
                      required
                      value={paymentForm.cheque_bank}
                      onChange={e => setPaymentForm({ ...paymentForm, cheque_bank: e.target.value })}
                      className="w-full bg-surface border border-border-subtle rounded-lg px-2 py-2 text-xs"
                    />
                  </div>
                </div>
              ) : paymentForm.payment_mode === 'Bank Transfer' ? (
                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase font-semibold">Transaction Reference / UTR (Bank Statement Entry)</label>
                  <select
                    value={paymentForm.reference_no}
                    onChange={e => handleUtrSelectChange(e.target.value)}
                    required
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2.5 text-xs focus:outline-none"
                  >
                    <option value="">Select unconsumed debit...</option>
                    {unconsumedDebits.length === 0 ? (
                      <option value="CUSTOM">No entries found (Type custom below)</option>
                    ) : (
                      unconsumedDebits.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.bank_ref_id || 'No UTR'} - {d.particulars || 'Debit'} (${parseFloat(d.debit_amount || 0).toFixed(2)})
                        </option>
                      ))
                    )}
                  </select>
                  {(unconsumedDebits.length === 0 || paymentForm.reference_no === 'CUSTOM') && (
                    <input
                      type="text"
                      required
                      value={paymentForm.reference_no === 'CUSTOM' ? '' : paymentForm.reference_no}
                      onChange={e => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                      className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 mt-2 text-xs focus:outline-none"
                      placeholder="Type custom UTR reference..."
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase font-semibold">Transaction Reference / UTR</label>
                  <input
                    type="text"
                    value={paymentForm.reference_no}
                    onChange={e => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2.5 text-xs focus:outline-none"
                    placeholder="e.g. UTR-9242042"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] text-ink-600 uppercase font-semibold">Remarks & Notes</label>
                <textarea
                  value={paymentForm.remarks}
                  onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2.5 text-xs focus:outline-none resize-none"
                  rows={2}
                  placeholder="Optional voucher text..."
                />
              </div>

              <button
                type="submit"
                disabled={recordPaymentMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {recordPaymentMutation.isPending ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                Confirm Payment Posting
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ModalCreateVendor */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-2xl w-full rounded-xl overflow-hidden shadow-2xl border border-border-subtle flex flex-col bg-white">
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-surface">
              <h3 className="font-semibold text-sm text-ink-900">Add New Supplier Profile</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-ink-600 hover:text-ink-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase">Vendor Name</label>
                  <input 
                    type="text" required
                    value={createForm.vendor_name}
                    onChange={e => setCreateForm({ ...createForm, vendor_name: e.target.value })}
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs"
                    placeholder="e.g. Volga Agencies"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase">Vendor Code</label>
                  <input 
                    type="text"
                    value={createForm.vendor_code}
                    onChange={e => setCreateForm({ ...createForm, vendor_code: e.target.value })}
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs"
                    placeholder="Auto-generated if blank"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase">Phone Number</label>
                  <input 
                    type="text"
                    value={createForm.contact_no}
                    onChange={e => setCreateForm({ ...createForm, contact_no: e.target.value })}
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase">Supplier Email</label>
                  <input 
                    type="email"
                    value={createForm.email}
                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase">GST Registration No</label>
                  <input 
                    type="text"
                    value={createForm.gst}
                    onChange={e => setCreateForm({ ...createForm, gst: e.target.value })}
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-ink-600 uppercase">Supplier Address</label>
                <input 
                  type="text"
                  value={createForm.address_line1}
                  onChange={e => setCreateForm({ ...createForm, address_line1: e.target.value })}
                  className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase">State</label>
                  <input 
                    type="text"
                    value={createForm.state}
                    onChange={e => setCreateForm({ ...createForm, state: e.target.value })}
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase">District</label>
                  <input 
                    type="text"
                    value={createForm.district}
                    onChange={e => setCreateForm({ ...createForm, district: e.target.value })}
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase">Pincode</label>
                  <input 
                    type="text"
                    value={createForm.pin_code}
                    onChange={e => setCreateForm({ ...createForm, pin_code: e.target.value })}
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border-subtle bg-surface space-y-3">
                <h4 className="font-semibold text-xs text-ink-950 uppercase tracking-wider">Settlement Bank accounts</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] text-ink-600 block">Bank Name</label>
                    <input 
                      type="text"
                      value={createForm.bank_name}
                      onChange={e => setCreateForm({ ...createForm, bank_name: e.target.value })}
                      className="w-full mt-1 bg-white border border-border-subtle rounded px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-ink-600 block">Account Number</label>
                    <input 
                      type="text"
                      value={createForm.bank_account_no}
                      onChange={e => setCreateForm({ ...createForm, bank_account_no: e.target.value })}
                      className="w-full mt-1 bg-white border border-border-subtle rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-ink-600 block">IFSC Code</label>
                    <input 
                      type="text"
                      value={createForm.bank_ifsc}
                      onChange={e => setCreateForm({ ...createForm, bank_ifsc: e.target.value })}
                      className="w-full mt-1 bg-white border border-border-subtle rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={createVendorMutation.isPending}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {createVendorMutation.isPending && <RefreshCw className="animate-spin mr-1.5 inline" size={12} />}
                Confirm Supplier Registration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: modalAddAddress */}
      {showAddAddressModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-xl overflow-hidden shadow-2xl border border-border-subtle flex flex-col bg-white">
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-surface">
              <h3 className="font-semibold text-sm text-ink-900">Register Supplier Location</h3>
              <button onClick={() => setShowAddAddressModal(false)} className="text-ink-600 hover:text-ink-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddAddress} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-ink-600 uppercase">Address Line</label>
                <input 
                  type="text" required
                  value={addressForm.address_line}
                  onChange={e => setAddressForm({ ...addressForm, address_line: e.target.value })}
                  className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase">City</label>
                  <input 
                    type="text" required
                    value={addressForm.city}
                    onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase">Pin Code</label>
                  <input 
                    type="text" required
                    value={addressForm.pin_code}
                    onChange={e => setAddressForm({ ...addressForm, pin_code: e.target.value })}
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase">State</label>
                  <input 
                    type="text" required
                    value={addressForm.state_code}
                    onChange={e => setAddressForm({ ...addressForm, state_code: e.target.value })}
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-ink-600 uppercase">District</label>
                  <input 
                    type="text" required
                    value={addressForm.district}
                    onChange={e => setAddressForm({ ...addressForm, district: e.target.value })}
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox"
                  id="chkNewDefault"
                  checked={addressForm.is_default}
                  onChange={e => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-400"
                />
                <label htmlFor="chkNewDefault" className="text-xs text-ink-900 cursor-pointer">
                  Set as default dispatch location
                </label>
              </div>

              <button
                type="submit"
                disabled={addAddressMutation.isPending}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {addAddressMutation.isPending && <RefreshCw className="animate-spin mr-1.5 inline" size={12} />}
                Add Location Address
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
