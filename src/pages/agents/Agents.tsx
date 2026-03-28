import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { showConfirm } from '../../utils/confirmDelete'
import {
  Plus, Pencil, Trash2, KeyRound,
  Eye, EyeOff, CheckCircle2, XCircle, Mail, Phone,
  Shield, Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { RowActions } from '../../components/ui/RowActions'
import { agentService, type CreateAgentPayload, type UpdateAgentPayload } from '../../services/agent.service'
import { useServerTable } from '../../hooks/useServerTable'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Agent extends Record<string, unknown> {
  id: number
  first_name: string
  last_name: string
  email: string
  mobile?: string
  extension?: string
  status: number
  role: number
  role_name: string
  role_level: number
  created_at: string
}

interface RoleOption {
  id: number
  name: string
  level: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function agentInitials(a: Agent) {
  return ((a.first_name?.[0] ?? '') + (a.last_name?.[0] ?? '')).toUpperCase() || '?'
}

const BG_COLORS = ['bg-indigo-500','bg-violet-500','bg-sky-500','bg-emerald-500','bg-amber-500','bg-rose-500']
function avatarBg(id: number) { return BG_COLORS[id % BG_COLORS.length] }

function StatusBadge({ status, onClick, disabled }: { status: number; onClick?: () => void; disabled?: boolean }) {
  const clickable = !!onClick
  return status === 1
    ? (
      <span
        onClick={!disabled ? onClick : undefined}
        className={`badge badge-green flex items-center gap-1 ${clickable ? 'cursor-pointer hover:opacity-75 transition-opacity' : ''}`}
        title={clickable ? 'Click to deactivate' : undefined}
      >
        <CheckCircle2 size={11} /> Active
      </span>
    )
    : (
      <span
        onClick={!disabled ? onClick : undefined}
        className={`badge badge-red flex items-center gap-1 ${clickable ? 'cursor-pointer hover:opacity-75 transition-opacity' : ''}`}
        title={clickable ? 'Click to activate' : undefined}
      >
        <XCircle size={11} /> Inactive
      </span>
    )
}

function Spinner({ small = false }: { small?: boolean }) {
  const s = small ? 'w-3 h-3' : 'w-4 h-4'
  return (
    <svg className={`animate-spin ${s}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ─── Create / Edit modal ──────────────────────────────────────────────────────
interface AgentModalProps {
  open: boolean
  onClose: () => void
  editing?: Agent | null
  roles: RoleOption[]
}

function AgentModal({ open, onClose, editing, roles }: AgentModalProps) {
  const qc = useQueryClient()
  const isEdit = !!editing
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({
    first_name: editing?.first_name ?? '',
    last_name:  editing?.last_name  ?? '',
    email:      editing?.email      ?? '',
    mobile:     editing?.mobile     ?? '',
    role_id:    editing?.role       ?? (roles[0]?.id ?? 0),
    password:   '',
    password_confirmation: '',
    send_welcome_email: true,
    status: editing?.status ?? 1,
  })

  // Reset form whenever the modal opens or the target agent changes
  useEffect(() => {
    if (!open) return
    setForm({
      first_name: editing?.first_name ?? '',
      last_name:  editing?.last_name  ?? '',
      email:      editing?.email      ?? '',
      mobile:     editing?.mobile     ?? '',
      role_id:    editing?.role       ?? (roles[0]?.id ?? 0),
      password:   '',
      password_confirmation: '',
      send_welcome_email: true,
      status: editing?.status ?? 1,
    })
  }, [open, editing]) // eslint-disable-line react-hooks/exhaustive-deps

  const [saving, setSaving] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEdit && form.password !== form.password_confirmation) {
      toast.error('Passwords do not match'); return
    }
    setSaving(true)
    try {
      if (isEdit) {
        const payload: UpdateAgentPayload = {
          first_name: form.first_name,
          last_name:  form.last_name,
          mobile:     form.mobile || undefined,
          role_id:    Number(form.role_id),
          status:     Number(form.status) as 0 | 1,
        }
        await agentService.update(editing!.id, payload)
        toast.success('Agent updated')
      } else {
        const payload: CreateAgentPayload = {
          first_name: form.first_name,
          last_name:  form.last_name || undefined,
          email:      form.email,
          mobile:     form.mobile || undefined,
          password:   form.password,
          password_confirmation: form.password_confirmation,
          role_id:    Number(form.role_id),
          send_welcome_email: form.send_welcome_email,
        }
        await agentService.create(payload)
        toast.success('Agent created — credentials emailed')
      }
      qc.invalidateQueries({ queryKey: ['agents'] })
      onClose()
    } catch { /* interceptor */ } finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Users size={18} className="text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900">{isEdit ? 'Edit Agent' : 'Create New Agent'}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-light">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name *</label>
              <input className="input" placeholder="Jane" value={form.first_name}
                onChange={set('first_name')} required maxLength={100} />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" placeholder="Doe" value={form.last_name}
                onChange={set('last_name')} maxLength={100} />
            </div>
          </div>

          {!isEdit && (
            <div>
              <label className="label">Email Address *</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="email" className="input pl-9" placeholder="agent@company.com"
                  value={form.email} onChange={set('email')} required />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Mobile</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="tel" className="input pl-9" placeholder="5551234567"
                  value={form.mobile} onChange={set('mobile')} />
              </div>
            </div>
            <div>
              <label className="label">Role *</label>
              <select className="input" value={form.role_id} onChange={set('role_id')} required>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={set('status')}>
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </div>
          )}

          {!isEdit && (
            <>
              <div>
                <label className="label">Password *</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className="input pr-10"
                    placeholder="Min 8 characters"
                    value={form.password} onChange={set('password')} required minLength={8} />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm Password *</label>
                <input type="password" className="input"
                  placeholder="Re-enter password"
                  value={form.password_confirmation} onChange={set('password_confirmation')} required />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300"
                  checked={form.send_welcome_email}
                  onChange={e => setForm(f => ({ ...f, send_welcome_email: e.target.checked }))} />
                Send welcome email with login credentials
              </label>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 btn-outline h-10 rounded-xl text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 btn-primary h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
              {saving ? <><Spinner small /> Saving...</> : isEdit ? 'Save Changes' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Reset Password modal ─────────────────────────────────────────────────────
function ResetPasswordModal({ open, agent, onClose }: { open: boolean; agent: Agent | null; onClose: () => void }) {
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [notify, setNotify] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pass !== confirm) { toast.error('Passwords do not match'); return }
    if (!agent) return
    setSaving(true)
    try {
      await agentService.resetPassword(agent.id, pass, confirm, notify)
      toast.success('Password reset successfully')
      onClose()
    } catch { /* interceptor */ } finally { setSaving(false) }
  }

  if (!open || !agent) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <KeyRound size={18} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Reset Password</h3>
              <p className="text-xs text-slate-500">{agent.first_name} {agent.last_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-light">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">New Password *</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} className="input pr-10"
                placeholder="Min 8 characters" value={pass}
                onChange={e => setPass(e.target.value)} required minLength={8} />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirm Password *</label>
            <input type="password" className="input" placeholder="Re-enter" value={confirm}
              onChange={e => setConfirm(e.target.value)} required />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" className="rounded border-slate-300"
              checked={notify} onChange={e => setNotify(e.target.checked)} />
            Notify agent by email
          </label>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 btn-outline h-10 rounded-xl text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 btn-primary h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
              {saving ? <><Spinner small /> Saving...</> : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Status filter options ─────────────────────────────────────────────────────
const STATUS_FILTER = [
  { key: 'status', label: 'All Status', options: [
    { value: '1', label: 'Active' },
    { value: '0', label: 'Inactive' },
  ]},
]

// ─── Main page ────────────────────────────────────────────────────────────────
export function Agents() {
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 20 })

  const [modalOpen, setModalOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [resetAgent, setResetAgent] = useState<Agent | null>(null)

  const { data: rolesData } = useQuery<RoleOption[]>({
    queryKey: ['agent-roles'],
    queryFn: async () => {
      const res = await agentService.roles()
      return res.data?.data ?? res.data ?? []
    },
    staleTime: 60_000,
  })
  const roles = rolesData ?? []

  const toggleMutation = useMutation({
    mutationFn: (a: Agent) =>
      a.status === 1 ? agentService.deactivate(a.id) : agentService.activate(a.id),
    onSuccess: (_r, a) => {
      toast.success(a.status === 1 ? 'Agent deactivated' : 'Agent activated')
      qc.invalidateQueries({ queryKey: ['agents'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => agentService.deactivate(id),
    onSuccess: () => {
      toast.success('Agent removed')
      qc.invalidateQueries({ queryKey: ['agents'] })
    },
  })

  const openCreate = () => { setEditingAgent(null); setModalOpen(true) }
  const openEdit   = (a: Agent) => { setEditingAgent(a); setModalOpen(true) }

  const columns: Column<Agent>[] = [
    {
      key: 'first_name', header: 'Agent',
      render: (a) => (
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${avatarBg(a.id)} flex items-center justify-center flex-shrink-0`}>
            <span className="text-white text-xs font-bold">{agentInitials(a)}</span>
          </div>
          <div>
            <p className="font-medium text-slate-900 text-sm">{a.first_name} {a.last_name}</p>
            <p className="text-xs text-slate-500"># {a.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email', header: 'Contact',
      render: (a) => (
        <div>
          <p className="text-sm text-slate-700">{a.email}</p>
          {a.mobile && <p className="text-xs text-slate-500">{a.mobile}</p>}
        </div>
      ),
    },
    {
      key: 'extension', header: 'Extension',
      render: (a) => (
        <span className="badge badge-blue text-xs">{a.extension || '—'}</span>
      ),
    },
    {
      key: 'role_name', header: 'Role',
      render: (a) => (
        <div className="flex items-center gap-1.5">
          <Shield size={13} className="text-indigo-400" />
          <span className="text-sm text-slate-700">{a.role_name}</span>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (a) => (
        <StatusBadge
          status={a.status}
          onClick={() => toggleMutation.mutate(a)}
          disabled={toggleMutation.isPending}
        />
      ),
    },
    {
      key: 'created_at', header: 'Joined',
      render: (a) => (
        <span className="text-xs text-slate-500">
          {new Date(a.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions', header: 'Action',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (a) => (
        <RowActions actions={[
          {
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit',
            onClick: () => openEdit(a),
          },
          {
            label: 'Reset Password',
            icon: <KeyRound size={13} />,
            variant: 'default',
            onClick: () => setResetAgent(a),
          },
          {
            label: 'Remove',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: async () => {
              if (await showConfirm({ message: `Remove agent ${a.first_name}? This cannot be undone.`, confirmText: 'Yes, remove' })) deleteMutation.mutate(a.id)
            },
            disabled: deleteMutation.isPending,
          },
        ]} />
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agents</h1>
          <p className="page-subtitle">Manage your team members and their access levels</p>
        </div>
      </div>

      <ServerDataTable<Agent>
        queryKey={['agents']}
        queryFn={(params) => agentService.list({
          search: params.search || undefined,
          status: params.filters?.status !== '' && params.filters?.status !== undefined
            ? Number(params.filters.status)
            : undefined,
          start: (params.page - 1) * params.limit,
          limit: params.limit,
        })}
        dataExtractor={(res: unknown) => {
          const r = res as { data?: { data?: Agent[] } }
          return r?.data?.data ?? []
        }}
        totalExtractor={(res: unknown) => {
          const r = res as { data?: { total?: number } }
          return r?.data?.total ?? 0
        }}
        columns={columns}
        searchPlaceholder="Search by name, email, or extension…"
        emptyText="No agents found"
        emptyIcon={<Users size={40} />}
        filters={STATUS_FILTER}
        search={table.search} onSearchChange={table.setSearch}
        activeFilters={table.filters} onFilterChange={table.setFilter}
        onResetFilters={table.resetFilters} hasActiveFilters={table.hasActiveFilters}
        page={table.page} limit={table.limit} onPageChange={table.setPage}
        headerActions={
          <button onClick={openCreate} className="btn-primary">
            <Plus size={15} /> Add Agent
          </button>
        }
      />

      <AgentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editingAgent}
        roles={roles}
      />
      <ResetPasswordModal
        open={!!resetAgent}
        agent={resetAgent}
        onClose={() => setResetAgent(null)}
      />
    </div>
  )
}
