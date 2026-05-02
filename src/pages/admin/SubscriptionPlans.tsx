import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Edit, RefreshCw, DollarSign, Users, PhoneCall, Upload, Loader2, CheckCircle2,
} from 'lucide-react'
import {
  subscriptionService,
  type SubscriptionPlan,
  type CreatePlanPayload,
} from '../../services/subscription.service'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const PER_PAGE = 25

const FEATURE_LABELS: Record<string, string> = {
  has_predictive_dialer: 'Predictive Dialer',
  has_full_crm: 'Full CRM',
  has_api_access: 'API Access',
  has_ai_coaching: 'AI Coaching',
  has_custom_integrations: 'Custom Integrations',
  has_sso: 'SSO',
  has_dedicated_csm: 'Dedicated CSM',
  has_white_label: 'White Label',
  has_on_premise: 'On-Premise',
  has_compliance_packages: 'Compliance Packages',
}

const FEATURE_KEYS = Object.keys(FEATURE_LABELS)

// ── Form Modal ──────────────────────────────────────────────────────────────

interface PlanFormProps {
  initial?: SubscriptionPlan | null
  onClose: () => void
  onSave: (payload: CreatePlanPayload) => void
  saving: boolean
}

function PlanFormModal({ initial, onClose, onSave, saving }: PlanFormProps) {
  const isEdit = !!initial
  const [form, setForm] = useState<CreatePlanPayload>({
    slug:                    (initial?.slug as string) ?? '',
    name:                    (initial?.name as string) ?? '',
    description:             (initial?.description as string) ?? '',
    price_monthly:           Number(initial?.price_monthly ?? 0),
    price_annual:            Number(initial?.price_annual ?? 0),
    max_agents:              Number(initial?.max_agents ?? 0),
    max_calls_monthly:       Number(initial?.max_calls_monthly ?? 0),
    max_sms_monthly:         Number(initial?.max_sms_monthly ?? 0),
    has_predictive_dialer:   Boolean(initial?.has_predictive_dialer),
    has_full_crm:            Boolean(initial?.has_full_crm),
    has_api_access:          Boolean(initial?.has_api_access),
    has_ai_coaching:         Boolean(initial?.has_ai_coaching),
    has_custom_integrations: Boolean(initial?.has_custom_integrations),
    has_sso:                 Boolean(initial?.has_sso),
    has_dedicated_csm:       Boolean(initial?.has_dedicated_csm),
    has_white_label:         Boolean(initial?.has_white_label),
    has_on_premise:          Boolean(initial?.has_on_premise),
    has_compliance_packages: Boolean(initial?.has_compliance_packages),
    is_active:               initial ? Boolean(initial.is_active) : true,
    display_order:           Number(initial?.display_order ?? 0),
    trial_days:              Number(initial?.trial_days ?? 14),
  })

  const set = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Plan name is required'); return }
    if (!form.slug.trim()) { toast.error('Slug is required'); return }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? 'Edit Plan' : 'Create New Plan'}
          </h2>
          <button onClick={onClose} className="btn-ghost btn-sm p-1.5 rounded-lg text-slate-400">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Plan Name *</label>
              <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Growth" />
            </div>
            <div className="form-group">
              <label className="label">Slug *</label>
              <input className="input font-mono" value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="growth" disabled={isEdit} />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Scale your outreach..." />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Monthly Price ($)</label>
              <input type="number" step="0.01" className="input" value={form.price_monthly} onChange={(e) => set('price_monthly', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="label">Annual Price ($/mo)</label>
              <input type="number" step="0.01" className="input" value={form.price_annual} onChange={(e) => set('price_annual', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">Max Agents</label>
              <input type="number" className="input" value={form.max_agents} onChange={(e) => set('max_agents', parseInt(e.target.value) || 0)} />
              <p className="text-[10px] text-slate-400 mt-0.5">0 = Unlimited</p>
            </div>
            <div className="form-group">
              <label className="label">Max Calls/Mo</label>
              <input type="number" className="input" value={form.max_calls_monthly} onChange={(e) => set('max_calls_monthly', parseInt(e.target.value) || 0)} />
              <p className="text-[10px] text-slate-400 mt-0.5">0 = Unlimited</p>
            </div>
            <div className="form-group">
              <label className="label">Max SMS/Mo</label>
              <input type="number" className="input" value={form.max_sms_monthly} onChange={(e) => set('max_sms_monthly', parseInt(e.target.value) || 0)} />
              <p className="text-[10px] text-slate-400 mt-0.5">0 = Unlimited</p>
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="label mb-2">Features</label>
            <div className="grid grid-cols-2 gap-2">
              {FEATURE_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(form[key as keyof CreatePlanPayload])}
                    onChange={(e) => set(key, e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="text-xs text-slate-700">{FEATURE_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">Trial Days</label>
              <input type="number" className="input" value={form.trial_days} onChange={(e) => set('trial_days', parseInt(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label className="label">Display Order</label>
              <input type="number" className="input" value={form.display_order} onChange={(e) => set('display_order', parseInt(e.target.value) || 0)} />
            </div>
            <div className="form-group flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(form.is_active)}
                  onChange={(e) => set('is_active', e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <span className="text-xs text-slate-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export function SubscriptionPlans() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => subscriptionService.listPlans(),
  })

  const plans: SubscriptionPlan[] = (data?.data?.data ?? []) as SubscriptionPlan[]
  const total = plans.length

  const createMutation = useMutation({
    mutationFn: (payload: CreatePlanPayload) => subscriptionService.createPlan(payload),
    onSuccess: () => { toast.success('Plan created!'); setShowForm(false); qc.invalidateQueries({ queryKey: ['subscription-plans'] }) },
    onError: () => { toast.error('Failed to create plan') },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreatePlanPayload> }) =>
      subscriptionService.updatePlan(id, payload),
    onSuccess: () => { toast.success('Plan updated!'); setEditing(null); qc.invalidateQueries({ queryKey: ['subscription-plans'] }) },
    onError: () => { toast.error('Failed to update plan') },
  })

  const syncMutation = useMutation({
    mutationFn: () => subscriptionService.syncToStripe(),
    onSuccess: (res) => {
      const synced = res.data?.data?.synced ?? 0
      toast.success(`Synced ${synced} plan(s) to Stripe`)
      qc.invalidateQueries({ queryKey: ['subscription-plans'] })
    },
    onError: () => { toast.error('Failed to sync plans to Stripe') },
  })

  const columns: Column<SubscriptionPlan>[] = [
    {
      key: 'id', header: 'ID',
      render: (r) => <span className="font-mono text-xs text-slate-400">#{r.id}</span>,
    },
    {
      key: 'name', header: 'Plan',
      render: (r) => (
        <div>
          <span className="font-medium text-sm text-slate-900">{r.name}</span>
          <span className="block text-[10px] text-slate-400 font-mono">{r.slug}</span>
        </div>
      ),
    },
    {
      key: 'price_monthly', header: 'Price',
      render: (r) => (
        <div>
          <span className="font-semibold text-sm text-slate-900">
            {Number(r.price_monthly) === 0 ? 'Custom' : `$${r.price_monthly}/mo`}
          </span>
          {Number(r.price_annual) > 0 && (
            <span className="block text-[10px] text-slate-400">${r.price_annual}/mo annual</span>
          )}
        </div>
      ),
    },
    {
      key: 'max_agents', header: 'Agents',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <Users size={12} className="text-slate-400" />
          <span className="text-xs text-slate-700">{Number(r.max_agents) === 0 ? 'Unlimited' : r.max_agents}</span>
        </div>
      ),
    },
    {
      key: 'max_calls_monthly', header: 'Calls/Mo',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <PhoneCall size={12} className="text-slate-400" />
          <span className="text-xs text-slate-700">{Number(r.max_calls_monthly) === 0 ? 'Unlimited' : Number(r.max_calls_monthly).toLocaleString()}</span>
        </div>
      ),
    },
    {
      key: 'features', header: 'Features',
      render: (r) => {
        const enabled = FEATURE_KEYS.filter((k) => Boolean(r[k as keyof SubscriptionPlan]))
        return (
          <div className="flex flex-wrap gap-1">
            {enabled.length === 0 && <span className="text-xs text-slate-300">None</span>}
            {enabled.slice(0, 3).map((k) => (
              <Badge key={k} variant="blue">{FEATURE_LABELS[k].split(' ')[0]}</Badge>
            ))}
            {enabled.length > 3 && <Badge variant="gray">+{enabled.length - 3}</Badge>}
          </div>
        )
      },
    },
    {
      key: 'is_active', header: 'Status',
      render: (r) => r.is_active
        ? <Badge variant="green">Active</Badge>
        : <Badge variant="red">Inactive</Badge>,
    },
    {
      key: 'stripe_product_id', header: 'Stripe',
      render: (r) => r.stripe_product_id
        ? <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 size={12} /> Synced</span>
        : <span className="text-xs text-slate-400">Not synced</span>,
    },
    {
      key: 'actions', header: 'Actions',
      render: (r) => (
        <button
          onClick={() => setEditing(r)}
          className="btn-ghost btn-sm p-1.5 text-slate-500 hover:text-indigo-600"
          title="Edit"
        >
          <Edit size={13} />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-ghost btn-sm p-2 rounded-lg"
          title="Refresh"
        >
          <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 transition-colors"
          title="Sync all plans to Stripe Products & Prices"
        >
          {syncMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Sync to Stripe
        </button>
        <button onClick={() => setShowForm(true)} className="btn-primary gap-2">
          <Plus size={15} /> Add Plan
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <DollarSign size={20} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Plans</p>
            <p className="text-2xl font-bold text-slate-900">{total}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <DollarSign size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Plans</p>
            <p className="text-2xl font-bold text-slate-900">{plans.filter((p) => p.is_active).length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Upload size={20} className="text-violet-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stripe Synced</p>
            <p className="text-2xl font-bold text-slate-900">
              {plans.filter((p) => p.stripe_product_id).length}/{plans.length}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
          <span className="text-xs text-slate-500 font-medium">
            {isLoading ? 'Loading...' : `${total} plans`}
          </span>
        </div>
        <DataTable
          columns={columns}
          data={plans}
          loading={isLoading}
          emptyText="No subscription plans found"
          pagination={{ page, total, perPage: PER_PAGE, onChange: setPage }}
        />
      </div>

      {/* Create Modal */}
      {showForm && (
        <PlanFormModal
          onClose={() => setShowForm(false)}
          onSave={(payload) => createMutation.mutate(payload)}
          saving={createMutation.isPending}
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <PlanFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(payload) => updateMutation.mutate({ id: editing.id, payload })}
          saving={updateMutation.isPending}
        />
      )}
    </div>
  )
}
