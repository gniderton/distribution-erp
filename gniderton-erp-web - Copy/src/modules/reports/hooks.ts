import { useQuery } from '@tanstack/react-query'
import { reportsApi } from './api'

export function useSalesSummary() {
  return useQuery({ queryKey: ['reports', 'sales-summary'], queryFn: reportsApi.salesSummaryDetailed })
}

export function useCashFlow() {
  return useQuery({ queryKey: ['reports', 'cash-flow'], queryFn: reportsApi.cashFlow })
}

export function usePnL() {
  return useQuery({ queryKey: ['reports', 'pnl'], queryFn: reportsApi.profitAndLoss })
}
