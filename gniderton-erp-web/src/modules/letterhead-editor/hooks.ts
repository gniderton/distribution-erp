import { useQuery } from '@tanstack/react-query'
import { letterhead_editorApi } from './api'

export function useList() {
  return useQuery({ queryKey: ['letterhead-editor', 'list'], queryFn: letterhead_editorApi.getLetters })
}
