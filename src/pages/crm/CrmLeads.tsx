import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Phone, Mail, Pencil, Trash2, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { leadService } from '../../services/lead.service'
import { initials, formatPhoneNumber } from '../../utils/format'
import { useServerTable } from '../../hooks/useServerTable'
import { useQuery } from '@tanstack/react-query'
import { cn } from '../../utils/cn'

const AVATAR_COLORS = [
  'from-indigo-500 to-violet-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
]
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length] }

interface Lead {
  id: number
  phone_number: string
  first_name?: string
  last_name?: string
  email?: string
  lead_status?: string
  city?: string
  state?: string
  [key: string]: unknown
}

export function CrmLeads() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 20 })

  const { data: statusesData } = useQuery({
    queryKey: ['lead-statuses'],
    queryFn: () => leadService.getLeadStatuses(),
    staleTime: 5 * 60 * 1000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => leadService.delete(id),
    onSuccess: () => { toast.success('Lead deleted'); qc.invalidateQueries({ queryKey: ['leads'] }) },
    onError: () => toast.error('Failed to delete lead'),
  })

  const statuses: Array<{ id: number; lead_status: string }> =
    statusesData?.data?.data || statusesData?.data || []

  const statusFilterOptions = statuses.map((s: { id: number; lead_status: string }) => ({
    value: s.lead_status,
    label: s.lead_status,
  }))

  const columns: Column<Lead>[] = [
    {
      key: 'name', header: 'Contact',
      render: (row) => {
        const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Unknown'
        return (
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-xl bg-gradient-to-br text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm',
              avatarColor(row.id)
            )}>
              {initials(name)}
            </div>
            <button onClick={() => navigate(`/crm/${row.id}`)} className="text-left">
              <p className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors">{name}</p>
              {(row.city || row.state) && (
                <p className="text-xs text-slate-400">{[row.city, row.state].filter(Boolean).join(', ')}</p>
              )}
            </button>
          </div>
        )
      },
    },
    {
      key: 'phone_number', header: 'Phone',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Phone size={12} className="text-slate-400 flex-shrink-0" />
          {formatPhoneNumber(row.phone_number)}
        </div>
      ),
    },
    {
      key: 'email', header: 'Email',
      render: (row) => row.email ? (
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Mail size={12} className="text-slate-400 flex-shrink-0" />
          <span className="truncate max-w-[160px]">{row.email as string}</span>
        </div>
      ) : <span className="text-slate-300 text-sm">—</span>,
    },
    {
      key: 'lead_status', header: 'Status',
      render: (row) => row.lead_status
        ? <Badge variant="blue" className="capitalize">{row.lead_status as string}</Badge>
        : <Badge variant="gray">New</Badge>,
    },
    {
      key: 'actions', header: '',
      headerClassName: 'w-px',
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => navigate(`/crm/${row.id}/edit`)}
            className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => { if (confirm('Delete this lead?')) deleteMutation.mutate(row.id) }}
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
        <h1 className="text-2xl font-bold text-slate-900">CRM Leads</h1>
        <p className="page-subtitle">Manage contacts and prospects</p>
      </div>

      <ServerDataTable<Lead>
        queryKey={['leads']}
        queryFn={(params) => leadService.list(params)}
        dataExtractor={(res: unknown) => {
          const r = res as { data?: { data?: Lead[] } }
          return r?.data?.data ?? []
        }}
        totalExtractor={(res: unknown) => {
          const r = res as { data?: { record_count?: number } }
          return r?.data?.record_count ?? 0
        }}
        columns={columns}
        searchPlaceholder="Search by name, phone, email…"
        filters={
          statusFilterOptions.length > 0
            ? [{ key: 'lead_status', label: 'All Status', options: statusFilterOptions }]
            : []
        }
        emptyText="No leads found"
        emptyIcon={<Users size={40} />}
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
          <button onClick={() => navigate('/crm/create')} className="btn-primary">
            <Plus size={15} /> Add Lead
          </button>
        }
      />
    </div>
  )
}
