import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsApi } from './api'

export function useExpenses(params?: any) {
  return useQuery({ 
    queryKey: ['transactions', 'expenses', params], 
    queryFn: () => transactionsApi.getFinanceExpenses() 
  })
}

export function useExpenseCategories() {
  return useQuery({ 
    queryKey: ['transactions', 'expense-categories'], 
    queryFn: transactionsApi.getFinanceExpensesCategories 
  })
}

export function useExpenseEntities() {
  return useQuery({ 
    queryKey: ['transactions', 'expense-entities'], 
    queryFn: transactionsApi.getEntitiesExpense 
  })
}

export function useBankAccounts() {
  return useQuery({ 
    queryKey: ['transactions', 'bank-accounts'], 
    queryFn: transactionsApi.getBankAccounts 
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: transactionsApi.createFinanceExpenses,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'expenses'] })
    }
  })
}

export function useIncomeEntities() {
  return useQuery({ 
    queryKey: ['transactions', 'income-entities'], 
    queryFn: transactionsApi.getEntitiesIncome 
  })
}

export function useCreateExpenseEntity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: transactionsApi.createEntitiesExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'expense-entities'] })
    }
  })
}

export function useCreateIncomeEntity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: transactionsApi.createEntitiesIncome,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'income-entities'] })
    }
  })
}

export function useUnconsumedDebits() {
  return useQuery({ 
    queryKey: ['transactions', 'unconsumed-debits'], 
    queryFn: transactionsApi.getFinanceReconciliationBankUnconsumedDebits 
  })
}

export function useUnconsumedCredits() {
  return useQuery({ 
    queryKey: ['transactions', 'unconsumed-credits'], 
    queryFn: transactionsApi.getFinanceReconciliationBankUnconsumedCredits 
  })
}

export function useCreateOtherIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: transactionsApi.createFinanceOtherIncome,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'other-income'] })
    }
  })
}

export function useOtherIncomeCategories() {
  return useQuery({ 
    queryKey: ['transactions', 'income-categories'], 
    queryFn: transactionsApi.getFinanceOtherIncomeCategories 
  })
}

export function useOtherIncome(params?: any) {
  return useQuery({ 
    queryKey: ['transactions', 'other-income', params], 
    queryFn: () => transactionsApi.getFinanceOtherIncome() 
  })
}

export function useExpenseLedger(entityId: string | number) {
  return useQuery({ 
    queryKey: ['transactions', 'expense-ledger', entityId], 
    queryFn: () => transactionsApi.getEntitiesExpenseLedger(entityId),
    enabled: !!entityId
  })
}

export function useIncomeLedger(entityId: string | number) {
  return useQuery({ 
    queryKey: ['transactions', 'income-ledger', entityId], 
    queryFn: () => transactionsApi.getEntitiesIncomeLedger(entityId),
    enabled: !!entityId
  })
}

export function useTransfers(params?: any) {
  return useQuery({ 
    queryKey: ['transactions', 'transfers', params], 
    queryFn: () => transactionsApi.getFinanceTransfers() 
  })
}

export function useCreateTransfer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: transactionsApi.createFinanceTransfers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'transfers'] })
      queryClient.invalidateQueries({ queryKey: ['transactions', 'unconsumed-debits'] })
      queryClient.invalidateQueries({ queryKey: ['transactions', 'unconsumed-credits'] })
    }
  })
}
