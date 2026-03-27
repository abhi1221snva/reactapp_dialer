import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, Check, X, Zap, Power,
  ChevronDown, ChevronUp, FlaskConical, Eye, EyeOff,
  AlertCircle, CheckCircle2, Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { confirmDelete } from '../../utils/confirmDelete'
import { cn } from '../../utils/cn'

// ── Types ──────────────────────────────────────────────────────────────────────

interface LenderApiConfig {
  id: number
  crm_lender_id: number
  lender_name?: string
  api_name: string
  auth_type: 'bearer' | 'basic' | 'api_key' | 'oauth2' | 'none'
  auth_credentials?: Record<string, string>
  base_url: string
  endpoint_path?: string
  request_method: 'GET' | 'POST' | 'PUT' | 'PATCH'
  default_headers?: Record<string, string>
  payload_mapping?: Record<string, string>
  response_mapping?: Record<string, string>
  retry_attempts: number
  timeout_seconds: number
  status: boolean
  notes?: string
  log_count?: number
  success_count?: number
  last_called_at?: string
  [key: string]: unknown
}

interface Lender { id: number; lender_name: string }

const AUTH_TYPES = [
  { value: 'none',    label: 'None',     desc: 'No authentication' },
  { value: 'bearer',  label: 'Bearer',   desc: 'Authorization: Bearer <token>' },
  { value: 'basic',   label: 'Basic',    desc: 'HTTP Basic Auth (username + password)' },
  { value: 'api_key', label: 'API Key',  desc: 'Custom header or query param' },
  { value: 'oauth2',  label: 'OAuth 2',  desc: 'Client Credentials flow' },
]

const HTTP_METHODS = ['POST', 'GET', 'PUT', 'PATCH']

const EMPTY_FORM = {
  crm_lender_id: '',
  api_name: '',
  auth_type: 'none' as LenderApiConfig['auth_type'],
  base_url: '',
  endpoint_path: '',
  request_method: 'POST' as LenderApiConfig['request_method'],
  retry_attempts: 3,
  timeout_seconds: 30,
  notes: '',
  // JSON editor strings
  auth_credentials_str: '{}',
  default_headers_str: '{\n  "Content-Type": "application/json",\n  "Accept": "application/json"\n}',
  payload_mapping_str: '{}',
  response_mapping_str: '{\n  "id_field": "data.id",\n  "status_field": "data.status"\n}',
}

type FormState = typeof EMPTY_FORM

// ── JSON Editor ────────────────────────────────────────────────────────────────

