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
