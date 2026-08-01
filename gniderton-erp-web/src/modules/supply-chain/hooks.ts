import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supply_chainApi } from './api'
import toast from 'react-hot-toast'

export function useTrips() {
  return useQuery({ 
    queryKey: ['delivery-trips'], 
    queryFn: supply_chainApi.getDeliveryTrips 
  })
}

export function useSyncLogs() {
  return useQuery({ 
    queryKey: ['delivery-sync-logs'], 
    queryFn: supply_chainApi.getDeliverySyncLogs 
  })
}

export function useSyncLogsHistory() {
  return useQuery({ 
    queryKey: ['delivery-sync-logs-history'], 
    queryFn: supply_chainApi.getDeliverySyncLogsHistory 
  })
}

export function useSyncDetails(id: string | number | null) {
  return useQuery({
    queryKey: ['delivery-sync-details', id],
    queryFn: () => supply_chainApi.getDeliverySyncDetails(id!),
    enabled: !!id,
  })
}

export function useSyncHistoryDetails(id: string | number | null) {
  return useQuery({
    queryKey: ['delivery-sync-history-details', id],
    queryFn: () => supply_chainApi.getDeliverySyncHistory(id!),
    enabled: !!id,
  })
}

export function useVerifySettle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: supply_chainApi.createDeliveryVerifySettle,
    onSuccess: () => {
      toast.success('Sync settled successfully.')
      queryClient.invalidateQueries({ queryKey: ['delivery-sync-logs'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-sync-logs-history'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-trips'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to settle sync')
    }
  })
}

export function useTeams() {
  return useQuery({ 
    queryKey: ['delivery-teams'], 
    queryFn: supply_chainApi.getDeliveryTeams 
  })
}

export function useInvoicesPool() {
  return useQuery({ 
    queryKey: ['delivery-invoices-pool'], 
    queryFn: supply_chainApi.getDeliveryInvoicesPool 
  })
}

export function useCreateTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: supply_chainApi.createDeliveryTrips,
    onSuccess: () => {
      toast.success('Trip created successfully.')
      queryClient.invalidateQueries({ queryKey: ['delivery-trips'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-invoices-pool'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to create trip')
    }
  })
}

export function useTripManifest(tripId: string | number | null) {
  return useQuery({
    queryKey: ['delivery-trip-manifest', tripId],
    queryFn: () => supply_chainApi.getDeliveryTripsManifestWeb(tripId!),
    enabled: !!tripId
  })
}

export function useTripPicklist(tripId: string | number | null) {
  return useQuery({
    queryKey: ['delivery-trip-picklist', tripId],
    queryFn: () => supply_chainApi.getDeliveryTripsPicklistWeb(tripId!),
    enabled: !!tripId
  })
}

export function useDeleteTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: supply_chainApi.removeDeliveryTrips,
    onSuccess: () => {
      toast.success('Trip aborted successfully.')
      queryClient.invalidateQueries({ queryKey: ['delivery-trips'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-invoices-pool'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to abort trip')
    }
  })
}

export function useUpdateTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number, payload: any }) => supply_chainApi.updateDeliveryTrips(id, payload),
    onSuccess: () => {
      toast.success('Trip updated successfully.')
      queryClient.invalidateQueries({ queryKey: ['delivery-trips'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-invoices-pool'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-trip-manifest'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-trip-picklist'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update trip')
    }
  })
}

export function useProductBreakdown(tripId: number | null, productId: number | null, mrp: number | null) {
  return useQuery({
    queryKey: ['product-breakdown', tripId, productId, mrp],
    queryFn: () => supply_chainApi.getDeliveryTripsProductBreakdown(tripId!, productId!, mrp!),
    enabled: !!tripId && !!productId && mrp !== null
  })
}

export function useInvoiceDetails(salesOrderId: number | null) {
  return useQuery({
    queryKey: ['invoice-details-unified', salesOrderId],
    queryFn: () => supply_chainApi.getSalesUnified2(salesOrderId!),
    enabled: !!salesOrderId
  })
}
  
export function useMarkSelfCollected() {  
  const queryClient = useQueryClient()  
  return useMutation({  
    mutationFn: (payload: any) => supply_chainApi.createDeliveryMarkSelfCollected(payload),  
    onSuccess: () => {  
      toast.success('Invoice marked as collected.')  
      queryClient.invalidateQueries({ queryKey: ['delivery-invoices-pool'] })  
    },  
    onError: (err: any) => {  
      toast.error(err?.response?.data?.error || 'Failed to mark as collected')  
    }  
  })  
} 

export function useGenerateEwayBills() {
  return useMutation({
    mutationFn: (tripId: string | number) => supply_chainApi.generateEwayBills(tripId),
    onSuccess: (data) => {
      if (data.fileData) {
        // Trigger file download
        const blob = new Blob([JSON.stringify(data.fileData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.fileName || 'eway_bills.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded bulk E-Way Bill JSON for ${data.processedCount} invoices!`);
      } else {
        toast.success(data.message || 'No eligible invoices found for E-Way Bills.');
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to generate E-Way Bills')
    }
  })
}

export function useUploadEwayBillResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return supply_chainApi.uploadEwayBillResponse(formData);
    },
    onSuccess: (data) => {
      toast.success(`Uploaded successfully! Updated: ${data.updatedCount}. Not found: ${data.notFoundCount}.`);
      queryClient.invalidateQueries({ queryKey: ['delivery-trip-manifest'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to upload response');
    }
  });
}
