import { useQuery } from '@tanstack/react-query'
import { Coins, Users, Wallet } from 'lucide-react'
import { billingService } from '../../services/billing.service'
import { Badge } from '../ui/Badge'

const STATUS_VARIANT: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'gray'> = {
  active: 'green',
  trialing: 'blue',
  past_due: 'yellow',
  canceled: 'red',
  incomplete: 'yellow',
  incomplete_expired: 'red',
}

/**
 * Compact widget for the dashboard sidebar.
 * Shows: subscription status, seats used/purchased, wallet balance, credit balance.
 *
 * Replaces the legacy plan-tier usage widget — under the new model, "usage"
 * is credit consumption rather than per-feature monthly counters.
 */
export function PlanUsageWidget() {
  const { data: subRes, isLoading: subLoading } = useQuery({
    queryKey: ['billing-subscription'],
    queryFn: billingService.getSubscription,
    staleTime: 5 * 60 * 1000,
  })

  const { data: walletRes } = useQuery({
    queryKey: ['billing-wallet'],
    queryFn: billingService.getWallet,
    staleTime: 60 * 1000,
  })

  const { data: creditsRes } = useQuery({
    queryKey: ['billing-credits'],
    queryFn: billingService.getCredits,
    staleTime: 60 * 1000,
  })

  if (subLoading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-24 mb-4" />
        <div className="space-y-3">
          <div className="h-2 bg-slate-200 rounded" />
          <div className="h-2 bg-slate-200 rounded" />
        </div>
      </div>
    )
  }

  const sub = subRes?.data?.data?.subscription ?? null
  const seats = subRes?.data?.data?.seats ?? { purchased: 0, used: 0, available: 0 }
  const balance = walletRes?.data?.data?.balance ?? '0'
  const credits = creditsRes?.data?.data ?? { bonus: '0', wallet: '0', total: '0' }

  const status = sub?.status ?? 'inactive'
  const statusVariant = STATUS_VARIANT[status] ?? 'gray'

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Billing</h3>
        <Badge variant={statusVariant}>{status}</Badge>
      </div>

      <div className="space-y-3 text-sm">
        <Row icon={Users} label="Users" value={`${seats.used} / ${seats.purchased}`} />
        <Row icon={Wallet} label="Wallet" value={`$${Number(balance).toFixed(2)}`} />
        <Row icon={Coins} label="Credits" value={Number(credits.total).toFixed(2)} />
      </div>
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<any>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Icon size={12} className="text-slate-400" />
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <span className="text-xs font-semibold text-slate-900">{value}</span>
    </div>
  )
}
