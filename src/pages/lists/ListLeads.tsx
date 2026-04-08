import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Search, X, RefreshCw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, List, Pencil,
} from 'lucide-react'
import { useDialerHeader } from '../../layouts/DialerLayout'
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
  const { setToolbar, headerKey } = useDialerHeader()
  const listId = Number(id)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch list detail for name + campaign
  const { data: listDetailData } = useQuery({
    queryKey: ['list-detail', id],
    queryFn: () => listService.getById(listId),
    enabled: !isNaN(listId),
  })
  const rawDetail = (listDetailData as { data?: { data?: unknown } })?.data?.data
  const listDetail = rawDetail && typeof rawDetail === 'object' && !Array.isArray(rawDetail)
    ? rawDetail as Record<string, unknown>
    : Array.isArray(rawDetail) && rawDetail.length > 0
      ? rawDetail[0] as Record<string, unknown>
      : null
  const detailListName = (listDetail?.l_title ?? listDetail?.title ?? '') as string
  const campaignName = (listDetail?.campaign ?? '') as string

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

  // Inject toolbar into the standard .lt header
  useEffect(() => {
    setToolbar(
      <>
        {/* Back to list detail */}
        <button className="lt-b" onClick={() => navigate(`/lists/${id}`)}>
          <ArrowLeft size={13} />
          Back
        </button>

        {/* List name */}
        {detailListName && (
          <span className="lt-desc">
            <strong style={{ color: '#94a3b8', fontWeight: 600, marginRight: 4 }}>List:</strong>
            {detailListName}
          </span>
        )}

        {/* Campaign name */}
        {campaignName && (
          <span className="lt-desc" style={{ background: '#eef2ff', borderColor: '#c7d2fe', color: '#4338ca' }}>
            <strong style={{ color: '#818cf8', fontWeight: 600, marginRight: 4 }}>Campaign:</strong>
            {campaignName}
          </span>
        )}

        {/* Record count */}
        {!isLoading && (
          <span className="lt-desc">
            {total.toLocaleString()} record{total !== 1 ? 's' : ''}
            {debouncedSearch ? ' (filtered)' : ''}
          </span>
        )}
        {isFetching && !isLoading && (
          <span className="lt-desc" style={{ border: 'none', background: 'transparent', padding: 0 }}>
            <RefreshCw size={11} className="animate-spin" style={{ color: '#94a3b8' }} />
          </span>
        )}

        <div className="lt-right">
          {/* Search */}
          <div className="lt-search">
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              placeholder="Search leads…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Refresh */}
          <button
            className="lt-b"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          </button>

          {/* View list info */}
          <button className="lt-b" onClick={() => navigate(`/lists/${id}`)}>
            List Info
          </button>
        </div>
      </>
    )
  }, [headerKey, search, total, isLoading, isFetching, detailListName, campaignName])

  if (isLoading && !payload) return <PageLoader />

  // If headers are empty after loading — API returned error or no headers
  const noHeaders = !isLoading && headers.length === 0

  return (
    <div>
      {/* Table */}
      <div className="table-wrapper bg-white">
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
                      <p className="font-medium text-slate-500">No headers found for this list</p>
                      <p className="text-sm mt-1">This list may have no headers configured. Edit the list to fix this.</p>
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => navigate(`/lists/${id}/edit`)}
                          className="btn-primary inline-flex items-center gap-1.5 text-xs"
                        >
                          <Pencil size={12} /> Edit List
                        </button>
                        <button
                          onClick={() => navigate(`/lists/${id}/mapping`)}
                          className="btn-outline inline-flex items-center gap-1.5 text-xs"
                        >
                          Edit Mapping
                        </button>
                      </div>
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
