import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays, Plus, Pencil, Trash2, X,
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { calltimeService } from '../../services/calltime.service'
import { cn } from '../../utils/cn'

// ── Types ─────────────────────────────────────────────────────────────────────

type Holiday = {
  id: number
  name: string
  date: number    // day of month 1-31
  month: number   // 1-12
}

type FormState = {
  holiday_id: number
  name: string
  month: number
  date: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatHolidayDate(month: number, date: number) {
  return `${MONTH_SHORT[(month - 1) % 12]} ${date}`
}

const DAYS_IN_MONTH = Array.from({ length: 31 }, (_, i) => i + 1)

const DEFAULT_FORM: FormState = { holiday_id: 0, name: '', month: 1, date: 1 }

const LIMIT = 15

// ── Main component ────────────────────────────────────────────────────────────

export function Holidays() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState<FormState>(DEFAULT_FORM)
  const [deleteId, setDeleteId]   = useState<number | null>(null)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const { data: holidays = [], isLoading } = useQuery<Holiday[]>({
    queryKey: ['holidays'],
    queryFn: async () => {
      const res = await calltimeService.getAllHolidays()
      const d = res.data?.data ?? res.data
      if (!Array.isArray(d)) return []
      return d.map((h: Record<string, unknown>) => ({
        id:    Number(h.id),
        name:  String(h.name ?? ''),
        date:  Number(h.date),
        month: Number(h.month),
      }))
    },
  })

  // ── Client-side sort, search, pagination ───────────────────────────────────
  const sorted = [...holidays].sort((a, b) =>
    a.month !== b.month ? a.month - b.month : a.date - b.date
  )
  const filtered = sorted.filter(h =>
    !search || h.name.toLowerCase().includes(search.toLowerCase()) ||
    formatHolidayDate(h.month, h.date).toLowerCase().includes(search.toLowerCase())
  )
  const totalRows  = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalRows / LIMIT))
  const pageRows   = filtered.slice((page - 1) * LIMIT, page * LIMIT)

  // ── Save mutation ──────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => calltimeService.saveHoliday(form),
    onSuccess: (res) => {
      if (res.data?.success === 'false') {
        toast.error(res.data.message || 'Failed to save holiday')
        return
      }
      toast.success(res.data?.message || 'Holiday saved')
      qc.invalidateQueries({ queryKey: ['holidays'] })
      setShowModal(false)
    },
  })

  // ── Delete mutation ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => calltimeService.deleteHoliday(id),
    onSuccess: (res) => {
      if (res.data?.success === 'false') {
        toast.error(res.data.message || 'Failed to delete holiday')
        return
      }
      toast.success('Holiday deleted')
      qc.invalidateQueries({ queryKey: ['holidays'] })
      setDeleteId(null)
    },
  })

  // ── Handlers ───────────────────────────────────────────────────────────────
  function openCreate() {
    setForm(DEFAULT_FORM)
    setShowModal(true)
  }

  function openEdit(h: Holiday) {
    setForm({ holiday_id: h.id, name: h.name, month: h.month, date: h.date })
    setShowModal(true)
  }

  function handleSave() {
    if (!form.name.trim()) { toast.error('Please enter a holiday name'); return }
    saveMutation.mutate()
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Holiday Calendar</h1>
          <p className="page-subtitle">Define holidays so calls can be routed differently on those dates via the Holiday Calendar toggle on DIDs.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex-shrink-0 flex items-center gap-2">
          <Plus size={15} /> Add Holiday
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-slate-100 shadow-sm">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-amber-400 to-orange-500">
            <CalendarDays size={13} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 leading-none">Total Holidays</p>
            <p className="text-sm font-black text-slate-800 leading-none mt-0.5">{holidays.length}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          className="input pl-9"
          placeholder="Search holidays…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-4 py-3 text-left">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">#</div>
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <CalendarDays size={10} /> Holiday Name
                  </div>
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</div>
                </th>
                <th className="px-4 py-3 text-right">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center">
                    <Loader2 size={24} className="animate-spin text-indigo-400 mx-auto" />
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <CalendarDays size={24} className="text-slate-300" />
                      </div>
                      <p className="text-sm font-semibold text-slate-500">No holidays found</p>
                      <p className="text-xs text-slate-400">
                        {search ? 'Try a different search term' : 'Add holidays to enable holiday-based call routing on your DIDs'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((h, i) => (
                  <tr key={h.id} className="group border-b border-slate-100 hover:bg-slate-50/70 transition-colors last:border-b-0">
                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      {(page - 1) * LIMIT + i + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <CalendarDays size={14} className="text-white" />
                        </div>
                        <span className="font-semibold text-sm text-slate-900">{h.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                        {formatHolidayDate(h.month, h.date)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(h)}
                          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteId(h.id)}
                          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalRows > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white">
            <span className="text-xs text-slate-500">
              {totalRows === 0 ? 'No results' : `${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, totalRows)} of ${totalRows}`}
            </span>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setPage(1)} disabled={page === 1} className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40" title="First page">
                <ChevronsLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40" title="Previous page">
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
                        p === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      {p}
                    </button>
                  )
                )
              })()}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40" title="Next page">
                <ChevronRight size={14} />
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page >= totalPages} className="btn-ghost btn-sm px-1.5 py-1 disabled:opacity-40" title="Last page">
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                  <CalendarDays size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {form.holiday_id ? 'Edit Holiday' : 'Add Holiday'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Enter the holiday name and date</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="form-group mb-0">
                <label className="label">Holiday Name <span className="text-red-500">*</span></label>
                <input
                  className="input"
                  placeholder="e.g. Christmas Day, New Year's Day"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group mb-0">
                  <label className="label">Month <span className="text-red-500">*</span></label>
                  <select
                    className="input"
                    value={form.month}
                    onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="label">Day <span className="text-red-500">*</span></label>
                  <select
                    className="input"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: Number(e.target.value) }))}
                  >
                    {DAYS_IN_MONTH.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-1.5"
              >
                {saveMutation.isPending ? 'Saving…' : form.holiday_id ? 'Save Changes' : 'Add Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <p className="text-sm font-bold text-slate-900 mb-1.5">Delete Holiday?</p>
            <p className="text-xs text-slate-500 mb-6">
              This will permanently remove the holiday from the calendar. DIDs using the holiday calendar will no longer route differently on this date.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-outline flex-1">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteId!)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
