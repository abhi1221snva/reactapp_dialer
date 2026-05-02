import { useQuery } from '@tanstack/react-query'
import { Users, PhoneCall, MessageSquare, AlertCircle } from 'lucide-react'
import { subscriptionService, type UsageSummary } from '../../services/subscription.service'
import { Badge } from '../ui/Badge'

function ProgressBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.min((current / max) * 100, 100)
  const isHigh = pct >= 80

  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-red-500' : color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function formatLimit(val: number): string {
  if (val === 0) return 'Unlimited'
  if (val >= 1000) return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`
  return val.toLocaleString()
}

const STATUS_VARIANT: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'gray'> = {
  active: 'green',
  trial: 'blue',
  past_due: 'yellow',
  cancelled: 'red',
  expired: 'red',
}

export function PlanUsageWidget() {
  const { data: planData, isLoading: planLoading } = useQuery({
    queryKey: ['my-plan'],
    queryFn: () => subscriptionService.getMyPlan(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['my-usage'],
    queryFn: () => subscriptionService.getMyUsage(),
    staleTime: 60 * 1000, // 1 minute
  })

  const isLoading = planLoading || usageLoading

  if (isLoading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-24 mb-4" />
        <div className="space-y-3">
          <div className="h-2 bg-slate-200 rounded" />
          <div className="h-2 bg-slate-200 rounded" />
          <div className="h-2 bg-slate-200 rounded" />
        </div>
      </div>
    )
  }

  const planResponse = planData?.data?.data as Record<string, unknown> | undefined
  const plan = planResponse?.plan as Record<string, unknown> | undefined
  const usage = usageData?.data?.data as UsageSummary | undefined

  if (!plan) {
    return (
      <div className="card p-5 border-amber-200 bg-amber-50">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-amber-900">No subscription plan</p>
            <p className="text-xs text-amber-700 mt-1">Contact your administrator to assign a plan.</p>
          </div>
        </div>
      </div>
    )
  }

  const status = (planResponse?.subscription_status as string) ?? 'active'
  const statusVariant = STATUS_VARIANT[status] ?? 'gray'

  const metrics = [
    {
      label: 'Agent Seats',
      icon: Users,
      current: usage?.agents?.current ?? 0,
      max: usage?.agents?.max ?? 0,
      color: 'bg-indigo-500',
    },
    {
      label: 'Monthly Calls',
      icon: PhoneCall,
      current: usage?.calls?.current ?? 0,
      max: usage?.calls?.max ?? 0,
      color: 'bg-emerald-500',
    },
    {
      label: 'Monthly SMS',
      icon: MessageSquare,
      current: usage?.sms?.current ?? 0,
      max: usage?.sms?.max ?? 0,
      color: 'bg-blue-500',
    },
  ]

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Subscription</h3>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant}>{status}</Badge>
          <span className="text-xs font-semibold text-indigo-600">{plan?.name as string}</span>
        </div>
      </div>

      <div className="space-y-3">
        {metrics.map(({ label, icon: Icon, current, max, color }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Icon size={12} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-600">{label}</span>
              </div>
              <span className="text-xs text-slate-500">
                {current.toLocaleString()} / {formatLimit(max)}
              </span>
            </div>
            {max > 0 ? (
              <ProgressBar current={current} max={max} color={color} />
            ) : (
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-300 rounded-full" style={{ width: '100%' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {usage?.year_month && (
        <p className="text-[10px] text-slate-400 mt-3 text-right">
          Period: {usage.year_month}
        </p>
      )}
    </div>
  )
}
