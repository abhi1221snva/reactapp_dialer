import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { cn } from '../../utils/cn'
import { Badge } from '../../components/ui/Badge'
import { Plus, Edit2, Trash2, Clock, Users, Sun, Sunset, Moon } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Shift {
  id: number
  name: string
  start_time: string
  end_time: string
  grace_period_minutes: number
  early_departure_minutes: number
  break_duration_minutes: number
  working_days: number[]
  is_default: boolean
  is_active: boolean
  user_id: number | null
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function shiftIcon(startTime: string) {
  const hour = parseInt(startTime.split(':')[0])
  if (hour >= 5 && hour < 13) return <Sun size={16} className="text-amber-500" />
  if (hour >= 13 && hour < 20) return <Sunset size={16} className="text-orange-500" />
  return <Moon size={16} className="text-indigo-400" />
}

function formatTime(t: string) {
  try {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12  = h % 12 || 12
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
  } catch { return t }
}

function shiftDuration(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface ShiftFormData {
  name: string
  start_time: string
  end_time: string
  grace_period_minutes: number
  early_departure_minutes: number
  break_duration_minutes: number
  working_days: number[]
  is_default: boolean
}

const defaultForm: ShiftFormData = {
  name: '',
  start_time: '09:00',
  end_time: '17:00',
  grace_period_minutes: 15,
  early_departure_minutes: 15,
  break_duration_minutes: 60,
  working_days: [1, 2, 3, 4, 5],
  is_default: false,
}

function ShiftForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial?: ShiftFormData & { id?: number }
  onSave: (data: ShiftFormData & { shift_id?: number }) => void
  onCancel: () => void
  loading: boolean
}) {
  const [form, setForm] = useState<ShiftFormData>(initial ?? defaultForm)

  const toggle = (f: keyof ShiftFormData, val: unknown) =>
    setForm(p => ({ ...p, [f]: val }))

  const toggleDay = (day: number) => {
    setForm(p => ({
      ...p,
      working_days: p.working_days.includes(day)
        ? p.working_days.filter(d => d !== day)
        : [...p.working_days, day].sort(),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Shift name is required'); return }
    if (form.working_days.length === 0) { toast.error('Select at least one working day'); return }
    onSave({ ...form, shift_id: (initial as Shift | undefined)?.id })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Shift Name *</label>
          <input
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.name}
            onChange={e => toggle('name', e.target.value)}
            placeholder="e.g. Morning Shift"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Start Time *</label>
            <input type="time" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={form.start_time} onChange={e => toggle('start_time', e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1">End Time *</label>
            <input type="time" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={form.end_time} onChange={e => toggle('end_time', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'grace_period_minutes', label: 'Grace Period (min)', help: 'Late tolerance' },
          { key: 'early_departure_minutes', label: 'Early Departure (min)', help: 'Early leave tolerance' },
          { key: 'break_duration_minutes', label: 'Break Duration (min)', help: 'Total allowed break' },
        ].map(({ key, label, help }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
            <input
              type="number"
              min={0}
              max={480}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={(form as unknown as Record<string, unknown>)[key] as number}
              onChange={e => toggle(key as keyof ShiftFormData, parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-slate-400 mt-0.5">{help}</p>
          </div>
        ))}
      </div>

      {/* Working days */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">Working Days *</label>
        <div className="flex gap-2 flex-wrap">
          {DAY_NAMES.map((name, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => toggleDay(idx)}
              className={cn(
                'w-10 h-10 rounded-xl text-xs font-semibold border transition-all',
                form.working_days.includes(idx)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Default toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_default} onChange={e => toggle('is_default', e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
        <span className="text-sm text-slate-700">Set as default shift</span>
      </label>

      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : (initial as Shift | undefined)?.id ? 'Save Changes' : 'Create Shift'}
        </button>
      </div>
    </form>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ShiftManagement() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Shift | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => api.post('/shift/list', { limit: 100, start: 0 }).then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d: ShiftFormData) => api.post('/shift/add', d),
    onSuccess: () => { toast.success('Shift created'); qc.invalidateQueries({ queryKey: ['shifts'] }); setShowForm(false) },
    onError: () => toast.error('Failed to create shift'),
  })

  const updateMut = useMutation({
    mutationFn: (d: ShiftFormData & { shift_id?: number }) => api.post('/shift/update', d),
    onSuccess: () => { toast.success('Shift updated'); qc.invalidateQueries({ queryKey: ['shifts'] }); setEditing(null) },
    onError: () => toast.error('Failed to update shift'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.post('/shift/delete', { shift_id: id }),
    onSuccess: () => { toast.success('Shift deleted'); qc.invalidateQueries({ queryKey: ['shifts'] }) },
  })

  const shifts: Shift[] = data?.data ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
          <Plus size={15} /> Add Shift
        </button>
      </div>

      {/* Form panel */}
      {(showForm || editing) && (
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-4">{editing ? 'Edit Shift' : 'Create New Shift'}</h3>
          <ShiftForm
            initial={editing ?? undefined}
            onSave={d => editing ? updateMut.mutate(d) : createMut.mutate(d)}
            onCancel={() => { setShowForm(false); setEditing(null) }}
            loading={createMut.isPending || updateMut.isPending}
          />
        </div>
      )}

      {/* Shifts grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card animate-pulse h-44" />)}
        </div>
      ) : shifts.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <Clock size={36} className="mx-auto mb-3 opacity-40" />
          <p className="font-semibold">No shifts configured</p>
          <p className="text-sm mt-1">Create your first shift to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map(shift => (
            <div key={shift.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {shiftIcon(shift.start_time)}
                  <h3 className="font-bold text-slate-900">{shift.name}</h3>
                  {shift.is_default && <Badge variant="purple">Default</Badge>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(shift); setShowForm(false) }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => { if (confirm('Delete this shift?')) deleteMut.mutate(shift.id) }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Hours</span>
                  <span className="font-semibold text-slate-900">
                    {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                    <span className="text-xs text-slate-400 ml-1">({shiftDuration(shift.start_time, shift.end_time)})</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Grace period</span>
                  <span className="font-medium">{shift.grace_period_minutes} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Break allowed</span>
                  <span className="font-medium">{shift.break_duration_minutes} min</span>
                </div>
              </div>

              {/* Working days */}
              <div className="flex gap-1 mt-3 flex-wrap">
                {DAY_NAMES.map((name, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center',
                      (shift.working_days ?? []).includes(idx)
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-50 text-slate-300'
                    )}
                  >
                    {name}
                  </span>
                ))}
              </div>

              {shift.user_id && (
                <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                  <Users size={11} />
                  <span>Assigned to specific agent</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
