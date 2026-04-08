import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, UserCircle, Eye, X, Search,
  Phone, Globe, Users as UsersIcon, Settings, Hash,
  PhoneForwarded, Shield, Mail, Lock, KeyRound,
  CheckCircle2, XCircle, Smartphone,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { userService } from '../../services/user.service'
import { useAuthStore } from '../../stores/auth.store'
import { LEVELS } from '../../utils/permissions'
import { initials } from '../../utils/format'
import { getTimezoneLabel } from '../../constants/timezones'
import { useServerTable } from '../../hooks/useServerTable'
import { cn } from '../../utils/cn'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'
import { useDialerHeader } from '../../layouts/DialerLayout'
import { ChangePasswordModal } from './ChangePasswordModal'

interface Agent {
  id: number
  first_name?: string
  last_name?: string
  email: string
  extension?: string
  user_level?: number
  level?: number
  status?: number
  role_name?: string
  [key: string]: unknown
}

const capFirst = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

const levelLabel = (level?: number) => {
  if (!level) return 'Agent'
  if (level >= 11) return 'System Administrator'
  if (level >= 9) return 'Super Admin'
  if (level >= 7) return 'Admin'
  if (level >= 5) return 'Manager'
  if (level >= 3) return 'Associate'
  return 'Agent'
}

const ROLE_COLORS: Record<string, string> = {
  'System Administrator': 'from-red-500 to-rose-600',
  'Super Admin': 'from-violet-500 to-purple-600',
  'Admin': 'from-indigo-500 to-blue-600',
  'Manager': 'from-sky-500 to-cyan-600',
  'Associate': 'from-teal-500 to-emerald-600',
  'Agent': 'from-slate-400 to-slate-500',
}

const STATUS_FILTERS = [
  { value: '1', label: 'Active' },
  { value: '0', label: 'Inactive' },
]

// ---------------------------------------------------------------------------
// ViewUserModal — Campaign-style compact layout
// ---------------------------------------------------------------------------
function VSection({ icon: Icon, title, iconColor, children }: {
  icon: React.ElementType; title: string; iconColor: string; children: React.ReactNode
}) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/70 border-b border-slate-100">
        <Icon size={14} className={iconColor} />
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  )
}

function VRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 gap-4">
      <span className="text-xs text-slate-500 font-medium flex-shrink-0">{label}</span>
      <span className="text-xs text-right font-semibold text-slate-800 truncate">{value ?? '—'}</span>
    </div>
  )
}

function VToggle({ val, label }: { val?: unknown; label: string }) {
  const on = val === 1 || val === '1' || val === true
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', on ? 'text-emerald-600' : 'text-slate-400')}>
        {on ? <><CheckCircle2 size={13} className="text-emerald-500" /> On</> : <><XCircle size={13} className="text-slate-300" /> Off</>}
      </span>
    </div>
  )
}

