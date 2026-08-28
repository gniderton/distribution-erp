
import { useEffect, memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Plus } from 'lucide-react'
import { useGetPendingBills } from '../hooks/backend/dse'
import { useAppState, useAppDispatch } from '../utils/appStore'
import AppShell from '../components/AppShell'
import { SkeletonList } from '../components/Skeleton'

interface Bill {
  id: string
  invoice_number: string
  invoice_date: string
  grand_total: number
  amount_paid: number
  balance_amount: number
}

const BillCard = memo(function BillCard({ bill, alreadyPaid, onSelect }: {
  bill: Bill
  alreadyPaid: number
  onSelect: (b: Bill) => void
}) {
  const remaining = bill.balance_amount - alreadyPaid
  const isPaid = remaining <= 0
  const daysOld = Math.floor((Date.now() - new Date(bill.invoice_date).getTime()) / 86_400_000)

  return (
    <button
      onClick={() => !isPaid && onSelect(bill)}
      disabled={isPaid}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isPaid
          ? 'bg-muted border-border opacity-60 cursor-not-allowed'
          : 'bg-card border-border hover:bg-accent active:scale-[0.99]'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-foreground text-sm">{bill.invoice_number}</p>
          <p className="text-xs text-muted-foreground">{new Date(bill.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {daysOld}d ago</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          isPaid
            ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
            : daysOld > 30
            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
        }`}>
          {isPaid ? 'Paid' : `${daysOld}d`}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Bill</p>
          <p className="font-medium text-foreground">₹{Number(bill.grand_total).toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Paid</p>
          <p className="font-medium text-green-600 dark:text-green-400">₹{Number(bill.amount_paid).toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Balance</p>
          <p className={`font-bold ${isPaid ? 'text-muted-foreground' : 'text-red-600 dark:text-red-400'}`}>
            ₹{Math.max(0, remaining).toLocaleString('en-IN')}
          </p>
        </div>
      </div>
    </button>
  )
})

export default function PaymentList() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { selectedCustomer, pendingPayments } = useAppState()
  const { data, loading, trigger } = useGetPendingBills()

  useEffect(() => {
    if (selectedCustomer) {
      trigger({ customer_id: selectedCustomer.id })
    }
  }, [selectedCustomer]) // eslint-disable-line react-hooks/exhaustive-deps

  const bills = (Array.isArray(data) ? data : []) as Bill[]

  // How much of each invoice is already captured offline
  const offlinePaidMap = pendingPayments.reduce<Record<string, number>>((acc, p) => {
    if (p.invoice_id) {
      acc[p.invoice_id] = (acc[p.invoice_id] ?? 0) + Number(p.amount)
    }
    return acc
  }, {})

  const selectBill = useCallback((bill: Bill) => {
    dispatch({
      type: 'SET_SELECTED_INVOICE',
      payload: {
        id: bill.id,
        invoice_number: bill.invoice_number,
        balance_amount: bill.balance_amount,
        grand_total: bill.grand_total,
      },
    })
    navigate('/payment-entry')
  }, [dispatch, navigate])

  const goAdvance = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_INVOICE', payload: null })
    navigate('/payment-entry')
  }, [dispatch, navigate])

  return (
    <AppShell
      title="Pending Bills"
      back="/customer-hub"
      right={
        <button onClick={() => selectedCustomer && trigger({ customer_id: selectedCustomer.id }, { skipCache: true })} className="p-2 rounded-full hover:bg-accent">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{selectedCustomer?.customer_name}</p>
          <button
            onClick={goAdvance}
            className="flex items-center gap-1 text-xs text-primary font-medium px-3 py-1.5 rounded-full border border-primary/30 hover:bg-primary/5"
          >
            <Plus className="w-3.5 h-3.5" />
            Advance
          </button>
        </div>

        {loading ? (
          <SkeletonList count={5} />
        ) : bills.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No pending bills</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bills.map(b => (
              <BillCard
                key={b.id}
                bill={b}
                alreadyPaid={offlinePaidMap[b.id] ?? 0}
                onSelect={selectBill}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
