import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { loanApi } from './api'
import toast from 'react-hot-toast'

// --- QUERIES ---

export function useLoanEntities() {
  return useQuery({ queryKey: ['loan-entities'], queryFn: loanApi.getLoanEntities })
}

export function useLoans() {
  return useQuery({ queryKey: ['loans'], queryFn: loanApi.getFinanceLoans })
}

export function useEntityLedger(id: number | string | null) {
  return useQuery({
    queryKey: ['loan-entities-ledger', id],
    queryFn: () => loanApi.getLoanEntitiesLedger(id!),
    enabled: !!id
  })
}

export function useLoanLedger(id: number | string | null) {
  return useQuery({
    queryKey: ['loans-ledger', id],
    queryFn: () => loanApi.getFinanceLoansLedger(id!),
    enabled: !!id
  })
}

export function useEmployees() {
  return useQuery({ queryKey: ['employees'], queryFn: loanApi.getEmployees })
}

export function useBankAccounts() {
  return useQuery({ queryKey: ['bank-accounts'], queryFn: loanApi.getBankAccounts })
}

export function useUnconsumedCredits() {
  return useQuery({ queryKey: ['bank-unconsumed-credits'], queryFn: loanApi.getFinanceReconciliationBankUnconsumedCredits })
}

export function useUnconsumedDebits() {
  return useQuery({ queryKey: ['bank-unconsumed-debits'], queryFn: loanApi.getFinanceReconciliationBankUnconsumedDebits })
}

// --- MUTATIONS ---

export function useCreateEntity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: loanApi.createLoanEntities,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-entities'] })
      toast.success('Loan Entity created successfully')
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create entity')
  })
}

export function useCreateLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: loanApi.createFinanceLoans,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loan-entities-ledger'] })
      toast.success('Loan disbursed successfully')
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create loan')
  })
}

export function useCreateInstallment(loanId: number | string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => loanApi.createFinanceLoansInstallment(loanId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans-ledger', loanId] })
      queryClient.invalidateQueries({ queryKey: ['loan-entities-ledger'] })
      toast.success('Installment recorded successfully')
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to record installment')
  })
}

export function useDeleteLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: loanApi.removeFinanceLoans,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      toast.success('Loan deleted successfully')
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to delete loan')
  })
}

export function useDeleteInstallment(loanId: number | string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: loanApi.removeFinanceLoansTransactions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans-ledger', loanId] })
      toast.success('Installment deleted successfully')
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to delete installment')
  })
}
