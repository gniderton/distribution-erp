import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '../api'

export function BankStatementUpload() {
  const [open, setOpen] = useState(false)
  const [bankType, setBankType] = useState('')
  const [file, setFile] = useState<File | null>(null)
  
  const queryClient = useQueryClient()
  
  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: reportsApi.bankAccounts
  })
  
  const mutation = useMutation({
    mutationFn: async (payload: { content: string, bank_type: string }) => {
      return reportsApi.uploadBankStatement(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generic-report', 'bank-stmt'] })
      queryClient.invalidateQueries({ queryKey: ['generic-report', 'audit-view'] })
      setOpen(false)
      setBankType('')
      setFile(null)
    }
  })

  const handleUpload = () => {
    if (!file || !bankType) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      mutation.mutate({ content: base64, bank_type: bankType })
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)} className="h-9">
        Upload Statement
      </Button>
      <Dialog
        open={open}
        onClose={() => !mutation.isPending && setOpen(false)}
        title="Upload Bank Statement"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={mutation.isPending}>Cancel</Button>
            <Button variant="primary" onClick={handleUpload} disabled={!file || !bankType || mutation.isPending} loading={mutation.isPending}>
              Upload
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium text-ink-900 mb-1.5">Target Bank Account</label>
            <select
              className="w-full h-10 rounded-md border border-border-subtle bg-white px-3 text-sm focus:border-ink-900 focus:ring-1 focus:ring-ink-900"
              value={bankType}
              onChange={(e) => setBankType(e.target.value)}
              disabled={mutation.isPending}
            >
              <option value="">Select Account</option>
              {bankAccounts?.map((account: any) => (
                <option key={account.id} value={account.id.toString()}>
                  {account.name} - {account.account_number}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-500">
              Ensure you select the exact account that matches this statement.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-900 mb-1.5">Statement File</label>
            <input
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={mutation.isPending}
              className="block w-full text-sm text-ink-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-ink-100 file:text-ink-900 hover:file:bg-ink-200 cursor-pointer"
            />
            <p className="mt-1 text-xs text-ink-500">
              Supports original bank CSVs and Excel exports.
            </p>
          </div>
          {mutation.isError && (
            <div className="p-3 text-sm text-danger-700 bg-danger-50 rounded-lg border border-danger-200">
              {String((mutation.error as any)?.response?.data?.error || mutation.error)}
            </div>
          )}
          {mutation.isSuccess && (
            <div className="p-3 text-sm text-success-700 bg-success-50 rounded-lg border border-success-200">
              Upload processed successfully.
            </div>
          )}
        </div>
      </Dialog>
    </>
  )
}
