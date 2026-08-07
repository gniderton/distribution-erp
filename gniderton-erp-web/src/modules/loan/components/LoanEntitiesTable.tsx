import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { BookOpen } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

interface LoanEntitiesTableProps {
  data: any[];
  isLoading: boolean;
  onViewLedger: (entityId: number) => void;
}

export function LoanEntitiesTable({ data, isLoading, onViewLedger }: LoanEntitiesTableProps) {
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'entity_name',
      header: 'Entity Name',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-ink-900">{row.original.entity_name}</p>
          <p className="text-xs text-ink-500">{row.original.contact_number}</p>
        </div>
      )
    },
    {
      accessorKey: 'entity_type',
      header: 'Type',
      cell: ({ row }) => <Badge tone="neutral">{row.original.entity_type}</Badge>
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge tone={row.original.is_active ? 'success' : 'neutral'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onViewLedger(row.original.id)}
            className="text-brand-600 hover:text-brand-700 hover:bg-brand-50"
          >
            <BookOpen size={14} className="mr-1" /> Ledger
          </Button>
        </div>
      )
    }
  ]

  return (
    <DataTable 
      data={data || []} 
      columns={columns} 
      isLoading={isLoading} 
      emptyTitle="No Loan Entities"
      emptyDescription="Create entities to start recording loans."
    />
  )
}
