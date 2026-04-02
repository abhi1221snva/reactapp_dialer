import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, UserCircle, Eye, X,
  Phone, Globe,
  PhoneForwarded, Shield,
  CheckCircle2, XCircle,
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
function OnOff({ val, label }: { val?: unknown; label: string }) {
  const on = val === 1 || val === '1' || val === true
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
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

function ViewSectionCard({ icon: Icon, title, iconColor, children }: {
  icon: React.ElementType; title: string; iconColor: string; children: React.ReactNode
}) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/70 border-b border-slate-100">
        <Icon size={14} className={iconColor} />
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-4 py-1">
        {children}
      </div>
    </div>
  )
}

function ViewDetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-100 last:border-0 gap-4">
      <span className="text-xs text-slate-500 font-medium flex-shrink-0">{label}</span>
      <span className="text-xs text-right font-semibold text-slate-800">{value ?? '—'}</span>
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

        {/* ── Blue Header Banner ── */}
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 relative overflow-hidden flex-shrink-0">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute top-6 -right-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            <X size={16} />
          </button>

          <div className="relative px-6 pt-6 pb-5">
            {isLoading ? (
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 bg-white/30 rounded animate-pulse w-36" />
                  <div className="h-3.5 bg-white/20 rounded animate-pulse w-48" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 border-2 border-white/30 text-white text-xl font-bold flex items-center justify-center flex-shrink-0 shadow-lg">
                  {initials(fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-white truncate leading-tight">{fullName}</h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
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
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${55 + (i % 4) * 12}%` }} />
              ))}
            </div>
          ) : u ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Personal Info */}
              <ViewSectionCard icon={Globe} title="Personal Info" iconColor="text-indigo-500">
                <ViewDetailRow label="Email" value={u.email as string} />
                <ViewDetailRow label="Phone" value={u.mobile as string} />
                <ViewDetailRow label="Country Code" value={u.country_code as string} />
                <ViewDetailRow
                  label="Extension"
                  value={
                    u.extension
                      ? <code className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-xs">{u.extension as string}</code>
                      : undefined
                  }
                />
              </ViewSectionCard>

              {/* Phone System */}
              <ViewSectionCard icon={Phone} title="Phone System" iconColor="text-sky-500">
                <ViewDetailRow label="Extension Type" value={u.extension_type as string} />
                <ViewDetailRow label="Dialer Mode" value={u.dialer_mode as string} />
                <ViewDetailRow label="Timezone" value={u.timezone as string} />
                <ViewDetailRow label="CLI Setting" value={cliLabel(u.cli_setting)} />
              </ViewSectionCard>

              {/* Call & Voicemail */}
              <ViewSectionCard icon={PhoneForwarded} title="Call & Voicemail" iconColor="text-emerald-500">
                <OnOff val={u.voicemail}    label="Voicemail" />
                <OnOff val={u.voicemail_send_to_email} label="Voicemail to Email" />
                <OnOff val={u.follow_me}    label="Follow Me" />
                <OnOff val={u.call_forward} label="Call Forward" />
                <OnOff val={u.twinning}     label="Twinning" />
              </ViewSectionCard>

              {/* Security & Messaging */}
              <ViewSectionCard icon={Shield} title="Security & Messaging" iconColor="text-violet-500">
                <OnOff val={u.enable_2fa}          label="2FA Enabled" />
                <OnOff val={u.app_status}           label="Mobile App Login" />
                <OnOff val={u.ip_filtering}         label="IP Filtering" />
                <OnOff val={u.receive_sms_on_email} label="SMS to Email" />
                <OnOff val={u.receive_sms_on_mobile} label="SMS to Phone" />
              </ViewSectionCard>

            </div>
          ) : (
            <div className="p-10 text-center text-slate-400 text-sm">No data available</div>
          )}
        </div>

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

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: number }) =>
      userService.toggleStatus(id, status === 1 ? 0 : 1),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['users'] })
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
