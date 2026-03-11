import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Plus, X, Loader2, Calendar,
  Clock, MapPin, FileText, Trash2, AlertCircle, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { calendarService } from '../../services/calendar.service'
import { cn } from '../../utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string
  title: string
  description: string
  location: string
  all_day: boolean
  start: string | null
  end: string | null
  status: string
  html_link: string | null
  creator: string | null
  color_id: string | null
}

interface EventFormData {
  title: string
  description: string
  location: string
  all_day: boolean
  start_date: string
  end_date: string
  start_time: string
  end_time: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Google Calendar event colors (colorId → hex)
const EVENT_COLORS: Record<string, string> = {
  '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
  '5': '#f6bf26', '6': '#f4511e', '7': '#039be5', '8': '#616161',
  '9': '#3f51b5', '10': '#0b8043', '11': '#d50000',
  default: '#1a73e8',
}

function eventColor(e: CalendarEvent) {
  return EVENT_COLORS[e.color_id ?? ''] ?? EVENT_COLORS.default
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1)
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function getEventDate(e: CalendarEvent): string {
  const raw = e.start ?? ''
  return raw.length === 10 ? raw : raw.slice(0, 10)
}

// ─── Event Form Modal ─────────────────────────────────────────────────────────

function EventFormModal({
  initial,
  defaultDate,
  onClose,
  onSave,
  saving,
}: {
  initial?: CalendarEvent
  defaultDate?: string
  onClose: () => void
  onSave: (data: EventFormData) => void
  saving: boolean
}) {
  const today = toDateStr(new Date())
  const [form, setForm] = useState<EventFormData>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    location: initial?.location ?? '',
    all_day: initial?.all_day ?? false,
    start_date: initial ? getEventDate(initial) : (defaultDate ?? today),
    end_date: initial ? (initial.end?.slice(0, 10) ?? getEventDate(initial)) : (defaultDate ?? today),
    start_time: initial?.start && !initial.all_day
      ? new Date(initial.start).toTimeString().slice(0, 5)
      : '09:00',
    end_time: initial?.end && !initial.all_day
      ? new Date(initial.end).toTimeString().slice(0, 5)
      : '10:00',
  })

  const set = (k: keyof EventFormData, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title is required'); return }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800" style={{ fontFamily: 'Google Sans, sans-serif' }}>
            {initial ? 'Edit event' : 'New event'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Title */}
          <input
            autoFocus
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Add title"
            className="w-full text-xl font-normal border-0 border-b border-slate-200 pb-2 outline-none placeholder-slate-300 text-slate-800 focus:border-blue-500 transition-colors"
            required
          />

          {/* All-day toggle */}
          <div className="flex items-center gap-3">
            <Clock size={16} className="text-slate-400 shrink-0" />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.all_day}
                onChange={e => set('all_day', e.target.checked)}
                className="rounded accent-blue-600"
              />
              <span className="text-sm text-slate-600">All day</span>
            </label>
          </div>

          {/* Dates */}
          <div className="flex items-start gap-3">
            <Clock size={16} className="text-slate-400 shrink-0 mt-2.5" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 text-slate-700" />
                {!form.all_day && (
                  <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)}
                    className="w-28 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 text-slate-700" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
                  min={form.start_date}
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 text-slate-700" />
                {!form.all_day && (
                  <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)}
                    className="w-28 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 text-slate-700" />
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3">
            <MapPin size={16} className="text-slate-400 shrink-0" />
            <input value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="Add location"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 text-slate-700 placeholder-slate-400" />
          </div>

          {/* Description */}
          <div className="flex items-start gap-3">
            <FileText size={16} className="text-slate-400 shrink-0 mt-2" />
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Add description"
              rows={3}
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 text-slate-700 placeholder-slate-400 resize-none" />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-full disabled:opacity-60 transition-colors"
              style={{ background: '#1a73e8' }}>
              {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : (initial ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Event Detail Popover ─────────────────────────────────────────────────────

function EventDetail({
  event,
  onClose,
  onEdit,
  onDelete,
  deleting,
}: {
  event: CalendarEvent
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const color = eventColor(event)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Color bar + toolbar */}
        <div className="flex items-center justify-between px-4 py-3" style={{ background: color }}>
          <span className="text-white text-sm font-semibold truncate max-w-[220px]">{event.title}</span>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onClick={onDelete} disabled={deleting} className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors" title="Delete">
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
            {event.html_link && (
              <a href={event.html_link} target="_blank" rel="noreferrer"
                className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors" title="Open in Google Calendar">
                <ExternalLink size={14} />
              </a>
            )}
            <button onClick={onClose} className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Date/time */}
          <div className="flex items-start gap-3">
            <Clock size={15} className="text-slate-400 shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700">
              {event.all_day ? (
                <span>{event.start}</span>
              ) : (
                <span>{formatDateTime(event.start)}{event.end ? ` – ${formatTime(event.end)}` : ''}</span>
              )}
            </div>
          </div>

          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700">{event.location}</p>
            </div>
          )}

          {event.description && (
            <div className="flex items-start gap-3">
              <FileText size={15} className="text-slate-400 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {event.creator && (
            <div className="flex items-center gap-3">
              <Calendar size={15} className="text-slate-400 shrink-0" />
              <p className="text-xs text-slate-500">{event.creator}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Mini Month Picker (sidebar) ──────────────────────────────────────────────

function MiniMonth({
  year, month, selectedDate, onSelectDate, onNavigate,
}: {
  year: number; month: number; selectedDate: string
  onSelectDate: (d: string) => void
  onNavigate: (dir: 1 | -1) => void
}) {
  const firstDay = startOfMonth(year, month).getDay()
  const days = daysInMonth(year, month)
  const today = toDateStr(new Date())

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-700">
          {MONTH_NAMES[month]} {year}
        </span>
        <div className="flex gap-1">
          <button onClick={() => onNavigate(-1)} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
            <ChevronLeft size={12} />
          </button>
          <button onClick={() => onNavigate(1)} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-slate-400 py-0.5">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate
          return (
            <button
              key={i}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                'text-[11px] w-6 h-6 mx-auto flex items-center justify-center rounded-full transition-colors',
                isSelected ? 'text-white font-bold' : isToday ? 'font-bold' : 'hover:bg-slate-100 text-slate-700'
              )}
              style={isSelected ? { background: '#1a73e8' } : isToday ? { color: '#1a73e8' } : undefined}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Calendar Component ──────────────────────────────────────────────────

export function GoogleCalendar() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const today = new Date()
  const [viewYear, setViewYear]     = useState(today.getFullYear())
  const [viewMonth, setViewMonth]   = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(toDateStr(today))
  const [showForm, setShowForm]     = useState(false)
  const [formDefaultDate, setFormDefaultDate] = useState<string | undefined>()
  const [editingEvent, setEditingEvent]   = useState<CalendarEvent | null>(null)
  const [detailEvent, setDetailEvent]     = useState<CalendarEvent | null>(null)

  // OAuth callback params
  useState(() => {
    const status = searchParams.get('status')
    if (status === 'success') {
      toast.success('Google Calendar connected!')
      qc.invalidateQueries({ queryKey: ['calendar-status'] })
    } else if (status === 'error') {
      const msg = searchParams.get('message')
      toast.error(msg ? decodeURIComponent(msg) : 'Failed to connect Google Calendar')
    }
    if (status) setSearchParams({}, { replace: true })
  })

  // Status check (raw fetch)
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['calendar-status'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/calendar/status`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      )
      if (!res.ok) return { connected: false }
      const json = await res.json()
      return json?.data ?? json
    },
    retry: 0,
    staleTime: 30_000,
  })

  const connected = (statusData as { connected?: boolean })?.connected ?? false

  // Compute time range for the current month view (+ padding days)
  const { timeMin, timeMax } = useMemo(() => {
    const start = new Date(viewYear, viewMonth, 1)
    start.setDate(start.getDate() - 7)
    const end = new Date(viewYear, viewMonth + 1, 1)
    end.setDate(end.getDate() + 7)
    return {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
    }
  }, [viewYear, viewMonth])

  // Events query
  const { data: events = [], isLoading: eventsLoading, error: eventsError } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events', timeMin, timeMax],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await calendarService.getEvents(timeMin, timeMax) as any
      return res.data?.data?.events ?? []
    },
    enabled: connected,
    staleTime: 60_000,
  })

  // Group events by date string
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const e of events) {
      const date = getEventDate(e)
      if (!map[date]) map[date] = []
      map[date].push(e)
    }
    return map
  }, [events])

  // Events for the selected date (for the sidebar list)
  const selectedDateEvents = eventsByDate[selectedDate] ?? []

  // Create mutation
  const createMut = useMutation({
    mutationFn: (form: EventFormData) => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (form.all_day) {
        return calendarService.createEvent({
          title: form.title, description: form.description, location: form.location,
          all_day: true, start_date: form.start_date, end_date: form.end_date,
        })
      }
      return calendarService.createEvent({
        title: form.title, description: form.description, location: form.location,
        all_day: false,
        start_datetime: `${form.start_date}T${form.start_time}:00`,
        end_datetime: `${form.end_date}T${form.end_time}:00`,
        timezone: tz,
      })
    },
    onSuccess: () => {
      toast.success('Event created')
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['calendar-events'] })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to create event'
      toast.error(msg, { duration: 6000 })
    },
  })

  // Update mutation
  const updateMut = useMutation({
    mutationFn: ({ id, form }: { id: string; form: EventFormData }) => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (form.all_day) {
        return calendarService.updateEvent(id, {
          title: form.title, description: form.description, location: form.location,
          all_day: true, start_date: form.start_date, end_date: form.end_date,
        })
      }
      return calendarService.updateEvent(id, {
        title: form.title, description: form.description, location: form.location,
        all_day: false,
        start_datetime: `${form.start_date}T${form.start_time}:00`,
        end_datetime: `${form.end_date}T${form.end_time}:00`,
        timezone: tz,
      })
    },
    onSuccess: () => {
      toast.success('Event updated')
      setEditingEvent(null)
      setDetailEvent(null)
      qc.invalidateQueries({ queryKey: ['calendar-events'] })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to update event'
      toast.error(msg, { duration: 6000 })
    },
  })

  // Delete mutation
  const deleteMut = useMutation({
    mutationFn: (id: string) => calendarService.deleteEvent(id),
    onSuccess: () => {
      toast.success('Event deleted')
      setDetailEvent(null)
      qc.invalidateQueries({ queryKey: ['calendar-events'] })
    },
    onError: () => toast.error('Failed to delete event'),
  })

  const navigateMonth = (dir: 1 | -1) => {
    setViewMonth(m => {
      let nm = m + dir
      if (nm < 0) { setViewYear(y => y - 1); return 11 }
      if (nm > 11) { setViewYear(y => y + 1); return 0 }
      return nm
    })
  }

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr)
  }

  const handleDayDoubleClick = (dateStr: string) => {
    setFormDefaultDate(dateStr)
    setShowForm(true)
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin" style={{ color: '#1a73e8' }} />
      </div>
    )
  }

  // ── Not connected ─────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#e8f0fe' }}>
          <Calendar size={28} style={{ color: '#1a73e8' }} />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">Google Calendar Not Connected</h2>
          <p className="text-sm text-slate-500 mt-1">Connect your Google Calendar to view and manage events.</p>
        </div>
        <button
          onClick={() => navigate('/profile', { state: { section: 'integrations' } })}
          className="px-5 py-2 rounded-full text-sm font-medium text-white"
          style={{ background: '#1a73e8' }}
        >
          Connect Google Calendar
        </button>
      </div>
    )
  }

  // ── Calendar grid ─────────────────────────────────────────────────────────
  const firstDayOfMonth = startOfMonth(viewYear, viewMonth).getDay()
  const totalDays = daysInMonth(viewYear, viewMonth)
  const todayStr = toDateStr(new Date())

  // Build grid cells (null = empty, number = day)
  const gridCells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (gridCells.length % 7 !== 0) gridCells.push(null)

  return (
    <div className="flex rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
      style={{ height: 'calc(100vh - 120px)', background: 'white', fontFamily: 'Roboto, Google Sans, sans-serif' }}>

      {/* ── LEFT SIDEBAR ───────────────────────────────────────────────── */}
      <div className="w-56 flex-shrink-0 border-r border-slate-100 flex flex-col overflow-y-auto"
        style={{ background: '#f6f8fc' }}>

        {/* Create button */}
        <div className="p-3">
          <button
            onClick={() => { setFormDefaultDate(selectedDate); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-sm hover:shadow-md text-sm font-medium text-slate-700 transition-all w-full"
            style={{ background: 'white' }}
          >
            <Plus size={20} style={{ color: '#1a73e8' }} />
            Create
          </button>
        </div>

        {/* Mini calendar */}
        <MiniMonth
          year={viewYear}
          month={viewMonth}
          selectedDate={selectedDate}
          onSelectDate={d => {
            setSelectedDate(d)
            const [y, m] = d.split('-').map(Number)
            setViewYear(y)
            setViewMonth(m - 1)
          }}
          onNavigate={navigateMonth}
        />

        {/* Selected day events */}
        <div className="px-3 pt-3 flex-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {selectedDateEvents.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No events</p>
          ) : (
            <div className="space-y-1">
              {selectedDateEvents.map(e => (
                <button
                  key={e.id}
                  onClick={() => setDetailEvent(e)}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-white"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: eventColor(e) }} />
                    <span className="font-medium text-slate-800 truncate">{e.title}</span>
                  </div>
                  {!e.all_day && e.start && (
                    <p className="text-slate-400 ml-3.5 text-[10px] mt-0.5">{formatTime(e.start)}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CALENDAR AREA ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-100 flex-shrink-0">
          {/* Today button */}
          <button
            onClick={() => {
              const t = new Date()
              setViewYear(t.getFullYear())
              setViewMonth(t.getMonth())
              setSelectedDate(toDateStr(t))
            }}
            className="px-4 py-1.5 text-sm border border-slate-300 rounded-full hover:bg-slate-50 text-slate-700 transition-colors"
          >
            Today
          </button>

          {/* Month navigation */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigateMonth(-1)} className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => navigateMonth(1)} className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          <h2 className="text-xl font-normal text-slate-800" style={{ fontFamily: 'Google Sans, sans-serif' }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h2>

          {eventsLoading && <Loader2 size={16} className="animate-spin ml-2" style={{ color: '#1a73e8' }} />}

          <div className="ml-auto flex items-center gap-2">
            {eventsError && (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle size={13} />
                Failed to load events
              </div>
            )}
            <button
              onClick={() => { setFormDefaultDate(selectedDate); setShowForm(true) }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium text-white transition-colors"
              style={{ background: '#1a73e8' }}
            >
              <Plus size={15} /> New event
            </button>
          </div>
        </div>

        {/* Day header row */}
        <div className="grid grid-cols-7 border-b border-slate-100 flex-shrink-0">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7 h-full" style={{ gridAutoRows: 'minmax(90px, 1fr)' }}>
            {gridCells.map((day, idx) => {
              if (!day) {
                return (
                  <div key={idx}
                    className="border-r border-b border-slate-100 bg-slate-50/50 min-h-[90px]" />
                )
              }

              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const dayEvents = eventsByDate[dateStr] ?? []
              const isCurrentMonth = true

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(dateStr)}
                  onDoubleClick={() => handleDayDoubleClick(dateStr)}
                  className={cn(
                    'border-r border-b border-slate-100 p-1.5 cursor-pointer min-h-[90px] flex flex-col transition-colors',
                    isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50',
                    !isCurrentMonth && 'opacity-40'
                  )}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-center mb-1">
                    <span
                      className={cn(
                        'w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition-colors',
                        isToday ? 'text-white font-bold' : isSelected ? 'font-semibold text-slate-900' : 'text-slate-700'
                      )}
                      style={isToday ? { background: '#1a73e8' } : undefined}
                    >
                      {day}
                    </span>
                  </div>

                  {/* Events on this day */}
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 3).map(e => (
                      <button
                        key={e.id}
                        onClick={ev => { ev.stopPropagation(); setDetailEvent(e) }}
                        className="w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate text-white transition-opacity hover:opacity-80"
                        style={{ background: eventColor(e) }}
                      >
                        {e.all_day ? e.title : `${formatTime(e.start)} ${e.title}`}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <button
                        onClick={ev => { ev.stopPropagation(); setSelectedDate(dateStr) }}
                        className="text-[11px] text-slate-500 hover:text-slate-700 px-1.5 font-medium"
                      >
                        +{dayEvents.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}

      {/* Create form */}
      {showForm && (
        <EventFormModal
          defaultDate={formDefaultDate}
          onClose={() => setShowForm(false)}
          onSave={form => createMut.mutate(form)}
          saving={createMut.isPending}
        />
      )}

      {/* Edit form */}
      {editingEvent && (
        <EventFormModal
          initial={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={form => updateMut.mutate({ id: editingEvent.id, form })}
          saving={updateMut.isPending}
        />
      )}

      {/* Event detail */}
      {detailEvent && !editingEvent && (
        <EventDetail
          event={detailEvent}
          onClose={() => setDetailEvent(null)}
          onEdit={() => { setEditingEvent(detailEvent); setDetailEvent(null) }}
          onDelete={() => deleteMut.mutate(detailEvent.id)}
          deleting={deleteMut.isPending}
        />
      )}
    </div>
  )
}
