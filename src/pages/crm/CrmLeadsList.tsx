import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, SlidersHorizontal, Loader2, X,
  Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { leadService } from '../../services/lead.service'
import { LeadStatusBadge } from '../../components/crm/LeadStatusBadge'
import { BulkActionsBar } from '../../components/crm/BulkActionsBar'
import { LeadSearchFilters } from '../../components/crm/LeadSearchFilters'
import { RowActions } from '../../components/ui/RowActions'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { formatPhoneNumber } from '../../utils/format'
import { confirmDelete } from '../../utils/confirmDelete'
import { cn } from '../../utils/cn'
import type { CrmLead, CrmSearchParams } from '../../types/crm.types'

// ── Constants ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899']
const PER_PAGE_OPTIONS = [10, 25, 50, 100]

// ── Filters ────────────────────────────────────────────────────────────────────

interface Filters {
  lead_status: string[]
  assigned_to: string
  date_from: string
  date_to: string
  lead_type: string
  company_name: string
  phone_number: string
  email: string
  industry_type: string
}

const EMPTY_FILTERS: Filters = {
  lead_status: [], assigned_to: '', date_from: '', date_to: '',
  lead_type: '', company_name: '', phone_number: '', email: '', industry_type: '',
}

// ── Pagination ─────────────────────────────────────────────────────────────────

