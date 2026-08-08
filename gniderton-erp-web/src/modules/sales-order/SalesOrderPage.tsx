import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { 
  useSalesOrders, 
  useProducts, 
  useBulkInvoiceGenerate 
} from './hooks'
import { JobProgressBar } from '@/components/ui/JobProgressBar'
import { 
  Eye, RefreshCw, CheckCircle2, AlertTriangle, 
  X, AlertCircle, Package, Send, Search, Filter, RefreshCcw, DollarSign, MapPin, Users, ShoppingCart, Plus, HelpCircle, Download
} from 'lucide-react'

interface OrderLine {
  product_id: number | string
  product_name: string
  qty: number
  rate: number
  amount: number
}

interface SalesOrder {
  id: string | number
  so_number: string
  customer_name: string
  order_date: string
  total_amount: number | string
  tax_amount: number | string
  route_name: string
  dse_name: string
  status: string
  lines: string | OrderLine[]
}

interface AnalysisItem {
  item_id: string
  product_name: string
  demand: number
  master_rate: number
  real_stock: number
  transit_qty: number
  temp_batch: string
  total_avail: number
  shortage: number
  status: 'SHORT' | 'OK'
  mrp: number
  distributor_rate: number
  wholesale_rate: number
  dealer_rate: number
  retail_rate: number
  rate: number
}

interface TransitRow {
  item_id: string
  product_name: string
  ordered_qty: number
  shortfall_qty: number
  qty: number
  batch_code: string
  rate: number
}

