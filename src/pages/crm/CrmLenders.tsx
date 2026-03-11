import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Loader2, X, Check, Building2, Phone, Mail, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { RowActions } from '../../components/ui/RowActions'
import type { Lender, LenderApiCredentials } from '../../types/crm.types'
import { confirmDelete } from '../../utils/confirmDelete'

const LENDER_API_TYPES = [
  { value: 'ondeck',           label: 'OnDeck' },
  { value: 'credibly',         label: 'Credibly' },
  { value: 'cancapital',       label: 'CAN Capital' },
  { value: 'lendini',          label: 'Lendini' },
  { value: 'forward_financing',label: 'Forward Financing' },
  { value: 'bitty_advance',    label: 'Bitty Advance' },
  { value: 'fox_partner',      label: 'Fox Partner' },
  { value: 'specialty',        label: 'Specialty' },
  { value: 'biz2credit',       label: 'Biz2Credit' },
]

interface FormState {
  lender_name: string
  email: string
  secondary_email: string
  contact_person: string
  phone: string
  address: string
  city: string
  state: string
  industry: string
  notes: string
  // API integration
  api_status: string
  lender_api_type: string
  url: string
  username: string
  password: string
  api_key: string
  auth_url: string
  partner_api_key: string
  client_id: string
  salesRepEmailAddress: string
}

const EMPTY_FORM: FormState = {
  lender_name: '', email: '', secondary_email: '', contact_person: '',
  phone: '', address: '', city: '', state: '', industry: '', notes: '',
  api_status: '0', lender_api_type: '', url: '', username: '', password: '',
  api_key: '', auth_url: '', partner_api_key: '', client_id: '', salesRepEmailAddress: '',
}

