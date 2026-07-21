import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from './EmptyState'
import { Input } from '@/components/ui/Input'

interface DataTableProps<T> {
  data: T[] | undefined
  columns: ColumnDef<T, any>[]
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: T) => void
  searchPlaceholder?: string
  globalFilter?: string
  onGlobalFilterChange?: (value: string) => void
  rowSelection?: Record<string, boolean>
  onRowSelectionChange?: (value: Record<string, boolean>) => void
}

/**
 * Generic table wrapper used by every module — replaces Appsmith's
 * TABLE_WIDGET_V2. Wire it once per module with that module's columns.
 */
export function DataTable<T>({
  data,
  columns,
  isLoading,
  isError,
  errorMessage,
  emptyTitle,
  emptyDescription,
  onRowClick,
  searchPlaceholder,
  globalFilter,
  onGlobalFilterChange,
  rowSelection,
  onRowSelectionChange,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: onRowSelectionChange as any,
    onSortingChange: setSorting,
    onGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="rounded-card border border-border-subtle bg-white overflow-hidden">
      {onGlobalFilterChange && (
        <div className="border-b border-border-subtle px-4 py-3">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-600/40" />
            <Input
              className="pl-8"
              placeholder={searchPlaceholder || 'Search…'}
              value={globalFilter ?? ''}
              onChange={(e) => onGlobalFilterChange(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border-subtle">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="text-left px-4 py-2.5 text-xs font-medium text-ink-600 select-none whitespace-nowrap"
                  >
                    {header.isPlaceholder ? null : (
                      <button className="inline-flex items-center gap-1 cursor-pointer">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: <ChevronUp className="h-3 w-3" />, desc: <ChevronDown className="h-3 w-3" /> }[
                          header.column.getIsSorted() as string
                        ] ?? null}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border-subtle last:border-0">
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading &&
              !isError &&
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={`border-b border-border-subtle last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-surface' : ''} transition`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-ink-900 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {isError && <ErrorState message={errorMessage} />}
      {!isLoading && !isError && data?.length === 0 && (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}

      {!isLoading && !isError && (data?.length ?? 0) > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
          <p className="text-xs text-ink-600">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-md border border-border-subtle disabled:opacity-40 hover:bg-surface transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-md border border-border-subtle disabled:opacity-40 hover:bg-surface transition"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
