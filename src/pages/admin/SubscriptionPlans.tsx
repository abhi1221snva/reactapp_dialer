import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, Plus, RefreshCw, Power } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  adminBillingService,
  type BillingSettings,
  type UsageRate,
  type SubscriptionPlan,
} from '../../services/billing.service'

const RATE_LABELS: Record<string, string> = {
  call_outgoing_per_min: 'Outgoing call (credits/min)',
  call_incoming_per_min: 'Incoming call (credits/min)',
  sms_outbound: 'SMS Outbound (credits each)',
  sms_inbound: 'SMS Inbound (credits each)',
}

/**
 * Admin: full billing engine configuration.
 *
 *   Tab 1 — Plan tiers   (price + bonus credits + Stripe sync per plan)
 *   Tab 2 — Global       (trial, conversion rate, low-balance, default plan)
 *   Tab 3 — Usage rates  (versioned: each save creates a new effective row)
 */
export function SubscriptionPlans() {
  const [tab, setTab] = useState<'Plans' | 'Global' | 'Rates'>('Plans')

  return (
    <div className="p-6 w-full">
      <h1 className="text-2xl font-bold mb-1">Billing settings</h1>
      <p className="text-slate-600 mb-6">Plans, pricing, trial defaults, conversion, and usage rates.</p>

      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {(['Plans', 'Global', 'Rates'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                'whitespace-nowrap pb-3 px-1 border-b-2 text-sm font-medium ' +
                (tab === t
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')
              }
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'Plans' && <PlansSection />}
      {tab === 'Global' && <GlobalSection />}
      {tab === 'Rates' && <RatesSection />}
    </div>
  )
}

// ── Plans tab ─────────────────────────────────────────────────────────────────

function PlansSection() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: adminBillingService.listPlans,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof adminBillingService.updatePlan>[1] }) =>
      adminBillingService.updatePlan(id, patch),
    onSuccess: () => {
      toast.success('Plan saved')
      qc.invalidateQueries({ queryKey: ['admin-plans'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Save failed'),
  })

  const deactMut = useMutation({
    mutationFn: (id: number) => adminBillingService.deactivatePlan(id),
    onSuccess: () => {
      toast.success('Plan deactivated')
      qc.invalidateQueries({ queryKey: ['admin-plans'] })
    },
  })

  const plans = (data?.data?.data?.plans ?? []).filter((p) => p.is_active)

  const syncAllMut = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled(
        plans.map((p) => adminBillingService.syncPlanStripe(p.id))
      )
      const ok = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - ok
      return { ok, failed, total: results.length }
    },
    onSuccess: ({ ok, failed, total }) => {
      qc.invalidateQueries({ queryKey: ['admin-plans'] })
      if (failed === 0) toast.success(`Synced ${ok}/${total} plans with Stripe`)
      else if (ok === 0) toast.error(`Failed to sync any plan (${failed}/${total})`)
      else toast(`Synced ${ok}/${total} (${failed} failed)`, { icon: '⚠️' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Sync failed'),
  })

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-slate-500">{plans.length} active plan{plans.length === 1 ? '' : 's'}</p>
        <button
          onClick={() => syncAllMut.mutate()}
          disabled={syncAllMut.isPending || plans.length === 0}
          className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          {syncAllMut.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
          {syncAllMut.isPending ? 'Syncing all…' : 'Sync All Stripe Prices'}
        </button>
      </div>
      {plans.map((p) => (
        <PlanCard
          key={p.id}
          plan={p}
          onSave={(patch) => updateMut.mutate({ id: p.id, patch })}
          onDeactivate={() => {
            if (confirm(`Deactivate ${p.name}?`)) deactMut.mutate(p.id)
          }}
          saving={updateMut.isPending}
        />
      ))}
    </div>
  )
}

function PlanCard({
  plan, onSave, onDeactivate, saving,
}: {
  plan: SubscriptionPlan
  onSave: (patch: Parameters<typeof adminBillingService.updatePlan>[1]) => void
  onDeactivate: () => void
  saving: boolean
}) {
  const [draft, setDraft] = useState({
    name: plan.name,
    price_per_seat: plan.price_per_seat,
    monthly_bonus_credits: plan.monthly_bonus_credits,
    trial_days: plan.trial_days ?? 0,
    is_active: plan.is_active,
  })

  const dirty =
    draft.name !== plan.name ||
    String(draft.price_per_seat) !== String(plan.price_per_seat) ||
    String(draft.monthly_bonus_credits) !== String(plan.monthly_bonus_credits) ||
    Number(draft.trial_days) !== Number(plan.trial_days ?? 0) ||
    draft.is_active !== plan.is_active

  return (
    <div className={'rounded-lg border bg-white p-4 ' + (plan.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60')}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">{plan.code}</div>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="text-lg font-bold bg-transparent focus:bg-white border border-transparent focus:border-slate-300 rounded px-1 -ml-1"
          />
          <div className="text-xs text-slate-500 mt-1 font-mono">
            {plan.stripe_price_id ?? <span className="text-amber-600">no Stripe price</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDeactivate}
            disabled={!plan.is_active}
            className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 flex items-center gap-1 disabled:opacity-30"
          >
            <Power className="w-3 h-3" />
            Deactivate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field
          label="Price / user / month (USD)"
          value={String(draft.price_per_seat)}
          onChange={(v) => setDraft({ ...draft, price_per_seat: v })}
        />
        <Field
          label="Bonus credits"
          value={String(draft.monthly_bonus_credits)}
          onChange={(v) => setDraft({ ...draft, monthly_bonus_credits: v })}
        />
        <Field
          label="Trial days (0 = no trial)"
          value={String(draft.trial_days)}
          onChange={(v) => setDraft({ ...draft, trial_days: Number(v.replace(/\D/g, '')) || 0 })}
        />
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Active</span>
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
            className="mt-2"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          disabled={!dirty || saving}
          onClick={() =>
            onSave({
              name: draft.name,
              price_per_seat: draft.price_per_seat,
              monthly_bonus_credits: draft.monthly_bonus_credits,
              trial_days: Number(draft.trial_days) || 0,
              is_active: draft.is_active,
            })
          }
          className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
          Save
        </button>
        {dirty && String(draft.price_per_seat) !== String(plan.price_per_seat) && (
          <span className="text-xs text-amber-600">Saving will create a new Stripe price.</span>
        )}
      </div>
    </div>
  )
}

// ── Global tab ────────────────────────────────────────────────────────────────

function GlobalSection() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-billing-settings'],
    queryFn: adminBillingService.getSettings,
  })

  const [draft, setDraft] = useState<Partial<BillingSettings>>({})
  useEffect(() => { if (data?.data?.data?.settings) setDraft({}) }, [data])

  const settings = data?.data?.data?.settings
  const merged = { ...(settings ?? {}), ...draft } as BillingSettings

  const saveMut = useMutation({
    mutationFn: (patch: Partial<BillingSettings>) => adminBillingService.updateSettings(patch),
    onSuccess: () => {
      toast.success('Settings saved')
      setDraft({})
      qc.invalidateQueries({ queryKey: ['admin-billing-settings'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Save failed'),
  })

  if (isLoading) return <Spinner />

  const setField = <K extends keyof BillingSettings>(key: K, val: BillingSettings[K]) =>
    setDraft((d) => ({ ...d, [key]: val }))
  const dirty = Object.keys(draft).length > 0

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Default plan code" value={merged.default_plan_code ?? ''} onChange={(v) => setField('default_plan_code', v)} />
        <Field label="Trial users" value={String(merged.trial_seats ?? '')} onChange={(v) => setField('trial_seats', Number(v) as never)} />
        <Field label="Trial credits" value={merged.trial_credits ?? ''} onChange={(v) => setField('trial_credits', v)} />
        <Field label="Wallet → credit rate (per $1)" value={merged.wallet_to_credit_rate ?? ''} onChange={(v) => setField('wallet_to_credit_rate', v)} />
        <Field label="Low-balance threshold (credits)" value={merged.low_balance_threshold ?? ''} onChange={(v) => setField('low_balance_threshold', v)} />
        <CheckboxField label="Block calls when balance hits 0" checked={Boolean(merged.block_calls_on_zero_balance)} onChange={(c) => setField('block_calls_on_zero_balance', c as never)} />
      </div>
      <div className="mt-4">
        <button
          disabled={!dirty || saveMut.isPending}
          onClick={() => saveMut.mutate(draft)}
          className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saveMut.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>
    </div>
  )
}

// ── Rates tab ─────────────────────────────────────────────────────────────────

function RatesSection() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-billing-rates'],
    queryFn: adminBillingService.getUsageRates,
  })

  const addMut = useMutation({
    mutationFn: (payload: { rate_key: string; credits_per_unit: string }) => adminBillingService.addUsageRate(payload),
    onSuccess: () => {
      toast.success('Rate updated')
      qc.invalidateQueries({ queryKey: ['admin-billing-rates'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  })

  if (isLoading) return <Spinner />

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 p-5">
      <p className="text-slate-500 text-sm mb-4">
        Saving creates a new versioned row. Past charges keep their original rate.
      </p>
      <div className="space-y-3">
        {(['call_outgoing_per_min', 'call_incoming_per_min', 'sms_outbound', 'sms_inbound'] as const).map((rk) => {
          const cur = data?.data?.data?.current?.[rk]
          return <RateRow key={rk} label={RATE_LABELS[rk]} current={cur} onSave={(v) => addMut.mutate({ rate_key: rk, credits_per_unit: v })} />
        })}
      </div>
    </div>
  )
}

// ── Shared bits ───────────────────────────────────────────────────────────────

function Spinner() {
  return <div className="p-8 flex items-center gap-2 text-slate-500"><Loader2 className="animate-spin w-4 h-4" /> Loading…</div>
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
      />
    </label>
  )
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 mt-6">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}

function RateRow({
  label, current, onSave,
}: {
  label: string
  current?: UsageRate
  onSave: (v: string) => void
}) {
  const [draft, setDraft] = useState<string>('')
  return (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Current:</span>
          <span className="font-mono text-sm">{current?.credits_per_unit ?? '—'}</span>
        </div>
      </div>
      <input
        type="text"
        value={draft}
        placeholder="New rate"
        onChange={(e) => setDraft(e.target.value)}
        className="w-32 px-3 py-2 border border-slate-300 rounded text-sm"
      />
      <button
        onClick={() => { if (!draft) return; onSave(draft); setDraft('') }}
        disabled={!draft}
        className="px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
      >
        <Plus className="w-4 h-4" /> Add
      </button>
    </div>
  )
}
