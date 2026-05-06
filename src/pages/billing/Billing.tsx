import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  CreditCard, Wallet, Users, Plus, Minus as MinusIcon,
  Activity, Coins, History,
  FileText, Trash2, Star, ExternalLink,
  Loader2, Search, X, Zap, Save,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  billingService,
  type CreditTransaction,
  type Subscription,
  type SubscriptionPlan,
  type PaymentMethod,
  type Invoice,
  type ProviderMode,
  type AutoRechargeSettings,
} from '../../services/billing.service'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatDate, formatDateTime, timeAgo } from '../../utils/format'
import { TopUpModal } from './TopUpModal'
import { AddCardModal } from './AddCardModal'

const ALL_TABS = ['Overview', 'Wallet', 'Payment Methods', 'Invoices', 'Activity'] as const
const BYOC_TABS = ['Overview', 'Payment Methods', 'Invoices'] as const
type Tab = typeof ALL_TABS[number]

const STATUS_VARIANT: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'gray'> = {
  active: 'green',
  trialing: 'blue',
  past_due: 'yellow',
  canceled: 'red',
  incomplete: 'yellow',
  incomplete_expired: 'red',
}

export function Billing() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('Overview')
  const [showTopUp, setShowTopUp] = useState(false)
  const [showAddCard, setShowAddCard] = useState(false)
  const [seatDraft, setSeatDraft] = useState<number | null>(null)

  // Activity tab — search / filters / pagination
  const [actSearch, setActSearch] = useState('')
  const [actDebouncedSearch, setActDebouncedSearch] = useState('')
  const [actDirection, setActDirection] = useState<'' | 'credit' | 'debit'>('')
  const [actBucket, setActBucket] = useState<'' | 'bonus' | 'wallet'>('')
  const [actPage, setActPage] = useState(1)
  const [actPerPage, setActPerPage] = useState(25)

  useEffect(() => {
    const t = setTimeout(() => setActDebouncedSearch(actSearch.trim()), 300)
    return () => clearTimeout(t)
  }, [actSearch])

  useEffect(() => { setActPage(1) }, [actDebouncedSearch, actDirection, actBucket, actPerPage])

  const { data: subRes, isLoading: subLoading } = useQuery({
    queryKey: ['billing-subscription'],
    queryFn: billingService.getSubscription,
    staleTime: 60_000,
  })

  const { data: walletRes } = useQuery({
    queryKey: ['billing-wallet'],
    queryFn: billingService.getWallet,
    staleTime: 60_000,
  })

  const { data: creditsRes } = useQuery({
    queryKey: ['billing-credits'],
    queryFn: billingService.getCredits,
    staleTime: 60_000,
  })

  const { data: ledgerRes, isFetching: ledgerFetching } = useQuery({
    queryKey: ['billing-credits-ledger', actPage, actPerPage, actDebouncedSearch, actDirection, actBucket],
    queryFn: () => billingService.getCreditLedger({
      page: actPage,
      per_page: actPerPage,
      q: actDebouncedSearch || undefined,
      direction: actDirection || undefined,
      bucket: actBucket || undefined,
    }),
    enabled: tab === 'Activity',
    placeholderData: keepPreviousData,
  })

  const { data: walletTxRes } = useQuery({
    queryKey: ['billing-wallet-tx'],
    queryFn: billingService.getWalletTransactions,
    enabled: tab === 'Wallet',
  })

  const { data: pmRes, refetch: refetchPM } = useQuery({
    queryKey: ['billing-payment-methods'],
    queryFn: billingService.getPaymentMethods,
    enabled: tab === 'Payment Methods',
  })

  const { data: invoicesRes } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: () => billingService.getInvoices(50),
    enabled: tab === 'Invoices',
  })

  const setDefaultPmMut = useMutation({
    mutationFn: (id: string) => billingService.setDefaultPaymentMethod(id),
    onSuccess: () => { toast.success('Default card updated'); refetchPM() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to set default'),
  })

  const deletePmMut = useMutation({
    mutationFn: (id: string) => billingService.deletePaymentMethod(id),
    onSuccess: () => { toast.success('Card removed'); refetchPM() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to remove card'),
  })

  const { data: autoRechargeRes } = useQuery({
    queryKey: ['billing-auto-recharge'],
    queryFn: billingService.getAutoRecharge,
    enabled: tab === 'Overview',
    staleTime: 60_000,
  })

  const { data: plansRes } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: billingService.getPlans,
    staleTime: 5 * 60_000,
  })

  const subscribeMut = useMutation({
    mutationFn: ({ seats, planId }: { seats: number; planId: number }) =>
      billingService.subscribe(seats, planId),
    onSuccess: () => {
      toast.success('Subscription created')
      qc.invalidateQueries({ queryKey: ['billing-subscription'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to subscribe'),
  })

  const updateSeatsMut = useMutation({
    mutationFn: (seats: number) => billingService.updateSeats(seats),
    onSuccess: () => {
      toast.success('Users updated')
      setSeatDraft(null)
      qc.invalidateQueries({ queryKey: ['billing-subscription'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update users'),
  })

  const sub: Subscription | null = subRes?.data?.data?.subscription ?? null
  const seats = subRes?.data?.data?.seats ?? { purchased: 0, used: 0, available: 0 }
  const providerMode: ProviderMode = subRes?.data?.data?.provider_mode ?? 'platform'
  const isByoc = providerMode === 'byoc'
  const TABS = isByoc ? BYOC_TABS : ALL_TABS
  const wallet = walletRes?.data?.data
  const credits = creditsRes?.data?.data ?? { bonus: '0', wallet: '0', total: '0' }
  const ledger: CreditTransaction[] = ledgerRes?.data?.data?.transactions ?? []
  const ledgerPagination = ledgerRes?.data?.data?.pagination ?? { page: 1, per_page: actPerPage, total: 0, last_page: 1 }
  const walletTx = walletTxRes?.data?.data?.transactions ?? []
  const plans: SubscriptionPlan[] = plansRes?.data?.data?.plans ?? []

  const currentSeats = sub?.seat_count ?? 0
  const draftSeats = seatDraft ?? currentSeats

  return (
    <div className="p-6 w-full">
      <h1 className="text-2xl font-bold mb-1">Billing</h1>
      <p className="text-gray-600 mb-6">
        {isByoc ? 'Subscription and invoices.' : 'Subscription, wallet, and credits.'}
      </p>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                'whitespace-nowrap pb-3 px-1 border-b-2 text-sm font-medium ' +
                (tab === t
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
              }
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Subscription */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-5 border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold">Subscription</h2>
                </div>
                {sub ? (
                  <Badge variant={STATUS_VARIANT[sub.status] ?? 'gray'} className="mt-2">
                    {sub.status}
                  </Badge>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">No subscription yet.</p>
                )}
              </div>
            </div>

            {subLoading ? (
              <Loader2 className="animate-spin w-5 h-5 text-gray-400" />
            ) : !sub || sub.status === 'incomplete' || sub.status === 'incomplete_expired' || sub.status === 'canceled' ? (
              <SubscribeForm
                plans={plans}
                onSubscribe={(seats, planId) => subscribeMut.mutate({ seats, planId })}
                pending={subscribeMut.isPending}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <Metric label="Users" value={`${seats.used}/${seats.purchased}`} icon={Users} />
                  <Metric
                    label="Period ends"
                    value={sub.current_period_end ? formatDateTime(sub.current_period_end) : '—'}
                  />
                  {sub.cancel_at_period_end && (
                    <Metric label="Will cancel" value="At period end" />
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold mb-2">Adjust users</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSeatDraft(Math.max(seats.used, draftSeats - 1))}
                      className="p-2 rounded border border-gray-300 hover:bg-gray-50"
                    >
                      <MinusIcon className="w-4 h-4" />
                    </button>
                    <span className="text-2xl font-bold w-12 text-center">{draftSeats}</span>
                    <button
                      onClick={() => setSeatDraft(draftSeats + 1)}
                      className="p-2 rounded border border-gray-300 hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {seatDraft !== null && seatDraft !== currentSeats && (
                      <>
                        <button
                          onClick={() => updateSeatsMut.mutate(seatDraft)}
                          disabled={updateSeatsMut.isPending}
                          className="ml-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {updateSeatsMut.isPending ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setSeatDraft(null)} className="text-sm text-gray-500 hover:text-gray-700">
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                  {seats.used > 0 && (
                    <p className="text-xs text-gray-500 mt-2">Cannot go below {seats.used} (currently assigned agents).</p>
                  )}
                </div>

                {sub.status === 'trialing' && !sub.stripe_subscription_id && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-semibold mb-1">Upgrade to a paid plan</h3>
                    <p className="text-xs text-gray-500 mb-4">
                      Pick a plan to convert your trial. Stripe handles billing — your trial credits stay yours.
                    </p>
                    <SubscribeForm
                      plans={plans.filter((p) => p.code !== 'TRIAL' && Number(p.price_per_seat) > 0)}
                      onSubscribe={(s, planId) => subscribeMut.mutate({ seats: s, planId })}
                      pending={subscribeMut.isPending}
                      fixedSeats={draftSeats}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Wallet + credits cards — hidden for BYOC */}
          {!isByoc ? (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow p-5 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-semibold">Wallet</h2>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  ${Number(wallet?.balance ?? 0).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mb-3">Recharge to add credits.</p>
                <button
                  onClick={() => setShowTopUp(true)}
                  className="w-full bg-emerald-600 text-white text-sm py-2 rounded hover:bg-emerald-700"
                >
                  Recharge
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-5 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Coins className="w-5 h-5 text-amber-600" />
                  <h2 className="text-lg font-semibold">Credits</h2>
                </div>
                <p className="text-3xl font-bold text-gray-900">{Number(credits.total).toFixed(2)}</p>
                <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                  <div>Bonus: <span className="font-medium">{Number(credits.bonus).toFixed(2)}</span></div>
                  <div>Wallet: <span className="font-medium">{Number(credits.wallet).toFixed(2)}</span></div>
                </div>
              </div>

              <AutoRechargeCard
                settings={autoRechargeRes?.data?.data ?? null}
                onSaved={() => qc.invalidateQueries({ queryKey: ['billing-auto-recharge'] })}
              />
            </div>
          ) : (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-5">
              <h3 className="font-semibold text-blue-900">BYOC Mode</h3>
              <p className="text-sm text-blue-700 mt-1">
                Your account uses your own provider credentials. Voice, SMS, and DID usage
                is billed directly by your provider — no platform credits needed.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'Wallet' && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" /> Wallet transactions
              </h2>
              <p className="text-sm text-gray-500">Recharges, refunds, manual adjustments.</p>
            </div>
            <button
              onClick={() => setShowTopUp(true)}
              className="bg-emerald-600 text-white text-sm px-4 py-2 rounded hover:bg-emerald-700"
            >
              Recharge
            </button>
          </div>
          <DataTable<typeof walletTx[number]>
            columns={[
              { key: 'created_at', header: 'When', render: (r) => formatDateTime(r.created_at) },
              { key: 'type', header: 'Type', render: (r) => <Badge>{r.type}</Badge> },
              { key: 'amount', header: 'Amount (USD)', className: 'text-right', render: (r) => `$${Number(r.amount).toFixed(2)}` },
              { key: 'stripe_payment_intent_id', header: 'Stripe ref', render: (r) => r.stripe_payment_intent_id ?? '—' },
            ] as Column<typeof walletTx[number]>[]}
            data={walletTx}
          />
        </div>
      )}

      {tab === 'Activity' && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-600" /> Credit activity
              {ledgerPagination.total > 0 && (
                <span className="text-xs font-normal text-slate-400">
                  · {ledgerPagination.total.toLocaleString()} total
                </span>
              )}
            </h2>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={actSearch}
                  onChange={(e) => setActSearch(e.target.value)}
                  placeholder="Search reason, ref, idempotency key…"
                  className="pl-8 pr-7 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-72 transition"
                />
                {actSearch && (
                  <button
                    onClick={() => setActSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Direction filter */}
              <select
                value={actDirection}
                onChange={(e) => setActDirection(e.target.value as '' | 'credit' | 'debit')}
                className="text-sm py-1.5 px-2.5 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              >
                <option value="">All directions</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>

              {/* Bucket filter */}
              <select
                value={actBucket}
                onChange={(e) => setActBucket(e.target.value as '' | 'bonus' | 'wallet')}
                className="text-sm py-1.5 px-2.5 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              >
                <option value="">All buckets</option>
                <option value="bonus">Bonus</option>
                <option value="wallet">Wallet</option>
              </select>

              {/* Per page */}
              <select
                value={actPerPage}
                onChange={(e) => setActPerPage(Number(e.target.value))}
                className="text-sm py-1.5 px-2.5 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                title="Rows per page"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>

            </div>
          </div>

          {/* Active filter chips */}
          {(actDebouncedSearch || actDirection || actBucket) && (
            <div className="flex items-center gap-2 mb-3 flex-wrap text-xs">
              <span className="text-slate-400">Filters:</span>
              {actDebouncedSearch && (
                <FilterChip label={`"${actDebouncedSearch}"`} onClear={() => setActSearch('')} />
              )}
              {actDirection && <FilterChip label={`dir: ${actDirection}`} onClear={() => setActDirection('')} />}
              {actBucket && <FilterChip label={`bucket: ${actBucket}`} onClear={() => setActBucket('')} />}
              <button
                onClick={() => { setActSearch(''); setActDirection(''); setActBucket('') }}
                className="text-indigo-600 hover:text-indigo-800 underline ml-1"
              >
                Clear all
              </button>
            </div>
          )}

          <DataTable<CreditTransaction>
            loading={ledgerFetching && !ledgerRes}
            columns={[
              { key: 'created_at', header: 'When', render: (r) => (
                <span className="whitespace-nowrap text-sm text-slate-700" title={`${formatDateTime(r.created_at)}\n${timeAgo(r.created_at)}`}>
                  {fmtShortDateTime(r.created_at)}
                </span>
              )},
              { key: 'direction', header: 'Dir', render: (r) => (
                <Badge variant={r.direction === 'credit' ? 'green' : 'red'}>{r.direction}</Badge>
              )},
              { key: 'bucket', header: 'Bucket' },
              { key: 'amount', header: 'Amount', className: 'text-right tabular-nums',
                render: (r) => fmtCredits(r.amount) },
              { key: 'reason', header: 'Reason' },
              { key: 'reference_id', header: 'Ref', render: (r) => {
                const full = r.reference_type
                  ? `${r.reference_type}:${r.reference_id ?? ''}`
                  : (r.reference_id ?? '—')
                return (
                  <span
                    title={full}
                    className="block max-w-[14rem] truncate text-xs text-slate-600 font-mono"
                  >
                    {full}
                  </span>
                )
              }},
              { key: 'balance_after_bonus', header: 'After-bonus', className: 'text-right tabular-nums',
                render: (r) => fmtCredits(r.balance_after_bonus) },
              { key: 'balance_after_wallet', header: 'After-wallet', className: 'text-right tabular-nums',
                render: (r) => fmtCredits(r.balance_after_wallet) },
              { key: 'credits_total', header: 'Credits', className: 'text-right tabular-nums',
                headerClassName: 'text-right tabular-nums bg-indigo-50',
                render: (r) => (
                  <span className="font-bold text-indigo-700" title="Bonus + Wallet">
                    {fmtCredits(Number(r.balance_after_bonus ?? 0) + Number(r.balance_after_wallet ?? 0))}
                  </span>
                ),
              },
            ]}
            data={ledger}
            emptyText={actDebouncedSearch || actDirection || actBucket
              ? 'No transactions match your filters.'
              : 'No credit activity yet.'}
            pagination={{
              page: ledgerPagination.page,
              total: ledgerPagination.total,
              perPage: ledgerPagination.per_page,
              onChange: setActPage,
            }}
          />
        </div>
      )}

      {tab === 'Payment Methods' && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" /> Payment methods
            </h2>
            <button
              onClick={() => setShowAddCard(true)}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm font-semibold hover:bg-indigo-700 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add card
            </button>
          </div>
          {(pmRes?.data?.data?.payment_methods ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">No saved cards. Click "Add card" to add one.</p>
          ) : (
            <div className="space-y-2">
              {(pmRes?.data?.data?.payment_methods ?? []).map((pm: PaymentMethod) => (
                <div key={pm.id} className="flex items-center justify-between border border-gray-200 rounded p-3">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium capitalize">{pm.brand ?? 'card'} •••• {pm.last4 ?? '----'}</div>
                      <div className="text-xs text-gray-500">
                        Expires {String(pm.exp_month ?? '').padStart(2, '0')}/{pm.exp_year ?? '----'}
                      </div>
                    </div>
                    {pm.is_default && (
                      <Badge variant="green" className="ml-1">Default</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!pm.is_default && (
                      <button
                        onClick={() => setDefaultPmMut.mutate(pm.id)}
                        disabled={setDefaultPmMut.isPending}
                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <Star className="w-3.5 h-3.5" /> Set default
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm('Remove this card?')) deletePmMut.mutate(pm.id) }}
                      disabled={deletePmMut.isPending || pm.is_default}
                      title={pm.is_default ? 'Set another card as default before removing this one' : 'Remove this card'}
                      className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Invoices' && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Invoices
          </h2>
          <DataTable<Invoice>
            columns={[
              { key: 'created', header: 'Date', render: (r) => formatDateTime(new Date(r.created * 1000).toISOString()) },
              { key: 'number', header: 'Number', render: (r) => r.number ?? r.id },
              { key: 'amount_due', header: 'Amount', className: 'text-right',
                render: (r) => `${r.currency} ${r.amount_due.toFixed(2)}` },
              { key: 'status', header: 'Status', render: (r) => (
                <Badge variant={r.status === 'paid' ? 'green' : r.status === 'open' ? 'yellow' : r.status === 'void' || r.status === 'uncollectible' ? 'red' : 'gray'}>
                  {r.status}
                </Badge>
              )},
              { key: 'pdf_url', header: '', render: (r) => (
                <div className="flex gap-2 justify-end">
                  {r.hosted_url && (
                    <a href={r.hosted_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" /> View
                    </a>
                  )}
                  {r.pdf_url && (
                    <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> PDF
                    </a>
                  )}
                </div>
              )},
            ]}
            data={invoicesRes?.data?.data?.invoices ?? []}
          />
        </div>
      )}

      <TopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} onSuccess={() => {
        qc.invalidateQueries({ queryKey: ['billing-wallet'] })
        qc.invalidateQueries({ queryKey: ['billing-credits'] })
        qc.invalidateQueries({ queryKey: ['billing-wallet-tx'] })
      }} />

      <AddCardModal
        open={showAddCard}
        onClose={() => setShowAddCard(false)}
        onSuccess={() => refetchPM()}
      />
    </div>
  )
}

// Compact "M/D h:mm AM/PM" — fits on one line in narrow columns.
// e.g. "2026-05-05 17:50:22" → "5/5 5:50 PM".
function fmtShortDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'))
  if (isNaN(d.getTime())) return String(iso)
  const m = d.getMonth() + 1
  const day = d.getDate()
  let h = d.getHours()
  const min = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${m}/${day} ${h}:${min} ${ampm}`
}

// Format credit amounts with at least 2 decimals, trimming trailing
// zeros beyond that. e.g. 59.0000 → "59.00", 0.1500 → "0.15", 1.2345 → "1.2345".
function fmtCredits(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  let s = n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  if (!s.includes('.')) return s + '.00'
  const [int, dec] = s.split('.')
  return dec.length < 2 ? `${int}.${dec.padEnd(2, '0')}` : s
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
      {label}
      <button onClick={onClear} className="hover:text-indigo-900" aria-label="Remove filter">
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

function Metric({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div>
      <div className="text-xs text-gray-500 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />} {label}
      </div>
      <div className="text-base font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  )
}

function AutoRechargeCard({
  settings,
  onSaved,
}: {
  settings: AutoRechargeSettings | null
  onSaved: () => void
}) {
  const [enabled, setEnabled] = useState(false)
  const [threshold, setThreshold] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  // Sync local state when server data loads
  useEffect(() => {
    if (settings) {
      setEnabled(settings.auto_recharge_enabled)
      setThreshold(String(Number(settings.auto_recharge_threshold) || ''))
      setAmount(String(Number(settings.auto_recharge_amount) || ''))
    }
  }, [settings])

  const dirty =
    settings !== null && (
      enabled !== settings.auto_recharge_enabled ||
      (enabled && (threshold !== String(Number(settings.auto_recharge_threshold) || '') ||
        amount !== String(Number(settings.auto_recharge_amount) || '')))
    )

  const handleSave = async () => {
    if (!enabled && !settings?.auto_recharge_enabled && !dirty) return
    setSaving(true)
    try {
      await billingService.updateAutoRecharge({
        auto_recharge_enabled: enabled,
        auto_recharge_threshold: enabled ? threshold || '0' : '0',
        auto_recharge_amount: enabled ? amount || '0' : '0',
      })
      toast.success('Auto-recharge settings saved.')
      onSaved()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to save auto-recharge settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-5 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-violet-600" />
          <h2 className="text-lg font-semibold">Auto-Recharge</h2>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled(!enabled)}
          className={
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors ' +
            (enabled ? 'bg-violet-600' : 'bg-gray-200')
          }
        >
          <span
            className={
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' +
              (enabled ? 'translate-x-6' : 'translate-x-1')
            }
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-700">When balance falls below (credits)</span>
            <input
              type="text"
              inputMode="decimal"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="50"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-700">Recharge amount (USD)</span>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="25"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
          </label>
        </div>
      )}

      {dirty && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-violet-600 text-white text-sm py-2 rounded hover:bg-violet-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      )}

      <p className="text-xs text-gray-500 mt-3">
        {enabled
          ? 'Your default card will be charged automatically when your balance drops below the threshold.'
          : 'Enable to automatically top up your balance when it runs low.'}
      </p>
    </div>
  )
}

function SubscribeForm({
  plans, onSubscribe, pending,
  fixedSeats,
}: {
  plans: SubscriptionPlan[]
  onSubscribe: (seats: number, planId: number) => void
  pending: boolean
  /** When provided, hide the stepper and use this seat count (e.g. trial→paid upgrade reuses the user's existing seat count). */
  fixedSeats?: number
}) {
  const [seats, setSeats] = useState(fixedSeats ?? 1)
  const [selected, setSelected] = useState<number | null>(null)
  const seatsLocked = fixedSeats !== undefined
  const effectiveSeats = seatsLocked ? fixedSeats : seats

  const sorted = [...plans].sort((a, b) => Number(a.price_per_seat) - Number(b.price_per_seat))
  const activePlan = selected ?? sorted[0]?.id ?? null

  return (
    <div className="text-sm">
      {!seatsLocked && (
        <p className="text-gray-700 mb-4">
          Pick a tier and user count. You can change either anytime — Stripe handles proration.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {sorted.map((p) => {
          const isActive = activePlan === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={
                'text-left rounded-lg border-2 p-3 transition ' +
                (isActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300')
              }
            >
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{p.code}</div>
              <div className="text-base font-bold text-slate-900">{p.name}</div>
              <div className="text-2xl font-bold text-indigo-600 mt-1">${Number(p.price_per_seat).toFixed(0)}</div>
              <div className="text-xs text-slate-500">per user / month</div>
              {Number(p.monthly_bonus_credits) > 0 && (
                <div className="text-xs text-emerald-700 mt-2">
                  +{Number(p.monthly_bonus_credits).toFixed(0)} bonus credits
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3 mb-4">
        {seatsLocked ? (
          <span className="text-sm text-slate-600">
            Users: <strong className="text-slate-900">{effectiveSeats}</strong>
            <span className="text-slate-400"> (use the stepper above to change)</span>
          </span>
        ) : (
          <>
            <span className="text-gray-700">Users:</span>
            <button onClick={() => setSeats(Math.max(1, seats - 1))} className="p-2 rounded border border-gray-300 hover:bg-gray-50">
              <MinusIcon className="w-4 h-4" />
            </button>
            <span className="text-2xl font-bold w-12 text-center">{seats}</span>
            <button onClick={() => setSeats(seats + 1)} className="p-2 rounded border border-gray-300 hover:bg-gray-50">
              <Plus className="w-4 h-4" />
            </button>
          </>
        )}
        {activePlan && (
          <span className="text-sm text-slate-500 ml-2">
            = ${(Number(sorted.find((p) => p.id === activePlan)?.price_per_seat ?? 0) * effectiveSeats).toFixed(2)} / mo
          </span>
        )}
      </div>

      <button
        onClick={() => activePlan && onSubscribe(effectiveSeats, activePlan)}
        disabled={pending || !activePlan}
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? 'Subscribing…' : 'Subscribe'}
      </button>
    </div>
  )
}
