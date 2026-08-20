import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendorApi } from './api'
import type { Vendor, VendorAddress } from './types'

export function useVendors() {
  return useQuery({ queryKey: ['vendors'], queryFn: vendorApi.list })
}

export function useVendor(id: string | number | null) {
  return useQuery({
    queryKey: ['vendors', id],
    queryFn: () => vendorApi.getOne(id as string | number),
    enabled: !!id,
  })
}

export function useVendorAddresses(id: string | number | null) {
  return useQuery({
    queryKey: ['vendors', id, 'addresses'],
    queryFn: () => vendorApi.addresses(id as string | number),
    enabled: !!id,
  })
}

export function useVendorLedger(id: string | number | null) {
  return useQuery({
    queryKey: ['vendors', id, 'ledger'],
    queryFn: () => vendorApi.ledger(id as string | number),
    enabled: !!id,
  })
}

export function useVendorPaymentHistory(id: string | number | null) {
  return useQuery({
    queryKey: ['vendors', id, 'payment-history'],
    queryFn: () => vendorApi.paymentHistory(id as string | number),
    enabled: !!id,
  })
}

export function usePurchaseInvoices() {
  return useQuery({
    queryKey: ['purchase-invoices'],
    queryFn: vendorApi.purchaseInvoices,
  })
}

export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn: vendorApi.bankAccounts,
  })
}

export function useCreateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Vendor>) => vendorApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  })
}

export function useUpdateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Partial<Vendor> }) =>
      vendorApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  })
}

export function useAddAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vendorId, payload }: { vendorId: string | number; payload: Partial<VendorAddress> }) =>
      vendorApi.addAddress(vendorId, payload),
    onSuccess: (_, variables) => qc.invalidateQueries({ queryKey: ['vendors', variables.vendorId, 'addresses'] }),
  })
}

export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: vendorApi.recordPayment,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['vendors', variables.vendor_id, 'ledger'] })
      qc.invalidateQueries({ queryKey: ['vendors', variables.vendor_id, 'payment-history'] })
      qc.invalidateQueries({ queryKey: ['purchase-invoices'] })
      qc.invalidateQueries({ queryKey: ['unconsumed-debits'] })
    }
  })
}

export function useUnconsumedDebits() {
  return useQuery({
    queryKey: ['unconsumed-debits'],
    queryFn: vendorApi.unconsumedDebits
  })
}
