import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Timer, Plus, Pencil, Trash2, X, CheckCircle2, AlertCircle,
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignService } from '../../services/campaign.service'
import { DAY_KEYS, type DayKey, type DaySchedule } from '../../services/calltime.service'
import { cn } from '../../utils/cn'
import { useDialerHeader } from '../../layouts/DialerLayout'

// ── Types ────────────────────────────────────────────────────────────────────

type CallTimer = {
  id: number
  title: string
  week_plan: Record<string, { start: string; end: string }>
}

type FormState = {
  timer_id: number
  title: string
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

function buildScheduleFromWeekPlan(
  weekPlan: Record<string, { start: string; end: string }>
): Record<DayKey, DaySchedule> {
  return Object.fromEntries(
    DAY_KEYS.map(d => {
      const t = weekPlan[d]
      return [d, t
        ? { enabled: true, from: t.start, to: t.end }
        : { enabled: false, from: '09:00', to: '17:00' }
      ]
    })
  ) as Record<DayKey, DaySchedule>
}

function fmt12(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

const DEFAULT_FORM: FormState = {
  timer_id: 0, title: '', schedule: buildDefaultSchedule(),
}

const LIMIT = 10

// ── Main component ────────────────────────────────────────────────────────────

export function CallTimers() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState<FormState>(DEFAULT_FORM)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const { setToolbar } = useDialerHeader()

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const { data: timers = [], isLoading } = useQuery({
    queryKey: ['call-timers-list'],
    queryFn: async () => {
      const res = await campaignService.listCallTimers()
      const d = res.data?.data?.data ?? res.data?.data ?? res.data
      return Array.isArray(d) ? (d as CallTimer[]) : []
    },
  })

  // ── Client-side search + pagination ───────────────────────────────────────
  const filtered = timers.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  )
  const totalRows  = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalRows / LIMIT))
  const pageRows   = filtered.slice((page - 1) * LIMIT, page * LIMIT)

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => {
      const weekPlan: Record<string, { start: string; end: string }> = {}
      for (const d of DAY_KEYS) {
        if (form.schedule[d].enabled) {
          weekPlan[d] = { start: form.schedule[d].from, end: form.schedule[d].to }
        }
      }
      if (form.timer_id) {
        return campaignService.updateCallTimer(form.timer_id, { title: form.title, week_plan: weekPlan })
      }
      return campaignService.createCallTimer({ title: form.title, week_plan: weekPlan })
    },
    onSuccess: () => {
      toast.success(form.timer_id ? 'Timer updated' : 'Timer created')
      qc.invalidateQueries({ queryKey: ['call-timers-list'] })
      setShowModal(false)
    },
    onError: () => toast.error('Failed to save timer'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => campaignService.deleteCallTimer(id),
    onSuccess: () => {
      toast.success('Timer deleted')
      qc.invalidateQueries({ queryKey: ['call-timers-list'] })
    },
    onError: () => toast.error('Failed to delete timer'),
  })

  // ── Handlers ───────────────────────────────────────────────────────────────
  function openCreate() {
    setForm(DEFAULT_FORM)
    setShowModal(true)
  }

  function openEdit(timer: CallTimer) {
    setForm({
      timer_id: timer.id,
      title:    timer.title,
      schedule: buildScheduleFromWeekPlan(timer.week_plan ?? {}),
    })
    setShowModal(true)
  }

  function handleDelete(timer: CallTimer) {
    if (!window.confirm(`Delete "${timer.title}"? This cannot be undone.`)) return
    deleteMutation.mutate(timer.id)
  }

  function setDay(day: DayKey, field: keyof DaySchedule, value: string | boolean) {
    setForm(f => ({
      ...f,
      schedule: { ...f.schedule, [day]: { ...f.schedule[day], [field]: value } },
    }))
  }

  function handleSave() {
    if (!form.title.trim()) { toast.error('Please enter a timer name'); return }
    const hasAnyDay = DAY_KEYS.some(d => form.schedule[d].enabled)
    if (!hasAnyDay) { toast.error('Please enable at least one day'); return }
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

  // ── Toolbar injection ──────────────────────────────────────────────────────
  useEffect(() => {
    setToolbar(
      <>
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input type="text" value={search} placeholder="Search timers…" onChange={e => { setSearch(e.target.value); setPage(1) }} />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1) }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className="lt-divider" />
        <div className="lt-right">
          <button onClick={openCreate} className="lt-b lt-p">
            <Plus size={13} /> Add Timer
          </button>
        </div>
      </>
    )
    return () => setToolbar(undefined)
  })

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-4 py-3 text-left">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <Timer size={10} /> Timer Name
                  </div>
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Schedule</div>
                </th>
                <th className="px-4 py-3 text-right">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center">
                    <Loader2 size={24} className="animate-spin text-indigo-400 mx-auto" />
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Timer size={24} className="text-slate-300" />
                      </div>
                      <p className="text-sm font-semibold text-slate-500">No call timers found</p>
                      <p className="text-xs text-slate-400">
                        {search ? 'Try a different search term' : 'Create your first call timer to schedule outbound campaigns'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map(timer => {
                  const openDays = DAY_KEYS.filter(d => timer.week_plan?.[d])
                  return (
                    <tr key={timer.id} className="group border-b border-slate-100 hover:bg-slate-50/70 transition-colors last:border-b-0">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Timer size={14} className="text-white" />
                          </div>
                          <span className="font-semibold text-sm text-slate-900">{timer.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {openDays.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">No hours configured</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {openDays.map(d => {
                              const t = timer.week_plan[d]
                              return (
                                <span
                                  key={d}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                                >
                                  {DAY_LABELS[d]} {fmt12(t.start)}–{fmt12(t.end)}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => openEdit(timer)}
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(timer)}
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
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
                  <Timer size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {form.timer_id ? 'Edit Call Timer' : 'New Call Timer'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Set the name and weekly schedule for outbound campaigns</p>
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
              <div className="form-group mb-0">
                <label className="label">Timer Name <span className="text-red-500">*</span></label>
                <input
                  className="input"
                  placeholder="e.g. Weekday 9-5, Evening Shift"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div>
                <p className="label mb-3">Weekly Schedule</p>
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
                          <span className="text-xs text-slate-400 italic">Off</span>
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
                {saveMutation.isPending ? 'Saving…' : form.timer_id ? 'Save Changes' : 'Create Timer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
