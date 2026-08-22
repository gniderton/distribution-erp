import { useQuery } from '@tanstack/react-query'
import { reportsApi } from './api'

export function useSalesSummary() {
  return useQuery({ queryKey: ['reports', 'sales-summary'], queryFn: reportsApi.salesSummaryDetailed })
}

export function useCashFlow(params?: { start_date?: string, end_date?: string }) {
  return useQuery({ 
    queryKey: ['reports', 'cash-flow', params], 
    queryFn: () => reportsApi.cashFlow(params) 
  })
}

export function usePnL(params?: { fy?: string, quarter?: string, month?: string }) {
  return useQuery({ 
    queryKey: ['reports', 'pnl', params], 
    queryFn: () => reportsApi.profitAndLoss(params) 
  })
}
