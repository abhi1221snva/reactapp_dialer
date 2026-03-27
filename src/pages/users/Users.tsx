import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, UserCircle, Eye, X,
  Phone, Mail, Globe, Monitor, Clock, Voicemail,
  PhoneForwarded, Shield, MessageSquare, Settings,
  CheckCircle2, XCircle, Hash,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { userService } from '../../services/user.service'
import { initials } from '../../utils/format'
import { useServerTable } from '../../hooks/useServerTable'
import { cn } from '../../utils/cn'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'

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

const levelLabel = (level?: number) => {
  if (!level) return 'Agent'
  if (level >= 10) return 'Super Admin'
  if (level >= 7) return 'Admin'
  if (level >= 5) return 'Manager'
  return 'Agent'
}

const ROLE_COLORS: Record<string, string> = {
  'Super Admin': 'from-violet-500 to-purple-600',
  'Admin': 'from-indigo-500 to-blue-600',
  'Manager': 'from-sky-500 to-cyan-600',
  'Agent': 'from-slate-400 to-slate-500',
}

const STATUS_FILTERS = [
  { value: '1', label: 'Active' },
  { value: '0', label: 'Inactive' },
]

// ---------------------------------------------------------------------------
// ViewUserModal — redesigned
// ---------------------------------------------------------------------------
const ROLE_BG_GRADIENT: Record<string, string> = {
  'Super Admin': 'from-violet-600 to-purple-700',
  'Admin':       'from-indigo-500 to-blue-600',
  'Manager':     'from-sky-500 to-cyan-600',
  'Agent':       'from-slate-500 to-slate-600',
}

function OnOff({ val, label }: { val?: unknown; label: string }) {
  const on = val === 1 || val === '1' || val === true
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold',
        on ? 'text-emerald-600' : 'text-slate-400'
      )}>
        {on
          ? <><CheckCircle2 size={13} className="text-emerald-500" /> Enabled</>
          : <><XCircle size={13} className="text-slate-300" /> Disabled</>
        }
      </span>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-slate-400 flex-shrink-0">{icon}</span>
      <span className="text-xs text-slate-400 w-28 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-800 font-medium truncate flex-1">
        {value ?? <span className="text-slate-300 font-normal">—</span>}
      </span>
    </div>
  )
}

function ViewUserModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-view', userId],
    queryFn: () => userService.getById(userId),
  })

  const u = data?.data?.data as Record<string, unknown> | undefined

  const fullName = u
    ? [u.first_name, u.last_name].filter(Boolean).join(' ') || (u.email as string)
    : ''

  const lvl   = u ? Number(u.user_level || u.level || 1) : 1
  const label = levelLabel(lvl)
  const bgGrad = ROLE_BG_GRADIENT[label] ?? 'from-slate-500 to-slate-600'
  const avatarGrad = ROLE_COLORS[label] ?? 'from-slate-400 to-slate-500'

  const cliLabel = (v?: unknown) => {
    const n = Number(v)
    if (n === 1) return 'Custom'
    if (n === 2) return 'Area Code + Randomizer'
    return 'Area Code'
  }

  const isActive = u?.status === 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Hero Banner ── */}
        <div className={cn('bg-gradient-to-br relative overflow-hidden flex-shrink-0', bgGrad)}>
          {/* decorative circles */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute top-6 -right-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

          {/* close btn */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            <X size={16} />
          </button>

          <div className="relative px-6 pt-6 pb-5">
            {isLoading ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 bg-white/30 rounded animate-pulse w-36" />
                  <div className="h-3.5 bg-white/20 rounded animate-pulse w-48" />
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-4">
                {/* Avatar */}
                <div className={cn(
                  'w-16 h-16 rounded-2xl bg-gradient-to-br border-2 border-white/30',
                  'text-white text-xl font-bold flex items-center justify-center flex-shrink-0 shadow-lg',
                  avatarGrad
                )}>
                  {initials(fullName)}
                </div>

                {/* Name + email + badges */}
                <div className="flex-1 min-w-0 pb-0.5">
                  <h2 className="text-xl font-bold text-white truncate leading-tight">{fullName}</h2>
                  <p className="text-white/70 text-sm truncate mt-0.5">{u?.email as string}</p>
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/25">
                      {label}
                    </span>
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border',
                      isActive
                        ? 'bg-emerald-400/20 border-emerald-300/40 text-emerald-100'
                        : 'bg-white/10 border-white/20 text-white/60'
                    )}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', isActive ? 'bg-emerald-300' : 'bg-white/40')} />
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stat chips strip */}
          {!isLoading && u && (
            <div className="flex items-stretch divide-x divide-white/20 border-t border-white/20 bg-black/10">
              {[
                { icon: <Hash size={12} />, label: 'Extension', value: u.extension as string },
                { icon: <Monitor size={12} />, label: 'Dialer Mode', value: (u.dialer_mode as string || '—') },
                { icon: <Clock size={12} />, label: 'Timezone', value: (u.timezone as string || '—') },
              ].map(chip => (
                <div key={chip.label} className="flex-1 px-4 py-3 flex items-center gap-2">
                  <span className="text-white/50">{chip.icon}</span>
                  <div>
                    <p className="text-white/50 text-[10px] uppercase tracking-wider leading-none">{chip.label}</p>
                    <p className="text-white text-xs font-semibold mt-0.5 truncate">{chip.value || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        {isLoading ? (
          <div className="p-6 space-y-3 overflow-y-auto">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${55 + (i % 4) * 12}%` }} />
            ))}
          </div>
        ) : u ? (
          <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Personal Info */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Globe size={12} className="text-indigo-600" />
                </div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Personal Info</p>
              </div>
              <div>
                <InfoRow icon={<Mail size={13} />}    label="Email"        value={u.email as string} />
                <InfoRow icon={<Phone size={13} />}   label="Phone"        value={u.mobile as string} />
                <InfoRow icon={<Globe size={13} />}   label="Country Code" value={u.country_code as string} />
                <InfoRow
                  icon={<Hash size={13} />}
                  label="Extension"
                  value={
                    u.extension
                      ? <code className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-xs">{u.extension as string}</code>
                      : undefined
                  }
                />
              </div>
            </div>

            {/* Phone System */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-sky-100 flex items-center justify-center">
                  <Phone size={12} className="text-sky-600" />
                </div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone System</p>
              </div>
              <div>
                <InfoRow icon={<Monitor size={13} />}  label="Extension Type" value={u.extension_type as string} />
                <InfoRow icon={<Monitor size={13} />}  label="Dialer Mode"    value={u.dialer_mode as string} />
                <InfoRow icon={<Clock size={13} />}    label="Timezone"       value={u.timezone as string} />
                <InfoRow icon={<Settings size={13} />} label="CLI Setting"    value={cliLabel(u.cli_setting)} />
              </div>
            </div>

            {/* Call & Voicemail */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                  <PhoneForwarded size={12} className="text-violet-600" />
                </div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Call & Voicemail</p>
              </div>
              <div>
                <OnOff val={u.voicemail}    label="Voicemail" />
                <OnOff val={u.voicemail_send_to_email} label="Voicemail to Email" />
                <OnOff val={u.follow_me}    label="Follow Me" />
                <OnOff val={u.call_forward} label="Call Forward" />
                <OnOff val={u.twinning}     label="Twinning" />
              </div>
            </div>

            {/* Security & Messaging */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center">
                  <Shield size={12} className="text-rose-600" />
                </div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Security & Messaging</p>
              </div>
              <div>
                <OnOff val={u.enable_2fa}          label="2FA Enabled" />
                <OnOff val={u.app_status}           label="Mobile App Login" />
                <OnOff val={u.ip_filtering}         label="IP Filtering" />
                <OnOff val={u.receive_sms_on_email} label="SMS to Email" />
                <OnOff val={u.receive_sms_on_mobile} label="SMS to Phone" />
              </div>
            </div>

          </div>
        ) : (
          <div className="p-10 text-center text-slate-400 text-sm">No data available</div>
        )}

        {/* ── Footer ── */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex justify-end">
          <button onClick={onClose} className="btn-outline text-sm px-5">Close</button>
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
  const table = useServerTable({ defaultLimit: 15 })
  const [viewUser, setViewUser] = useState<Agent | null>(null)

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
      key: 'name', header: 'User',
      render: (row) => {
        const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email
        const lvl = (row.user_level || row.level || 1) as number
        const label = levelLabel(lvl)
        const gradient = ROLE_COLORS[label] ?? 'from-slate-400 to-slate-500'
        return (
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-xl bg-gradient-to-br text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm',
              gradient
            )}>
              {initials(name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{name}</p>
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
    {
      key: 'role', header: 'Role',
      render: (row) => {
        const lvl = (row.user_level || row.level || 1) as number
        const variant = lvl >= 7 ? 'blue' as const : lvl >= 5 ? 'purple' as const : 'gray' as const
        return <Badge variant={variant}>{levelLabel(lvl)}</Badge>
      },
    },
    {
      key: 'status', header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 1 ? 'green' : 'gray'}>
          {row.status === 1 ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions', header: 'Action',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (row) => (
        <RowActions actions={[
          {
            label: 'View',
            icon: <Eye size={13} />,
            variant: 'default' as const,
            onClick: () => setViewUser(row),
          },
          {
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit' as const,
            onClick: () => navigate(`/users/${row.id}/edit`),
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete' as const,
            onClick: async () => { if (await confirmDelete()) deleteMutation.mutate(row.id) },
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
          <h1 className="page-title">Users & Agents</h1>
          <p className="page-subtitle">Manage team members and their access levels</p>
        </div>
      </div>

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
        headerActions={
          <button onClick={() => navigate('/users/create')} className="btn-primary">
            <Plus size={15} /> Add User
          </button>
        }
      />

      {viewUser && (
        <ViewUserModal
          userId={viewUser.id}
          onClose={() => setViewUser(null)}
        />
      )}
    </div>
  )
}