function LenderModal({
  editing,
  onClose,
  onSaved,
}: {
  editing?: Lender | null
  onClose: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!editing
  const [form, setForm] = useState<FormState>(
    editing
      ? {
          lender_name:         editing.lender_name,
          email:               editing.email,
          secondary_email:     editing.secondary_email ?? '',
          contact_person:      editing.contact_person ?? '',
          phone:               editing.phone ?? '',
          address:             editing.address ?? '',
          city:                editing.city ?? '',
          state:               editing.state ?? '',
          industry:            editing.industry ?? '',
          notes:               editing.notes ?? '',
          api_status:          String(editing.api_status ?? '0'),
          lender_api_type:     editing.lender_api_type ?? '',
          url: '', username: '', password: '', api_key: '',
          auth_url: '', partner_api_key: '', client_id: '', salesRepEmailAddress: '',
        }
      : EMPTY_FORM
  )

  // Load existing API credentials when editing a lender that has api_status=1
  const { data: apiCreds } = useQuery({
    queryKey: ['lender-api-creds', editing?.id],
    queryFn: async () => {
      const res = await crmService.getLenderApiCredentials(editing!.id)
      return (res.data?.data ?? res.data) as LenderApiCredentials | null
    },
    enabled: isEdit && String(editing?.api_status) === '1',
  })

  useEffect(() => {
    if (apiCreds) {
      setForm(f => ({
        ...f,
        lender_api_type:      apiCreds.type ?? f.lender_api_type,
        url:                  apiCreds.url ?? '',
        username:             apiCreds.username ?? '',
        password:             apiCreds.password ?? '',
        api_key:              apiCreds.api_key ?? '',
        auth_url:             apiCreds.auth_url ?? '',
        partner_api_key:      apiCreds.partner_api_key ?? '',
        client_id:            apiCreds.client_id ?? '',
        salesRepEmailAddress: apiCreds.sales_rep_email ?? '',
      }))
    }
  }, [apiCreds])

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))
  const apiEnabled = form.api_status === '1'

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? crmService.updateLender(editing!.id, form as unknown as Record<string, unknown>)
        : crmService.createLender(form as unknown as Record<string, unknown>),
    onSuccess: () => {
      toast.success(isEdit ? 'Lender updated' : 'Lender created')
      qc.invalidateQueries({ queryKey: ['lenders'] })
      onSaved()
    },
    onError: () => toast.error('Failed to save lender'),
  })

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? 'Edit Lender' : 'Add Lender'}
          </h2>
          <button onClick={onClose} className="action-btn"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Basic Info ─────────────────────────────────────────── */}
          <div>
            <p className="section-label mb-3">Basic Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Lender Name <span className="text-red-500">*</span></label>
                <input className="input w-full" value={form.lender_name} onChange={e => set('lender_name', e.target.value)} placeholder="e.g. ABC Capital" />
              </div>
              <div>
                <label className="label">Primary Email <span className="text-red-500">*</span></label>
                <input className="input w-full" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="lender@example.com" />
              </div>
              <div>
                <label className="label">Secondary Email</label>
                <input className="input w-full" type="email" value={form.secondary_email} onChange={e => set('secondary_email', e.target.value)} placeholder="cc@example.com" />
              </div>
              <div>
                <label className="label">Contact Person</label>
                <input className="input w-full" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="John Smith" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input w-full" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="label">Industry</label>
                <input className="input w-full" value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="Merchant Cash Advance" />
              </div>
              <div>
                <label className="label">City</label>
                <input className="input w-full" value={form.city} onChange={e => set('city', e.target.value)} placeholder="New York" />
              </div>
              <div>
                <label className="label">State</label>
                <input className="input w-full" value={form.state} onChange={e => set('state', e.target.value)} placeholder="NY" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Notes</label>
                <textarea className="input w-full resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." />
              </div>
            </div>
          </div>

          {/* ── API Integration ────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-indigo-500" />
                <span className="text-sm font-semibold text-slate-800">API Integration</span>
                {apiEnabled && (
                  <span className="badge badge-indigo text-[10px]">Enabled</span>
                )}
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

            {apiEnabled && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Lender API Type <span className="text-red-500">*</span></label>
                  <select className="input w-full" value={form.lender_api_type} onChange={e => set('lender_api_type', e.target.value)}>
                    <option value="">— Select integration —</option>
                    {LENDER_API_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">API Endpoint URL</label>
                  <input className="input w-full font-mono text-xs" value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://api.lender.com/v1/" />
                </div>
                <div>
                  <label className="label">Username</label>
                  <input className="input w-full" value={form.username} onChange={e => set('username', e.target.value)} placeholder="API username" />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input className="input w-full" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="API password" />
                </div>
                <div>
                  <label className="label">API Key</label>
                  <input className="input w-full font-mono text-xs" value={form.api_key} onChange={e => set('api_key', e.target.value)} placeholder="API key or token" />
                </div>
                <div>
                  <label className="label">Partner API Key</label>
                  <input className="input w-full font-mono text-xs" value={form.partner_api_key} onChange={e => set('partner_api_key', e.target.value)} placeholder="Partner key (if required)" />
                </div>
                <div>
                  <label className="label">Auth URL</label>
                  <input className="input w-full font-mono text-xs" value={form.auth_url} onChange={e => set('auth_url', e.target.value)} placeholder="https://auth.lender.com/token" />
                </div>
                <div>
                  <label className="label">Client ID</label>
                  <input className="input w-full" value={form.client_id} onChange={e => set('client_id', e.target.value)} placeholder="OAuth client ID" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Sales Rep Email</label>
                  <input className="input w-full" type="email" value={form.salesRepEmailAddress} onChange={e => set('salesRepEmailAddress', e.target.value)} placeholder="sales@lender.com" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!form.lender_name || !form.email || (apiEnabled && !form.lender_api_type) || saveMutation.isPending}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Lender'}
          </button>
          <button onClick={onClose} className="btn-outline">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export function CrmLenders() {
  const qc = useQueryClient()
  const { setDescription, setActions } = useCrmHeader()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Lender | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['lenders', page],
    queryFn: async () => {
      const res = await crmService.getLenders({ page, per_page: 25 })
      return res.data
    },
    staleTime: 30 * 1000,
  })

  const lenders: Lender[] = data?.data?.data ?? data?.data ?? data?.records ?? data ?? []
  const total: number = data?.data?.total ?? data?.total ?? 0
  const totalPages = data?.data?.last_page ?? data?.last_page ?? (Math.ceil(total / 25) || 1)

  useEffect(() => {
    setDescription(isLoading ? 'Loading...' : `${total.toLocaleString()} lenders`)
    setActions(
      <button
        onClick={() => { setEditing(null); setShowModal(true) }}
        className="btn-primary flex items-center gap-2"
      >
        <Plus size={15} /> Add Lender
      </button>
    )
    return () => { setDescription(undefined); setActions(undefined) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, total])

  const toggleMutation = useMutation({
    mutationFn: (l: Lender) => crmService.toggleLender(l.id, Number(l.status) === 1 ? 0 : 1),
    onSuccess: () => { toast.success('Lender updated'); qc.invalidateQueries({ queryKey: ['lenders'] }) },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteLender(id),
    onSuccess: () => { toast.success('Lender deleted'); qc.invalidateQueries({ queryKey: ['lenders'] }) },
    onError: () => toast.error('Failed to delete'),
  })

  return (
    <div className="space-y-5">

      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {['Lender', 'Contact', 'Industry', 'Location', 'API', 'Status', 'Action'].map(h => (
                  <th key={h} className={h === 'Action' ? 'text-right' : ''}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="py-12"><div className="flex justify-center"><Loader2 size={20} className="animate-spin text-indigo-500" /></div></td></tr>
              ) : lenders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <div className="text-center">
                      <Building2 size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-sm text-slate-400">No lenders added yet</p>
                    </div>
                  </td>
                </tr>
              ) : lenders.map(l => {
                const apiType = LENDER_API_TYPES.find(t => t.value === l.lender_api_type)
                return (
                  <tr key={l.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50">
                          <Building2 size={15} className="text-indigo-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{l.lender_name}</p>
                          {l.email && (
                            <p className="text-xs flex items-center gap-1 mt-0.5 text-slate-400">
                              <Mail size={10} /> {l.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {l.contact_person && <p className="text-sm text-slate-700">{l.contact_person}</p>}
                      {l.phone && (
                        <p className="text-xs flex items-center gap-1 mt-0.5 text-slate-400">
                          <Phone size={10} /> {l.phone}
                        </p>
                      )}
                    </td>
                    <td className="text-slate-500">{l.industry || '—'}</td>
                    <td className="text-slate-500">
                      {[l.city, l.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td>
                      {String(l.api_status) === '1' && apiType ? (
                        <span className="badge badge-indigo flex items-center gap-1 w-fit">
                          <Zap size={10} /> {apiType.label}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleMutation.mutate(l)}
                        className={Number(l.status) === 1
                          ? 'badge badge-green hover:opacity-80 transition-opacity'
                          : 'badge badge-gray hover:opacity-80 transition-opacity'
                        }
                      >
                        {Number(l.status) === 1 ? <><Check size={10} /> Active</> : 'Inactive'}
                      </button>
                    </td>
                    <td className="w-px whitespace-nowrap">
                      <RowActions actions={[
                        {
                          label: 'Edit',
                          icon: <Pencil size={13} />,
                          variant: 'edit',
                          onClick: () => { setEditing(l); setShowModal(true) },
                        },
                        {
                          label: 'Delete',
                          icon: <Trash2 size={13} />,
                          variant: 'delete',
                          onClick: async () => { if (await confirmDelete(l.lender_name)) deleteMutation.mutate(l.id) },
                          disabled: deleteMutation.isPending,
                        },
                      ]} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination-bar">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="pagination-btn">Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="pagination-btn">Next</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <LenderModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
