import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Clock, Plus, Pencil, X, CheckCircle2, AlertCircle,
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, CalendarDays,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { calltimeService, DAY_KEYS, type DayKey, type DaySchedule } from '../../services/calltime.service'
import { cn } from '../../utils/cn'

// ── Types ────────────────────────────────────────────────────────────────────

type RawRow = {
  id: number
  name: string
  description: string
  day: string | null
  from_time: string | null
  to_time: string | null
  department_id: number | null
}

type Department = {
  id: number
  name: string
  description: string
  timings: Partial<Record<DayKey, { from: string; to: string }>>
}

type FormState = {
  name: string
  description: string
  dept_id: number
  schedule: Record<DayKey, DaySchedule>
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

const DAY_FULL: Record<DayKey, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
}

function buildDefaultSchedule(): Record<DayKey, DaySchedule> {
  return Object.fromEntries(
    DAY_KEYS.map(d => [d, { enabled: false, from: '09:00', to: '17:00' }])
  ) as Record<DayKey, DaySchedule>
}

function buildScheduleFromTimings(
  timings: Partial<Record<DayKey, { from: string; to: string }>>
): Record<DayKey, DaySchedule> {
  return Object.fromEntries(
    DAY_KEYS.map(d => {
      const t = timings[d]
      return [d, t
        ? { enabled: true,  from: t.from, to: t.to }
        : { enabled: false, from: '09:00', to: '17:00' }
      ]
    })
  ) as Record<DayKey, DaySchedule>
}

function groupRows(rows: RawRow[]): Department[] {
  const map = new Map<number, Department>()
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, { id: row.id, name: row.name, description: row.description, timings: {} })
    }
    if (row.day && row.from_time && row.to_time) {
      map.get(row.id)!.timings[row.day as DayKey] = { from: row.from_time, to: row.to_time }
    }
  }
  return Array.from(map.values())
}

