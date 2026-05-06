import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Plus, Search, RefreshCw, UserCheck, UserX,
  LogIn, Edit, Users, CheckCircle, XCircle, Filter,
  DollarSign, Trash2, Loader2, Save, X,
} from 'lucide-react'
import { adminClientService, type AdminClient, type CreateClientPayload, type UpdateClientPayload } from '../../services/adminClient.service'
import {
  adminBillingService,
  type ProviderBillingProfile,
  type ProviderMode,
  type CreditBalance,
} from '../../services/billing.service'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { useAuthStore } from '../../stores/auth.store'
import { showConfirm } from '../../utils/confirmDelete'
import { formatDateTime } from '../../utils/format'
import toast from 'react-hot-toast'
import type { User } from '../../types'

const PER_PAGE = 25

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateApiKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Client Form Modal ──────────────────────────────────────────────────────────

interface ClientFormProps {
  initial?: AdminClient | null
  onClose: () => void
  onSave: (payload: CreateClientPayload | UpdateClientPayload) => void
  saving: boolean
}

function ClientFormModal({ initial, onClose, onSave, saving }: ClientFormProps) {
  const isEdit = !!initial
  const [form, setForm] = useState({
    company_name: initial?.company_name ?? '',
    trunk:        initial?.trunk ?? '',
    api_key:      initial?.api_key ?? generateApiKey(),
    address_1:    initial?.address_1 ?? '',
    address_2:    initial?.address_2 ?? '',
    enable_2fa:   initial?.enable_2fa ?? '0',
    sms:          initial?.sms ?? '0',
    fax:          initial?.fax ?? '0',
    chat:         initial?.chat ?? '0',
    webphone:     initial?.webphone ?? '0',
    ringless:     initial?.ringless ?? '0',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name.trim()) { toast.error('Company name is required'); return }
    if (!form.trunk.trim()) { toast.error('Trunk is required'); return }
    if (!form.api_key.trim()) { toast.error('API key is required'); return }
    const payload: CreateClientPayload | UpdateClientPayload = {
      ...form,
      asterisk_servers: [1], // default server; can be extended later
    }
    onSave(payload)
  }

  const toggle = (field: keyof typeof form) =>
    setForm((f) => ({ ...f, [field]: f[field] === '1' ? '0' : '1' }))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? 'Edit Client' : 'Create New Client'}
          </h2>
          <button onClick={onClose} className="btn-ghost btn-sm p-1.5 rounded-lg text-slate-400">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Company name */}
          <div className="form-group">
            <label className="label">Company Name *</label>
            <input
              className="input"
              value={form.company_name}
              onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
              placeholder="Acme Corp"
            />
          </div>

          {/* Trunk */}
          <div className="form-group">
            <label className="label">SIP Trunk *</label>
            <input
              className="input font-mono"
              value={form.trunk}
              onChange={(e) => setForm((f) => ({ ...f, trunk: e.target.value }))}
              placeholder="SIP-Trunk-1"
            />
          </div>

          {/* API Key */}
          <div className="form-group">
            <label className="label">API Key *</label>
            <div className="flex gap-2">
              <input
                className="input font-mono flex-1"
                value={form.api_key}
                onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, api_key: generateApiKey() }))}
                className="btn-outline btn-sm px-3 text-xs"
              >
                Regen
              </button>
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Address 1</label>
              <input className="input" value={form.address_1} onChange={(e) => setForm((f) => ({ ...f, address_1: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Address 2</label>
              <input className="input" value={form.address_2} onChange={(e) => setForm((f) => ({ ...f, address_2: e.target.value }))} />
            </div>
          </div>

          {/* Feature toggles */}
          <div>
            <label className="label mb-2">Features</label>
            <div className="grid grid-cols-3 gap-2">
              {(['sms', 'fax', 'chat', 'webphone', 'ringless', 'enable_2fa'] as const).map((feat) => (
                <label key={feat} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form[feat] === '1'}
                    onChange={() => toggle(feat)}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="text-xs text-slate-700 capitalize">
                    {feat === 'enable_2fa' ? '2FA' : feat.toUpperCase()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function AdminClients() {
  const qc = useQueryClient()
  const { startImpersonation } = useAuthStore()

  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState<'active' | 'inactive' | ''>('')
  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState<AdminClient | null>(null)
  const [billingClient, setBillingClient] = useState<AdminClient | null>(null)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-clients', search, status],
    queryFn: () => adminClientService.list({ page: 1, per_page: 500, search, status }),
  })

  const listData = data?.data?.data
  const clients: AdminClient[] = listData?.clients ?? []
  const total = clients.length

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (payload: CreateClientPayload) => adminClientService.create(payload),
    onSuccess: () => { toast.success('Client created!'); setShowForm(false); qc.invalidateQueries({ queryKey: ['admin-clients'] }) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateClientPayload }) => adminClientService.update(id, payload),
    onSuccess: () => { toast.success('Client updated!'); setEditing(null); qc.invalidateQueries({ queryKey: ['admin-clients'] }) },
  })

  const activateMutation = useMutation({
    mutationFn: (id: number) => adminClientService.activate(id),
    onSuccess: () => { toast.success('Client activated'); qc.invalidateQueries({ queryKey: ['admin-clients'] }) },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => adminClientService.deactivate(id),
    onSuccess: () => { toast.success('Client deactivated'); qc.invalidateQueries({ queryKey: ['admin-clients'] }) },
  })

  const switchMutation = useMutation({
    mutationFn: (id: number) => adminClientService.switchTo(id),
    onSuccess: (res) => {
      const d = res.data?.data as Record<string, unknown>
      if (d?.token && d?.id) {
        // The admin stays as themselves — same user ID, same level.
        // Only parent_id and companyName change to reflect the target client context.
        const contextUser: User = {
          id:            d.id as number,
          parent_id:     d.parent_id as number,
          name:          `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim(),
          email:         d.email as string,
          first_name:    d.first_name as string,
          last_name:     d.last_name as string,
          companyName:   d.companyName as string,
          companyLogo:   d.companyLogo as string,
          profile_pic:   d.profile_pic as string,
          extension:     (d.extension as string) ?? '',
          alt_extension: (d.alt_extension as string) ?? '',
          app_extension: (d.app_extension as string) ?? '',
          server:        (d.server as string) ?? '',
          domain:        (d.domain as string) ?? '',
          secret:        '',
          level:         (d.level as number) ?? 10,  // keep superadmin level
          dialer_mode:   (d.dialer_mode as 'webphone' | 'extension' | 'mobile_app') ?? 'extension',
        }
        startImpersonation(d.token as string, contextUser, d.companyName as string)
        toast.success(`Switched to "${d.companyName}" workspace`)
        window.location.href = '/dashboard'
      }
    },
  })

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns: Column<AdminClient>[] = [
    {
      key: 'id', header: 'ID',
      render: (r) => <span className="font-mono text-xs text-slate-400">#{r.id}</span>,
    },
    {
      key: 'company_name', header: 'Company', sortable: true,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Building2 size={13} className="text-indigo-600" />
          </div>
          <span className="font-medium text-sm text-slate-900">{r.company_name}</span>
        </div>
      ),
    },
    {
      key: 'admin_user', header: 'Admin User',
      render: (r) => r.admin_user
        ? <span className="text-xs text-slate-600">{r.admin_user.email}</span>
        : <span className="text-xs text-slate-300">—</span>,
    },
    {
      key: 'trunk', header: 'Trunk',
      render: (r) => <span className="font-mono text-xs text-slate-500">{r.trunk || '—'}</span>,
    },
    {
      key: 'features', header: 'Features',
      render: (r) => (
        <div className="flex gap-1 flex-wrap">
          {r.sms === '1' && <Badge variant="blue">SMS</Badge>}
          {r.fax === '1' && <Badge variant="gray">Fax</Badge>}
          {r.chat === '1' && <Badge variant="gray">Chat</Badge>}
          {r.webphone === '1' && <Badge variant="gray">WebPhone</Badge>}
          {r.ringless === '1' && <Badge variant="gray">Ringless</Badge>}
        </div>
      ),
    },
    {
      key: 'subscription_plan', header: 'Plan',
      render: (r) => {
        const plan = r.subscription_plan as { id: number; slug: string; name: string } | null | undefined
        const status = r.subscription_status as string | undefined
        const statusColor: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'gray'> = {
          active: 'green', trial: 'blue', past_due: 'yellow', cancelled: 'red', expired: 'red',
        }
        return plan ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-900">{plan.name}</span>
            {status && <Badge variant={statusColor[status] ?? 'gray'}>{status}</Badge>}
          </div>
        ) : <span className="text-xs text-slate-300">-</span>
      },
    },
    {
      key: 'is_deleted', header: 'Status', sortable: true,
      render: (r) => r.is_deleted
        ? <Badge variant="red">Inactive</Badge>
        : <Badge variant="green">Active</Badge>,
    },
    {
      key: 'created_at', header: 'Created',
      render: (r) => <span className="text-xs text-slate-400">{r.created_at ? formatDateTime(r.created_at) : '—'}</span>,
    },
    {
      key: 'actions', header: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-1">
          {/* Edit */}
          <button
            onClick={() => setEditing(r)}
            className="btn-ghost btn-sm p-1.5 text-slate-500 hover:text-indigo-600"
            title="Edit"
          >
            <Edit size={13} />
          </button>

          {/* Activate / Deactivate */}
          {r.is_deleted ? (
            <button
              onClick={async () => {
                if (await showConfirm({ message: `Activate "${r.company_name}"?`, confirmText: 'Yes, activate', danger: false }))
                  activateMutation.mutate(r.id)
              }}
              className="btn-ghost btn-sm p-1.5 text-emerald-600 hover:bg-emerald-50"
              title="Activate"
            >
              <UserCheck size={13} />
            </button>
          ) : (
            <button
              onClick={async () => {
                if (await showConfirm({ message: `Deactivate "${r.company_name}"? Their agents will lose access.`, confirmText: 'Yes, deactivate' }))
                  deactivateMutation.mutate(r.id)
              }}
              className="btn-ghost btn-sm p-1.5 text-amber-600 hover:bg-amber-50"
              title="Deactivate"
            >
              <UserX size={13} />
            </button>
          )}

          {/* Login as Client */}
          {!r.is_deleted && (
            <button
              onClick={async () => {
                if (await showConfirm({
                  message: `You will be logged in as the admin of "${r.company_name}". Continue?`,
                  confirmText: 'Switch now',
                  danger: false,
                }))
                  switchMutation.mutate(r.id)
              }}
              className="btn-ghost btn-sm p-1.5 text-indigo-600 hover:bg-indigo-50"
              title="Login as client"
            >
              <LogIn size={13} />
            </button>
          )}

          {/* Provider Billing */}
          {!r.is_deleted && (
            <button
              onClick={() => setBillingClient(r)}
              className="btn-ghost btn-sm p-1.5 text-emerald-600 hover:bg-emerald-50"
              title="Provider billing"
            >
              <DollarSign size={13} />
            </button>
          )}
        </div>
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
          <button onClick={() => setShowForm(true)} className="btn-primary gap-2">
            <Plus size={15} /> Add Client
          </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Users size={20} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Clients</p>
            <p className="text-2xl font-bold text-slate-900">{total}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active</p>
            <p className="text-2xl font-bold text-slate-900">
              {clients.filter((c) => !c.is_deleted).length}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <XCircle size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Inactive</p>
            <p className="text-2xl font-bold text-slate-900">
              {clients.filter((c) => c.is_deleted).length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Filter</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-8"
              placeholder="Search by company name…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            className="input w-40"
            value={status}
            onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1) }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
          <span className="text-xs text-slate-500 font-medium">
            {isLoading ? 'Loading…' : `${total.toLocaleString()} clients`}
          </span>
        </div>
        <DataTable
          columns={columns}
          data={clients}
          loading={isLoading}
          emptyText="No clients found"
          pagination={{ page, total, perPage: PER_PAGE, onChange: setPage }}
        />
      </div>

      {/* Create Modal */}
      {showForm && (
        <ClientFormModal
          onClose={() => setShowForm(false)}
          onSave={(payload) => createMutation.mutate(payload as CreateClientPayload)}
          saving={createMutation.isPending}
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <ClientFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(payload) => updateMutation.mutate({ id: editing.id, payload: payload as UpdateClientPayload })}
          saving={updateMutation.isPending}
        />
      )}

      {/* Provider Billing Modal */}
      {billingClient && (
        <ProviderBillingModal
          client={billingClient}
          onClose={() => setBillingClient(null)}
        />
      )}
    </div>
  )
}

// ── Provider Billing Modal ──────────────────────────────────────────────────

const MODE_VARIANT: Record<string, 'green' | 'blue' | 'purple' | 'gray'> = {
  platform: 'green', byoc: 'blue', hybrid: 'purple',
}

const PROVIDERS = ['twilio', 'plivo', 'sip_trunk'] as const
const OWNERSHIP_TYPES = ['platform_managed', 'client_owned'] as const
const BILLING_MODES = ['credit_deduct', 'passthrough'] as const

const EMPTY_FORM = {
  provider: 'twilio' as typeof PROVIDERS[number],
  ownership_type: 'client_owned' as typeof OWNERSHIP_TYPES[number],
  voice_billing: 'passthrough' as typeof BILLING_MODES[number],
  sms_billing: 'passthrough' as typeof BILLING_MODES[number],
  did_billing: 'passthrough' as typeof BILLING_MODES[number],
  margin_percent: '',
  notes: '',
}

function ProviderBillingModal({ client, onClose }: { client: AdminClient; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [editingProvider, setEditingProvider] = useState<string | null>(null)

  const { data: profilesRes, refetch: refetchProfiles } = useQuery({
    queryKey: ['admin-provider-profiles', client.id],
    queryFn: () => adminBillingService.getProviderProfiles(client.id),
  })

  const { data: tenantRes } = useQuery({
    queryKey: ['admin-tenant-billing', client.id],
    queryFn: () => adminBillingService.getTenantBilling(client.id),
  })

  const profiles: ProviderBillingProfile[] = profilesRes?.data?.data?.profiles ?? []
  const providerMode: ProviderMode = profilesRes?.data?.data?.provider_mode ?? 'platform'
  const credits: CreditBalance = tenantRes?.data?.data?.credits ?? { bonus: '0', wallet: '0', total: '0' }

  const usedProviders = profiles.map((p) => p.provider)

  const handleEdit = (p: ProviderBillingProfile) => {
    setEditingProvider(p.provider)
    setForm({
      provider: p.provider as typeof PROVIDERS[number],
      ownership_type: p.ownership_type as typeof OWNERSHIP_TYPES[number],
      voice_billing: p.voice_billing as typeof BILLING_MODES[number],
      sms_billing: p.sms_billing as typeof BILLING_MODES[number],
      did_billing: p.did_billing as typeof BILLING_MODES[number],
      margin_percent: p.margin_percent ? String(p.margin_percent) : '',
      notes: p.notes ?? '',
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminBillingService.setProviderProfile(client.id, {
        provider: form.provider,
        ownership_type: form.ownership_type,
        voice_billing: form.voice_billing,
        sms_billing: form.sms_billing,
        did_billing: form.did_billing,
        margin_percent: form.margin_percent ? Number(form.margin_percent) : 0,
        notes: form.notes || null,
      })
      toast.success(`Profile saved for ${form.provider}`)
      setForm({ ...EMPTY_FORM })
      setEditingProvider(null)
      refetchProfiles()
      qc.invalidateQueries({ queryKey: ['admin-tenant-billing', client.id] })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (provider: string) => {
    if (!confirm(`Remove ${provider} profile? Client will revert to platform billing for this provider.`)) return
    try {
      await adminBillingService.deleteProviderProfile(client.id, provider)
      toast.success(`${provider} profile removed`)
      setForm({ ...EMPTY_FORM })
      setEditingProvider(null)
      refetchProfiles()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to delete profile')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Provider Billing — {client.company_name}
            </h2>
            <span className="text-xs text-slate-400">Client #{client.id}</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status row */}
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Provider Mode</p>
              <Badge variant={MODE_VARIANT[providerMode] ?? 'gray'} className="mt-1">
                {providerMode}
              </Badge>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Credits</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">{Number(credits.total).toFixed(2)}</p>
              <p className="text-[10px] text-slate-400">
                Bonus: {Number(credits.bonus).toFixed(2)} | Wallet: {Number(credits.wallet).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Existing Profiles */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Provider Profiles</h3>
            {profiles.length === 0 ? (
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
                No profiles configured. This client uses <strong>platform VoIP</strong> — all usage deducts credits.
                Add a profile below to configure BYOC for a specific provider.
              </div>
            ) : (
              <div className="space-y-2">
                {profiles.map((p) => (
                  <div key={p.provider} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 capitalize">{p.provider.replace('_', ' ')}</span>
                        <Badge variant={p.ownership_type === 'client_owned' ? 'blue' : 'green'}>
                          {p.ownership_type === 'client_owned' ? 'Client Owned' : 'Platform Managed'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(p)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.provider)}
                          className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs text-slate-600">
                      <div>Voice: <span className="font-medium">{p.voice_billing === 'passthrough' ? 'passthrough' : 'credits'}</span></div>
                      <div>SMS: <span className="font-medium">{p.sms_billing === 'passthrough' ? 'passthrough' : 'credits'}</span></div>
                      <div>DID: <span className="font-medium">{p.did_billing === 'passthrough' ? 'passthrough' : 'credits'}</span></div>
                      <div>Margin: <span className="font-medium">{p.margin_percent ?? 0}%</span></div>
                    </div>
                    {p.notes && <p className="text-xs text-slate-400 mt-1">{p.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add / Edit Form */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              {editingProvider ? `Edit ${editingProvider} Profile` : 'Add Provider Profile'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Provider</span>
                <select
                  value={form.provider}
                  onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as typeof PROVIDERS[number] }))}
                  disabled={!!editingProvider}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p} disabled={!editingProvider && usedProviders.includes(p)}>
                      {p.replace('_', ' ')}{!editingProvider && usedProviders.includes(p) ? ' (exists)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Ownership</span>
                <select
                  value={form.ownership_type}
                  onChange={(e) => setForm((f) => ({ ...f, ownership_type: e.target.value as typeof OWNERSHIP_TYPES[number] }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="platform_managed">Platform Managed</option>
                  <option value="client_owned">Client Owned (BYOC)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Voice Billing</span>
                <select
                  value={form.voice_billing}
                  onChange={(e) => setForm((f) => ({ ...f, voice_billing: e.target.value as typeof BILLING_MODES[number] }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="credit_deduct">Credit Deduct</option>
                  <option value="passthrough">Passthrough (no charge)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">SMS Billing</span>
                <select
                  value={form.sms_billing}
                  onChange={(e) => setForm((f) => ({ ...f, sms_billing: e.target.value as typeof BILLING_MODES[number] }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="credit_deduct">Credit Deduct</option>
                  <option value="passthrough">Passthrough (no charge)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">DID Billing</span>
                <select
                  value={form.did_billing}
                  onChange={(e) => setForm((f) => ({ ...f, did_billing: e.target.value as typeof BILLING_MODES[number] }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="credit_deduct">Credit Deduct</option>
                  <option value="passthrough">Passthrough (no charge)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Margin %</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.margin_percent}
                  onChange={(e) => setForm((f) => ({ ...f, margin_percent: e.target.value.replace(/[^\d.]/g, '') }))}
                  placeholder="0"
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>
            <label className="block mt-3">
              <span className="text-xs font-medium text-slate-600">Notes (optional)</span>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Client's own Twilio account SID: AC..."
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editingProvider ? 'Update Profile' : 'Add Profile'}
              </button>
              {editingProvider && (
                <button
                  onClick={() => { setEditingProvider(null); setForm({ ...EMPTY_FORM }) }}
                  className="px-4 py-2 text-slate-600 text-sm hover:bg-slate-100 rounded"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {form.ownership_type === 'client_owned' && (
              <p className="text-xs text-amber-600 mt-2">
                Client-owned providers with passthrough billing will not deduct credits for usage on that provider.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