export default function SalesOrderPage() {
  // Query Hooks
  const { data: salesOrdersRaw, isLoading: loadingOrders, refetch: refetchOrders } = useSalesOrders()
  const { data: productsRaw, isLoading: loadingProducts } = useProducts()
  const generateInvoicesMutation = useBulkInvoiceGenerate()

  // Support wrapper payload objects (like { data: [...] })
  const salesOrders: SalesOrder[] = salesOrdersRaw?.data || salesOrdersRaw || []
  const products: any[] = productsRaw?.data || productsRaw || []

  // Filters State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRoute, setSelectedRoute] = useState('')
  const [selectedDse, setSelectedDse] = useState('')

  // Checkboxes for selected rows
  const [selectedOrderIds, setSelectedOrderIds] = useState<(string | number)[]>([])

  // Modal Visibility
  const [showViewLines, setShowViewLines] = useState(false) // mdlViewOrderLines
  const [showAllocation, setShowAllocation] = useState(false) // modalStockAllocation
  const [showTransit, setShowTransit] = useState(false) // modalTransitEntry
  const [showBreakup, setShowBreakup] = useState(false) // mdlBreakup
  const [jobId, setJobId] = useState<string | null>(null)

  // Core Mapped State Variables (replacing Appsmith store)
  const [viewLines, setViewLines] = useState<OrderLine[]>([])
  const [activeOrder, setActiveOrder] = useState<SalesOrder | null>(null)
  
  const [demandAnalysis, setDemandAnalysis] = useState<AnalysisItem[]>([])
  const [transitStock, setTransitStock] = useState<Record<string, { qty: number; batch_code: string; rate: number }>>({})
  const [transitTableData, setTransitTableData] = useState<TransitRow[]>([])
  
  const [productBreakup, setProductBreakup] = useState<any[]>([])
  const [selectedProductForBreakup, setSelectedProductForBreakup] = useState<AnalysisItem | null>(null)

  // Status Alerts
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null)

  // Dynamic lists for filter dropdowns
  const uniqueRoutes = useMemo(() => {
    const routes = salesOrders.map(o => o.route_name).filter(Boolean)
    return Array.from(new Set(routes))
  }, [salesOrders])

  const uniqueDses = useMemo(() => {
    const dses = salesOrders.map(o => o.dse_name).filter(Boolean)
    return Array.from(new Set(dses))
  }, [salesOrders])

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return salesOrders.filter(o => {
      const matchesSearch = 
        (o.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.so_number || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesRoute = !selectedRoute || o.route_name === selectedRoute
      const matchesDse = !selectedDse || o.dse_name === selectedDse

      return matchesSearch && matchesRoute && matchesDse
    })
  }, [salesOrders, searchTerm, selectedRoute, selectedDse])

  // KPI Calculations
  const kpis = useMemo(() => {
    const count = filteredOrders.length
    const totalValue = filteredOrders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0)
    const routesCount = new Set(filteredOrders.map(o => o.route_name).filter(Boolean)).size
    const dseCount = new Set(filteredOrders.map(o => o.dse_name).filter(Boolean)).size

    return { count, totalValue, routesCount, dseCount }
  }, [filteredOrders])

  const handleResetFilters = () => {
    setSearchTerm('')
    setSelectedRoute('')
    setSelectedDse('')
  }

  // Row selection toggle
  const toggleSelectOrder = (id: string | number) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
    )
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([])
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id))
    }
  };

  // Triggers mdlViewOrderLines
  const handleOpenViewLines = (order: SalesOrder) => {
    setActiveOrder(order)
    let parsedLines: OrderLine[] = []
    try {
      parsedLines = typeof order.lines === 'string' ? JSON.parse(order.lines) : order.lines || []
    } catch (e) {
      console.error('Failed to parse order lines', e)
    }
    setViewLines(parsedLines)
    setShowViewLines(true)
  };

  // JSObject1.analyzeDemand logic
  const handleAnalyzeDemand = () => {
    const selectedOrders = salesOrders.filter(o => selectedOrderIds.includes(o.id))
    if (selectedOrders.length === 0) {
      setAlertMsg({ type: 'warning', text: 'Please select at least one order to process.' })
      return
    }

    let demandMap: Record<string, { item_id: string; product_name: string; demand: number; master_rate: number }> = {}

    selectedOrders.forEach(order => {
      let lines: OrderLine[] = []
      try {
        lines = typeof order.lines === 'string' ? JSON.parse(order.lines) : order.lines || []
      } catch (e) {
        console.error("Error parsing order lines", e)
      }

      lines.forEach(line => {
        const pid = String(line.product_id)
        if (!demandMap[pid]) {
          demandMap[pid] = {
            item_id: pid,
            product_name: line.product_name || `Product ID: ${pid}`,
            demand: 0,
            master_rate: Number(line.rate || 0)
          }
        }
        demandMap[pid].demand += Number(line.qty || 0)
      })
    })

    const analysis: AnalysisItem[] = Object.values(demandMap).map(item => {
      const product = products.find(p => String(p.id) === String(item.item_id))
      const realStock = product ? Number(product.current_stock || 0) : 0
      const transitEntry = transitStock[item.item_id] || {}
      const transitQty = Number(transitEntry.qty || 0)
      const totalAvail = realStock + transitQty
      const shortage = Math.max(0, item.demand - totalAvail)

      return {
        ...item,
        real_stock: realStock,
        transit_qty: transitQty,
        temp_batch: transitEntry.batch_code || '-',
        total_avail: totalAvail,
        shortage: shortage,
        status: shortage > 0 ? 'SHORT' : 'OK',
        mrp: product ? Number(product.mrp || 0) : 0,
        distributor_rate: product ? Number(product.distributor_rate || 0) : 0,
        wholesale_rate: product ? Number(product.wholesale_rate || 0) : 0,
        dealer_rate: product ? Number(product.dealer_rate || 0) : 0,
        retail_rate: product ? Number(product.retail_rate || 0) : 0,
        rate: item.master_rate
      }
    })

    setDemandAnalysis(analysis)
    setShowAllocation(true)
  };

  // Transit_Actions.openTransitEntry logic
  const handleOpenTransitEntry = () => {
    const shortItems = demandAnalysis.filter(item => item.shortage > 0)
    if (shortItems.length === 0) {
      setAlertMsg({ type: 'success', text: 'All items are fully stocked! No transit allocation needed.' })
      return
    }

    const tableRows = shortItems.map(item => {
      const saved = transitStock[item.item_id] || {}
      return {
        item_id: item.item_id,
        product_name: item.product_name,
        ordered_qty: item.demand,
        shortfall_qty: item.shortage,
        qty: saved.qty !== undefined ? saved.qty : item.shortage,
        batch_code: saved.batch_code || 'TRANSIT-PENDING',
        rate: saved.rate !== undefined ? saved.rate : item.rate
      }
    })

    setTransitTableData(tableRows)
    setShowTransit(true)
  };

  const handleUpdateTransitStock = (itemId: string, field: 'qty' | 'batch_code' | 'rate', value: any) => {
    setTransitTableData(prev => 
      prev.map(row => {
        if (row.item_id === itemId) {
          const updated = { ...row, [field]: value }
          setTransitStock(prevMap => ({
            ...prevMap,
            [itemId]: {
              qty: field === 'qty' ? Number(value) : (prevMap[itemId]?.qty ?? row.qty),
              batch_code: field === 'batch_code' ? value : (prevMap[itemId]?.batch_code ?? row.batch_code),
              rate: field === 'rate' ? Number(value) : (prevMap[itemId]?.rate ?? row.rate)
            }
          }))
          return updated
        }
        return row
      })
    )
  };

  const handleCommitTransitStock = () => {
    const updatedAnalysis = demandAnalysis.map(item => {
      const transitEntry = transitStock[item.item_id] || {}
      const transitQty = Number(transitEntry.qty || 0)
      const totalAvail = item.real_stock + transitQty
      const shortage = Math.max(0, item.demand - totalAvail)

      return {
        ...item,
        transit_qty: transitQty,
        temp_batch: transitEntry.batch_code || '-',
        total_avail: totalAvail,
        shortage: shortage,
        status: shortage > 0 ? 'SHORT' : 'OK'
      } as AnalysisItem
    })

    setDemandAnalysis(updatedAnalysis)
    setShowTransit(false)
    setAlertMsg({ type: 'success', text: 'Transit stock allocations updated successfully!' })
  };

  const handleGetProductBreakup = (item: AnalysisItem) => {
    setSelectedProductForBreakup(item)
    const selectedOrders = salesOrders.filter(o => selectedOrderIds.includes(o.id))
    const targetId = String(item.item_id)

    const breakup = selectedOrders.reduce((acc: any[], order) => {
      let lines: OrderLine[] = []
      try {
        lines = typeof order.lines === 'string' ? JSON.parse(order.lines) : order.lines || []
      } catch (e) {
        return acc
      }

      const productLine = lines.find(l => String(l.product_id) === targetId)
      if (productLine) {
        acc.push({
          so_number: order.so_number || `SO-${order.id}`,
          customer_name: order.customer_name,
          route: order.route_name || 'Generic Route',
          dse_name: order.dse_name || 'Generic Rep',
          qty: Number(productLine.qty || 0),
          rate: productLine.rate,
          amount: productLine.amount
        })
      }
      return acc
    }, [])

    setProductBreakup(breakup)
    setShowBreakup(true)
  };

  const handleGenerateInvoices = async () => {
    if (selectedOrderIds.length === 0) return

    try {
      const res = await generateInvoicesMutation.mutateAsync({
        order_ids: selectedOrderIds,
        transit_stock: transitStock,
        allow_negative_stock: true
      })

      if (res && res.jobId) {
        setJobId(res.jobId)
      } else {
        setAlertMsg({ type: 'success', text: `Successfully generated bulk invoices for ${selectedOrderIds.length} orders!` })
        setSelectedOrderIds([])
        setTransitStock({})
        setDemandAnalysis([])
        setShowAllocation(false)
        refetchOrders()
      }
    } catch (e: any) {
      setAlertMsg({ type: 'error', text: e?.response?.data?.message || 'Failed to generate bulk invoices.' })
    }
  };

  const handleDownloadShortfallReport = () => {
    const selectedOrders = salesOrders.filter(o => selectedOrderIds.includes(o.id));
    
    // Create a mutable copy of total available stock per product
    const availableStockMap: Record<string, number> = {};
    demandAnalysis.forEach(item => {
      availableStockMap[item.item_id] = item.total_avail;
    });

    const reportRows: Array<{ customer_name: string; so_number: string; product_name: string; shortfall_qty: number }> = [];

    // Simulate FIFO allocation to determine which customers are short
    selectedOrders.forEach(order => {
      let lines: OrderLine[] = [];
      try {
        lines = typeof order.lines === 'string' ? JSON.parse(order.lines) : order.lines || [];
      } catch (e) {}

      lines.forEach(line => {
        const pid = String(line.product_id);
        const qty = Number(line.qty || 0);
        
        if (availableStockMap[pid] !== undefined) {
          const available = availableStockMap[pid];
          if (available < qty) {
            const shortfall = qty - available;
            reportRows.push({
              customer_name: order.customer_name || 'Unknown',
              so_number: order.so_number || `SO-${order.id}`,
              product_name: line.product_name || `Product ${pid}`,
              shortfall_qty: shortfall
            });
          }
          availableStockMap[pid] = Math.max(0, available - qty);
        }
      });
    });

    if (reportRows.length === 0) {
      setAlertMsg({ type: 'success', text: 'No shortfalls found! All stock can be allocated.' });
      return;
    }

    // Convert to CSV
    const headers = ['Customer Name', 'SO Number', 'Product Name', 'Shortfall Qty'];
    const csvContent = [
      headers.join(','),
      ...reportRows.map(row => 
        `"${row.customer_name}","${row.so_number}","${row.product_name}",${row.shortfall_qty}`
      )
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Shortfall_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportTableToExcel = async () => {
    if (demandAnalysis.length === 0) {
      setAlertMsg({ type: 'error', text: 'No data to export.' });
      return;
    }

    try {
      // Dynamic import to avoid inflating initial bundle size if not used immediately
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Stock Allocation');

      // Define columns to match the view on the table
      worksheet.columns = [
        { header: 'Product Name', key: 'product_name', width: 40 },
        { header: 'Total Demand', key: 'demand', width: 15 },
        { header: 'Warehouse Stock', key: 'real_stock', width: 18 },
        { header: 'Transit Allocated', key: 'transit_qty', width: 18 },
        { header: 'Total Available', key: 'total_avail', width: 18 },
        { header: 'Shortage', key: 'shortage', width: 15 },
        { header: 'Status', key: 'status', width: 15 }
      ];

      // Add data rows
      demandAnalysis.forEach(item => {
        worksheet.addRow({
          product_name: item.product_name,
          demand: item.demand,
          real_stock: item.real_stock,
          transit_qty: item.transit_qty || 0,
          total_avail: item.total_avail,
          shortage: item.shortage > 0 ? item.shortage : 0,
          status: item.status
        });
      });

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' } // surface color
      };

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Stock_Allocation_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      setAlertMsg({ type: 'success', text: 'Successfully exported to Excel!' });
    } catch (err) {
      console.error('Export error:', err);
      setAlertMsg({ type: 'error', text: 'Failed to export to Excel.' });
    }
  };

  // Stock Allocation metrics cards (from Input1 & Input2 in Appsmith modalStockAllocation)
  const allocationMetrics = useMemo(() => {
    const selectedOrders = salesOrders.filter(o => selectedOrderIds.includes(o.id))
    
    // Order Value: sum of total_amount of checked orders
    const orderValue = selectedOrders.reduce((acc, x) => acc + (Number(x.total_amount) || 0), 0)
    
    // Estimated Value: sum of actual fillable goods based on current total availability (real_stock + transit)
    const estimatedValue = demandAnalysis.reduce((acc, item) => {
      const fillableQty = Math.min(item.demand, item.total_avail)
      return acc + (fillableQty * (item.rate || 0))
    }, 0)

    // Shortfall Value
    const shortfallValue = Math.max(0, orderValue - estimatedValue)

    return { orderValue, estimatedValue, shortfallValue }
  }, [salesOrders, selectedOrderIds, demandAnalysis])

  return (
    <div className="space-y-6 w-full">
      {/* Top Page Header */}
      <PageHeader
        eyebrow="SALES · Sell"
        title="Sales Orders Dashboard"
        description="Monitor order pipelines, resolve shortages via transit allocation, and trigger bulk billing operations."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => refetchOrders()}
              className="p-2.5 border border-[#e6e9ee] rounded-lg hover:bg-ink-100 transition text-ink-600 bg-white"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleAnalyzeDemand}
              disabled={selectedOrderIds.length === 0}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition disabled:opacity-50 shadow-md shadow-brand-500/10"
            >
              <Package size={14} />
              Process Selected ({selectedOrderIds.length})
            </button>
          </div>
        }
      />

      {/* 📊 Useful Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-xl border border-[#e6e9ee] bg-white flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-ink-500 uppercase font-semibold tracking-wider">Pending Orders</span>
            <h4 className="text-2xl font-bold text-ink-900 mt-1">{kpis.count}</h4>
          </div>
          <div className="p-3 bg-brand-500/10 text-brand-600 rounded-lg">
            <ShoppingCart size={20} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-[#e6e9ee] bg-white flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-ink-500 uppercase font-semibold tracking-wider">Total Booking Value</span>
            <h4 className="text-2xl font-bold text-ink-900 mt-1">${kpis.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
          </div>
          <div className="p-3 bg-success-500/10 text-success-600 rounded-lg">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-[#e6e9ee] bg-white flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-ink-500 uppercase font-semibold tracking-wider">Active Routes</span>
            <h4 className="text-2xl font-bold text-ink-900 mt-1">{kpis.routesCount}</h4>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-lg">
            <MapPin size={20} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-[#e6e9ee] bg-white flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-ink-500 uppercase font-semibold tracking-wider">Sales Reps (DSE)</span>
            <h4 className="text-2xl font-bold text-ink-900 mt-1">{kpis.dseCount}</h4>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-lg">
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* 🔍 Dynamic Filters Panel */}
      <div className="glass-card p-4 rounded-xl border border-[#e6e9ee] bg-white shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between w-full">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3 text-ink-600" size={15} />
          <input 
            type="text" 
            placeholder="Search by customer name or order number..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-[#e6e9ee] rounded-lg pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-brand-400 text-ink-900 placeholder:text-ink-600"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
            <Filter size={12} className="text-ink-600" />
            <select
              value={selectedRoute}
              onChange={e => setSelectedRoute(e.target.value)}
              className="bg-transparent text-xs text-ink-900 focus:outline-none pr-6 cursor-pointer"
            >
              <option value="">All Routes</option>
              {uniqueRoutes.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-[#e6e9ee]">
            <Users size={12} className="text-ink-600" />
            <select
              value={selectedDse}
              onChange={e => setSelectedDse(e.target.value)}
              className="bg-transparent text-xs text-ink-900 focus:outline-none pr-6 cursor-pointer"
            >
              <option value="">All Reps (DSE)</option>
              {uniqueDses.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {(searchTerm || selectedRoute || selectedDse) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-danger-600 hover:bg-danger-500/5 rounded-lg transition"
            >
              <RefreshCcw size={12} />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {alertMsg && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs ${
          alertMsg.type === 'error' ? 'bg-danger-500/10 text-danger-600 border border-danger-500/20' : 
          alertMsg.type === 'warning' ? 'bg-warning-500/10 text-warning-600 border border-warning-500/20' : 
          'bg-success-500/10 text-success-600 border border-success-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {alertMsg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span className="font-medium">{alertMsg.text}</span>
          </div>
          <button onClick={() => setAlertMsg(null)} className="text-ink-600 hover:text-ink-900 font-bold text-sm">
            &times;
          </button>
        </div>
      )}

      {loadingOrders ? (
        <div className="h-64 flex items-center justify-center text-xs text-ink-600/60 gap-2">
          <RefreshCw className="animate-spin" size={14} />
          Loading confirmed sales order backlog...
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-[#e6e9ee] overflow-hidden w-full shadow-sm">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs divide-y divide-border-subtle">
              <thead className="bg-surface text-ink-600 font-semibold">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input 
                      type="checkbox" 
                      checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                      onChange={toggleSelectAll}
                      className="rounded text-brand-600 focus:ring-brand-400"
                    />
                  </th>
                  <th className="p-3">Order Number</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Route</th>
                  <th className="p-3">DSE Rep</th>
                  <th className="p-3">Order Date</th>
                  <th className="p-3 text-right">Order Value</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-white">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-ink-600/50 italic">
                      No matching sales orders found in queue.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => {
                    const isSelected = selectedOrderIds.includes(o.id);
                    return (
                      <tr 
                        key={o.id} 
                        className={`transition-colors cursor-pointer ${isSelected ? 'bg-brand-50 hover:bg-brand-100/50' : 'hover:bg-surface/30'}`}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.tagName !== 'INPUT' && target.tagName !== 'BUTTON' && !target.closest('button')) {
                            toggleSelectOrder(o.id);
                          }
                        }}
                      >
                        <td className="p-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelectOrder(o.id)}
                            className="rounded text-brand-600 focus:ring-brand-400 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-semibold text-ink-900">{o.so_number || `SO-${o.id}`}</td>
                        <td className="p-3 font-medium text-ink-900">{o.customer_name}</td>
                        <td className="p-3 text-ink-600">{o.route_name || 'N/A'}</td>
                        <td className="p-3 text-ink-600">{o.dse_name || 'N/A'}</td>
                        <td className="p-3 text-ink-600">{o.order_date?.split('T')[0]}</td>
                        <td className="p-3 text-right font-semibold text-ink-900">
                          ${parseFloat(String(o.total_amount || 0)).toFixed(2)}
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-brand-500/10 text-brand-700">
                            {o.status || 'Confirmed'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenViewLines(o);
                            }}
                            className="p-1.5 rounded hover:bg-ink-100 text-ink-700 transition"
                            title="Inspect Order Lines"
                          >
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: mdlViewOrderLines */}
      {showViewLines && activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-2xl w-full rounded-xl overflow-hidden shadow-2xl border border-[#e6e9ee] flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-[#e6e9ee] flex items-center justify-between bg-surface">
              <div>
                <h3 className="font-semibold text-sm text-ink-900">
                  Items Details: {activeOrder.so_number || `SO-${activeOrder.id}`}
                </h3>
                <p className="text-[10px] text-ink-600 mt-0.5">{activeOrder.customer_name}</p>
              </div>
              <button onClick={() => setShowViewLines(false)} className="text-ink-600 hover:text-ink-900">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="border border-[#e6e9ee] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs divide-y divide-border-subtle">
                  <thead className="bg-surface text-ink-600">
                    <tr>
                      <th className="p-3">Product Name</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle bg-white">
                    {viewLines.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-ink-600/50 italic">No lines on this order.</td>
                      </tr>
                    ) : (
                      viewLines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-medium text-ink-900">{line.product_name || `Product ID: ${line.product_id}`}</td>
                          <td className="p-3 text-right">${parseFloat(String(line.rate || 0)).toFixed(2)}</td>
                          <td className="p-3 text-right font-medium text-ink-900">{line.qty}</td>
                          <td className="p-3 text-right font-semibold text-ink-900">
                            ${parseFloat(String(line.amount || (line.qty * line.rate))).toFixed(2)}
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
      )}

      {/* MODAL 2: modalStockAllocation */}
      {showAllocation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-6xl w-full rounded-xl overflow-hidden shadow-2xl border border-[#e6e9ee] flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#e6e9ee] flex items-center justify-between bg-surface">
              <div>
                <h3 className="font-semibold text-sm text-ink-900">
                  Stock Allocation & Demand Constraint Analysis
                </h3>
                <p className="text-[10px] text-ink-600 mt-0.5">
                  Processing shortages across {selectedOrderIds.length} orders
                </p>
              </div>
              <button onClick={() => setShowAllocation(false)} className="text-ink-600 hover:text-ink-900">
                <X size={18} />
              </button>
            </div>
          <div className="p-4 flex-1 overflow-y-auto bg-surface relative">
            {jobId ? (
              <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <JobProgressBar 
                  jobId={jobId} 
                  title="Generating Bulk Invoices..." 
                  onComplete={() => {
                    setAlertMsg({ type: 'success', text: `Successfully generated bulk invoices!` })
                    setSelectedOrderIds([])
                    setTransitStock({})
                    setDemandAnalysis([])
                    setJobId(null)
                    setShowAllocation(false)
                    refetchOrders()
                  }}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Cards Inside Modal (Input1 & Input2 equivalents in Appsmith) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-[#e6e9ee] bg-surface flex flex-col justify-between">
                  <span className="text-[10px] text-ink-600 font-semibold uppercase">Total Order Value Requested</span>
                  <span className="text-lg font-bold text-ink-900 mt-1">
                    ${allocationMetrics.orderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-[#e6e9ee] bg-brand-500/5 border-brand-500/20 flex flex-col justify-between">
                  <span className="text-[10px] text-brand-700 font-semibold uppercase flex items-center gap-1">
                    Estimated Billing Value (Stock Ready)
                    <span title="Actual value deliverable based on current stock availability" className="cursor-help">
                      <HelpCircle size={12} />
                    </span>
                  </span>
                  <span className="text-lg font-bold text-brand-700 mt-1">
                    ${allocationMetrics.estimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-[#e6e9ee] bg-danger-500/5 border-danger-500/20 flex flex-col justify-between">
                  <span className="text-[10px] text-danger-700 font-semibold uppercase">Shortfall Billing Value Loss</span>
                  <span className="text-lg font-bold text-danger-600 mt-1">
                    ${allocationMetrics.shortfallValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-[#e6e9ee] rounded-lg overflow-hidden bg-white">
                <table className="w-full text-left text-xs divide-y divide-border-subtle">
                  <thead className="bg-surface text-ink-600 font-semibold">
                    <tr>
                      <th className="p-3">Product Name</th>
                      <th className="p-3 text-right">Total Demand</th>
                      <th className="p-3 text-right">Warehouse Stock</th>
                      <th className="p-3 text-right">Transit Allocated</th>
                      <th className="p-3 text-right">Total Available</th>
                      <th className="p-3 text-right">Shortage</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle bg-white">
                    {demandAnalysis.map((item) => (
                      <tr key={item.item_id} className="hover:bg-surface/30">
                        <td className="p-3 font-medium text-ink-900">{item.product_name}</td>
                        <td className="p-3 text-right font-semibold text-ink-900">{item.demand}</td>
                        <td className="p-3 text-right text-ink-600">{item.real_stock}</td>
                        <td className="p-3 text-right text-brand-600 font-semibold">{item.transit_qty || '—'}</td>
                        <td className="p-3 text-right font-medium text-ink-900">{item.total_avail}</td>
                        <td className="p-3 text-right font-semibold text-danger-600">
                          {item.shortage > 0 ? item.shortage : '—'}
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            item.status === 'SHORT' ? 'bg-danger-500/10 text-danger-600' : 'bg-success-500/10 text-success-600'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleGetProductBreakup(item)}
                            className="text-[10px] text-brand-600 hover:underline font-semibold"
                          >
                            Breakdown
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            )}
          </div>

          {!jobId && (
            <div className="p-4 border-t border-[#e6e9ee] flex flex-col md:flex-row justify-between items-center bg-white shrink-0 gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleOpenTransitEntry}
                  className="flex items-center gap-1.5 border border-[#e6e9ee] bg-white text-ink-700 hover:bg-ink-100 text-xs font-semibold px-4 py-2 rounded-lg transition shadow-sm"
                >
                  <Plus size={14} />
                  Allocate Transit Stock
                </button>
                <div className="text-sm text-ink-500 hidden md:block">
                  Ensure all shorts are addressed before proceeding.
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportTableToExcel}
                  className="px-4 py-2 border border-brand-200 text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Table to Excel
                </button>
                <button
                  onClick={handleDownloadShortfallReport}
                  className="px-4 py-2 border border-brand-200 text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Shortfall
                </button>
                <button
                  onClick={() => setShowAllocation(false)}
                  className="px-4 py-2 border border-[#e6e9ee] text-ink-700 rounded-lg hover:bg-ink-50 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateInvoices}
                  disabled={generateInvoicesMutation.isPending}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-all active:scale-95"
                >
                  {generateInvoicesMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirm & Generate Invoices
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* MODAL 3: modalTransitEntry */}
      {showTransit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-4xl w-full rounded-xl overflow-hidden shadow-2xl border border-[#e6e9ee] flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-[#e6e9ee] flex items-center justify-between bg-surface">
              <div>
                <h3 className="font-semibold text-sm text-ink-900">Allocate Upcoming Transit Stock</h3>
                <p className="text-[10px] text-ink-600 mt-0.5">Assign expected batch arrivals to cover stock shortages.</p>
              </div>
              <button onClick={() => setShowTransit(false)} className="text-ink-600 hover:text-ink-900">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="border border-[#e6e9ee] rounded-lg overflow-hidden bg-background">
                <table className="w-full text-left text-xs divide-y divide-border-subtle">
                  <thead className="bg-white/2 text-ink-600">
                    <tr>
                      <th className="p-3">Product Item Name</th>
                      <th className="p-3 text-right">Shortfall Qty</th>
                      <th className="p-3 text-right w-36">Allocated Qty</th>
                      <th className="p-3 w-44">Batch Code</th>
                      <th className="p-3 text-right">Rate ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle bg-white">
                    {transitTableData.map((row) => (
                      <tr key={row.item_id}>
                        <td className="p-3 font-semibold text-ink-900">{row.product_name}</td>
                        <td className="p-3 text-right font-bold text-danger-600">{row.shortfall_qty}</td>
                        <td className="p-1.5">
                          <input 
                            type="number"
                            value={row.qty}
                            onChange={(e) => handleUpdateTransitStock(row.item_id, 'qty', e.target.value)}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-right"
                          />
                        </td>
                        <td className="p-1.5">
                          <input 
                            type="text"
                            value={row.batch_code}
                            onChange={(e) => handleUpdateTransitStock(row.item_id, 'batch_code', e.target.value)}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="p-1.5">
                          <input 
                            type="number"
                            step="0.01"
                            value={row.rate}
                            onChange={(e) => handleUpdateTransitStock(row.item_id, 'rate', e.target.value)}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-right"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#e6e9ee] flex justify-end bg-surface">
              <button
                onClick={handleCommitTransitStock}
                className="bg-ink-900 text-white hover:bg-ink-800 text-xs font-semibold px-4 py-2.5 rounded-lg transition"
              >
                Commit Transit Allocations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: mdlBreakup */}
      {showBreakup && selectedProductForBreakup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-4xl w-full rounded-xl overflow-hidden shadow-2xl border border-[#e6e9ee] flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-[#e6e9ee] flex items-center justify-between bg-surface">
              <div>
                <h3 className="font-semibold text-sm text-ink-900">Demand Breakdown: {selectedProductForBreakup.product_name}</h3>
                <p className="text-[10px] text-ink-600 mt-0.5">Clients requesting this shortage line item.</p>
              </div>
              <button onClick={() => setShowBreakup(false)} className="text-ink-600 hover:text-ink-900">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="border border-[#e6e9ee] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs divide-y divide-border-subtle">
                  <thead className="bg-surface text-ink-600">
                    <tr>
                      <th className="p-3">Order Ref</th>
                      <th className="p-3">Customer Name</th>
                      <th className="p-3">Route Line</th>
                      <th className="p-3">Rep Agent</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Master Rate</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle bg-white">
                    {productBreakup.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-ink-600/50 italic">No customer orders contain this item.</td>
                      </tr>
                    ) : (
                      productBreakup.map((row, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-semibold text-ink-900">{row.so_number}</td>
                          <td className="p-3 font-medium text-ink-900">{row.customer_name}</td>
                          <td className="p-3 text-ink-600">{row.route}</td>
                          <td className="p-3 text-ink-600">{row.dse_name}</td>
                          <td className="p-3 text-right font-semibold text-ink-900">{row.qty}</td>
                          <td className="p-3 text-right text-ink-600">${parseFloat(String(row.rate || 0)).toFixed(2)}</td>
                          <td className="p-3 text-right font-bold text-ink-900">
                            ${parseFloat(String(row.amount || (row.qty * row.rate))).toFixed(2)}
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
      )}
    </div>
  )
}
