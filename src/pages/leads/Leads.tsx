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
import { useDialerHeader } from '../../layouts/DialerLayout'

interface LeadItem {
  lead_id?: number
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
  const { setToolbar } = useDialerHeader()

  // Filter state
  const [selectedListId, setSelectedListId] = useState<number | null>(null)
  const [searchBy, setSearchBy] = useState('')
  const [searchValue, setSearchValue] = useState('')

  // Applied filters (set on Search click)
  const [appliedFilters, setAppliedFilters] = useState<{
    listId: number; searchBy: string; searchValue: string
  } | null>(null)

  // Dynamic column headers from API response
  const [columnHeaders, setColumnHeaders] = useState<string[]>([])

  // Pagination
  const [page, setPage] = useState(1)

  // Fetch all lists for the dropdown
  const { data: listsRaw, isLoading: listsLoading } = useQuery({
    queryKey: ['all-lists-dropdown'],
    queryFn: () => listService.getAll(),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch headers for the selected list (for Search By dropdown)
  const { data: headersRaw } = useQuery({
    queryKey: ['list-headers', selectedListId],
    queryFn: () => listService.getHeadersByList(selectedListId!),
    enabled: !!selectedListId,
    staleTime: 5 * 60 * 1000,
  })

  // Extract label titles from headers response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listLabelTitles: string[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (headersRaw as any)?.data?.data ?? (headersRaw as any)?.data ?? []
    if (!Array.isArray(raw)) return []
    return raw.map((h: { title?: string }) => h.title).filter(Boolean) as string[]
  }, [headersRaw])

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
        ...(appliedFilters.searchBy ? { search_by: appliedFilters.searchBy } : {}),
      })
    },
    enabled: !!appliedFilters,
    placeholderData: (prev) => prev,
  })

  // Extract data from the API response: { success, message, data: { list_data, list_header, total_records, ... } }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responseData = (leadsRaw as any)?.data?.data
  const leads: LeadItem[] = (() => {
    const arr = responseData?.list_data
    return Array.isArray(arr) ? arr : []
  })()
  const total: number = responseData?.total_records ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  // Update column headers from API response
  useEffect(() => {
    const headers = responseData?.list_header
    if (Array.isArray(headers) && headers.length > 0) {
      setColumnHeaders(headers)
    }
  }, [responseData?.list_header])

  // Max columns to show in table (first N + actions)
  const MAX_COLS = 6
  const visibleHeaders = columnHeaders.slice(0, MAX_COLS)

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
    setColumnHeaders([])
    setPage(1)
  }, [])

  const handleListChange = (id: number | null) => {
    setSelectedListId(id)
    setSearchBy('')
    setSearchValue('')
    setColumnHeaders([])
  }

  const selectedListName = (() => {
    const found = lists.find(l => l.id === appliedFilters?.listId)
    return found ? getListName(found) : ''
  })()

  useEffect(() => {
    setToolbar(
      <>
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input type="text" value={searchValue} placeholder="Search leads…" onChange={e => setSearchValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && selectedListId) handleSearch() }} />
          {searchValue && (
            <button onClick={() => setSearchValue('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className="lt-divider" />
        <div className="lt-right">
          {appliedFilters && (
            <button onClick={handleReset} className="lt-b">
              <X size={12} /> Reset
            </button>
          )}
          <button onClick={handleSearch} disabled={!selectedListId} className="lt-b lt-p" style={{ opacity: selectedListId ? 1 : 0.5 }}>
            <Search size={13} /> Search
          </button>
        </div>
      </>
    )
    return () => setToolbar(undefined)
  })

  // Build Search By options: use pre-fetched headers, fall back to response headers
  const searchBySource = listLabelTitles.length > 0 ? listLabelTitles : columnHeaders
  const searchByOptions = searchBySource.map(h => ({ value: h, label: h }))

  return (
    <div className="space-y-4">
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

            {/* Search By Dropdown */}
            <div className={cn('md:col-span-3 transition-opacity', selectedListId ? 'opacity-100' : 'opacity-40 pointer-events-none')}>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Search By</label>
              <select
                className="input h-10 text-sm"
                value={searchBy}
                onChange={e => setSearchBy(e.target.value)}
                disabled={!selectedListId}
              >
                <option value="">All Fields</option>
                {searchByOptions.map(opt => (
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
                <Badge variant="purple">{appliedFilters.searchBy}</Badge>
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

            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    {visibleHeaders.map(h => (
                      <th key={h} className="text-left">{h}</th>
                    ))}
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: visibleHeaders.length + 1 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className={cn('h-4 bg-slate-200 rounded animate-pulse', j === 0 ? 'w-3/4' : 'w-1/2')} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={visibleHeaders.length + 1}>
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                          <div className="mb-3 opacity-40"><Target size={40} /></div>
                          <p className="font-medium text-slate-500">No leads found</p>
                          <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    leads.map((row, i) => {
                      const leadId = row.lead_id ?? 0
                      return (
                        <tr key={leadId || i}>
                          {visibleHeaders.map((h, ci) => (
                            <td key={h}>
                              {ci === 0 ? (
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                                    <Target size={14} className="text-indigo-600" />
                                  </div>
                                  <span className="text-sm font-medium text-slate-900 truncate">
                                    {String(row[h] ?? '—')}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-slate-600 truncate">
                                  {String(row[h] ?? '—')}
                                </span>
                              )}
                            </td>
                          ))}
                          <td className="w-px whitespace-nowrap">
                            <RowActions actions={[
                              {
                                label: 'View',
                                icon: <Eye size={13} />,
                                variant: 'view',
                                onClick: () => navigate(`/lists/${appliedFilters.listId}/leads`),
                              },
                              {
                                label: 'Delete',
                                icon: <Trash2 size={13} />,
                                variant: 'delete',
                                onClick: async () => {
                                  if (await confirmDelete('this lead')) deleteMutation.mutate(leadId as number)
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
            </div>

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
