import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
  headerClassName?: string
  sortable?: boolean
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  keyField?: string
  pagination?: {
    page: number
    total: number
    perPage: number
    onChange: (page: number) => void
  }
  emptyText?: string
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

export function DataTable<T extends Record<string, unknown>>({
  columns, data, loading, keyField = 'id', pagination, emptyText = 'No data found',
  sortKey, sortDir, onSort,
}: Props<T>) {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.perPage) : 1

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => {
              const isSorted = sortKey === col.key
              return (
                <th
                  key={col.key}
                  className={[
                    col.headerClassName ?? col.className,
                    col.sortable ? 'cursor-pointer select-none hover:bg-slate-100 transition-colors' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      isSorted
                        ? sortDir === 'desc'
                          ? <ArrowDown size={12} className="text-indigo-500 flex-shrink-0" />
                          : <ArrowUp size={12} className="text-indigo-500 flex-shrink-0" />
                        : <ArrowUpDown size={12} className="text-slate-300 flex-shrink-0" />
                    )}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key}>
                    <div className="h-4 bg-slate-200 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-slate-400">{emptyText}</td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row[keyField] as string ?? i}>
                {columns.map((col) => (
                  <td key={col.key} className={col.className}>
                    {col.render ? col.render(row) : String(row[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 flex-wrap gap-2">
          <span className="text-xs text-slate-500">
            Showing{' '}
            <span className="font-medium text-slate-700">
              {((pagination.page - 1) * pagination.perPage + 1).toLocaleString()}
            </span>
            {' – '}
            <span className="font-medium text-slate-700">
              {Math.min(pagination.page * pagination.perPage, pagination.total).toLocaleString()}
            </span>
            {' of '}
            <span className="font-medium text-slate-700">{pagination.total.toLocaleString()}</span>
            {' results'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onChange(1)}
              disabled={pagination.page === 1}
              className="btn-ghost btn-sm px-2"
              title="First page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => pagination.onChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="btn-ghost btn-sm px-2"
            >
              <ChevronLeft size={14} />
            </button>
            {getPageNumbers(pagination.page, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => pagination.onChange(p as number)}
                  className={[
                    'w-7 h-7 text-xs rounded-lg transition-colors',
                    pagination.page === p
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-100',
                  ].join(' ')}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => pagination.onChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
              className="btn-ghost btn-sm px-2"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => pagination.onChange(totalPages)}
              disabled={pagination.page === totalPages}
              className="btn-ghost btn-sm px-2"
              title="Last page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
