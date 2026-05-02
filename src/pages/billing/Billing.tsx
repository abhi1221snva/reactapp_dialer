import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CreditCard, DollarSign, Wallet, Package, Plus, ArrowUp,
  CheckCircle2, Minus, FileText, Trash2, ReceiptText, Loader2, ExternalLink,
  Activity, Bell, Settings2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { billingService, type PaymentMethod, type WalletTransaction, type InvoiceRecord, type SubscriptionEvent } from '../../services/billing.service'
import type { SubscriptionPlan } from '../../services/subscription.service'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { cn } from '../../utils/cn'
import { formatDateTime } from '../../utils/format'
import { AddCardModal } from './AddCardModal'
import { TopUpModal } from './TopUpModal'
import { PlanUpgradeModal } from './PlanUpgradeModal'

const TABS = ['Overview', 'Plans', 'Wallet', 'Payment Methods', 'Invoices', 'Activity'] as const
type Tab = typeof TABS[number]

const STATUS_VARIANT: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'gray'> = {
  active: 'green',
  trial: 'blue',
  past_due: 'yellow',
  cancelled: 'red',
  expired: 'red',
}

export function Billing() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('Overview')
  const [showAddCard, setShowAddCard] = useState(false)
  const [showTopUp, setShowTopUp] = useState(false)
  const [upgradePlan, setUpgradePlan] = useState<SubscriptionPlan | null>(null)

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: overviewRes } = useQuery({
    queryKey: ['billing-overview'],
    queryFn: billingService.getOverview,
    staleTime: 60_000,
  })

  const { data: plansRes } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: billingService.getAvailablePlans,
    enabled: tab === 'Plans' || tab === 'Overview',
    staleTime: 300_000,
  })

  const { data: walletTxRes, isLoading: txLoading } = useQuery({
    queryKey: ['billing-wallet-tx'],
    queryFn: () => billingService.getWalletTransactions(),
    enabled: tab === 'Wallet',
  })

  const { data: pmRes, refetch: refetchPm } = useQuery({
    queryKey: ['billing-pm'],
    queryFn: billingService.getPaymentMethods,
    enabled: tab === 'Payment Methods' || tab === 'Overview' || tab === 'Wallet' || tab === 'Plans',
  })

  const { data: invRes, isLoading: invLoading } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: () => billingService.getInvoices(),
    enabled: tab === 'Invoices',
  })

  const { data: eventsRes, isLoading: eventsLoading } = useQuery({
    queryKey: ['billing-events'],
    queryFn: () => billingService.getEvents(),
    enabled: tab === 'Activity',
  })

  const overview = overviewRes?.data?.data
  const plans: SubscriptionPlan[] = plansRes?.data?.data?.plans || []
  const currentPlanId = plansRes?.data?.data?.current_plan_id
  const currentCycle = (overview?.billing_cycle || 'monthly') as 'monthly' | 'annual'
  const currentPlan = plans.find(p => p.id === currentPlanId) || null
  const paymentMethods: PaymentMethod[] = pmRes?.data?.data || []
  const walletTxs: WalletTransaction[] = walletTxRes?.data?.data?.data || []
  const invoices: InvoiceRecord[] = invRes?.data?.data?.data || []
  const events: SubscriptionEvent[] = eventsRes?.data?.data?.data || []
  const hasSubscription = !!overview?.subscription_status && !['trial', 'expired'].includes(overview.subscription_status)

  // Wallet threshold state
  const [thresholdInput, setThresholdInput] = useState('')
  const [thresholdEditing, setThresholdEditing] = useState(false)

  const thresholdMutation = useMutation({
    mutationFn: (cents: number) => billingService.updateWalletThreshold(cents),
    onSuccess: () => {
      toast.success('Low balance threshold updated')
      setThresholdEditing(false)
      qc.invalidateQueries({ queryKey: ['billing-overview'] })
    },
    onError: () => { /* interceptor handles */ },
  })

  const saveThreshold = () => {
    const dollars = parseFloat(thresholdInput)
    if (isNaN(dollars) || dollars < 0) {
      toast.error('Enter a valid dollar amount')
      return
    }
    thresholdMutation.mutate(Math.round(dollars * 100))
  }

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['billing-overview'] })
    qc.invalidateQueries({ queryKey: ['billing-plans'] })
    qc.invalidateQueries({ queryKey: ['billing-pm'] })
    qc.invalidateQueries({ queryKey: ['billing-wallet-tx'] })
    qc.invalidateQueries({ queryKey: ['billing-invoices'] })
    qc.invalidateQueries({ queryKey: ['billing-events'] })
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const fmtLimit = (v: number) => (v === 0 ? 'Unlimited' : v.toLocaleString())
  const usagePct = (cur: number, max: number) => (max === 0 ? 0 : Math.min(100, Math.round((cur / max) * 100)))

  const removeCard = async (id: string) => {
    if (!confirm('Remove this card?')) return
    try {
      await billingService.removePaymentMethod(id)
      toast.success('Card removed')
      refetchPm()
    } catch { /* interceptor */ }
  }

  // ── Column defs ─────────────────────────────────────────────────────────
  const txCols: Column<WalletTransaction>[] = [
    { key: 'id', header: '#', render: r => <span className="text-xs font-mono text-slate-400">#{r.id}</span> },
    { key: 'transaction_type', header: 'Type', render: r => <Badge variant={r.transaction_type === 'credit' ? 'green' : 'red'}>{r.transaction_type}</Badge> },
    { key: 'description', header: 'Description', render: r => <span className="text-sm text-slate-700">{r.description || '—'}</span> },
    {
      key: 'amount', header: 'Amount',
      render: r => (
        <span className={cn('text-sm font-bold', r.transaction_type === 'credit' ? 'text-emerald-700' : 'text-red-600')}>
          {r.transaction_type === 'credit' ? '+' : '-'}${Math.abs(Number(r.amount)).toFixed(2)}
        </span>
      ),
    },
    { key: 'created_at', header: 'Date', render: r => <span className="text-xs text-slate-500">{formatDateTime(r.created_at)}</span> },
  ]

  const invCols: Column<InvoiceRecord>[] = [
    { key: 'id', header: 'Invoice', render: r => <span className="text-xs font-mono text-slate-500">{String(r.id).slice(0, 20)}...</span> },
    { key: 'status', header: 'Status', render: r => <Badge variant={r.status === 'paid' ? 'green' : r.status === 'open' ? 'yellow' : 'gray'}>{r.status}</Badge> },
    { key: 'amount_paid', header: 'Amount', render: r => <span className="font-bold text-sm">${(r.amount_paid / 100).toFixed(2)}</span> },
    {
      key: 'period_start', header: 'Period',
      render: r => <span className="text-xs text-slate-500">{r.period_start ? new Date(r.period_start * 1000).toLocaleDateString() : '—'} — {r.period_end ? new Date(r.period_end * 1000).toLocaleDateString() : '—'}</span>,
    },
    {
      key: 'hosted_invoice_url', header: '',
      render: r => r.hosted_invoice_url ? (
        <a href={r.hosted_invoice_url as string} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">
          <ExternalLink size={14} />
        </a>
      ) : null,
    },
  ]

  const EVENT_VARIANT: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'gray'> = {
    trial_started: 'blue',
    subscribed: 'green',
    upgraded: 'green',
    cancelled: 'yellow',
    trial_expired: 'red',
    subscription_expired: 'red',
    grace_ended: 'gray',
  }

  const eventCols: Column<SubscriptionEvent>[] = [
    {
      key: 'event_type', header: 'Event',
      render: r => (
        <Badge variant={EVENT_VARIANT[r.event_type] || 'gray'}>
          {String(r.event_type).replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'from_status', header: 'From',
      render: r => <span className="text-sm text-slate-500">{r.from_status || '—'}</span>,
    },
    {
      key: 'to_status', header: 'To',
      render: r => <span className="text-sm text-slate-700 font-medium">{r.to_status || '—'}</span>,
    },
    {
      key: 'triggered_by', header: 'By',
      render: r => <span className="text-xs text-slate-400">{r.triggered_by}</span>,
    },
    {
      key: 'created_at', header: 'Date',
      render: r => <span className="text-xs text-slate-500">{formatDateTime(r.created_at)}</span>,
    },
  ]

  // ══════════════════════════════════════════════════════════════════════════
  //  Render
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5">
      {/* Quick actions */}
      <div className="flex items-center justify-end gap-3">
        <button onClick={() => setShowTopUp(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:border-indigo-300 hover:text-indigo-700 transition-all">
          <Wallet size={15} /> Top Up Wallet
        </button>
        <button onClick={() => setTab('Plans')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-all">
          <ArrowUp size={15} /> Upgrade Plan
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors',
              tab === t
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ═══ Overview ═══ */}
      {tab === 'Overview' && (
        <div className="space-y-5">
          {/* Plan + Status card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Current Plan</h3>
              {overview?.subscription_status && (
                <Badge variant={STATUS_VARIANT[overview.subscription_status] || 'gray'}>
                  {overview.subscription_status}
                </Badge>
              )}
            </div>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-indigo-600">
                {currentPlan?.name || 'No plan'}
              </span>
              {currentPlan && (
                <span className="text-slate-500 text-sm mb-1">
                  ${currentCycle === 'annual' ? currentPlan.price_annual : currentPlan.price_monthly}/{currentCycle === 'annual' ? 'yr' : 'mo'}
                </span>
              )}
            </div>
            {overview?.subscription_ends_at && (
              <p className="text-xs text-slate-400 mt-2">
                {overview.subscription_status === 'trial' ? 'Trial ends' : 'Renews'}: {new Date(overview.subscription_ends_at).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Wallet Balance', value: `$${Number(overview?.wallet_balance ?? 0).toFixed(2)}`, icon: DollarSign, gradient: 'from-emerald-500 to-teal-600' },
              { label: 'Agent Seats', value: `${overview?.usage?.agents?.current ?? 0} / ${fmtLimit(overview?.usage?.agents?.max ?? 0)}`, icon: Package, gradient: 'from-indigo-500 to-violet-600' },
              { label: 'Monthly Calls', value: `${(overview?.usage?.calls?.current ?? 0).toLocaleString()} / ${fmtLimit(overview?.usage?.calls?.max ?? 0)}`, icon: FileText, gradient: 'from-sky-500 to-blue-600' },
            ].map(stat => (
              <div key={stat.label} className="card flex items-center gap-4">
                <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', stat.gradient)}>
                  <stat.icon size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
                  <p className="font-bold text-slate-900 mt-0.5">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Usage bars */}
          <div className="card space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Usage This Month</h3>
            {(['agents', 'calls', 'sms'] as const).map(key => {
              const m = overview?.usage?.[key]
              const cur = m?.current ?? 0
              const max = m?.max ?? 0
              const pct = usagePct(cur, max)
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-600 capitalize">{key}</span>
                    <span className="text-slate-400">{cur.toLocaleString()} / {fmtLimit(max)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', pct >= 80 ? 'bg-red-500' : 'bg-indigo-500')}
                      style={{ width: max === 0 ? '0%' : `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Upcoming invoice */}
          {overview?.upcoming_invoice && (
            <div className="card">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Next Invoice</h3>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 text-sm">Amount due</span>
                <span className="font-bold text-lg text-indigo-600">${(overview.upcoming_invoice.amount_due / 100).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Plans ═══ */}
      {tab === 'Plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map(plan => {
            const isCurrent = plan.id === currentPlanId
            const canUpgrade = currentPlan ? plan.display_order > currentPlan.display_order : true
            const price = currentCycle === 'annual' ? plan.price_annual : plan.price_monthly
            return (
              <div
                key={plan.id}
                className={cn(
                  'card relative overflow-hidden transition-all hover:shadow-lg',
                  isCurrent && 'ring-2 ring-indigo-500 shadow-indigo-100 shadow-lg'
                )}
              >
                {isCurrent && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="blue">Current</Badge>
                  </div>
                )}
                <h3 className="font-bold text-slate-900 text-lg">{plan.name}</h3>
                <div className="flex items-end gap-1 mt-2 mb-4">
                  <span className="text-3xl font-bold text-indigo-600">{price > 0 ? `$${price}` : 'Custom'}</span>
                  {price > 0 && <span className="text-slate-500 text-sm mb-1">/{currentCycle === 'annual' ? 'yr' : 'mo'}</span>}
                </div>
                <div className="text-xs text-slate-500 space-y-1 mb-4">
                  <p>Up to {plan.max_agents === 0 ? 'Unlimited' : plan.max_agents} agents</p>
                  <p>{plan.max_calls_monthly === 0 ? 'Unlimited' : plan.max_calls_monthly.toLocaleString()} calls/mo</p>
                  <p>{plan.max_sms_monthly === 0 ? 'Unlimited' : plan.max_sms_monthly.toLocaleString()} SMS/mo</p>
                </div>
                <div className="space-y-1.5 text-sm border-t border-slate-100 pt-3">
                  {Object.entries({
                    has_predictive_dialer: 'Predictive Dialer',
                    has_full_crm: 'Full CRM',
                    has_api_access: 'API Access',
                    has_ai_coaching: 'AI Coaching',
                  }).map(([key, label]) => {
                    const on = !!(plan as Record<string, unknown>)[key]
                    return (
                      <div key={key} className="flex items-center gap-2">
                        {on ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Minus size={14} className="text-slate-300" />}
                        <span className={on ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
                      </div>
                    )
                  })}
                </div>
                <button
                  onClick={() => canUpgrade && !isCurrent ? setUpgradePlan(plan) : undefined}
                  disabled={isCurrent || !canUpgrade}
                  className={cn(
                    'w-full mt-5 py-2.5 rounded-xl font-semibold text-sm transition-all',
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 cursor-default'
                      : canUpgrade
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 hover:shadow-indigo-300'
                        : 'border-2 border-slate-200 text-slate-400 cursor-not-allowed'
                  )}
                >
                  {isCurrent ? 'Current Plan' : canUpgrade ? 'Upgrade' : 'Contact Support'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ Wallet ═══ */}
      {tab === 'Wallet' && (
        <div className="space-y-5">
          <div
            className="rounded-2xl p-6 text-white overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #0ea5e9 100%)' }}
          >
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm font-medium uppercase tracking-wide">Wallet Balance</p>
                <p className="text-5xl font-bold mt-1 tabular-nums">${Number(overview?.wallet_balance ?? 0).toFixed(2)}</p>
              </div>
              <button
                onClick={() => setShowTopUp(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 text-white font-semibold text-sm hover:bg-white/30 backdrop-blur transition-all"
              >
                <Plus size={15} /> Top Up
              </button>
            </div>
          </div>

          {/* Low balance alert threshold */}
          <div className="card">
            <div className="flex items-center gap-2.5 mb-3">
              <Bell size={16} className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Low Balance Alert</h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Get notified by email when your wallet balance drops below this amount.
            </p>
            {thresholdEditing ? (
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-[200px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={thresholdInput}
                    onChange={e => setThresholdInput(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="2.00"
                    autoFocus
                  />
                </div>
                <button
                  onClick={saveThreshold}
                  disabled={thresholdMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {thresholdMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setThresholdEditing(false)}
                  className="px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-700">
                  Alert threshold: <strong>${(overview?.wallet_low_threshold_cents ?? 200) / 100}</strong>
                </span>
                <button
                  onClick={() => {
                    setThresholdInput(String((overview?.wallet_low_threshold_cents ?? 200) / 100))
                    setThresholdEditing(true)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <Settings2 size={13} /> Change
                </button>
              </div>
            )}
          </div>

          <div className="card overflow-hidden p-0">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
              <ReceiptText size={16} className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Transaction History</h3>
            </div>
            <DataTable columns={txCols} data={walletTxs} loading={txLoading} emptyText="No transactions yet" />
          </div>
        </div>
      )}

      {/* ═══ Payment Methods ═══ */}
      {tab === 'Payment Methods' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddCard(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
            >
              <Plus size={15} /> Add Card
            </button>
          </div>

          {paymentMethods.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <CreditCard size={32} className="text-indigo-500" />
              </div>
              <p className="font-semibold text-slate-700">No payment methods</p>
              <p className="text-sm text-slate-400">Add a card to subscribe or top up your wallet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map(pm => (
                <div key={pm.id} className="card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <CreditCard size={20} className="text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {pm.brand.toUpperCase()} ****{pm.last4}
                        {pm.is_default && <Badge variant="blue" className="ml-2">Default</Badge>}
                      </p>
                      <p className="text-xs text-slate-400">Expires {pm.exp_month}/{pm.exp_year}</p>
                    </div>
                  </div>
                  <button onClick={() => removeCard(pm.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ Invoices ═══ */}
      {tab === 'Invoices' && (
        <div className="card overflow-hidden p-0">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
            <FileText size={16} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Invoice History</h3>
          </div>
          <DataTable columns={invCols} data={invoices} loading={invLoading} emptyText="No invoices yet" />
        </div>
      )}

      {/* ═══ Activity ═══ */}
      {tab === 'Activity' && (
        <div className="card overflow-hidden p-0">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
            <Activity size={16} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Subscription Activity</h3>
          </div>
          <DataTable columns={eventCols} data={events} loading={eventsLoading} emptyText="No activity yet" />
        </div>
      )}

      {/* ═══ Modals ═══ */}
      <AddCardModal
        open={showAddCard}
        onClose={() => setShowAddCard(false)}
        onSuccess={() => { refetchPm(); refreshAll() }}
      />
      <TopUpModal
        open={showTopUp}
        onClose={() => setShowTopUp(false)}
        onSuccess={refreshAll}
        paymentMethods={paymentMethods}
        onAddCard={() => { setShowTopUp(false); setShowAddCard(true) }}
      />
      {upgradePlan && (
        <PlanUpgradeModal
          open={!!upgradePlan}
          onClose={() => setUpgradePlan(null)}
          onSuccess={refreshAll}
          plan={upgradePlan}
          currentPlan={currentPlan}
          currentCycle={currentCycle}
          hasSubscription={hasSubscription}
          paymentMethods={paymentMethods}
          onAddCard={() => { setUpgradePlan(null); setShowAddCard(true) }}
        />
      )}
    </div>
  )
}
