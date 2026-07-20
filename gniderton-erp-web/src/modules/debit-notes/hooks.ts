import { useQuery } from '@tanstack/react-query'
import { debit_notesApi } from './api'

export function useList() {
  return useQuery({ queryKey: ['debit-notes', 'list'], queryFn: debit_notesApi.getDebitNotes })
}
