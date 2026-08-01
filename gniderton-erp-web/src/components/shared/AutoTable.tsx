import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from './DataTable'

/**
 * Derives table columns automatically from the shape of the first row.
 * Used for scaffolded modules where the exact response shape depends on the
 * live backend — swap this out for explicit typed columns (see Vendor/Items/
 * Customer/Invoice modules) as each module gets built out for real.
 */
export function AutoTable({
  data,
  isLoading,
  isError,
  emptyTitle,
  emptyDescription,
  onRowClick,
}: {
  data: any[] | undefined
  isLoading?: boolean
  isError?: boolean
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: any) => void
}) {
  const columns = useMemo<ColumnDef<any>[]>(() => {
    const sample = data?.[0]
    if (!sample || typeof sample !== 'object') return [{ accessorKey: 'value', header: 'Value' }]
    return Object.keys(sample)
      .filter((k) => typeof sample[k] !== 'object')
      .slice(0, 7)
      .map((key) => ({
        accessorKey: key,
        header: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        cell: (c: any) => {
          const v = c.getValue()
          if (v === null || v === undefined || v === '') return '—'
          
          if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
            return new Date(v).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          }
          
          return String(v)
        },
      }))
  }, [data])

  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      isError={isError}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      onRowClick={onRowClick}
    />
  )
}