function fmt12(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

const DEFAULT_FORM: FormState = {
  name: '', description: '', dept_id: 0, schedule: buildDefaultSchedule(),
}

const LIMIT = 10

// ── Main component ────────────────────────────────────────────────────────────

export function CallTimes() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState<FormState>(DEFAULT_FORM)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const { data: rawData, isLoading } = useQuery({
    queryKey: ['call-timings'],
    queryFn: async () => {
      const res = await calltimeService.getCallTimings()
      const d = res.data?.data ?? res.data
      return Array.isArray(d) ? (d as RawRow[]) : []
    },
  })

  const departments = rawData ? groupRows(rawData) : []

  // ── Client-side search + pagination ───────────────────────────────────────
  const filtered = departments.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.description.toLowerCase().includes(search.toLowerCase())
  )
  const totalRows  = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalRows / LIMIT))
  const pageRows   = filtered.slice((page - 1) * LIMIT, page * LIMIT)

  // Count total active days across all schedules
  const totalActiveDays = departments.reduce((sum, d) => sum + Object.keys(d.timings).length, 0)

  // ── Save mutation ──────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => calltimeService.saveCallTimings({
      name:        form.name,
      description: form.description,
      dept_id:     form.dept_id,
      schedule:    form.schedule,
    }),
    onSuccess: (res) => {
      if (res.data?.success === 'false') {
        toast.error(res.data.message || 'Failed to save schedule')
        return
      }
      toast.success(res.data?.message || 'Schedule saved successfully')
      qc.invalidateQueries({ queryKey: ['call-timings'] })
      qc.invalidateQueries({ queryKey: ['department-list'] })
      setShowModal(false)
    },
  })

  // ── Handlers ───────────────────────────────────────────────────────────────
  function openCreate() {
    setForm(DEFAULT_FORM)
    setShowModal(true)
  }

  function openEdit(dept: Department) {
    setForm({
      name:        dept.name,
      description: dept.description,
      dept_id:     dept.id,
      schedule:    buildScheduleFromTimings(dept.timings),
    })
    setShowModal(true)
  }

  function setDay(day: DayKey, field: keyof DaySchedule, value: string | boolean) {
    setForm(f => ({
      ...f,
      schedule: { ...f.schedule, [day]: { ...f.schedule[day], [field]: value } },
    }))
  }

  function handleSave() {
    if (!form.name.trim()) { toast.error('Please enter a schedule name'); return }
    const hasAnyDay = DAY_KEYS.some(d => form.schedule[d].enabled)
    if (!hasAnyDay) { toast.error('Please enable at least one business day'); return }
    for (const d of DAY_KEYS) {
      if (form.schedule[d].enabled) {
        if (!form.schedule[d].from || !form.schedule[d].to) {
          toast.error(`Please set hours for ${DAY_FULL[d]}`); return
        }
        if (form.schedule[d].from >= form.schedule[d].to) {
          toast.error(`${DAY_FULL[d]}: start time must be before end time`); return
        }
      }
    }
    saveMutation.mutate()
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Call Times</h1>
          <p className="page-subtitle">Define business-hour schedules that control when calls are routed normally or diverted.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex-shrink-0 flex items-center gap-2">
          <Plus size={15} /> New Schedule
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Total Schedules', value: departments.length, Icon: Clock,        bg: 'from-indigo-500 to-violet-600', iconCls: 'text-white' },
          { label: 'Active Day Slots', value: totalActiveDays,   Icon: CalendarDays, bg: 'bg-blue-100',                   iconCls: 'text-blue-600' },
        ].map(({ label, value, Icon, bg, iconCls }) => (
          <div key={label} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-slate-100 shadow-sm">
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', bg.startsWith('from') ? `bg-gradient-to-br ${bg}` : bg)}>
              <Icon size={13} className={iconCls} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 leading-none">{label}</p>
              <p className="text-sm font-black text-slate-800 leading-none mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          className="input pl-9"
          placeholder="Search schedules…"
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
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <Clock size={10} /> Schedule Name
                  </div>
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Description</div>
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Business Hours</div>
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
                        <Clock size={24} className="text-slate-300" />
                      </div>
                      <p className="text-sm font-semibold text-slate-500">No schedules found</p>
                      <p className="text-xs text-slate-400">
                        {search ? 'Try a different search term' : 'Create your first call time schedule to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map(dept => {
                  const openDays = DAY_KEYS.filter(d => dept.timings[d])
                  return (
                    <tr key={dept.id} className="group border-b border-slate-100 hover:bg-slate-50/70 transition-colors last:border-b-0">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Clock size={14} className="text-white" />
                          </div>
                          <span className="font-semibold text-sm text-slate-900">{dept.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{dept.description || '—'}</td>
                      <td className="px-4 py-3.5">
                        {openDays.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">No hours configured</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {openDays.map(d => {
                              const t = dept.timings[d]!
                              return (
                                <span
                                  key={d}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                                >
                                  {DAY_LABELS[d]} {fmt12(t.from)}–{fmt12(t.to)}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => openEdit(dept)}
                          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors ml-auto"
                        >
                          <Pencil size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                  <Clock size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {form.dept_id ? 'Edit Schedule' : 'New Schedule'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Set the name and business hours for this schedule</p>
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
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group mb-0">
                  <label className="label">Schedule Name <span className="text-red-500">*</span></label>
                  <input
                    className="input"
                    placeholder="e.g. Main Office, Night Shift"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="label">Description</label>
                  <input
                    className="input"
                    placeholder="Optional description"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <p className="label mb-3">Business Hours</p>
                <div className="space-y-2">
                  {DAY_KEYS.map(day => {
                    const s = form.schedule[day]
                    return (
                      <div
                        key={day}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors',
                          s.enabled ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-100 bg-slate-50/40'
                        )}
                      >
                        {/* Toggle */}
                        <div
                          className={cn(
                            'relative w-9 h-5 rounded-full flex-shrink-0 cursor-pointer transition-colors',
                            s.enabled ? 'bg-indigo-500' : 'bg-slate-200'
                          )}
                          onClick={() => setDay(day, 'enabled', !s.enabled)}
                        >
                          <div className={cn(
                            'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                            s.enabled ? 'translate-x-4' : 'translate-x-0'
                          )} />
                        </div>

                        <span className={cn('w-24 text-sm font-semibold flex-shrink-0', s.enabled ? 'text-slate-800' : 'text-slate-400')}>
                          {DAY_FULL[day]}
                        </span>

                        {s.enabled ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="time"
                              className="input py-1.5 text-xs w-32"
                              value={s.from}
                              onChange={e => setDay(day, 'from', e.target.value)}
                            />
                            <span className="text-xs text-slate-400">to</span>
                            <input
                              type="time"
                              className="input py-1.5 text-xs w-32"
                              value={s.to}
                              onChange={e => setDay(day, 'to', e.target.value)}
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Closed</span>
                        )}

                        {s.enabled ? (
                          <CheckCircle2 size={14} className="text-indigo-400 flex-shrink-0 ml-auto" />
                        ) : (
                          <AlertCircle size={14} className="text-slate-300 flex-shrink-0 ml-auto" />
                        )}
                      </div>
                    )
                  })}
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
                {saveMutation.isPending ? 'Saving…' : form.dept_id ? 'Save Changes' : 'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