function formatPhone(raw?: string) {
  if (!raw) return '—'
  const d = String(raw).replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

function ViewUserModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-view', userId],
    queryFn: () => userService.getById(userId),
  })

  const { data: groupsData } = useQuery({
    queryKey: ['extension-groups-view'],
    queryFn: () => userService.getGroups(),
  })

  const u = data?.data?.data as Record<string, unknown> | undefined

  const fullName = u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || (u.email as string) : ''
  const lvl = u ? Number(u.user_level || u.level || 1) : 1
  const roleLabel = levelLabel(lvl)
  const active = u?.status === 1

  const cliLabel = (v?: unknown) => {
    const n = Number(v)
    if (n === 1) return 'Custom'
    if (n === 2) return 'Area Code + Randomizer'
    return 'Area Code'
  }

  const countryCode = u ? (() => {
    const raw = String(u.country_code || '1')
    return raw.startsWith('+') ? raw : '+' + raw
  })() : '+1'

  // Resolve group name from groups list using group_id
  const groupName = (() => {
    const groups: Array<{id:number;title?:string;group_name?:string}> = groupsData?.data?.data || groupsData?.data || []
    const gIds = Array.isArray(u?.group) ? (u.group as Array<{group_id:number}>).map(g => Number(g.group_id)) : Array.isArray(u?.group_id) ? (u?.group_id as number[]) : (u?.group_id ? [Number(u?.group_id)] : [])
    if (gIds.length === 0) return '—'
    const names = gIds.map(gid => {
      const g = groups.find(gr => gr.id === gid)
      return g ? (g.title || g.group_name || `Group ${g.id}`) : `Group ${gid}`
    })
    return names.join(', ')
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* ── Blue Header Banner (compact, campaign-style) ── */}
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 relative overflow-hidden flex-shrink-0">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute top-6 -right-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

          <button onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white">
            <X size={16} />
          </button>

          <div className="relative px-5 pt-4 pb-3">
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 animate-pulse" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-white/30 rounded animate-pulse w-36" />
                  <div className="h-3 bg-white/20 rounded animate-pulse w-48" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {initials(fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-white truncate leading-tight">{fullName}</h2>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white border border-white/25">
                        {roleLabel}
                      </span>
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                        active
                          ? 'bg-emerald-400/20 border-emerald-300/40 text-emerald-100'
                          : 'bg-white/10 border-white/20 text-white/60'
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-emerald-300' : 'bg-white/40')} />
                        {active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats strip */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/15 flex-wrap">
                  {[
                    { icon: Hash, val: String(u?.extension ?? '—'), lbl: 'Extension' },
                    { icon: UsersIcon, val: String(groupName), lbl: 'Group' },

                    { icon: Lock, val: u?.vm_pin ? String(u.vm_pin) : '—', lbl: 'VM PIN' },
                    { icon: Settings, val: cliLabel(u?.cli_setting), lbl: 'CLI' },
                    { icon: Phone, val: countryCode, lbl: 'Code' },
                  ].map(({ icon: SIcon, val, lbl }) => (
                    <div key={lbl} className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5">
                      <SIcon size={11} className="text-white/60" />
                      <span className="text-[11px] font-bold text-white leading-none">{val}</span>
                      <span className="text-[9px] text-white/50 font-medium leading-none">{lbl}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${55 + (i % 4) * 12}%` }} />
              ))}
            </div>
          ) : u ? (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Contact Info */}
              <VSection icon={Mail} title="Contact Info" iconColor="text-indigo-500">
                <VRow label="Email" value={u.email as string} />
                <VRow label="Phone" value={formatPhone(u.mobile as string)} />
                <VRow label="Timezone" value={getTimezoneLabel(u?.timezone as string)} />
              </VSection>

              {/* Call Settings */}
              <VSection icon={PhoneForwarded} title="Call Settings" iconColor="text-emerald-500">
                <VToggle val={u.voicemail}     label="Voicemail" />
                <VToggle val={u.follow_me}     label="Follow Me" />
                <VToggle val={u.call_forward}  label="Call Forward" />
                <VToggle val={u.twinning}      label="Twinning" />
              </VSection>

              {/* Security */}
              <VSection icon={Shield} title="Security" iconColor="text-violet-500">
                <VToggle val={u.ip_filtering}  label="IP Filtering" />
                <VToggle val={u.enable_2fa}    label="2FA" />
                <VToggle val={u.app_status}    label="Mobile App" />
              </VSection>

            </div>
          ) : (
            <div className="p-10 text-center text-slate-400 text-sm">No data available</div>
          )}
        </div>

      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Users list page
// ---------------------------------------------------------------------------
export function Users() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const authUser = useAuthStore(s => s.user)
  const authLevel = authUser?.level ?? 0
  const isAgentRole = authLevel < LEVELS.MANAGER
  const table = useServerTable({ defaultLimit: 15 })
  const [viewUser, setViewUser] = useState<Agent | null>(null)
  const [pwUser, setPwUser] = useState<Agent | null>(null)
  const { setToolbar } = useDialerHeader()

  useEffect(() => {
    setToolbar(
      <>
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input type="text" value={table.search} placeholder="Search users…" onChange={e => table.setSearch(e.target.value)} />
          {table.search && (
            <button onClick={() => table.setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={12} />
            </button>
          )}
        </div>
        {!isAgentRole && (
          <>
            <div className="lt-divider" />
            <div className="lt-right">
              <button onClick={() => navigate('/users/create')} className="lt-b lt-p">
                <Plus size={13} /> Add User
              </button>
            </div>
          </>
        )}
      </>
    )
    return () => setToolbar(undefined)
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: number }) =>
      userService.toggleStatus(id, status === 1 ? 0 : 1),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user'] })
      qc.invalidateQueries({ queryKey: ['user-view'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const deleteMutation = useMutation({
    // POST /edit-extension with is_deleted=1 — soft-delete by primary DB id.
    // No easify_user_uuid needed; works for all users.
    mutationFn: (id: number) => userService.delete(id),
    onSuccess: (res) => {
      const data = (res as { data?: { success?: boolean | string; message?: string } })?.data
      if (data?.success === false || data?.success === 'false') {
        toast.error(data.message || 'Failed to delete user')
        return
      }
      toast.success('User deleted')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      const interceptorHandled = status && (status === 401 || status === 403 || status === 422 || status >= 500)
      if (!interceptorHandled) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        toast.error(msg || 'Failed to delete user')
      }
    },
  })

  const columns: Column<Agent>[] = [
    {
      key: 'name', header: 'User', sortable: true,
      sortValue: (row) => [row.first_name, row.last_name].filter(Boolean).join(' ').toLowerCase() || String(row.email).toLowerCase(),
      render: (row) => {
        const name = [row.first_name, row.last_name].filter(Boolean).map(n => capFirst(String(n))).join(' ') || row.email
        const lvl = (row.user_level || row.level || 1) as number
        const label = levelLabel(lvl)
        const gradient = ROLE_COLORS[label] ?? 'from-slate-400 to-slate-500'
        const canDrillDown = (authUser?.level ?? 0) >= LEVELS.SYSTEM_ADMIN
        return (
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-xl bg-gradient-to-br text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm',
              gradient
            )}>
              {initials(name)}
            </div>
            <div>
              {canDrillDown ? (
                <button onClick={() => navigate(`/users/${row.id}/details`)}
                  className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left">
                  {name}
                </button>
              ) : (
                <p className="text-sm font-semibold text-slate-900">{name}</p>
              )}
              <p className="text-xs text-slate-400">{row.email}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'extension', header: 'Extension',
      render: (row) => (
        <code className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
          {row.extension || '—'}
        </code>
      ),
    },
    ...(!isAgentRole ? [{
      key: 'role' as const, header: 'Role',
      render: (row: Agent) => {
        const lvl = (row.user_level || row.level || 1) as number
        const variant = lvl >= 7 ? 'blue' as const : lvl >= 5 ? 'purple' as const : 'gray' as const
        return <Badge variant={variant}>{levelLabel(lvl)}</Badge>
      },
    }] : []),
    {
      key: 'status', header: 'Status',
      render: (row) => (
        <button
          onClick={() => toggleMutation.mutate({ id: row.id, status: row.status ?? 0 })}
          disabled={toggleMutation.isPending}
          title={row.status === 1 ? 'Click to deactivate' : 'Click to activate'}
          className="cursor-pointer hover:opacity-75 transition-opacity"
        >
          <Badge variant={row.status === 1 ? 'green' : 'gray'}>
            {row.status === 1 ? 'Active' : 'Inactive'}
          </Badge>
        </button>
      ),
    },
    {
      key: 'actions', header: 'Action',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (row) => {
        const isSelf = authUser?.id === row.id
        return (
        <RowActions actions={[
          {
            label: 'View',
            icon: <Eye size={13} />,
            variant: 'default' as const,
            onClick: () => setViewUser(row),
          },
          {
            label: 'Change Password',
            icon: <KeyRound size={13} />,
            variant: 'warning' as const,
            onClick: () => setPwUser(row),
            hidden: !((authUser?.level ?? 0) >= LEVELS.ADMIN || isSelf),
          },
          {
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit' as const,
            onClick: () => navigate(`/users/${row.id}/edit`),
            hidden: isAgentRole && !isSelf,
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete' as const,
            onClick: async () => { if (await confirmDelete()) deleteMutation.mutate(row.id) },
            disabled: deleteMutation.isPending || (isAgentRole && isSelf),
            hidden: isAgentRole,
          },
        ]} />
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <ServerDataTable<Agent>
        queryKey={['users']}
        queryFn={(params) => userService.list(params)}
        dataExtractor={(res: unknown) => {
          const r = res as { data?: { data?: Agent[] } }
          return r?.data?.data ?? []
        }}
        totalExtractor={(res: unknown) => {
          const r = res as { data?: { total_rows?: number } }
          return r?.data?.total_rows ?? 0
        }}
        columns={columns}
        searchPlaceholder="Search by name, email, extension…"
        filters={[
          { key: 'status', label: 'All Status', options: STATUS_FILTERS },
        ]}
        emptyText="No users found"
        emptyIcon={<UserCircle size={40} />}
        search={table.search}
        onSearchChange={table.setSearch}
        activeFilters={table.filters}
        onFilterChange={table.setFilter}
        onResetFilters={table.resetFilters}
        hasActiveFilters={table.hasActiveFilters}
        page={table.page}
        limit={table.limit}
        onPageChange={table.setPage}
        hideToolbar
      />

      {viewUser && (
        <ViewUserModal
          userId={viewUser.id}
          onClose={() => setViewUser(null)}
        />
      )}

      {pwUser && (
        <ChangePasswordModal
          userId={pwUser.id}
          userName={[pwUser.first_name, pwUser.last_name].filter(Boolean).join(' ') || pwUser.email}
          isSelf={authUser?.id === pwUser.id}
          onClose={() => setPwUser(null)}
        />
      )}
    </div>
  )
}
