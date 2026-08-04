import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GenericReportView } from './GenericReportView'
import { reportsApi } from '../api'

export function ReconciliationAuditWrapper() {
  const [bankAccountId, setBankAccountId] = useState('')
  const [status, setStatus] = useState('Available')

  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: reportsApi.bankAccounts
  })

  const extraActions = (
    <>
      <select 
        className="h-9 rounded border border-border-subtle bg-white text-sm px-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        value={bankAccountId}
        onChange={e => setBankAccountId(e.target.value)}
      >
        <option value="">All Banks</option>
        {bankAccounts?.map((account: any) => (
          <option key={account.id} value={account.id.toString()}>
            {account.name} - {account.account_number}
          </option>
        ))}
      </select>

      <select 
        className="h-9 rounded border border-border-subtle bg-white text-sm px-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        value={status}
        onChange={e => setStatus(e.target.value)}
      >
        <option value="">All Statuses</option>
        <option value="Available">Available</option>
        <option value="Partially Consumed">Partially Consumed</option>
        <option value="Exhausted">Exhausted</option>
      </select>
    </>
  )

  return (
    <GenericReportView 
      title="Reconciliation Audit" 
      queryKey={`audit-view-${bankAccountId}-${status}`} 
      fetchFn={() => reportsApi.bankAuditView({ bank_account_id: bankAccountId || undefined, status: status || undefined })}
      extraActions={extraActions}
      hiddenColumns={['id', 'bank_account_id', 'created_at', 'bank_statement_entry_id', 'upload_batch_id']}
    />
  )
}
