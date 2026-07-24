import { useQuery } from '@tanstack/react-query'
import { supply_chainApi } from '../api'
import { Loader2, Package, Truck, CheckCircle2, XCircle, Clock } from 'lucide-react'
import dayjs from 'dayjs'

interface DeliveryCycleTimelineProps {
  invoiceId: string | number
}

export default function DeliveryCycleTimeline({ invoiceId }: DeliveryCycleTimelineProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['delivery-cycle', invoiceId],
    queryFn: () => supply_chainApi.getDeliveryInvoicesDeliveryCycle(invoiceId),
    enabled: !!invoiceId
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-ink-500">
        <Loader2 className="w-6 h-6 animate-spin mb-2" />
        <p className="text-sm">Loading delivery history...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-sm">
        Failed to load delivery cycle.
      </div>
    )
  }

  const timeline = data?.timeline || []

  if (timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-ink-500 bg-surface rounded-xl border border-border-subtle/50">
        <Package className="w-8 h-8 mb-3 opacity-20" />
        <p className="text-sm font-medium">No Delivery History</p>
        <p className="text-xs mt-1">This invoice hasn't been assigned to any delivery trips yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider mb-4 border-b border-border-subtle pb-2">Delivery Lifecycle</h3>
      <div className="relative pl-6 border-l-2 border-border-subtle space-y-8">
        {timeline.map((event: any, idx: number) => {
          const isDelivered = event.attempt_status === 'Delivered'
          const isFailed = ['Failed', 'Rejected', 'Returned'].includes(event.attempt_status)
          const isPending = !isDelivered && !isFailed

          let Icon = Clock
          let iconColor = 'bg-ink-100 text-ink-500 border-ink-200'
          
          if (isDelivered) {
            Icon = CheckCircle2
            iconColor = 'bg-emerald-100 text-emerald-600 border-emerald-200'
          } else if (isFailed) {
            Icon = XCircle
            iconColor = 'bg-rose-100 text-rose-600 border-rose-200'
          } else if (isPending) {
            Icon = Truck
            iconColor = 'bg-blue-100 text-blue-600 border-blue-200'
          }

          return (
            <div key={idx} className="relative">
              {/* Timeline dot */}
              <div className={`absolute -left-[35px] w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white ${iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="bg-white border border-border-subtle rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-ink-900 capitalize">{event.attempt_status || 'In Transit'}</h4>
                    <p className="text-xs text-ink-500 mt-1">
                      {event.attempt_time ? dayjs(event.attempt_time).format('MMM D, YYYY • h:mm A') : 'Time Pending'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold bg-surface px-2 py-1 rounded-md text-ink-600">
                      Trip {event.trip_number}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border-subtle/50 text-sm">
                  <div>
                    <span className="text-ink-400 text-xs block mb-0.5">Driver</span>
                    <span className="font-medium text-ink-900">{event.driver_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-ink-400 text-xs block mb-0.5">Vehicle</span>
                    <span className="font-medium text-ink-900">{event.vehicle_number || '-'}</span>
                  </div>
                </div>

                {(event.failure_reason || event.attempt_notes) && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${isFailed ? 'bg-rose-50 border border-rose-100 text-rose-800' : 'bg-surface border border-border-subtle/50 text-ink-700'}`}>
                    {event.failure_reason && <p className="font-semibold mb-1">Reason: {event.failure_reason}</p>}
                    {event.attempt_notes && <p className="text-xs">{event.attempt_notes}</p>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
