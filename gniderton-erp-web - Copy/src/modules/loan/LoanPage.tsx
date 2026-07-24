import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { AutoTable } from '@/components/shared/AutoTable'
import { useList } from './hooks'

export default function LoanPage() {
  const { data, isLoading, isError } = useList()
  const [_selected, setSelected] = useState<any>(null)

  return (
    <div>
      <PageHeader
        eyebrow="LON · Finance"
        title="Loan"
        description="Loans issued, ledgers, and installments."
      />
      <AutoTable
        data={data}
        isLoading={isLoading}
        isError={isError}
        emptyTitle="No records yet"
        emptyDescription="Data from the connected API will appear here once available."
        onRowClick={(row) => setSelected(row)}
      />
      <p className="text-xs text-ink-600/60 mt-3">
        Read-only scaffold — see Build Spec §8 for the full endpoint list and
        the Vendor / Items / Customer / Invoice modules for the complete
        create/edit/drawer pattern to extend this page with.
      </p>
    </div>
  )
}
