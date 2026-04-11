import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Radio, RefreshCw, Edit, Activity, AlertTriangle, ShieldAlert,
  CheckCircle2, XCircle, Clock, MinusCircle, Building2, ExternalLink,
  Layers, X,
} from 'lucide-react'
import {
  adminRvmCutoverService,
  type RvmTenantFlag,
  type PipelineMode,
  type LiveProvider,
  type UpdateFlagPayload,
  type ReadinessReport,
  type CheckStatus,
  type BulkPipelineMode,
  type BulkSetModeResponse,
} from '../../services/adminRvmCutover.service'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { showConfirm } from '../../utils/confirmDelete'
import { formatDateTime } from '../../utils/format'
import toast from 'react-hot-toast'

// ── Helpers ────────────────────────────────────────────────────────────────────

const MODE_VARIANT: Record<PipelineMode, 'gray' | 'blue' | 'yellow' | 'green'> = {
  legacy:  'gray',
  shadow:  'blue',
  dry_run: 'yellow',
  live:    'green',
}

const MODE_LABEL: Record<PipelineMode, string> = {
  legacy:  'Legacy',
  shadow:  'Shadow',
  dry_run: 'Dry Run',
  live:    'Live',
}

const CHECK_STATUS: Record<
  CheckStatus,
  { variant: 'green' | 'red' | 'yellow' | 'gray'; icon: typeof CheckCircle2; label: string }
> = {
  pass: { variant: 'green',  icon: CheckCircle2, label: 'Pass' },
  fail: { variant: 'red',    icon: XCircle,      label: 'Fail' },
  warn: { variant: 'yellow', icon: AlertTriangle, label: 'Warn' },
  skip: { variant: 'gray',   icon: MinusCircle,  label: 'Skip' },
}

// ── Edit Flag Modal ────────────────────────────────────────────────────────────

interface FlagEditProps {
  tenant: RvmTenantFlag
  onClose: () => void
  onSave: (payload: UpdateFlagPayload) => void
  saving: boolean
}

function FlagEditModal({ tenant, onClose, onSave, saving }: FlagEditProps) {
  const [form, setForm] = useState<{
    pipeline_mode:  PipelineMode
    live_provider:  LiveProvider | ''
    live_daily_cap: string
    notes:          string
  }>({
    pipeline_mode:  tenant.pipeline_mode,
    live_provider:  tenant.live_provider ?? '',
    live_daily_cap: tenant.live_daily_cap !== null ? String(tenant.live_daily_cap) : '',
    notes:          tenant.notes ?? '',
  })

  const isLive = form.pipeline_mode === 'live'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isLive && !form.live_provider) {
      toast.error('live_provider is required when pipeline mode is live')
      return
    }

    const cap = form.live_daily_cap.trim() === '' ? null : Number(form.live_daily_cap)
    if (cap !== null && (!Number.isFinite(cap) || cap < 1 || cap > 1_000_000)) {
      toast.error('Daily cap must be between 1 and 1,000,000')
      return
    }

    const payload: UpdateFlagPayload = {
      pipeline_mode: form.pipeline_mode,
      notes:         form.notes.trim() === '' ? null : form.notes.trim(),
      live_provider: isLive ? (form.live_provider as LiveProvider) : null,
      live_daily_cap: isLive ? cap : null,
    }

    onSave(payload)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Edit Tenant Flag</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {tenant.company_name} <span className="font-mono">#{tenant.client_id}</span>
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm p-1.5 rounded-lg text-slate-400">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Pipeline mode */}
          <div className="form-group">
            <label className="label">Pipeline Mode *</label>
            <select
              className="input"
              value={form.pipeline_mode}
              onChange={(e) =>
                setForm((f) => ({ ...f, pipeline_mode: e.target.value as PipelineMode }))
              }
            >
              <option value="legacy">Legacy — use the old RVM pipeline</option>
              <option value="shadow">Shadow — log v2 decisions only, still dispatch via legacy</option>
              <option value="dry_run">Dry Run — run v2 pipeline, divert to no-op provider</option>
              <option value="live">Live — dispatch via the real v2 provider</option>
            </select>
          </div>

          {/* Live provider */}
          <div className="form-group">
            <label className="label">
              Live Provider {isLive && <span className="text-red-500">*</span>}
            </label>
            <select
              className="input"
              value={form.live_provider}
              disabled={!isLive}
              onChange={(e) =>
                setForm((f) => ({ ...f, live_provider: e.target.value as LiveProvider | '' }))
              }
            >
              <option value="">— none —</option>
              <option value="mock">mock (debug only)</option>
              <option value="twilio">twilio</option>
              <option value="plivo">plivo</option>
              <option value="slybroadcast">slybroadcast</option>
            </select>
            {!isLive && (
              <p className="text-xs text-slate-400 mt-1">Only applied when mode is <code>live</code>.</p>
            )}
          </div>

          {/* Daily cap */}
          <div className="form-group">
            <label className="label">Live Daily Cap</label>
            <input
              type="number"
              className="input"
              min={1}
              max={1_000_000}
              placeholder={isLive ? 'e.g. 100 (blank = uncapped)' : '—'}
              value={form.live_daily_cap}
              disabled={!isLive}
              onChange={(e) => setForm((f) => ({ ...f, live_daily_cap: e.target.value }))}
            />
            <p className="text-xs text-slate-400 mt-1">
              Max dispatches per day. Blank = uncapped. Only applied when mode is <code>live</code>.
            </p>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="label">Notes</label>
            <textarea
              className="input min-h-[72px]"
              maxLength={1000}
              placeholder="Why are you flipping this tenant? (e.g. wave-1 ramp 2026-04-11)"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <p className="text-xs text-slate-400 mt-1">{form.notes.length} / 1000</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Readiness Modal ────────────────────────────────────────────────────────────

