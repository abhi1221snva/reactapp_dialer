import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, UserCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { userService } from '../../services/user.service'
import { initials } from '../../utils/format'
import { useServerTable } from '../../hooks/useServerTable'
import { cn } from '../../utils/cn'

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

export function Users() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userService.delete(id),
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: () => toast.error('Failed to delete user'),
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
        return <Badge variant={variant}>{row.role_name || levelLabel(lvl)}</Badge>
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
      key: 'actions', header: '',
      headerClassName: 'w-px',
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => navigate(`/users/${row.id}/edit`)}
            className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => { if (confirm('Delete this user?')) deleteMutation.mutate(row.id) }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Users & Agents</h1>
        <p className="page-subtitle">Manage team members and their access levels</p>
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
    </div>
  )
}
