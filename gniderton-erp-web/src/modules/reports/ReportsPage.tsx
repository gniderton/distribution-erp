import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Drawer } from '@/components/ui/Drawer'
import { 
  BarChart3, TrendingUp, Wallet, FileBarChart, 
  BookOpen, Landmark, FileText, Activity, 
  Users, PackageSearch, Receipt, FileSpreadsheet,
  PieChart, Store
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { FinancialReportView } from './components/FinancialReportView'
import { GenericReportView } from './components/GenericReportView'
import { SalesMarginReportView } from './components/SalesMarginReportView'
import { BankStatementWrapper } from './components/BankStatementWrapper'
import { ReconciliationAuditWrapper } from './components/ReconciliationAuditWrapper'
import { SalesLinesDashboard } from './components/SalesLinesDashboard'
import { SalesAnalyticsDashboard } from './components/SalesAnalyticsDashboard'
import { PaymentAllocationsReportView } from './components/PaymentAllocationsReportView'
import { reportsApi } from './api'

type ReportDefinition = {
  id: string
  title: string
  description: string
  icon: any
  colorClass: string
  component: React.ReactNode
}

const REPORT_CATEGORIES = [
  {
    category: 'Financial Statements',
    description: 'Core financial health and ledger data.',
    color: 'emerald',
    reports: [
      {
        id: 'pnl',
        title: 'Profit & Loss',
        description: 'Detailed revenue and expense breakdown across the fiscal year.',
        icon: TrendingUp,
        colorClass: 'text-emerald-600 bg-emerald-500/10 group-hover:bg-emerald-500/20 ring-emerald-500/30',
        component: <FinancialReportView type="pnl" />
      },
      {
        id: 'balancesheet',
        title: 'Balance Sheet',
        description: 'Snapshot of assets, liabilities, and equity.',
        icon: Landmark,
        colorClass: 'text-emerald-600 bg-emerald-500/10 group-hover:bg-emerald-500/20 ring-emerald-500/30',
        component: <FinancialReportView type="balanceSheet" />
      },
      {
        id: 'cashflow',
        title: 'Cash Flow',
        description: 'Operating, investing, and financing cash movements.',
        icon: Wallet,
        colorClass: 'text-emerald-600 bg-emerald-500/10 group-hover:bg-emerald-500/20 ring-emerald-500/30',
        component: <FinancialReportView type="cashFlow" />
      },
      {
        id: 'gl',
        title: 'General Ledger',
        description: 'Complete record of all financial transactions by account.',
        icon: BookOpen,
        colorClass: 'text-emerald-600 bg-emerald-500/10 group-hover:bg-emerald-500/20 ring-emerald-500/30',
        component: <GenericReportView title="General Ledger" queryKey="gl" fetchFn={reportsApi.generalLedger} />
      }
    ]
  },
  {
    category: 'Sales & Revenue',
    description: 'Sales performance and margin analytics.',
    color: 'amber',
    reports: [
      {
        id: 'sales-lines',
        title: 'Sales Lines',
        description: 'Granular view of all sales invoice lines and items sold.',
        icon: Receipt,
        colorClass: 'text-amber-600 bg-amber-500/10 group-hover:bg-amber-500/20 ring-amber-500/30',
        component: <SalesLinesDashboard />
      },
      {
        id: 'sales-analytics',
        title: 'Sales Analytics Dashboard',
        description: 'Comprehensive visual dashboard of sales performance, top brands, and leaderboards.',
        icon: TrendingUp,
        colorClass: 'text-brand-600 bg-brand-500/10 group-hover:bg-brand-500/20 ring-brand-500/30',
        component: <SalesAnalyticsDashboard />
      },
      {
        id: 'sales-margin',
        title: 'Sales Margin',
        description: 'Profitability analysis on sales transactions.',
        icon: PieChart,
        colorClass: 'text-amber-600 bg-amber-500/10 group-hover:bg-amber-500/20 ring-amber-500/30',
        component: <SalesMarginReportView />
      },
      {
        id: 'receivables',
        title: 'Receivables & Collections',
        description: 'Payment Collection Master and outstanding DSE invoices.',
        icon: Activity,
        colorClass: 'text-amber-600 bg-amber-500/10 group-hover:bg-amber-500/20 ring-amber-500/30',
        component: <ReceivablesReportView />
      },
      {
        id: 'customer-advances',
        title: 'Customer Advances',
        description: 'Track advance payments and unutilized balances from customers.',
        icon: Wallet,
        colorClass: 'text-rose-600 bg-rose-500/10 group-hover:bg-rose-500/20 ring-rose-500/30',
        component: <CustomerAdvanceReportView />
      },
      {
        id: 'credit-note-allocations',
        title: 'Credit Note Allocations',
        description: 'Track which bills each credit note or return has been applied against.',
        icon: FileSpreadsheet,
        colorClass: 'text-brand-600 bg-brand-500/10 group-hover:bg-brand-500/20 ring-brand-500/30',
        component: <CreditNoteAllocationReportView />
      },
      {
        id: 'dse-performance',
        title: 'DSE Executive Dashboard',
        description: 'Live KPIs, productivity stats, and sales vs collection trends for executives.',
        icon: Users,
        colorClass: 'text-fuchsia-600 bg-fuchsia-500/10 group-hover:bg-fuchsia-500/20 ring-fuchsia-500/30',
        component: <DseDashboardView />
      }
    ]
  },
  {
    category: 'Banking & Reconciliation',
    description: 'Bank matching, statements, and payment audits.',
    color: 'blue',
    reports: [
      {
        id: 'bank-stmt',
        title: 'Bank Statements',
        description: 'Uploaded statements and matching status.',
        icon: FileSpreadsheet,
        colorClass: 'text-brand-600 bg-brand-500/10 group-hover:bg-brand-500/20 ring-brand-500/30',
        component: <BankStatementWrapper />
      },
      {
        id: 'audit-view',
        title: 'Reconciliation Audit',
        description: 'Deep dive into payment allocations and forensic catches.',
        icon: FileText,
        colorClass: 'text-brand-600 bg-brand-500/10 group-hover:bg-brand-500/20 ring-brand-500/30',
        component: <ReconciliationAuditWrapper />
      },
      {
        id: 'payment-allocations',
        title: 'Payment Allocations',
        description: 'View how payments are distributed across specific invoices.',
        icon: Activity,
        colorClass: 'text-brand-600 bg-brand-500/10 group-hover:bg-brand-500/20 ring-brand-500/30',
        component: <PaymentAllocationsReportView />
      }
    ]
  },
  {
    category: 'Payroll & HR',
    description: 'Employee attendance and salary processing.',
    color: 'indigo',
    reports: [
      {
        id: 'attendance',
        title: 'Attendance Report',
        description: 'Daily attendance logs for all staff.',
        icon: Users,
        colorClass: 'text-brand-600 bg-brand-500/10 group-hover:bg-brand-500/20 ring-brand-500/30',
        component: <GenericReportView title="Attendance Report" queryKey="attendance" fetchFn={reportsApi.attendanceDetails} />
      }
    ]
  },
  {
    category: 'Inventory & Purchases',
    description: 'Stock holding and procurement data.',
    color: 'rose',
    reports: [
      {
        id: 'stock',
        title: 'Stock Report',
        description: 'Current inventory holding and valuations.',
        icon: PackageSearch,
        colorClass: 'text-rose-600 bg-rose-500/10 group-hover:bg-rose-500/20 ring-rose-500/30',
        component: <StockReportView />
      },
      {
        id: 'purchase-analytics',
        title: 'Purchase Analytics',
        description: 'Line level purchase insights and vendor analytics.',
        icon: Store,
        colorClass: 'text-rose-600 bg-rose-500/10 group-hover:bg-rose-500/20 ring-rose-500/30',
        component: <PurchaseAnalyticsDashboard />
      }
    ]
  }
]

import { StockReportView } from './components/StockReportView'
import { ReceivablesReportView } from './components/ReceivablesReportView'
import { DseDashboardView } from './components/DseDashboardView'
import { CustomerAdvanceReportView } from './components/CustomerAdvanceReportView'
import { CreditNoteAllocationReportView } from './components/CreditNoteAllocationReportView'
import { PurchaseAnalyticsDashboard } from './components/PurchaseAnalyticsDashboard'

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportDefinition | null>(null)

  return (
    <div className="pb-20">
      <PageHeader
        eyebrow="RPT · Analytics"
        title="Reports Hub"
        description="Comprehensive financial statements, sales analytics, and audit ledgers."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Reports Available" value="15+" icon={FileBarChart} />
        <StatCard label="Financial Statements" value="Ready" icon={Landmark} />
        <StatCard label="Reconciliation Status" value="Healthy" icon={Activity} />
        <StatCard label="System Integrity" value="100%" icon={BarChart3} />
      </div>

      <div className="space-y-12">
        {REPORT_CATEGORIES.map((cat, idx) => (
          <div key={idx} className="space-y-4">
            <div>
              <h2 className="text-lg font-display font-semibold text-ink-900">{cat.category}</h2>
              <p className="text-sm text-ink-500">{cat.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cat.reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setActiveReport(report)}
                  className="group relative flex flex-col items-start p-5 text-left bg-white border border-border-subtle rounded-xl hover:shadow-sm hover:border-border-hover transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-brand-500/50 hover:-translate-y-[2px]"
                >
                  <div className={cn("p-2.5 rounded-lg mb-4 ring-1 ring-inset transition-colors", report.colorClass)}>
                    <report.icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <h3 className="font-medium text-ink-900 mb-1 group-hover:text-brand-600 transition-colors">{report.title}</h3>
                  <p className="text-sm text-ink-500 leading-relaxed">{report.description}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Report Viewer Drawer */}
      <Drawer 
        open={!!activeReport} 
        onClose={() => setActiveReport(null)}
        title={
          <div className="flex items-center gap-3">
            {activeReport && (
              <>
                <div className={cn("p-1.5 rounded-md ring-1 ring-inset", activeReport.colorClass)}>
                  <activeReport.icon className="w-4 h-4" />
                </div>
                <span>{activeReport.title}</span>
              </>
            )}
          </div>
        }
        description={activeReport?.description}
        widthClass="max-w-[95vw] lg:max-w-[1200px]"
      >
        <div className="pt-2">
          {activeReport?.component}
        </div>
      </Drawer>
    </div>
  )
}