interface ReadinessProps {
  tenant: RvmTenantFlag
  onClose: () => void
}

function ReadinessModal({ tenant, onClose }: ReadinessProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['rvm-cutover-readiness', tenant.client_id],
    queryFn: () => adminRvmCutoverService.checkReadiness(tenant.client_id),
    refetchOnWindowFocus: false,
    retry: false,
  })

  const report: ReadinessReport | undefined = data?.data?.data
  const ok = report?.ok ?? false

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Live Readiness Check</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {tenant.company_name} <span className="font-mono">#{tenant.client_id}</span>
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm p-1.5 rounded-lg text-slate-400">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {isLoading && (
            <div className="flex items-center gap-3 py-12 justify-center text-slate-500">
              <RefreshCw size={18} className="animate-spin" />
              <span className="text-sm">Running 9 checks…</span>
            </div>
          )}

          {isError && (
            <div className="rounded-xl bg-red-50 border border-red-100 p-4 flex items-start gap-3">
              <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">Readiness check failed</p>
                <p className="text-xs text-red-700 mt-1">
                  {(error as Error)?.message ?? 'Unknown error'}
                </p>
              </div>
            </div>
          )}

          {report && (
            <>
              {/* Overall banner */}
              <div
                className={[
                  'rounded-xl border p-4 flex items-start gap-3',
                  ok
                    ? 'bg-emerald-50 border-emerald-100'
                    : 'bg-red-50 border-red-100',
                ].join(' ')}
              >
                {ok ? (
                  <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={[
                      'text-sm font-semibold',
                      ok ? 'text-emerald-900' : 'text-red-900',
                    ].join(' ')}
                  >
                    {ok ? 'All required checks passed — safe to flip to live' : 'One or more checks failed — NOT safe to flip'}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Exit code: <span className="font-mono">{report.exit_code}</span>
                  </p>
                </div>
              </div>

              {/* Checks table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-16">ID</th>
                      <th className="w-24">Status</th>
                      <th>Check</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.checks.map((chk) => {
                      const meta = CHECK_STATUS[chk.status]
                      const Icon = meta.icon
                      return (
                        <tr key={chk.id}>
                          <td>
                            <span className="font-mono text-xs text-slate-500">{chk.id}</span>
                          </td>
                          <td>
                            <span className="inline-flex items-center gap-1.5">
                              <Icon
                                size={13}
                                className={[
                                  chk.status === 'pass' && 'text-emerald-600',
                                  chk.status === 'fail' && 'text-red-500',
                                  chk.status === 'warn' && 'text-amber-500',
                                  chk.status === 'skip' && 'text-slate-400',
                                ].filter(Boolean).join(' ')}
                              />
                              <Badge variant={meta.variant}>{meta.label}</Badge>
                            </span>
                          </td>
                          <td>
                            <span className="text-sm text-slate-700">{chk.label}</span>
                          </td>
                          <td>
                            <span className="text-xs text-slate-500">{chk.detail}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={onClose} className="btn-outline">Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function AdminRvmCutover() {
  const qc = useQueryClient()
  const [editing,  setEditing]  = useState<RvmTenantFlag | null>(null)
  const [checking, setChecking] = useState<RvmTenantFlag | null>(null)

  // Bulk-select state: set of client_ids the operator has ticked. Kept
  // separate from the list query so it survives refetches, but we clear
  // it after a successful bulk mutation to avoid stale selections.
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [bulkMode, setBulkMode] = useState<BulkPipelineMode>('shadow')
  const [bulkNotes, setBulkNotes] = useState<string>('')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-rvm-cutover'],
    queryFn: () => adminRvmCutoverService.list(),
  })

  const payload = data?.data?.data
  const tenants: RvmTenantFlag[] = payload?.tenants ?? []
  const globalKillSwitch = payload?.global_kill_switch ?? false

  const totals = {
    total:   tenants.length,
    legacy:  tenants.filter((t) => t.pipeline_mode === 'legacy').length,
    shadow:  tenants.filter((t) => t.pipeline_mode === 'shadow').length,
    dry_run: tenants.filter((t) => t.pipeline_mode === 'dry_run').length,
    live:    tenants.filter((t) => t.pipeline_mode === 'live').length,
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: ({ clientId, payload }: { clientId: number; payload: UpdateFlagPayload }) =>
      adminRvmCutoverService.update(clientId, payload),
    onSuccess: (res) => {
      const flag = res.data?.data
      toast.success(flag ? `Set to ${flag.pipeline_mode}` : 'Saved')
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['admin-rvm-cutover'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Failed to save'
      toast.error(msg)
    },
  })

  const bulkMutation = useMutation({
    mutationFn: (args: { clientIds: number[]; mode: BulkPipelineMode; notes: string | null }) =>
      adminRvmCutoverService.bulkSetMode({
        client_ids:    args.clientIds,
        pipeline_mode: args.mode,
        notes:         args.notes,
      }),
    onSuccess: (res) => {
      const data: BulkSetModeResponse | undefined = res.data?.data
      const ok   = data?.succeeded_count ?? 0
      const fail = data?.failed_count    ?? 0

      if (fail === 0) {
        toast.success(`Bulk update: ${ok} tenant${ok === 1 ? '' : 's'} set to ${data?.mode}`)
      } else if (ok === 0) {
        toast.error(`Bulk update failed: 0 succeeded, ${fail} failed`)
      } else {
        // Mixed result — surface as a warning toast with both counts so
        // the operator knows to check the details.
        toast(`Bulk update: ${ok} succeeded, ${fail} failed`, { icon: '⚠️' })
      }

      // Log per-row failures to the console so operators can inspect
      // which client ids refused — keeps the toast compact.
      if (data?.failed?.length) {
        // eslint-disable-next-line no-console
        console.warn('[rvm-cutover] bulk failures', data.failed)
      }

      setSelected(new Set())
      setBulkNotes('')
      qc.invalidateQueries({ queryKey: ['admin-rvm-cutover'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Bulk update failed'
      toast.error(msg)
    },
  })

  const rollbackMutation = useMutation({
    mutationFn: () => adminRvmCutoverService.rollbackAll(),
    onSuccess: (res) => {
      const count = res.data?.data?.affected_count ?? 0
      toast.success(
        count > 0
          ? `Rolled back ${count} tenant(s) to legacy`
          : 'No tenants needed rollback',
      )
      qc.invalidateQueries({ queryKey: ['admin-rvm-cutover'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Rollback failed'
      toast.error(msg)
    },
  })

  // ── Selection helpers ──────────────────────────────────────────────────────

  const allSelected = tenants.length > 0 && selected.size === tenants.length
  const someSelected = selected.size > 0 && !allSelected

  const toggleRow = (clientId: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(clientId)) next.delete(clientId)
      else next.add(clientId)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(tenants.map((t) => t.client_id)))
    }
  }

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns: Column<RvmTenantFlag>[] = [
    {
      key: 'select', header: '',
      headerClassName: 'w-10',
      render: (r) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          checked={selected.has(r.client_id)}
          onChange={(e) => {
            // Stop this from bubbling into any row-level click handler
            // the parent might add later.
            e.stopPropagation()
            toggleRow(r.client_id)
          }}
          aria-label={`Select ${r.company_name}`}
        />
      ),
    },
    {
      key: 'client_id', header: 'Client',
      render: (r) => (
        <Link
          to={`/admin/rvm/cutover/${r.client_id}`}
          className="flex items-center gap-2 group"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Building2 size={13} className="text-indigo-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
              {r.company_name}
            </div>
            <div className="text-xs text-slate-400 font-mono">#{r.client_id}</div>
          </div>
        </Link>
      ),
    },
    {
      key: 'pipeline_mode', header: 'Mode',
      render: (r) => (
        <Badge variant={MODE_VARIANT[r.pipeline_mode]}>{MODE_LABEL[r.pipeline_mode]}</Badge>
      ),
    },
    {
      key: 'live_provider', header: 'Live Provider',
      render: (r) => r.live_provider
        ? <span className="font-mono text-xs text-slate-600">{r.live_provider}</span>
        : <span className="text-xs text-slate-300">—</span>,
    },
    {
      key: 'live_daily_cap', header: 'Daily Cap',
      render: (r) => r.live_daily_cap !== null
        ? <span className="text-xs text-slate-600">{r.live_daily_cap.toLocaleString()}</span>
        : <span className="text-xs text-slate-300">uncapped</span>,
    },
    {
      key: 'shadow_24h', header: 'Shadow 24h',
      render: (r) => (
        <div className="text-xs">
          <span className="text-slate-700 font-medium">{r.shadow_24h.toLocaleString()}</span>
          {r.rejected_24h > 0 && (
            <span className="text-red-500 ml-1">({r.rejected_24h.toLocaleString()} rejected)</span>
          )}
        </div>
      ),
    },
    {
      key: 'live_enabled_at', header: 'Live Since',
      render: (r) => r.live_enabled_at
        ? <span className="text-xs text-slate-400">{formatDateTime(r.live_enabled_at)}</span>
        : <span className="text-xs text-slate-300">—</span>,
    },
    {
      key: 'notes', header: 'Notes',
      render: (r) => r.notes
        ? (
          <span
            className="text-xs text-slate-500 block max-w-[200px] truncate"
            title={r.notes}
          >
            {r.notes}
          </span>
        )
        : <span className="text-xs text-slate-300">—</span>,
    },
    {
      key: 'actions', header: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-1">
          <Link
            to={`/admin/rvm/cutover/${r.client_id}`}
            className="btn-ghost btn-sm p-1.5 text-slate-500 hover:text-indigo-600"
            title="View detail"
          >
            <ExternalLink size={13} />
          </Link>
          <button
            onClick={() => setEditing(r)}
            className="btn-ghost btn-sm p-1.5 text-slate-500 hover:text-indigo-600"
            title="Edit flag"
          >
            <Edit size={13} />
          </button>
          <button
            onClick={() => setChecking(r)}
            className="btn-ghost btn-sm p-1.5 text-slate-500 hover:text-emerald-600"
            title="Check readiness"
          >
            <Activity size={13} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-indigo-600" />
            <h1 className="text-lg font-semibold text-slate-900">RVM Cutover</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Per-tenant pipeline mode + live provider controls for the RVM v2 migration.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-ghost btn-sm p-2 rounded-lg"
            title="Refresh"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={async () => {
              if (
                await showConfirm({
                  title:       'Emergency rollback?',
                  message:     'This will flip EVERY non-legacy tenant back to legacy mode immediately. Use only during an incident.',
                  confirmText: 'Yes, roll back everything',
                  danger:      true,
                })
              ) {
                rollbackMutation.mutate()
              }
            }}
            disabled={rollbackMutation.isPending}
            className="btn-sm gap-2 px-3 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center"
          >
            <ShieldAlert size={14} />
            {rollbackMutation.isPending ? 'Rolling back…' : 'Rollback all to legacy'}
          </button>
        </div>
      </div>

      {/* Kill switch banner */}
      {!globalKillSwitch && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Global kill switch is OFF — the new RVM pipeline is disabled system-wide.
            </p>
            <p className="text-xs text-amber-800 mt-1">
              All tenants resolve to <code>legacy</code> regardless of the flag below until
              <code className="mx-1">rvm.use_new_pipeline</code>
              is flipped on in the environment.
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Building2 size={20} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tenants</p>
            <p className="text-2xl font-bold text-slate-900">{totals.total}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Clock size={20} className="text-slate-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Legacy</p>
            <p className="text-2xl font-bold text-slate-900">{totals.legacy}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Radio size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Shadow</p>
            <p className="text-2xl font-bold text-slate-900">{totals.shadow}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Activity size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dry Run</p>
            <p className="text-2xl font-bold text-slate-900">{totals.dry_run}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Live</p>
            <p className="text-2xl font-bold text-slate-900">{totals.live}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        {/* Bulk action bar — takes over the table header when at least
            one row is selected. Otherwise shows the plain count + a
            "select all" checkbox so operators can enter bulk mode with
            one click. */}
        {selected.size === 0 ? (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                checked={false}
                onChange={toggleAll}
                aria-label="Select all tenants"
                disabled={tenants.length === 0}
              />
              <span className="text-xs text-slate-500 font-medium">
                {isLoading ? 'Loading…' : `${totals.total.toLocaleString()} tenants`}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-indigo-100 bg-indigo-50/60 flex-wrap">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected
                }}
                onChange={toggleAll}
                aria-label="Select all tenants"
              />
              <span className="text-xs font-semibold text-indigo-900">
                <Layers size={12} className="inline mr-1" />
                {selected.size} selected
              </span>
              <button
                onClick={() => {
                  setSelected(new Set())
                  setBulkNotes('')
                }}
                className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
                title="Clear selection"
              >
                <X size={11} /> Clear
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={bulkMode}
                onChange={(e) => setBulkMode(e.target.value as BulkPipelineMode)}
                className="input input-sm py-1.5 text-xs min-w-[150px]"
                disabled={bulkMutation.isPending}
              >
                <option value="legacy">Legacy</option>
                <option value="shadow">Shadow</option>
                <option value="dry_run">Dry Run</option>
              </select>

              <input
                type="text"
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="Notes (optional)"
                maxLength={1000}
                className="input input-sm py-1.5 text-xs min-w-[200px]"
                disabled={bulkMutation.isPending}
              />

              <button
                onClick={async () => {
                  const ids = Array.from(selected).sort((a, b) => a - b)
                  if (ids.length === 0) return
                  const ok = await showConfirm({
                    title:   'Apply bulk mode change?',
                    message: `Flip ${ids.length} tenant${ids.length === 1 ? '' : 's'} to ${MODE_LABEL[bulkMode]} mode. This is reversible but will affect every selected tenant immediately.`,
                    confirmText: `Yes, set ${ids.length} to ${MODE_LABEL[bulkMode]}`,
                    danger: bulkMode === 'legacy',
                  })
                  if (!ok) return
                  bulkMutation.mutate({
                    clientIds: ids,
                    mode:      bulkMode,
                    notes:     bulkNotes.trim() === '' ? null : bulkNotes.trim(),
                  })
                }}
                disabled={bulkMutation.isPending}
                className="btn-sm gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center text-xs"
              >
                <Layers size={12} />
                {bulkMutation.isPending ? 'Applying…' : `Apply to ${selected.size}`}
              </button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          data={tenants}
          loading={isLoading}
          keyField="client_id"
          emptyText="No tenants found"
        />
      </div>

      {/* Modals */}
      {editing && (
        <FlagEditModal
          tenant={editing}
          onClose={() => setEditing(null)}
          onSave={(payload) =>
            updateMutation.mutate({ clientId: editing.client_id, payload })
          }
          saving={updateMutation.isPending}
        />
      )}

      {checking && (
        <ReadinessModal
          tenant={checking}
          onClose={() => setChecking(null)}
        />
      )}
    </div>
  )
}