function JsonEditor({
  label, hint, value, onChange,
}: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  const [error, setError] = useState<string | null>(null)

  const handleChange = (v: string) => {
    onChange(v)
    try { JSON.parse(v); setError(null) } catch { setError('Invalid JSON') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="label mb-0">{label}</label>
        {error && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{error}</span>}
        {!error && value.trim() !== '' && value.trim() !== '{}' && (
          <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} />Valid JSON</span>
        )}
      </div>
      {hint && <p className="text-[11px] text-slate-400 mb-1">{hint}</p>}
      <textarea
        className={cn(
          'input w-full resize-y font-mono text-xs leading-relaxed',
          error ? 'border-red-300 focus:ring-red-400' : '',
        )}
        rows={6}
        value={value}
        onChange={e => handleChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  )
}

// ── Auth credential fields by auth type ────────────────────────────────────────

function AuthCredentialHint({ authType }: { authType: string }) {
  const examples: Record<string, string> = {
    bearer:  '{\n  "token": "your-bearer-token"\n}',
    basic:   '{\n  "username": "user",\n  "password": "pass"\n}',
    api_key: '{\n  "key": "your-api-key",\n  "header_name": "X-Api-Key",\n  "in": "header"\n}',
    oauth2:  '{\n  "token_url": "https://auth.example.com/token",\n  "client_id": "...",\n  "client_secret": "...",\n  "scope": "read write"\n}',
    none:    '{}',
  }
  return (
    <div className="mt-1 p-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px] font-mono text-slate-500 whitespace-pre">
      {examples[authType] ?? '{}'}
    </div>
  )
}

// ── Config Modal (Add / Edit) ──────────────────────────────────────────────────

function ConfigModal({
  editing,
  lenders,
  onClose,
  onSaved,
}: {
  editing: LenderApiConfig | null
  lenders: Lender[]
  onClose: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!editing

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showPass, setShowPass] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>('basic')

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (editing) {
      setForm({
        crm_lender_id:        String(editing.crm_lender_id),
        api_name:             editing.api_name ?? '',
        auth_type:            editing.auth_type ?? 'none',
        base_url:             editing.base_url ?? '',
        endpoint_path:        editing.endpoint_path ?? '',
        request_method:       editing.request_method ?? 'POST',
        retry_attempts:       editing.retry_attempts ?? 3,
        timeout_seconds:      editing.timeout_seconds ?? 30,
        notes:                editing.notes ?? '',
        auth_credentials_str: JSON.stringify(editing.auth_credentials ?? {}, null, 2),
        default_headers_str:  JSON.stringify(editing.default_headers ?? { 'Content-Type': 'application/json' }, null, 2),
        payload_mapping_str:  JSON.stringify(editing.payload_mapping ?? {}, null, 2),
        response_mapping_str: JSON.stringify(editing.response_mapping ?? {}, null, 2),
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [editing])

  const parseJson = (str: string): Record<string, unknown> => {
    try { return JSON.parse(str) } catch { return {} }
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        crm_lender_id:    Number(form.crm_lender_id),
        api_name:         form.api_name.trim(),
        auth_type:        form.auth_type,
        base_url:         form.base_url.trim(),
        endpoint_path:    form.endpoint_path.trim(),
        request_method:   form.request_method,
        retry_attempts:   Number(form.retry_attempts),
        timeout_seconds:  Number(form.timeout_seconds),
        notes:            form.notes.trim() || undefined,
        auth_credentials: parseJson(form.auth_credentials_str),
        default_headers:  parseJson(form.default_headers_str),
        payload_mapping:  parseJson(form.payload_mapping_str),
        response_mapping: parseJson(form.response_mapping_str),
      }
      return isEdit
        ? crmService.updateLenderApiConfig(editing!.id, payload)
        : crmService.createLenderApiConfig(payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Configuration updated' : 'Configuration created')
      qc.invalidateQueries({ queryKey: ['lender-api-configs'] })
      onSaved()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to save configuration')
    },
  })

  const canSave = form.crm_lender_id && form.api_name.trim() && form.base_url.trim()

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => {
    const open = activeSection === id
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setActiveSection(open ? null : id)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="text-sm font-semibold text-slate-700">{title}</span>
          {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </button>
        {open && <div className="p-4 space-y-4 border-t border-slate-100">{children}</div>}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="h-1 bg-indigo-600" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center">
              <Zap size={16} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isEdit ? `Edit: ${editing!.api_name}` : 'New Lender API Config'}
              </h2>
              <p className="text-xs text-slate-400">Configure how this lender receives lead data via API</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-3">

          <Section id="basic" title="1 — Basic Information">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Lender <span className="text-red-500">*</span></label>
                <select
                  className="input w-full"
                  value={form.crm_lender_id}
                  onChange={e => set('crm_lender_id', e.target.value)}
                >
                  <option value="">Select lender…</option>
                  {lenders.map(l => (
                    <option key={l.id} value={l.id}>{l.lender_name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">API Config Name <span className="text-red-500">*</span></label>
                <input
                  className="input w-full"
                  placeholder="e.g. OnDeck Production API"
                  value={form.api_name}
                  onChange={e => set('api_name', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Base URL <span className="text-red-500">*</span></label>
                <input
                  className="input w-full"
                  placeholder="https://api.lender.com/v1"
                  value={form.base_url}
                  onChange={e => set('base_url', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Endpoint Path</label>
                <input
                  className="input w-full"
                  placeholder="applications"
                  value={form.endpoint_path}
                  onChange={e => set('endpoint_path', e.target.value)}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Full URL: {form.base_url ? `${form.base_url.replace(/\/$/, '')}/${form.endpoint_path.replace(/^\//, '')}` : '—'}
                </p>
              </div>
              <div>
                <label className="label">HTTP Method</label>
                <select className="input w-full" value={form.request_method} onChange={e => set('request_method', e.target.value as LenderApiConfig['request_method'])}>
                  {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Retry Attempts</label>
                <input type="number" min={1} max={10} className="input w-full" value={form.retry_attempts} onChange={e => set('retry_attempts', Number(e.target.value))} />
              </div>
              <div>
                <label className="label">Timeout (seconds)</label>
                <input type="number" min={5} max={300} className="input w-full" value={form.timeout_seconds} onChange={e => set('timeout_seconds', Number(e.target.value))} />
              </div>
            </div>
          </Section>

          <Section id="auth" title="2 — Authentication">
            <div>
              <label className="label">Auth Type</label>
              <div className="grid grid-cols-5 gap-2">
                {AUTH_TYPES.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('auth_type', opt.value as LenderApiConfig['auth_type'])}
                    className={cn(
                      'text-center px-2 py-2 rounded-lg border text-xs font-medium transition-colors',
                      form.auth_type === opt.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-indigo-300',
                    )}
                    title={opt.desc}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {AUTH_TYPES.find(t => t.value === form.auth_type)?.desc}
              </p>
            </div>

            {form.auth_type !== 'none' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Auth Credentials (JSON)</label>
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    {showPass ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
                  </button>
                </div>
                {showPass ? (
                  <JsonEditor
                    label=""
                    value={form.auth_credentials_str}
                    onChange={v => set('auth_credentials_str', v)}
                  />
                ) : (
                  <div className="input bg-slate-50 text-slate-400 text-xs cursor-pointer" onClick={() => setShowPass(true)}>
                    ●●●●●●●●  (click to reveal)
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-1">Expected format for <strong>{form.auth_type}</strong>:</p>
                <AuthCredentialHint authType={form.auth_type} />
              </div>
            )}
          </Section>

          <Section id="headers" title="3 — Headers">
            <JsonEditor
              label="Default Headers"
              hint="JSON object — sent with every request. Content-Type and Accept are set automatically."
              value={form.default_headers_str}
              onChange={v => set('default_headers_str', v)}
            />
          </Section>

          <Section id="mapping" title="4 — Payload Mapping">
            <JsonEditor
              label="Payload Mapping"
              hint={`Map CRM field keys to the lender's JSON path.\nExample: { "business_name": "business.name", "owner_ssn": "owners.0.ssn" }`}
              value={form.payload_mapping_str}
              onChange={v => set('payload_mapping_str', v)}
            />
            <JsonEditor
              label="Response Mapping"
              hint={`Extract fields from the API response.\nExample: { "id_field": "data.applicationId", "status_field": "data.status" }`}
              value={form.response_mapping_str}
              onChange={v => set('response_mapping_str', v)}
            />
          </Section>

          <Section id="notes" title="5 — Notes">
            <textarea
              className="input w-full resize-none"
              rows={3}
              placeholder="Internal notes about this API configuration…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </Section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Configuration'}
          </button>
          <button onClick={onClose} className="btn-outline">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function CrmLenderApis() {
  const qc = useQueryClient()
  const { setDescription, setActions } = useCrmHeader()
  const [showModal, setShowModal]     = useState(false)
  const [editing, setEditing]         = useState<LenderApiConfig | null>(null)
  const [lenderFilter, setLenderFilter] = useState('')

  // Fetch all lenders for the dropdown
  const { data: lendersRes } = useQuery({
    queryKey: ['lenders-list'],
    queryFn: () => crmService.getLenders({ per_page: 500 }),
    staleTime: 60_000,
  })
  const lenders: Lender[] = lendersRes?.data?.data?.data ?? lendersRes?.data?.data ?? []

  // Fetch API configs
  const { data: configs, isLoading } = useQuery({
    queryKey: ['lender-api-configs', lenderFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {}
      if (lenderFilter) params.lender_id = Number(lenderFilter)
      const res = await crmService.getLenderApiConfigs(params)
      return (res.data?.data ?? []) as LenderApiConfig[]
    },
    staleTime: 0,
  })

  useEffect(() => {
    setDescription(`${configs?.length ?? 0} API configuration${configs?.length !== 1 ? 's' : ''}`)
    setActions(
      <button onClick={() => { setEditing(null); setShowModal(true) }} className="btn-primary flex items-center gap-2">
        <Plus size={15} /> Add API Config
      </button>
    )
    return () => { setDescription(undefined); setActions(undefined) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs?.length])

  const toggleMutation = useMutation({
    mutationFn: (id: number) => crmService.toggleLenderApiConfig(id),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['lender-api-configs'] }) },
    onError: () => toast.error('Failed to toggle'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteLenderApiConfig(id),
    onSuccess: () => { toast.success('Configuration deleted'); qc.invalidateQueries({ queryKey: ['lender-api-configs'] }) },
    onError: () => toast.error('Failed to delete'),
  })

  const successRate = (cfg: LenderApiConfig) => {
    const total = Number(cfg.log_count ?? 0)
    const success = Number(cfg.success_count ?? 0)
    if (!total) return null
    return Math.round((success / total) * 100)
  }

  return (
    <div className="space-y-4">

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          className="input h-9 text-sm min-w-[200px]"
          value={lenderFilter}
          onChange={e => setLenderFilter(e.target.value)}
        >
          <option value="">All Lenders</option>
          {lenders.map(l => <option key={l.id} value={l.id}>{l.lender_name}</option>)}
        </select>
        <span className="text-xs text-slate-400">{configs?.length ?? 0} configs</span>
      </div>

      {/* Table */}
      <div className="table-wrapper bg-white">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>API Config</th>
                <th>Lender</th>
                <th className="hidden md:table-cell">Auth</th>
                <th className="hidden lg:table-cell">Endpoint</th>
                <th className="hidden xl:table-cell">Stats</th>
                <th className="hidden sm:table-cell">Status</th>
                <th className="!text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: j === 0 ? '80%' : '60%' }} /></td>
                    ))}
                  </tr>
                ))
              ) : configs?.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                      <Zap size={28} className="mb-2 text-slate-300" />
                      <p className="font-medium text-slate-500">No API configurations yet</p>
                      <p className="text-xs mt-1">Click "Add API Config" to connect a lender's API</p>
                    </div>
                  </td>
                </tr>
              ) : configs?.map(cfg => {
                const rate = successRate(cfg)
                return (
                  <tr key={cfg.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          cfg.status ? 'bg-indigo-50' : 'bg-slate-100',
                        )}>
                          <Zap size={14} className={cfg.status ? 'text-indigo-500' : 'text-slate-400'} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{cfg.api_name}</p>
                          <p className="text-xs text-slate-400">{cfg.request_method} · {cfg.auth_type}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-slate-700">{cfg.lender_name ?? `Lender #${cfg.crm_lender_id}`}</span>
                    </td>
                    <td className="hidden md:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 capitalize">
                        {cfg.auth_type}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell">
                      <p className="text-xs font-mono text-slate-500 truncate max-w-[200px]" title={cfg.base_url}>
                        {cfg.base_url}{cfg.endpoint_path ? `/${cfg.endpoint_path}` : ''}
                      </p>
                    </td>
                    <td className="hidden xl:table-cell">
                      {Number(cfg.log_count ?? 0) > 0 ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-600">{rate}%</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{cfg.log_count} calls</p>
                          {cfg.last_called_at && (
                            <p className="text-[11px] text-slate-300 flex items-center gap-1">
                              <Clock size={9} />
                              {new Date(cfg.last_called_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">No calls yet</span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell">
                      <button
                        onClick={() => toggleMutation.mutate(cfg.id)}
                        disabled={toggleMutation.isPending}
                        title="Click to toggle"
                      >
                        {cfg.status ? (
                          <span className="badge badge-green flex items-center gap-1">
                            <Check size={10} /> Active
                          </span>
                        ) : (
                          <span className="badge badge-gray flex items-center gap-1">
                            <Power size={10} /> Inactive
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="w-px whitespace-nowrap text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => { setEditing(cfg); setShowModal(true) }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={async () => {
                            if (await confirmDelete(cfg.api_name)) deleteMutation.mutate(cfg.id)
                          }}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ConfigModal
          editing={editing}
          lenders={lenders}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
