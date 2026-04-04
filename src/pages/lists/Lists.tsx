import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Pencil, Trash2, List, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { listService } from '../../services/list.service'
import { useServerTable } from '../../hooks/useServerTable'
import { formatDateTime } from '../../utils/format'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'
import { useDialerHeader } from '../../layouts/DialerLayout'

interface ListItem {
  id: number
  list_id?: number
  l_title?: string
  title?: string
  is_active: number
  is_dialing?: number
  lead_count?: number
  rowListData?: number
  campaign_id?: number
  campaign?: string
  updated_at?: string
  created_at?: string
  [key: string]: unknown
}

export function Lists() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })
  const { setToolbar } = useDialerHeader()

  useEffect(() => {
    setToolbar(
      <>
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input type="text" value={table.search} placeholder="Search lists…" onChange={e => table.setSearch(e.target.value)} />
          {table.search && (
            <button onClick={() => table.setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className="lt-divider" />
        <div className="lt-right">
          <button onClick={() => navigate('/lists/create')} className="lt-b lt-p">
            <Plus size={13} /> Add List
          </button>
        </div>
      </>
    )
    return () => setToolbar(undefined)
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, campaignId, status }: { id: number; campaignId: number; status: number }) =>
      listService.toggleStatus(id, campaignId, status === 1 ? 0 : 1),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['lists'] }) },
    onError: () => toast.error('Failed to update status'),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, campaignId }: { id: number; campaignId: number }) =>
      listService.delete(id, campaignId),
    onSuccess: () => { toast.success('List deleted'); qc.invalidateQueries({ queryKey: ['lists'] }) },
    onError: () => toast.error('Failed to delete list'),
  })

  const listId = (row: ListItem) => row.list_id ?? row.id
  const listName = (row: ListItem) => {
    const name = (row.l_title ?? row.title ?? '—') as string
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  const leadCount = (row: ListItem) => row.lead_count ?? row.rowListData ?? 0

  const columns: Column<ListItem>[] = [
    {
      key: 'name', header: 'List Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <List size={13} className="text-white" />
          </div>
          <div>
            <button
              onClick={() => navigate(`/lists/${listId(row)}`)}
              className="font-medium text-slate-900 hover:text-indigo-600 text-sm text-left"
            >
              {listName(row)}
            </button>
            {row.campaign && (
              <p className="text-xs text-slate-400 mt-0.5">{row.campaign}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'lead_count', header: 'Leads',
      render: (row) => (
        <span className="text-sm font-medium text-slate-700">
          {Number(leadCount(row)).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'is_active', header: 'Status',
      render: (row) => (
        <button
          onClick={() => toggleMutation.mutate({ id: row.list_id ?? row.id, campaignId: row.campaign_id ?? 0, status: row.is_active })}
          disabled={toggleMutation.isPending}
          title={row.is_active === 1 ? 'Click to deactivate' : 'Click to activate'}
          className="cursor-pointer hover:opacity-75 transition-opacity"
        >
          <Badge variant={row.is_active === 1 ? 'green' : 'gray'}>
            {row.is_active === 1 ? 'Active' : 'Inactive'}
          </Badge>
        </button>
      ),
    },
    {
      key: 'is_dialing', header: 'Dialing',
      render: (row) => (
        <Badge variant={row.is_dialing === 1 ? 'blue' : 'gray'}>
          {row.is_dialing === 1 ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'updated_at', header: 'Updated',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.updated_at ? formatDateTime(row.updated_at as string) : '—'}
        </span>
      ),
    },
    {
      key: 'actions', header: 'Action',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (row) => {
        const id = listId(row)
        const cid = row.campaign_id ?? 0
        return (
          <RowActions actions={[
            {
              label: 'Leads',
              icon: <Eye size={13} />,
              variant: 'view',
              onClick: () => navigate(`/lists/${id}/leads`),
            },
            {
              label: 'Edit',
              icon: <Pencil size={13} />,
              variant: 'edit',
              onClick: () => navigate(`/lists/${id}/mapping`),
            },
            {
              label: 'Delete',
              icon: <Trash2 size={13} />,
              variant: 'delete',
              onClick: async () => { if (await confirmDelete(listName(row))) deleteMutation.mutate({ id, campaignId: cid }) },
              disabled: deleteMutation.isPending,
            },
          ]} />
        )
      },
    },
  ]

  return (
    <div className="space-y-2">
      <ServerDataTable<ListItem>
        queryKey={['lists']}
        queryFn={(params) => listService.list(params)}
        dataExtractor={(res: unknown) => {
          const r = res as { data?: { data?: ListItem[] } }
          return r?.data?.data ?? []
        }}
        totalExtractor={(res: unknown) => {
          const r = res as { data?: { total_rows?: number } }
          return r?.data?.total_rows ?? 0
        }}
        columns={columns}
        searchPlaceholder="Search lists by name…"
        filters={[
          { key: 'is_active', label: 'All Status', options: [
            { value: '1', label: 'Active' },
            { value: '0', label: 'Inactive' },
          ]},
        ]}
        emptyText="No lists found"
        emptyIcon={<List size={40} />}
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
    </div>
  )
}
