import { useState } from 'react'
import { GenericReportView } from './GenericReportView'
import { BankStatementUpload } from './BankStatementUpload'
import { reportsApi } from '../api'

export function BankStatementWrapper() {
  const [bankName, setBankName] = useState('')
  const [status, setStatus] = useState('Available')

  const extraActions = (
    <>
      <select 
        className="h-9 rounded border border-border-subtle bg-white text-sm px-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        value={bankName}
        onChange={e => setBankName(e.target.value)}
      >
        <option value="">All Banks</option>
        <option value="Axis">Axis</option>
        <option value="IDFC First Bank (Calicut)">IDFC First Bank (Calicut)</option>
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

      <BankStatementUpload />
    </>
  )

  return (
    <GenericReportView 
      title="Bank Reconciliation List" 
      queryKey={`bank-stmt-${bankName}-${status}`} 
      fetchFn={() => reportsApi.bankReconciliationList({ bank_name: bankName || undefined, status: status || undefined })}
      extraActions={extraActions}
      hiddenColumns={['created_at', 'upload_batch_id']}
    />
  )
}
