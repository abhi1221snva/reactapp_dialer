import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Loader2, X, Zap, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, Eye, EyeOff,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import type { Lender } from '../../types/crm.types'
import { cn } from '../../utils/cn'

// ─── API Config types ─────────────────────────────────────────────────────────

interface LenderApiConfig {
  id: number
  crm_lender_id: number
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
  notes?: string
  status: boolean
  [key: string]: unknown
}

const AUTH_TYPES = [
  { value: 'none',    label: 'None',    desc: 'No authentication' },
  { value: 'bearer',  label: 'Bearer',  desc: 'Authorization: Bearer <token>' },
  { value: 'basic',   label: 'Basic',   desc: 'HTTP Basic Auth (username + password)' },
  { value: 'api_key', label: 'API Key', desc: 'Custom header or query param' },
  { value: 'oauth2',  label: 'OAuth 2', desc: 'Client Credentials flow' },
]

const HTTP_METHODS = ['POST', 'GET', 'PUT', 'PATCH']

const API_EMPTY_FORM = {
  api_name: '',
  auth_type: 'none' as LenderApiConfig['auth_type'],
  base_url: '',
  endpoint_path: '',
  request_method: 'POST' as LenderApiConfig['request_method'],
  retry_attempts: 3,
  timeout_seconds: 30,
  notes: '',
  auth_credentials_str: '{}',
  default_headers_str: '{\n  "Content-Type": "application/json",\n  "Accept": "application/json"\n}',
  payload_mapping_str: '{}',
  response_mapping_str: '{\n  "id_field": "data.id",\n  "status_field": "data.status"\n}',
}

type ApiFormState = typeof API_EMPTY_FORM

// ─── JSON Editor ──────────────────────────────────────────────────────────────

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
      {hint && <p className="text-[11px] text-slate-400 mb-1 whitespace-pre-line">{hint}</p>}
      <textarea
        className={cn('input w-full resize-y font-mono text-xs leading-relaxed', error ? 'border-red-300 focus:ring-red-400' : '')}
        rows={5}
        value={value}
        onChange={e => handleChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  )
}

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

// ─── Constants ────────────────────────────────────────────────────────────────

const US_STATES = [
  'Alabama','Alaska','American Samoa','Arizona','Arkansas',
  'Armed Forces Africa','Armed Forces Americas','Armed Forces Canada',
  'Armed Forces Europe','Armed Forces Middle East','Armed Forces Pacific',
  'California','Colorado','Connecticut','Delaware','District of Columbia',
  'Federated States of Micronesia','Florida','Georgia','Guam','Hawaii',
  'Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana',
  'Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
  'New Mexico','New York','North Carolina','North Dakota',
  'Northern Mariana Islands','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Puerto Rico','Republic of Marshall Islands','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virgin Islands of the U.S.','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming',
]

const INDUSTRY_OPTIONS = [
  'Construction','Trucking','Auto Sales','Restaurant','Retail',
  'Healthcare','Real Estate','Cannabis','Adult Entertainment','Gambling',
  'Firearms','Cryptocurrency','Legal Services','Travel','Non-Profit',
  'Financial Services','Insurance','Staffing','Transportation','Technology',
]

const BANK_VERIFY_OPTIONS = ['Team Viewer','Plaid','MX','Finicity','Micro Deposits','Manual','Other']
const COUNTRY_OPTIONS = ['USA','Canada','United Kingdom','Other']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String)
  if (typeof val === 'string') {
    const t = val.trim()
    if (t.startsWith('[')) { try { return JSON.parse(t) } catch { /* ok */ } }
  }
  return []
}

function parseCommaSep(val: unknown): string[] {
  if (!val || typeof val !== 'string') return []
  return val.split(',').map(s => s.trim()).filter(Boolean)
}

function parseJson(str: string): Record<string, unknown> {
  try { return JSON.parse(str) } catch { return {} }
}

// ─── YesNo toggle ─────────────────────────────────────────────────────────────

