import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { UploadCloud } from 'lucide-react'

const IMPORTS = [
  { key: 'customers', label: 'Customers', endpoint: '/api/migration/customers' },
  { key: 'vendors', label: 'Vendors', endpoint: '/api/migration/vendors' },
  { key: 'customer-advances', label: 'Customer advances', endpoint: '/api/migration/customer-advances' },
  { key: 'vendor-advances', label: 'Vendor advances', endpoint: '/api/migration/vendor-advances' },
  { key: 'loans', label: 'Loans', endpoint: '/api/migration/loans' },
  { key: 'opening-stock', label: 'Opening stock', endpoint: '/api/migration/opening-stock' },
  { key: 'outstanding-bills', label: 'Outstanding bills', endpoint: '/api/migration/outstanding-bills' },
  { key: 'outstanding-invoices', label: 'Outstanding invoices', endpoint: '/api/migration/outstanding-invoices' },
]

/**
 * One-time data import tool — admin only. Each card posts a file to its
 * migration endpoint (Build Spec §8.19). Wire the file input to
 * migrationsetupApi in ./api.ts once file-field naming is confirmed with backend.
 */
export default function MigrationSetupPage() {
  return (
    <div>
      <PageHeader
        eyebrow="MIG · Admin"
        title="Migration Setup"
        description="One-time bulk import tools for moving historical data into GNIDERTON ERP."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {IMPORTS.map((item) => (
          <div key={item.key} className="rounded-card border border-border-subtle bg-white p-5 flex flex-col">
            <div className="h-9 w-9 rounded-lg bg-brand-500/10 flex items-center justify-center mb-3">
              <UploadCloud className="h-4 w-4 text-brand-700" />
            </div>
            <p className="font-display font-medium text-ink-900">{item.label}</p>
            <p className="font-mono-figures text-[11px] text-ink-600/50 mt-1">{item.endpoint}</p>
            <Button variant="secondary" size="sm" className="mt-4 self-start">
              Choose file
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
