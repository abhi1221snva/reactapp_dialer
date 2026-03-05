import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Search, X, RefreshCw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, SlidersHorizontal, List,
} from 'lucide-react'
import { listService } from '../../services/list.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'

const PAGE_SIZE = 20

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRows({ cols, rows = PAGE_SIZE }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-2.5">
              <div className={`h-3.5 bg-slate-200 rounded animate-pulse ${j === 0 ? 'w-3/4' : 'w-1/2'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({
  page, total, limit, onChange,
}: {
  page: number; total: number; limit: number; onChange: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

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
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white">
      <span className="text-xs text-slate-500">
        {total === 0 ? 'No results' : `${from}–${to} of ${total.toLocaleString()}`}
      </span>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onChange(1)} disabled={page === 1}
          className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40"><ChevronsLeft size={14} /></button>
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40"><ChevronLeft size={14} /></button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`d${i}`} className="px-2 py-1 text-xs text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors ${
                p === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >{p}</button>
          )
        )}

        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages}
          className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40"><ChevronRight size={14} /></button>
        <button onClick={() => onChange(totalPages)} disabled={page >= totalPages}
          className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40"><ChevronsRight size={14} /></button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ListLeads() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const listId = Number(id)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['list-leads', listId, page, debouncedSearch],
    queryFn: () =>
      listService.getLeads(listId, {
        start: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      }),
    placeholderData: (prev) => prev,
    enabled: !isNaN(listId),
  })

  // Response shape: res.data.data = { list_name, list_header[], list_data[], total_records }
  type LeadsResponse = {
    data?: {
      data?: {
        list_name?: string
        list_id?: number
        list_header?: string[]
        list_data?: Record<string, unknown>[]
        total_records?: number
        start?: number
        limit?: number
      }
    }
  }
  const payload = (data as LeadsResponse)?.data?.data
  const listName = payload?.list_name ?? `List #${id}`
  const headers: string[] = payload?.list_header ?? []
  const rows: Record<string, unknown>[] = payload?.list_data ?? []
  const total: number = payload?.total_records ?? 0

  if (isLoading && !payload) return <PageLoader />

  // If headers are empty after loading — API returned error or no headers
  const noHeaders = !isLoading && headers.length === 0

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/lists/${id}`)} className="btn-ghost p-2 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="page-title">{listName}</h1>
          <p className="page-subtitle">
            {!isLoading && `${total.toLocaleString()} leads`}
            {' '}
            <button
              onClick={() => navigate(`/lists/${id}`)}
              className="text-indigo-600 hover:underline text-xs"
            >
              View list info
            </button>
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <SlidersHorizontal size={14} className="text-slate-400 flex-shrink-0" />
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              className="input pl-8 pr-8 h-9 text-sm"
              placeholder="Search leads…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-ghost btn-sm p-2 h-9 w-9"
          title="Refresh"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper bg-white">
        {/* Count bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
          <span className="text-xs text-slate-500 font-medium">
            {isLoading ? 'Loading…' : `${total.toLocaleString()} record${total !== 1 ? 's' : ''}`}
            {debouncedSearch && !isLoading && (
              <span className="ml-1.5 text-indigo-600">(filtered)</span>
            )}
          </span>
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <RefreshCw size={11} className="animate-spin" /> Updating…
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-12 text-center">#</th>
                {headers.map(h => (
                  <th key={h}>{h}</th>
                ))}
                {isLoading && headers.length === 0 && (
                  // Skeleton headers
                  Array.from({ length: 5 }).map((_, i) => (
                    <th key={i}>
                      <div className="h-3 bg-slate-300 rounded animate-pulse w-16" />
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows cols={(headers.length || 5) + 1} />
              ) : noHeaders ? (
                <tr>
                  <td colSpan={10}>
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <List size={40} className="mb-3 opacity-40" />
                      <p className="font-medium text-slate-500">No data available</p>
                      <p className="text-sm mt-1">This list may have no headers configured</p>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length + 1}>
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <List size={40} className="mb-3 opacity-40" />
                      <p className="font-medium text-slate-500">
                        {debouncedSearch ? `No leads match "${debouncedSearch}"` : 'No leads in this list'}
                      </p>
                      {debouncedSearch && (
                        <button
                          onClick={() => setSearch('')}
                          className="mt-2 text-xs text-indigo-600 hover:underline"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={(row.lead_id as string) ?? i}>
                    <td className="text-center text-xs text-slate-400">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    {headers.map(h => (
                      <td key={h} className="max-w-[200px] truncate">
                        {row[h] !== undefined && row[h] !== null && row[h] !== ''
                          ? String(row[h])
                          : <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && total > 0 && (
          <Pagination page={page} total={total} limit={PAGE_SIZE} onChange={setPage} />
        )}
      </div>
    </div>
  )
}