function YesNo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-slate-200 h-8">
      {['Yes', 'No'].map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? '' : opt)}
          className={`flex-1 px-3 text-xs font-medium transition-colors ${
            value === opt ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ─── MultiSelect ──────────────────────────────────────────────────────────────

function MultiSelect({
  placeholder, options, value, onChange,
}: {
  placeholder: string; options: string[]; value: string[]; onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt])

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input w-full text-left flex items-center justify-between min-h-[36px]"
      >
        <span className={`text-sm truncate ${value.length === 0 ? 'text-slate-400' : 'text-slate-700'}`}>
          {value.length === 0 ? placeholder : `${value.length} selected`}
        </span>
        <ChevronDown size={14} className={`flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {value.map(v => (
            <span key={v} className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
              {v}
              <button type="button" onClick={() => toggle(v)} className="hover:text-indigo-900"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-slate-100">
            <input
              className="input w-full text-sm py-1"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">No results</p>
            ) : filtered.map(opt => (
              <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={value.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FormState ────────────────────────────────────────────────────────────────

interface FormState {
  lender_name: string; email: string; secondary_email: string
  secondary_email2: string; secondary_email3: string; secondary_email4: string
  contact_person: string; phone: string; min_credit_score: string
  max_negative_days: string; max_advance: string; nsfs: string
  min_time_business: string; min_amount: string; min_deposits: string
  min_monthly_deposit: string; min_avg_revenue: string; max_position: string[]
  max_term: string; daily_balance: string; white_label: string
  consolidation: string; max_mca_payoff_amount: string
  reverse_consolidation: string; sole_prop: string; home_business: string
  non_profit: string; daily: string; coj_req: string; bank_verify: string
  loc: string; ownership_percentage: string; factor_rate: string
  address: string; country: string; state: string; city: string
  prohibited_industry: string[]; restricted_industry_note: string
  guideline_state: string[]; restricted_state_note: string
  notes: string; guideline_file: string; api_status: string
}

const EMPTY_FORM: FormState = {
  lender_name: '', email: '', secondary_email: '', secondary_email2: '',
  secondary_email3: '', secondary_email4: '', contact_person: '', phone: '',
  min_credit_score: '', max_negative_days: '', max_advance: '', nsfs: '',
  min_time_business: '', min_amount: '', min_deposits: '', min_monthly_deposit: '',
  min_avg_revenue: '', max_position: [], max_term: '', daily_balance: '',
  white_label: '', consolidation: '', max_mca_payoff_amount: '',
  reverse_consolidation: '', sole_prop: '', home_business: '', non_profit: '',
  daily: '', coj_req: '', bank_verify: '', loc: '', ownership_percentage: '',
  factor_rate: '', address: '', country: 'USA', state: '', city: '',
  prohibited_industry: [], restricted_industry_note: '',
  guideline_state: [], restricted_state_note: '',
  notes: '', guideline_file: '',
  api_status: '0',
}

function lenderToForm(lender: Lender): FormState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = lender as any
  return {
    lender_name:              lender.lender_name ?? '',
    email:                    lender.email ?? '',
    secondary_email:          lender.secondary_email ?? '',
    secondary_email2:         e.secondary_email2 ?? '',
    secondary_email3:         e.secondary_email3 ?? '',
    secondary_email4:         e.secondary_email4 ?? '',
    contact_person:           lender.contact_person ?? '',
    phone:                    lender.phone ?? '',
    min_credit_score:         String(e.min_credit_score ?? ''),
    max_negative_days:        String(e.max_negative_days ?? ''),
    max_advance:              String(e.max_advance ?? ''),
    nsfs:                     String(e.nsfs ?? ''),
    min_time_business:        String(e.min_time_business ?? ''),
    min_amount:               String(e.min_amount ?? ''),
    min_deposits:             String(e.min_deposits ?? ''),
    min_monthly_deposit:      String(e.min_monthly_deposit ?? ''),
    min_avg_revenue:          String(e.min_avg_revenue ?? ''),
    max_position:             parseJsonArray(e.max_position),
    max_term:                 String(e.max_term ?? ''),
    daily_balance:            String(e.daily_balance ?? ''),
    white_label:              String(e.white_label ?? ''),
    consolidation:            String(e.consolidation ?? ''),
    max_mca_payoff_amount:    String(e.max_mca_payoff_amount ?? ''),
    reverse_consolidation:    String(e.reverse_consolidation ?? ''),
    sole_prop:                String(e.sole_prop ?? ''),
    home_business:            String(e.home_business ?? ''),
    non_profit:               String(e.non_profit ?? ''),
    daily:                    String(e.daily ?? ''),
    coj_req:                  String(e.coj_req ?? ''),
    bank_verify:              String(e.bank_verify ?? ''),
    loc:                      String(e.loc ?? ''),
    ownership_percentage:     String(e.ownership_percentage ?? ''),
    factor_rate:              String(e.factor_rate ?? ''),
    address:                  lender.address ?? '',
    country:                  String(e.country ?? 'USA'),
    state:                    lender.state ?? '',
    city:                     lender.city ?? '',
    prohibited_industry:      parseCommaSep(e.prohibited_industry),
    restricted_industry_note: String(e.restricted_industry_note ?? ''),
    guideline_state:          parseJsonArray(e.guideline_state),
    restricted_state_note:    String(e.restricted_state_note ?? ''),
    notes:                    lender.notes ?? '',
    guideline_file:           String(e.guideline_file ?? ''),
    api_status:               String(lender.api_status ?? '0'),
  }
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Collapsible API sub-section ──────────────────────────────────────────────

function ApiSection({
  id, title, activeId, onToggle, children,
}: { id: string; title: string; activeId: string | null; onToggle: (id: string) => void; children: React.ReactNode }) {
  const open = activeId === id
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
      </button>
      {open && <div className="p-4 space-y-4 border-t border-slate-100">{children}</div>}
    </div>
  )
}

// ─── CrmLenderForm page ───────────────────────────────────────────────────────

export function CrmLenderForm() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { setDescription, setActions } = useCrmHeader()
  const isEdit = !!id

  // ── Lender data ──────────────────────────────────────────────────────────────
  const { data: lenderData, isLoading: loadingLender } = useQuery({
    queryKey: ['lender', id],
    queryFn: async () => {
      const res = await crmService.getLenders({ page: 1, per_page: 500 })
      const list: Lender[] = res.data?.data?.data ?? res.data?.data ?? res.data?.records ?? res.data ?? []
      return list.find(l => String(l.id) === id) ?? null
    },
    enabled: isEdit,
  })

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formReady, setFormReady] = useState(!isEdit)

  useEffect(() => {
    if (lenderData) {
      setForm(lenderToForm(lenderData))
      setFormReady(true)
    }
  }, [lenderData])

  // ── API Config data ──────────────────────────────────────────────────────────
  const [apiForm, setApiForm] = useState<ApiFormState>(API_EMPTY_FORM)
  const [apiSection, setApiSection] = useState<string | null>('basic')
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    if (lenderData) {
      const l = lenderData as Record<string, unknown>
      setApiForm({
        api_name:             String(l.api_name ?? ''),
        auth_type:            (l.auth_type as ApiFormState['auth_type']) ?? 'none',
        base_url:             String(l.base_url ?? ''),
        endpoint_path:        String(l.endpoint_path ?? ''),
        request_method:       (l.request_method as ApiFormState['request_method']) ?? 'POST',
        retry_attempts:       Number(l.retry_attempts ?? 3),
        timeout_seconds:      Number(l.timeout_seconds ?? 30),
        notes:                String(l.api_notes ?? ''),
        auth_credentials_str: JSON.stringify(l.auth_credentials ?? {}, null, 2),
        default_headers_str:  JSON.stringify(l.default_headers ?? { 'Content-Type': 'application/json' }, null, 2),
        payload_mapping_str:  JSON.stringify(l.payload_mapping ?? {}, null, 2),
        response_mapping_str: JSON.stringify(l.response_mapping ?? {}, null, 2),
      })
    }
  }, [lenderData])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }))
  const setApi = <K extends keyof ApiFormState>(k: K, v: ApiFormState[K]) =>
    setApiForm(f => ({ ...f, [k]: v }))

  const togglePos = (n: string) => {
    const pos = form.max_position
    set('max_position', pos.includes(n) ? pos.filter(p => p !== n) : [...pos, n])
  }
  const apiEnabled = form.api_status === '1'

  const toggleApiSection = (sid: string) =>
    setApiSection(prev => prev === sid ? null : sid)

  // ── Save mutation ─────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const lenderPayload: Record<string, unknown> = {
        ...form,
        prohibited_industry: form.prohibited_industry.join(','),
      }

      // Include API config fields directly in the lender payload
      if (apiEnabled && apiForm.base_url.trim()) {
        lenderPayload.api_name         = apiForm.api_name.trim() || form.lender_name
        lenderPayload.auth_type        = apiForm.auth_type
        lenderPayload.base_url         = apiForm.base_url.trim()
        lenderPayload.endpoint_path    = apiForm.endpoint_path.trim()
        lenderPayload.request_method   = apiForm.request_method
        lenderPayload.retry_attempts   = Number(apiForm.retry_attempts)
        lenderPayload.timeout_seconds  = Number(apiForm.timeout_seconds)
        lenderPayload.api_notes        = apiForm.notes.trim() || undefined
        lenderPayload.auth_credentials = parseJson(apiForm.auth_credentials_str)
        lenderPayload.default_headers  = parseJson(apiForm.default_headers_str)
        lenderPayload.payload_mapping  = parseJson(apiForm.payload_mapping_str)
        lenderPayload.response_mapping = parseJson(apiForm.response_mapping_str)
      }

      return isEdit
        ? crmService.updateLender(Number(id), lenderPayload)
        : crmService.createLender(lenderPayload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Lender updated' : 'Lender created')
      qc.invalidateQueries({ queryKey: ['lenders'] })
      navigate('/crm/lenders')
    },
    onError: () => toast.error('Failed to save lender'),
  })

  const canSave = !!form.lender_name && !(apiEnabled && !apiForm.base_url.trim())

  // ── Header ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const title = isEdit
      ? (lenderData ? `Edit: ${lenderData.lender_name}` : 'Edit Lender')
      : 'Add Lender'
    setDescription(title)
    setActions(
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/crm/lenders')}
          className="btn-outline flex items-center gap-1.5"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!canSave || saveMutation.isPending}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
          {isEdit ? 'Save Changes' : 'Add Lender'}
        </button>
      </div>
    )
    return () => { setDescription(undefined); setActions(undefined) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, lenderData, canSave, saveMutation.isPending])

  if (isEdit && (loadingLender || !formReady)) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="pb-10 space-y-5">

      {/* ── API Integration ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-indigo-500" />
            <span className="text-sm font-semibold text-slate-800">API Integration</span>
            {apiEnabled
              ? <span className="badge badge-indigo text-[10px]">Enabled — submits via API</span>
              : <span className="badge badge-slate text-[10px]">Disabled — submits via Email</span>
            }
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-slate-500">{apiEnabled ? 'On' : 'Off'}</span>
            <button
              type="button"
              onClick={() => set('api_status', apiEnabled ? '0' : '1')}
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 ${apiEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 m-0.5 rounded-full bg-white shadow transition-transform duration-200 ${apiEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </label>
        </div>

        {apiEnabled ? (
          <div className="p-5 space-y-3">

            {/* 1 — Basic */}
            <ApiSection id="basic" title="1 — Basic Information" activeId={apiSection} onToggle={toggleApiSection}>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Config Name</label>
                  <input
                    className="input w-full"
                    placeholder="e.g. OnDeck Production API"
                    value={apiForm.api_name}
                    onChange={e => setApi('api_name', e.target.value)}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Leave blank to use lender name</p>
                </div>
                <div>
                  <label className="label">Base URL <span className="text-red-500">*</span></label>
                  <input
                    className="input w-full font-mono text-xs"
                    placeholder="https://api.lender.com/v1"
                    value={apiForm.base_url}
                    onChange={e => setApi('base_url', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Endpoint Path</label>
                  <input
                    className="input w-full font-mono text-xs"
                    placeholder="applications"
                    value={apiForm.endpoint_path}
                    onChange={e => setApi('endpoint_path', e.target.value)}
                  />
                  {apiForm.base_url && (
                    <p className="text-[11px] text-slate-400 mt-1 font-mono truncate">
                      {apiForm.base_url.replace(/\/$/, '')}/{apiForm.endpoint_path.replace(/^\//, '')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">HTTP Method</label>
                  <select className="input w-full" value={apiForm.request_method} onChange={e => setApi('request_method', e.target.value as ApiFormState['request_method'])}>
                    {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3 col-span-2">
                  <div>
                    <label className="label">Retry Attempts</label>
                    <input type="number" min={1} max={10} className="input w-full" value={apiForm.retry_attempts} onChange={e => setApi('retry_attempts', Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="label">Timeout (seconds)</label>
                    <input type="number" min={5} max={300} className="input w-full" value={apiForm.timeout_seconds} onChange={e => setApi('timeout_seconds', Number(e.target.value))} />
                  </div>
                </div>
              </div>
            </ApiSection>

            {/* 2 — Auth */}
            <ApiSection id="auth" title="2 — Authentication" activeId={apiSection} onToggle={toggleApiSection}>
              <div>
                <label className="label">Auth Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {AUTH_TYPES.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setApi('auth_type', opt.value as ApiFormState['auth_type'])}
                      className={cn(
                        'text-center px-2 py-2 rounded-lg border text-xs font-medium transition-colors',
                        apiForm.auth_type === opt.value
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
                  {AUTH_TYPES.find(t => t.value === apiForm.auth_type)?.desc}
                </p>
              </div>
              {apiForm.auth_type !== 'none' && (
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
                      value={apiForm.auth_credentials_str}
                      onChange={v => setApi('auth_credentials_str', v)}
                    />
                  ) : (
                    <div className="input bg-slate-50 text-slate-400 text-xs cursor-pointer" onClick={() => setShowPass(true)}>
                      ●●●●●●●●  (click to reveal)
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-1">Expected format for <strong>{apiForm.auth_type}</strong>:</p>
                  <AuthCredentialHint authType={apiForm.auth_type} />
                </div>
              )}
            </ApiSection>

            {/* 3 — Headers */}
            <ApiSection id="headers" title="3 — Headers" activeId={apiSection} onToggle={toggleApiSection}>
              <JsonEditor
                label="Default Headers"
                hint="JSON object — sent with every request."
                value={apiForm.default_headers_str}
                onChange={v => setApi('default_headers_str', v)}
              />
            </ApiSection>

            {/* 4 — Payload Mapping */}
            <ApiSection id="mapping" title="4 — Payload Mapping" activeId={apiSection} onToggle={toggleApiSection}>
              <JsonEditor
                label="Payload Mapping"
                hint={'Map CRM field keys to the lender\'s JSON path.\nExample: { "business_name": "business.name", "owner_ssn": "owners.0.ssn" }'}
                value={apiForm.payload_mapping_str}
                onChange={v => setApi('payload_mapping_str', v)}
              />
              <JsonEditor
                label="Response Mapping"
                hint={'Extract fields from the API response.\nExample: { "id_field": "data.applicationId", "status_field": "data.status" }'}
                value={apiForm.response_mapping_str}
                onChange={v => setApi('response_mapping_str', v)}
              />
            </ApiSection>

            {/* 5 — Notes */}
            <ApiSection id="notes" title="5 — Notes" activeId={apiSection} onToggle={toggleApiSection}>
              <textarea
                className="input w-full resize-none"
                rows={3}
                placeholder="Internal notes about this API configuration…"
                value={apiForm.notes}
                onChange={e => setApi('notes', e.target.value)}
              />
            </ApiSection>

          </div>
        ) : (
          <div className="px-5 py-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="ri-mail-send-line text-base text-slate-400" />
            Applications will be delivered to the lender's email address(es) configured below.
          </div>
        )}
      </div>

      {/* ── Two-column section grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* LEFT column */}
        <div className="space-y-5">

          {/* Contact Information */}
          <Section title="Contact Information">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Lender Name <span className="text-red-500">*</span></label>
                <input className="input w-full" value={form.lender_name} onChange={e => set('lender_name', e.target.value)} placeholder="e.g. Forward Finance" />
              </div>
              <div>
                <label className="label">Lender Email</label>
                <input className="input w-full" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="submissions@lender.com" />
              </div>
              <div>
                <label className="label">Optional Email 1 (CC)</label>
                <input className="input w-full" type="email" value={form.secondary_email} onChange={e => set('secondary_email', e.target.value)} placeholder="cc@lender.com" />
              </div>
              <div>
                <label className="label">Optional Email 2</label>
                <input className="input w-full" type="email" value={form.secondary_email2} onChange={e => set('secondary_email2', e.target.value)} placeholder="email2@lender.com" />
              </div>
              <div>
                <label className="label">Optional Email 3</label>
                <input className="input w-full" type="email" value={form.secondary_email3} onChange={e => set('secondary_email3', e.target.value)} placeholder="email3@lender.com" />
              </div>
              <div>
                <label className="label">Optional Email 4</label>
                <input className="input w-full" type="email" value={form.secondary_email4} onChange={e => set('secondary_email4', e.target.value)} placeholder="email4@lender.com" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input w-full" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(617) 657-1601" />
              </div>
              <div>
                <label className="label">Contact Person</label>
                <input className="input w-full" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="Sam Lang" />
              </div>
            </div>
          </Section>

          {/* Loan Requirements */}
          <Section title="Loan Requirements">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">FICO</label>
                <input className="input w-full" type="number" value={form.min_credit_score} onChange={e => set('min_credit_score', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label">Max Negative Days</label>
                <input className="input w-full" type="number" value={form.max_negative_days} onChange={e => set('max_negative_days', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label">Max Loan Amount $</label>
                <input className="input w-full" type="number" value={form.max_advance} onChange={e => set('max_advance', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label">Min Loan Amount $</label>
                <input className="input w-full" type="number" value={form.min_amount} onChange={e => set('min_amount', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label">NSFs</label>
                <input className="input w-full" value={form.nsfs} onChange={e => set('nsfs', e.target.value)} placeholder="Enter NSFs" />
              </div>
              <div>
                <label className="label">Time In Business (Mo.)</label>
                <input className="input w-full" value={form.min_time_business} onChange={e => set('min_time_business', e.target.value)} placeholder="e.g. 6" />
              </div>
              <div>
                <label className="label">Min Deposits</label>
                <input className="input w-full" type="number" value={form.min_deposits} onChange={e => set('min_deposits', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label">Min Monthly Deposit $</label>
                <input className="input w-full" type="number" value={form.min_monthly_deposit} onChange={e => set('min_monthly_deposit', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label">Min Avg Revenue $</label>
                <input className="input w-full" type="number" value={form.min_avg_revenue} onChange={e => set('min_avg_revenue', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label">Max Term (months)</label>
                <input className="input w-full" value={form.max_term} onChange={e => set('max_term', e.target.value)} placeholder="Enter Max Term" />
              </div>
              <div>
                <label className="label">Avg Daily Balance $</label>
                <input className="input w-full" type="number" value={form.daily_balance} onChange={e => set('daily_balance', e.target.value)} placeholder="0" />
              </div>
              <div className="col-span-2">
                <label className="label">Positions Offered</label>
                <div className="flex flex-wrap gap-2">
                  {['1','2','3','4','5','6','7','8','9','10'].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => togglePos(n)}
                      className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-colors ${
                        form.max_position.includes(n)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* Restrictions */}
          <Section title="Restrictions">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Restricted Industry</label>
                <MultiSelect
                  placeholder="Select restricted industries..."
                  options={INDUSTRY_OPTIONS}
                  value={form.prohibited_industry}
                  onChange={v => set('prohibited_industry', v)}
                />
              </div>
              <div>
                <label className="label">Restricted State</label>
                <MultiSelect
                  placeholder="Select restricted states..."
                  options={US_STATES}
                  value={form.guideline_state}
                  onChange={v => set('guideline_state', v)}
                />
              </div>
              <div>
                <label className="label">Restricted Industry Notes</label>
                <textarea className="input w-full resize-none" rows={2} value={form.restricted_industry_note} onChange={e => set('restricted_industry_note', e.target.value)} placeholder="Write notes..." />
              </div>
              <div>
                <label className="label">Restricted State Notes</label>
                <textarea className="input w-full resize-none" rows={2} value={form.restricted_state_note} onChange={e => set('restricted_state_note', e.target.value)} placeholder="Write notes..." />
              </div>
            </div>
          </Section>

        </div>

        {/* RIGHT column */}
        <div className="space-y-5">

          {/* Features & Eligibility */}
          <Section title="Features & Eligibility">
            <div className="grid grid-cols-2 gap-4">
              {([
                ['White Label',           'white_label'],
                ['Consolidation',         'consolidation'],
                ['Reverse Consolidation', 'reverse_consolidation'],
                ['Sole Prop',             'sole_prop'],
                ['Home Based',            'home_business'],
                ['Non Profit',            'non_profit'],
                ['LOC',                   'loc'],
                ['COJ Request',           'coj_req'],
              ] as [string, keyof FormState][]).map(([label, key]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <YesNo value={form[key] as string} onChange={v => set(key, v)} />
                </div>
              ))}
              <div>
                <label className="label">Payment Schedule</label>
                <div className="flex rounded-lg overflow-hidden border border-slate-200 h-8">
                  {['Daily', 'Weekly'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set('daily', form.daily === opt ? '' : opt)}
                      className={`flex-1 text-xs font-medium transition-colors ${
                        form.daily === opt ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Bank Verification</label>
                <select className="input w-full" value={form.bank_verify} onChange={e => set('bank_verify', e.target.value)}>
                  <option value="">— Select —</option>
                  {BANK_VERIFY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Ownership %</label>
                <input className="input w-full" value={form.ownership_percentage} onChange={e => set('ownership_percentage', e.target.value)} placeholder="e.g. 51" />
              </div>
              <div>
                <label className="label">Factor Rate</label>
                <input className="input w-full" value={form.factor_rate} onChange={e => set('factor_rate', e.target.value)} placeholder="e.g. 1.25" />
              </div>
              <div>
                <label className="label">Max MCA Payoff $</label>
                <input className="input w-full" type="number" value={form.max_mca_payoff_amount} onChange={e => set('max_mca_payoff_amount', e.target.value)} placeholder="0" />
              </div>
            </div>
          </Section>

          {/* Location */}
          <Section title="Location">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Address</label>
                <input className="input w-full" value={form.address} onChange={e => set('address', e.target.value)} placeholder="1501 W 15th St" />
              </div>
              <div>
                <label className="label">Country</label>
                <select className="input w-full" value={form.country} onChange={e => set('country', e.target.value)}>
                  {COUNTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="label">State</label>
                <select className="input w-full" value={form.state} onChange={e => set('state', e.target.value)}>
                  <option value="">— Select State —</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">City</label>
                <input className="input w-full" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Davenport" />
              </div>
            </div>
          </Section>

          {/* Notes & Guidelines */}
          <Section title="Notes & Guidelines">
            <div className="space-y-4">
              <div>
                <label className="label">Lender Notes</label>
                <textarea className="input w-full resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Write notes..." />
              </div>
              <div>
                <label className="label">Upload Guidelines</label>
                <input className="input w-full" value={form.guideline_file} onChange={e => set('guideline_file', e.target.value)} placeholder="guidelines.pdf or URL" />
              </div>
            </div>
          </Section>

        </div>
      </div>

      {/* ── Bottom action bar ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!canSave || saveMutation.isPending}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
          {isEdit ? 'Save Changes' : 'Add Lender'}
        </button>
        <button onClick={() => navigate('/crm/lenders')} className="btn-outline">Cancel</button>
        {apiEnabled && !apiForm.base_url.trim() && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle size={12} /> Base URL is required when API is enabled
          </p>
        )}
      </div>

    </div>
  )
}
