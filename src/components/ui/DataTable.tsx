import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
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
}

export function DataTable<T extends Record<string, unknown>>({
  columns, data, loading, keyField = 'id', pagination, emptyText = 'No data found',
}: Props<T>) {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.perPage) : 1

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className}>{col.header}</th>
            ))}
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
          <span className="text-xs text-slate-500">
            Page {pagination.page} of {totalPages} ({pagination.total} total)
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => pagination.onChange(1)} disabled={pagination.page === 1} className="btn-ghost btn-sm px-2">
              <ChevronsLeft size={14} />
            </button>
            <button onClick={() => pagination.onChange(pagination.page - 1)} disabled={pagination.page === 1} className="btn-ghost btn-sm px-2">
              <ChevronLeft size={14} />
            </button>
            <span className="px-3 py-1 text-xs font-medium">{pagination.page}</span>
            <button onClick={() => pagination.onChange(pagination.page + 1)} disabled={pagination.page === totalPages} className="btn-ghost btn-sm px-2">
              <ChevronRight size={14} />
            </button>
            <button onClick={() => pagination.onChange(totalPages)} disabled={pagination.page === totalPages} className="btn-ghost btn-sm px-2">
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
