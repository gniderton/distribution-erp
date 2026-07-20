import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useInvoice, useUnlockInvoice } from '../hooks'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Lock } from 'lucide-react'

export function InvoiceDetailDrawer({ id, onClose }: { id: string | number | null; onClose: () => void }) {
  const { data, isLoading } = useInvoice(id)
  const unlock = useUnlockInvoice()

  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      title={data?.invoice_no ? `Invoice ${data.invoice_no}` : 'Invoice'}
      description={data?.customer_name}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
          <Button
            size="sm"
            variant="secondary"
            loading={unlock.isPending}
            onClick={() => id && unlock.mutate(id)}
          >
            <Lock className="h-3.5 w-3.5" /> Unlock for edit
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-600">Amount</span>
            <span className="font-mono-figures font-semibold text-lg text-ink-900">{formatCurrency(data?.amount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-600">Date</span>
            <span className="text-ink-900">{formatDate(data?.date)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-600">Status</span>
            <Badge tone={data?.status === 'paid' ? 'success' : data?.status === 'overdue' ? 'danger' : 'warn'}>
              {data?.status || 'pending'}
            </Badge>
          </div>
          <div className="rounded-lg bg-surface border border-border-subtle p-3 text-xs text-ink-600">
            Full line-item breakdown, PDF preview, and payment allocation render here —
            wire additional fields from <code className="font-mono-figures">GET /api/sales/unified/{'{id}'}</code> as needed.
          </div>
        </div>
      )}
    </Drawer>
  )
}
