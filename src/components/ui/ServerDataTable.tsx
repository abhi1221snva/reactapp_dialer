import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  SlidersHorizontal, X, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import type { TableParams } from '../../hooks/useServerTable'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
  headerClassName?: string
  sortable?: boolean
  sortValue?: (row: T) => string | number | null
}

export interface FilterOption {
  value: string
  label: string
}

export interface FilterDef {
  key: string
  label: string
  options: FilterOption[]
}

interface Props<T extends Record<string, unknown>> {
  // query
  queryKey: unknown[]
  queryFn: (params: TableParams) => Promise<unknown>
  dataExtractor: (res: unknown) => T[]
  totalExtractor: (res: unknown) => number

  // table
  columns: Column<T>[]
  keyField?: string
  emptyText?: string
  emptyIcon?: React.ReactNode

  // search & filters
  search: string
  onSearchChange: (v: string) => void
  searchPlaceholder?: string
  filters?: FilterDef[]
  activeFilters?: Record<string, string>
  onFilterChange?: (key: string, value: string) => void
  onResetFilters?: () => void
  hasActiveFilters?: boolean

  // pagination
  page: number
  limit: number
  onPageChange: (p: number) => void

  // header slot
  headerActions?: React.ReactNode

  /** When true, the built-in toolbar (search, filters, refresh) is hidden.
   *  Use this when the parent page renders the toolbar in the layout header instead. */
  hideToolbar?: boolean
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRows({ cols, rows = 8 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-2">
              <div className={cn('h-4 bg-slate-200 rounded animate-pulse', j === 0 ? 'w-3/4' : 'w-1/2')} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page, totalPages, total, limit, onPageChange,
}: {
  page: number; totalPages: number; total: number; limit: number; onPageChange: (p: number) => void
}) {
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
    <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 bg-white">
      <span className="text-xs text-slate-500">
        {total === 0 ? 'No results' : `${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40"
          title="First page"
        >
          <ChevronsLeft size={14} />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40"
          title="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 py-1 text-xs text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={cn(
                'min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors',
                p === page
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40"
          title="Next page"
        >
          <ChevronRight size={14} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40"
          title="Last page"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ServerDataTable<T extends Record<string, unknown>>({
  queryKey, queryFn, dataExtractor, totalExtractor,
  columns, keyField = 'id', emptyText = 'No records found', emptyIcon,
  search, onSearchChange, searchPlaceholder = 'Search…',
  filters = [], activeFilters = {}, onFilterChange = () => {}, onResetFilters = () => {}, hasActiveFilters = false,
  page, limit, onPageChange,
  headerActions,
  hideToolbar = false,
}: Props<T>) {

  const params: TableParams = { page, limit, search, filters: activeFilters }

  const { data: raw, isLoading, isFetching, refetch } = useQuery({
    queryKey: [...queryKey, page, limit, search, activeFilters],
    queryFn: () => queryFn(params),
    placeholderData: (prev) => prev,
  })

  const rawRows = dataExtractor(raw)
  const total = totalExtractor(raw)
  const totalPages = Math.max(1, Math.ceil(total / limit))

  // ── Client-side sort ──
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortKey(null); setSortDir('asc') }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const rows = useMemo(() => {
    if (!sortKey) return rawRows
    const col = columns.find(c => c.key === sortKey)
    return [...rawRows].sort((a, b) => {
      const av = col?.sortValue ? col.sortValue(a) : a[sortKey]
      const bv = col?.sortValue ? col.sortValue(b) : b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rawRows, sortKey, sortDir, columns])

  return (
    <div className="space-y-2">
      {/* ── Toolbar (hidden when parent renders it in the layout header) ── */}
      {!hideToolbar && (
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
          <div className="flex flex-1 flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                className="input pl-9 pr-8 h-9 text-sm"
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => onSearchChange(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter dropdowns */}
            {filters.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <SlidersHorizontal size={14} className="text-slate-400" />
                {filters.map(f => (
                  <select
                    key={f.key}
                    className="input h-9 text-sm w-auto pr-8 min-w-[120px] py-1.5"
                    value={activeFilters[f.key] ?? ''}
                    onChange={e => onFilterChange(f.key, e.target.value)}
                  >
                    <option value="">{f.label}</option>
                    {f.options.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ))}
                {hasActiveFilters && (
                  <button onClick={onResetFilters} className="btn-ghost btn-sm h-9 gap-1 text-slate-500">
                    <X size={13} /> Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right side actions + refresh */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="btn-ghost btn-sm p-2 h-9 w-9"
              title="Refresh"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            </button>
            {headerActions}
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="table-wrapper bg-white">
        <table className="table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn('text-left', col.headerClassName, col.sortable === true && 'cursor-pointer select-none hover:text-slate-700')}
                  onClick={() => { if (col.sortable === true) handleSort(col.key) }}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable === true && (
                      sortKey === col.key
                        ? sortDir === 'asc'
                          ? <ArrowUp size={12} className="text-indigo-600" />
                          : <ArrowDown size={12} className="text-indigo-600" />
                        : <ArrowUpDown size={12} className="text-slate-300" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows cols={columns.length} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    {emptyIcon && <div className="mb-3 opacity-40">{emptyIcon}</div>}
                    <p className="font-medium text-slate-500">{emptyText}</p>
                    {hasActiveFilters && (
                      <button onClick={onResetFilters} className="mt-2 text-xs text-indigo-600 hover:underline">
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={(row[keyField] as string) ?? i}>
                  {columns.map(col => (
                    <td key={col.key} className={col.className}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '–')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </div>
  )
}