function Pagination({
  page, totalPages, total, perPage, onPageChange,
}: {
  page: number; totalPages: number; total: number; perPage: number; onPageChange: (p: number) => void
}) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to   = Math.min(page * perPage, total)

  const pages = (() => {
    const delta = 2
    const range: (number | '...')[] = []
    let prev = 0
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - delta && p <= page + delta)) {
        if (prev && p - prev > 1) range.push('...')
        range.push(p)
        prev = p
      }
    }
    return range
  })()

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-white">
      <span className="text-xs text-slate-500">
        {total === 0 ? 'No results' : `${from}–${to} of ${total.toLocaleString()} leads`}
      </span>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onPageChange(1)} disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors" title="First">
          <ChevronsLeft size={13} />
        </button>
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors" title="Previous">
          <ChevronLeft size={13} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-1.5 text-xs text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={cn(
                'min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors',
                p === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {p}
            </button>
          )
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors" title="Next">
          <ChevronRight size={13} />
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors" title="Last">
          <ChevronsRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ── CrmLeadsList ───────────────────────────────────────────────────────────────

export function CrmLeadsList() {
  const navigate   = useNavigate()
  const qc         = useQueryClient()
  const { setDescription, setActions } = useCrmHeader()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]           = useState('')
  const [page, setPage]               = useState(1)
  const [perPage, setPerPage]         = useState(25)
  const [filters, setFilters]         = useState<Filters>(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  // ── Lookups ──────────────────────────────────────────────────────────────────

  const { data: statusesData } = useQuery({
    queryKey: ['lead-statuses'],
    queryFn:  () => crmService.getLeadStatuses(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: usersData } = useQuery({
    queryKey: ['crm-users'],
    queryFn:  () => crmService.getUsers(),
    staleTime: 5 * 60 * 1000,
  })

  const statuses = statusesData ?? []
  const agents   = usersData   ?? []

  // Map lead_title_url → status object (for badge colors + names)
  const statusMap = useMemo(
    () => Object.fromEntries(statuses.map(s => [s.lead_title_url, s])),
    [statuses],
  )

  // ── Data fetch ───────────────────────────────────────────────────────────────

  const buildParams = (): CrmSearchParams => ({
    search:        search || undefined,
    lead_status:   filters.lead_status.length ? filters.lead_status : undefined,
    assigned_to:   filters.assigned_to ? [Number(filters.assigned_to)] : undefined,
    date_from:     filters.date_from || undefined,
    date_to:       filters.date_to   || undefined,
    lead_type:     filters.lead_type     || undefined,
    company_name:  filters.company_name  || undefined,
    phone_number:  filters.phone_number  || undefined,
    email:         filters.email         || undefined,
    industry_type: filters.industry_type || undefined,
    lower_limit:   (page - 1) * perPage,
    upper_limit:   perPage,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['crm-leads-search', search, filters, page, perPage],
    queryFn:  async () => {
      const res = await crmService.searchLeads(buildParams())
      return res.data?.data ?? res.data
    },
    placeholderData: prev => prev,
  })

  const leads: CrmLead[] = data?.records ?? data?.data ?? data?.items ?? data?.leads ?? []
  const total: number    = data?.pagination?.total ?? data?.total ?? 0
  const totalPages       = Math.max(1, data?.pagination?.last_page ?? Math.ceil(total / perPage))

  // ── Delete ───────────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: number) => leadService.delete(id),
    onSuccess: () => {
      toast.success('Lead deleted')
      qc.invalidateQueries({ queryKey: ['crm-leads-search'] })
    },
    onError: () => toast.error('Failed to delete lead'),
  })

  const handleDelete = async (id: number) => {
    const ok = await confirmDelete('this lead')
    if (ok) deleteMutation.mutate(id)
  }

  // ── Search ───────────────────────────────────────────────────────────────────

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }, [])

  const clearSearch = () => {
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  // ── Selection ────────────────────────────────────────────────────────────────

  const toggleSelect = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleAll = () =>
    setSelectedIds(prev => prev.length === leads.length ? [] : leads.map(l => l.id))

  // ── Active filter count ───────────────────────────────────────────────────────

  const activeFilterCount = [
    filters.lead_status.length > 0,
    !!filters.assigned_to,
    !!filters.date_from,
    !!filters.date_to,
    !!filters.lead_type,
    !!filters.company_name,
    !!filters.phone_number,
    !!filters.email,
    !!filters.industry_type,
  ].filter(Boolean).length

  // ── Header (CrmLayout) ────────────────────────────────────────────────────────

  useEffect(() => {
    setDescription(isLoading ? 'Loading…' : `${total.toLocaleString()} leads`)
    setActions(
      <button onClick={() => navigate('/crm/leads/create')} className="btn-primary flex items-center gap-2">
        <Plus size={16} /> Add Lead
      </button>
    )
    return () => { setDescription(undefined); setActions(undefined) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, total])

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">

        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: '240px' }}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            placeholder="Search by name, email, phone, company…"
            onChange={e => handleSearchChange(e.target.value)}
            className="input w-full pl-9 pr-9"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(f => !f)}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors whitespace-nowrap',
            activeFilterCount > 0
              ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
          )}
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Per-page selector */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-500 whitespace-nowrap hidden sm:block">Show</span>
          <select
            value={perPage}
            onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
            className="input text-sm py-1.5 pr-8 cursor-pointer"
            style={{ width: 'auto', minWidth: '72px' }}
          >
            {PER_PAGE_OPTIONS.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-xs text-slate-500 whitespace-nowrap hidden sm:block">entries</span>
        </div>
      </div>

      {/* ── Filter panel ────────────────────────────────────────────────────── */}
      {showFilters && (
        <LeadSearchFilters
          filters={filters}
          onFilterChange={f => { setFilters(f); setPage(1) }}
          statuses={statuses}
          agents={agents}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* ── Table card ──────────────────────────────────────────────────────── */}
      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && selectedIds.length === leads.length}
                    onChange={toggleAll}
                    className="rounded accent-indigo-600"
                  />
                </th>
                <th className="w-14 text-slate-400 font-medium">#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Created</th>
                <th className="w-12" />
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Loader2 size={22} className="animate-spin text-indigo-400" />
                      <span className="text-sm">Loading leads…</span>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search size={28} className="opacity-30" />
                      <p className="text-sm font-medium">No leads found</p>
                      <p className="text-xs">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map(lead => {
                  const name     = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || `Lead #${lead.id}`
                  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                  const bg       = AVATAR_COLORS[lead.id % AVATAR_COLORS.length]
                  const selected = selectedIds.includes(lead.id)
                  const createdDate = lead.created_at
                    ? new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'

                  return (
                    <tr
                      key={lead.id}
                      className={cn('cursor-pointer', selected && 'bg-indigo-50 hover:bg-indigo-50')}
                      onClick={() => navigate(`/crm/leads/${lead.id}`)}
                    >
                      {/* Checkbox */}
                      <td onClick={e => { e.stopPropagation(); toggleSelect(lead.id) }}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded accent-indigo-600"
                        />
                      </td>

                      {/* ID */}
                      <td className="text-slate-400 text-xs font-mono">
                        {lead.id}
                      </td>

                      {/* Name + Avatar */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                            style={{ background: bg }}
                          >
                            {initials}
                          </div>
                          <span className="font-medium text-slate-800 text-sm">{name}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="text-slate-500 text-xs">
                        {lead.email ? String(lead.email) : '—'}
                      </td>

                      {/* Phone */}
                      <td className="text-slate-700 text-xs">
                        {lead.phone_number ? formatPhoneNumber(String(lead.phone_number)) : '—'}
                      </td>

                      {/* Company */}
                      <td className="text-slate-500 text-xs">
                        {lead.company_name ? String(lead.company_name) : '—'}
                      </td>

                      {/* Status */}
                      <td>
                        {(() => {
                          const slug = String(lead.lead_status ?? '')
                          const s    = statusMap[slug] as (typeof statuses[number] & Record<string, unknown>) | undefined
                          return (
                            <LeadStatusBadge
                              status={slug}
                              statusName={s?.lead_title}
                              colorCode={(s?.color_code ?? s?.color) as string | undefined}
                              size="sm"
                            />
                          )
                        })()}
                      </td>

                      {/* Assigned */}
                      <td className="text-slate-500 text-xs">
                        {(lead.assigned_name as string | undefined) ?? '—'}
                      </td>

                      {/* Created date */}
                      <td className="text-slate-400 text-xs whitespace-nowrap">
                        {createdDate}
                      </td>

                      {/* Actions */}
                      <td onClick={e => e.stopPropagation()}>
                        <RowActions
                          actions={[
                            {
                              label: 'View Details',
                              icon:  <Eye size={13} />,
                              variant: 'view',
                              onClick: () => navigate(`/crm/leads/${lead.id}`),
                            },
                            {
                              label: 'Edit Lead',
                              icon:  <Pencil size={13} />,
                              variant: 'edit',
                              onClick: () => navigate(`/crm/leads/${lead.id}/edit`),
                            },
                            {
                              label: 'Delete Lead',
                              icon:  <Trash2 size={13} />,
                              variant: 'delete',
                              onClick: () => handleDelete(lead.id),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ──────────────────────────────────────────────────────── */}
        {totalPages >= 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            perPage={perPage}
            onPageChange={p => setPage(p)}
          />
        )}
      </div>

      {/* ── Bulk actions bar ─────────────────────────────────────────────────── */}
      <BulkActionsBar
        selectedIds={selectedIds}
        statuses={statuses}
        agents={agents}
        onClear={() => setSelectedIds([])}
        onRefresh={() => refetch()}
      />
    </div>
  )
}
