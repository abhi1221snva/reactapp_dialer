import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Target, Trash2, Eye, Search, X, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, RefreshCw, ListFilter, ChevronDown, Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { leadService } from '../../services/lead.service'
import { listService } from '../../services/list.service'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'
import { cn } from '../../utils/cn'

interface LeadItem {
  id: number
  lead_id?: number
  first_name?: string
  last_name?: string
  phone_number?: string
  email?: string
  list_id?: number
  list_title?: string
  lead_status?: string
  status?: string | number
  disposition?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  created_at?: string
  [key: string]: unknown
}

interface ListOption {
  id: number
  l_title?: string
  title?: string
  list_name?: string
  [key: string]: unknown
}

function getListName(l: ListOption) {
  return l.l_title || l.title || l.list_name || `List #${l.id}`
}

const SEARCH_BY_OPTIONS = [
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'phone_number', label: 'Phone Number' },
  { value: 'email', label: 'Email' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'zip_code', label: 'Zip Code' },
]

const PAGE_LIMIT = 15

/* ── Searchable List Dropdown ─────────────────────────────────────────────── */

function SearchableListDropdown({
  lists,
  loading,
  selectedId,
  onChange,
}: {
  lists: ListOption[]
  loading: boolean
  selectedId: number | null
  onChange: (id: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  const filtered = useMemo(() => {
    if (!query.trim()) return lists
    const q = query.toLowerCase()
    return lists.filter(l => getListName(l).toLowerCase().includes(q))
  }, [lists, query])

  const selectedLabel = selectedId
    ? getListName(lists.find(l => l.id === selectedId) || { id: selectedId })
    : null

  const handleSelect = (id: number) => {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setQuery('')
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        disabled={loading}
        className={cn(
          'input h-10 text-sm w-full flex items-center justify-between gap-2 text-left cursor-pointer',
          !selectedLabel && 'text-slate-400',
        )}
      >
        <span className="truncate flex-1">
          {loading ? 'Loading lists…' : selectedLabel || '— Choose a list —'}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedLabel && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown size={14} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                ref={inputRef}
                className="w-full h-8 pl-8 pr-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder:text-slate-400"
                placeholder="Search lists…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') setOpen(false)
                  if (e.key === 'Enter' && filtered.length === 1) handleSelect(filtered[0].id)
                }}
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">No lists found</div>
            ) : (
              filtered.map(l => {
                const isSelected = l.id === selectedId
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleSelect(l.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    {isSelected && <Check size={13} className="text-indigo-600 flex-shrink-0" />}
                    <span className={cn('truncate', !isSelected && 'ml-5')}>{getListName(l)}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main Component ───────────────────────────────────────────────────────── */

export function Leads() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Filter state
  const [selectedListId, setSelectedListId] = useState<number | null>(null)
  const [searchBy, setSearchBy] = useState('')
  const [searchValue, setSearchValue] = useState('')

  // Applied filters (set on Search click)
  const [appliedFilters, setAppliedFilters] = useState<{
    listId: number; searchBy: string; searchValue: string
  } | null>(null)

  // Pagination
  const [page, setPage] = useState(1)

  // Fetch all lists for the dropdown
  const { data: listsRaw, isLoading: listsLoading } = useQuery({
    queryKey: ['all-lists-dropdown'],
    queryFn: () => listService.getAll(),
    staleTime: 5 * 60 * 1000,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lists: ListOption[] = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = listsRaw as any
    const arr = r?.data?.data ?? r?.data ?? []
    return Array.isArray(arr) ? arr : []
  })()

  // Fetch leads only when filters are applied
  const {
    data: leadsRaw,
    isLoading: leadsLoading,
    isFetching: leadsFetching,
    refetch,
  } = useQuery({
    queryKey: ['leads-filtered', appliedFilters, page],
    queryFn: () => {
      if (!appliedFilters) return Promise.resolve(null)
      return listService.getLeads(appliedFilters.listId, {
        start: (page - 1) * PAGE_LIMIT,
        limit: PAGE_LIMIT,
        ...(appliedFilters.searchValue ? { search: appliedFilters.searchValue } : {}),
      })
    },
    enabled: !!appliedFilters,
    placeholderData: (prev) => prev,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leadsData = leadsRaw as any
  const leads: LeadItem[] = (() => {
    const arr = leadsData?.data?.data ?? leadsData?.data ?? []
    return Array.isArray(arr) ? arr : []
  })()
  const total: number = leadsData?.data?.total_rows ?? leadsData?.data?.total ?? leads.length ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  const deleteMutation = useMutation({
    mutationFn: (id: number) => leadService.delete(id),
    onSuccess: () => {
      toast.success('Lead deleted')
      qc.invalidateQueries({ queryKey: ['leads-filtered'] })
    },
    onError: () => toast.error('Failed to delete lead'),
  })

  const handleSearch = useCallback(() => {
    if (!selectedListId) {
      toast.error('Please select a list first')
      return
    }
    setPage(1)
    setAppliedFilters({
      listId: selectedListId,
      searchBy,
      searchValue: searchValue.trim(),
    })
  }, [selectedListId, searchBy, searchValue])

  const handleReset = useCallback(() => {
    setSelectedListId(null)
    setSearchBy('')
    setSearchValue('')
    setAppliedFilters(null)
    setPage(1)
  }, [])

  const handleListChange = (id: number | null) => {
    setSelectedListId(id)
    if (!id) {
      setSearchBy('')
      setSearchValue('')
    }
  }

  const selectedListName = (() => {
    const found = lists.find(l => l.id === appliedFilters?.listId)
    return found ? getListName(found) : ''
  })()

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">Search and manage leads across your lists</p>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card !p-0">
        <div className="px-2.5 py-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* List Dropdown — searchable */}
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Select List *</label>
              <SearchableListDropdown
                lists={lists}
                loading={listsLoading}
                selectedId={selectedListId}
                onChange={handleListChange}
              />
            </div>

            {/* Search By Dropdown — visible after list is selected */}
            <div className={cn('md:col-span-3 transition-opacity', selectedListId ? 'opacity-100' : 'opacity-40 pointer-events-none')}>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Search By</label>
              <select
                className="input h-10 text-sm"
                value={searchBy}
                onChange={e => setSearchBy(e.target.value)}
                disabled={!selectedListId}
              >
                <option value="">All Fields</option>
                {SEARCH_BY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Value Input */}
            <div className={cn('md:col-span-3 transition-opacity', selectedListId ? 'opacity-100' : 'opacity-40 pointer-events-none')}>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Value</label>
              <input
                className="input h-10 text-sm"
                placeholder="Enter search value…"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && selectedListId) handleSearch() }}
                disabled={!selectedListId}
              />
            </div>

            {/* Buttons */}
            <div className="md:col-span-3 flex gap-2">
              <button
                onClick={handleSearch}
                disabled={!selectedListId}
                className="btn-primary h-10 flex-1 text-sm gap-1.5"
              >
                <Search size={14} />
                Search
              </button>
              {appliedFilters && (
                <button
                  onClick={handleReset}
                  className="btn-outline h-10 px-3 text-sm gap-1.5"
                >
                  <X size={14} />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Section — only shown after search */}
      {!appliedFilters ? (
        <div className="table-wrapper bg-white">
          <div className="flex flex-col items-center justify-center py-14 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
              <ListFilter size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">Select a list and click Search to view leads</p>
            <p className="text-xs text-slate-400 mt-1">Use the filters above to find specific leads</p>
          </div>
        </div>
      ) : (
        <div className="space-y-0">
          {/* Active filter summary + refresh */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Showing results for:</span>
              <Badge variant="blue">{selectedListName || `List #${appliedFilters.listId}`}</Badge>
              {appliedFilters.searchBy && (
                <Badge variant="purple">
                  {SEARCH_BY_OPTIONS.find(o => o.value === appliedFilters.searchBy)?.label || appliedFilters.searchBy}
                </Badge>
              )}
              {appliedFilters.searchValue && (
                <Badge variant="gray">&quot;{appliedFilters.searchValue}&quot;</Badge>
              )}
            </div>
            <button
              onClick={() => refetch()}
              disabled={leadsFetching}
              className="btn-ghost btn-sm p-2 h-8 w-8"
              title="Refresh"
            >
              <RefreshCw size={13} className={leadsFetching ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Table */}
          <div className="table-wrapper bg-white">
            {/* Count bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
              <span className="text-xs text-slate-500 font-medium">
                {leadsLoading ? 'Loading…' : `${total} record${total !== 1 ? 's' : ''}`}
              </span>
              {leadsFetching && !leadsLoading && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <RefreshCw size={11} className="animate-spin" /> Updating…
                </span>
              )}
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th className="text-left">Lead</th>
                  <th className="text-left">Email</th>
                  <th className="text-left">Disposition</th>
                  <th className="text-left">Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leadsLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className={cn('h-4 bg-slate-200 rounded animate-pulse', j === 0 ? 'w-3/4' : 'w-1/2')} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <div className="mb-3 opacity-40"><Target size={40} /></div>
                        <p className="font-medium text-slate-500">No leads found</p>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  leads.map((row, i) => {
                    const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || '—'
                    const st = row.lead_status || row.status
                    return (
                      <tr key={row.id ?? row.lead_id ?? i}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                              <Target size={14} className="text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
                              {row.phone_number && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{row.phone_number}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-sm text-slate-600 truncate">{row.email || '—'}</span>
                        </td>
                        <td>
                          <span className="text-sm text-slate-600">{row.disposition || '—'}</span>
                        </td>
                        <td>
                          <Badge variant={st === 'active' || st === 'new' || Number(st) === 1 ? 'green' : 'gray'}>
                            {String(st || 'Unknown')}
                          </Badge>
                        </td>
                        <td className="w-px whitespace-nowrap">
                          <RowActions actions={[
                            {
                              label: 'View',
                              icon: <Eye size={13} />,
                              variant: 'view',
                              onClick: () => navigate(`/lists/${row.list_id || appliedFilters.listId}/leads`),
                            },
                            {
                              label: 'Delete',
                              icon: <Trash2 size={13} />,
                              variant: 'delete',
                              onClick: async () => {
                                if (await confirmDelete('this lead')) deleteMutation.mutate(row.id ?? row.lead_id ?? 0)
                              },
                              disabled: deleteMutation.isPending,
                            },
                          ]} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {!leadsLoading && total > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white">
                <span className="text-xs text-slate-500">
                  {total === 0 ? 'No results' : `${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
                </span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setPage(1)} disabled={page === 1} className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40" title="First page">
                    <ChevronsLeft size={14} />
                  </button>
                  <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40" title="Previous">
                    <ChevronLeft size={14} />
                  </button>

                  {(() => {
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
                    return range.map((p, i) =>
                      p === '...' ? (
                        <span key={`dots-${i}`} className="px-2 py-1 text-xs text-slate-400">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p as number)}
                          className={cn(
                            'min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors',
                            p === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                          )}
                        >
                          {p}
                        </button>
                      ),
                    )
                  })()}

                  <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40" title="Next">
                    <ChevronRight size={14} />
                  </button>
                  <button onClick={() => setPage(totalPages)} disabled={page >= totalPages} className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40" title="Last page">
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
