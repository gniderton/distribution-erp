import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hrApi } from './api'
import toast from 'react-hot-toast'

export function useEmployees(status?: string) {
  return useQuery({ queryKey: ['hr', 'employees', status], queryFn: () => hrApi.getEmployees(status) })
}

export function useEmployeeProfile(id: string | number | null) {
  return useQuery({ 
    queryKey: ['hr', 'profile', id], 
    queryFn: () => hrApi.getEmployeesProfile2(id!),
    enabled: !!id
  })
}

export function useDesignations() {
  return useQuery({ queryKey: ['hr', 'designations'], queryFn: hrApi.getEmployeesDesignations })
}

export function useMasterBanks() {
  return useQuery({ queryKey: ['hr', 'banks'], queryFn: hrApi.getMasterBanks })
}

export function useUnconsumedDebits() {
  return useQuery({ queryKey: ['hr', 'unconsumed-debits'], queryFn: hrApi.getFinanceReconciliationBankUnconsumedDebits })
}

export function useSalesInvoicesLookup() {
  return useQuery({ queryKey: ['hr', 'sales-invoices'], queryFn: hrApi.getSalesInvoicesLookup })
}


export function useSalaryPreview(month: number, year: number) {
  return useQuery({ 
    queryKey: ['hr', 'salary-preview', month, year], 
    queryFn: () => hrApi.getEmployeesSalaryPreview(month, year) 
  })
}

export function useEmployeeAdvances() {
  return useQuery({ queryKey: ['hr', 'advances'], queryFn: hrApi.getEmployeesAdvances })
}

export function useSalaryPaymentHeaders() {
  return useQuery({ queryKey: ['hr', 'salary-payment-headers'], queryFn: hrApi.getEmployeesSalaryPaymentHeaders })
}

export function useAttendanceReport(start: string, end: string) {
  return useQuery({ 
    queryKey: ['hr', 'attendance-report', start, end], 
    queryFn: () => hrApi.getEmployeesAttendanceReport(start, end) 
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrApi.createEmployees,
    onSuccess: () => {
      toast.success('Employee created successfully')
      qc.invalidateQueries({ queryKey: ['hr', 'employees'] })
    }
  })
}

export function useUpdateSalary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number, payload: any }) => hrApi.createEmployeesSalaryUpdate(id, payload),
    onSuccess: (_, variables) => {
      toast.success('Salary updated successfully')
      qc.invalidateQueries({ queryKey: ['hr', 'profile', variables.id] })
      qc.invalidateQueries({ queryKey: ['hr', 'employees'] })
    }
  })
}

export function useResignEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number, payload: any }) => hrApi.createEmployeesResign(id, payload),
    onSuccess: (_, variables) => {
      toast.success('Employee resignation initiated')
      qc.invalidateQueries({ queryKey: ['hr', 'profile', variables.id] })
      qc.invalidateQueries({ queryKey: ['hr', 'employees'] })
    }
  })
}

export function useBulkAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrApi.createEmployeesBulkAttendance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'employees'] })
    }
  })
}

export function useBulkSalaryUpdate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrApi.createEmployeesBulkSalaryUpdate,
    onSuccess: () => {
      toast.success('Bulk salary update successful')
      qc.invalidateQueries({ queryKey: ['hr', 'employees'] })
    }
  })
}

export function useBulkBonus() {
  return useMutation({
    mutationFn: hrApi.createEmployeesBulkBonus,
    onSuccess: () => {
      toast.success('Bulk bonus added successfully')
    }
  })
}

export function useBulkSalaryAdvance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrApi.createEmployeesBulkSalaryAdvance,
    onSuccess: () => {
      toast.success('Advance issued successfully')
      qc.invalidateQueries({ queryKey: ['hr', 'advances'] })
      qc.invalidateQueries({ queryKey: ['hr', 'employees'] })
    }
  })
}

export function useBulkSalaryPayment() {
  return useMutation({
    mutationFn: hrApi.createEmployeesBulkSalaryPayment,
  })
}

export function useEmployeeLiabilities(id: string | number | null) {
  return useQuery({
    queryKey: ['hr', 'liabilities', id],
    queryFn: () => hrApi.getEmployeesLiabilities(id!),
    enabled: !!id
  })
}

export function useCreateLiability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrApi.createEmployeesLiabilities,
    onSuccess: (_, variables) => {
      toast.success('Liability recorded successfully')
      qc.invalidateQueries({ queryKey: ['hr', 'liabilities', variables.employee_id] })
      qc.invalidateQueries({ queryKey: ['hr', 'profile', variables.employee_id] })
    }
  })
}

export function useDeleteLiability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrApi.deleteEmployeesLiability,
    onSuccess: () => {
      toast.success('Liability cancelled successfully')
      qc.invalidateQueries({ queryKey: ['hr', 'liabilities'] })
      qc.invalidateQueries({ queryKey: ['hr', 'profile'] })
    }
  })
}
