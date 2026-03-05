import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Clock, Coffee, LogIn, LogOut, Calendar, CheckCircle2, Timer } from 'lucide-react'
import toast from 'react-hot-toast'
import { attendanceService } from '../../services/attendance.service'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatDateTime, formatDuration } from '../../utils/format'
import { cn } from '../../utils/cn'

const TABS = ['Today', 'History']

interface AttendanceRecord { id: number; date: string; clock_in: string; clock_out?: string; total_hours?: number; status: string; [key: string]: unknown }

const BREAK_TYPES = [
  { type: 'Short Break', duration: '10 min', emoji: '☕' },
  { type: 'Lunch', duration: '30 min', emoji: '🍱' },
  { type: 'Personal', duration: 'Flexible', emoji: '🚶' },
]

export function Attendance() {
  const [tab, setTab] = useState('Today')

  const { data: todayData, refetch } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => attendanceService.getToday(),
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['attendance-history'],
    queryFn: () => attendanceService.getHistory(),
    enabled: tab === 'History',
  })

  const clockInMutation = useMutation({
    mutationFn: () => attendanceService.clockIn(),
    onSuccess: () => { toast.success('Clocked in!'); refetch() },
  })

  const clockOutMutation = useMutation({
    mutationFn: () => attendanceService.clockOut(),
    onSuccess: () => { toast.success('Clocked out!'); refetch() },
  })

  const breakMutation = useMutation({
    mutationFn: (type: string) => attendanceService.startBreak(type),
    onSuccess: () => { toast.success('Break started'); refetch() },
  })

  const endBreakMutation = useMutation({
    mutationFn: () => attendanceService.endBreak(),
    onSuccess: () => { toast.success('Break ended'); refetch() },
  })

  const today = todayData?.data?.data
  const history: AttendanceRecord[] = historyData?.data?.data || []

  const isClockedIn = !!today?.clock_in && !today?.clock_out
  const isOnBreak = !!today?.active_break

  const historyColumns: Column<AttendanceRecord>[] = [
    { key: 'date', header: 'Date', render: r => <span className="text-sm font-medium text-slate-700">{r.date as string}</span> },
    { key: 'clock_in', header: 'Clock In', render: r => <span className="text-sm text-slate-600 font-mono">{formatDateTime(r.clock_in)}</span> },
    { key: 'clock_out', header: 'Clock Out', render: r => r.clock_out
      ? <span className="text-sm text-slate-600 font-mono">{formatDateTime(r.clock_out)}</span>
      : <span className="text-xs text-emerald-600 font-semibold">Active</span>
    },
    { key: 'total_hours', header: 'Hours', render: r => (
      <span className="text-sm font-semibold text-slate-700">
        {r.total_hours ? formatDuration(Number(r.total_hours) * 3600) : '—'}
      </span>
    )},
    {
      key: 'status', header: 'Status',
      render: r => <Badge variant={r.status === 'present' ? 'green' : r.status === 'late' ? 'yellow' : 'gray'}>{r.status}</Badge>,
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="page-subtitle">Track your work hours and breaks</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
          <Calendar size={14} />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-5 py-1.5 rounded-lg text-sm font-semibold transition-all',
              tab === t
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Today' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Clock in/out card */}
          <div className="card flex flex-col items-center gap-5 py-10">
            <div className="relative">
              {isClockedIn && (
                <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
              )}
              <div className={cn(
                'relative w-24 h-24 rounded-full flex items-center justify-center shadow-md',
                isClockedIn
                  ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                  : 'bg-gradient-to-br from-slate-300 to-slate-400'
              )}>
                <Clock size={44} className="text-white" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">
                {!isClockedIn ? 'Not Clocked In' : isOnBreak ? 'On Break' : 'Clocked In'}
              </p>
              {today?.clock_in && (
                <p className="text-sm text-slate-500 mt-1">
                  Since {formatDateTime(today.clock_in)}
                </p>
              )}
            </div>

            {!isClockedIn ? (
              <button
                onClick={() => clockInMutation.mutate()}
                disabled={clockInMutation.isPending}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all disabled:opacity-60"
              >
                <LogIn size={18} /> {clockInMutation.isPending ? 'Clocking in…' : 'Clock In'}
              </button>
            ) : (
              <button
                onClick={() => clockOutMutation.mutate()}
                disabled={clockOutMutation.isPending}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold shadow-lg shadow-red-200 hover:shadow-red-300 transition-all disabled:opacity-60"
              >
                <LogOut size={18} /> {clockOutMutation.isPending ? 'Clocking out…' : 'Clock Out'}
              </button>
            )}
          </div>

          {/* Breaks card */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Coffee size={16} className="text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-900">Breaks</h3>
            </div>

            {!isClockedIn && (
              <p className="text-sm text-slate-400 text-center py-6">Clock in first to take breaks</p>
            )}

            {isClockedIn && isOnBreak && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                  <Coffee size={16} className="text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">Currently on break</span>
                </div>
                <button
                  onClick={() => endBreakMutation.mutate()}
                  disabled={endBreakMutation.isPending}
                  className="btn-outline w-full gap-2"
                >
                  <CheckCircle2 size={15} /> End Break
                </button>
              </div>
            )}

            {isClockedIn && !isOnBreak && (
              <div className="space-y-2">
                {BREAK_TYPES.map(({ type, duration, emoji }) => (
                  <button
                    key={type}
                    onClick={() => breakMutation.mutate(type)}
                    disabled={breakMutation.isPending}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-amber-200 hover:bg-amber-50 text-sm text-slate-700 transition-all group"
                  >
                    <span className="text-lg">{emoji}</span>
                    <div className="text-left">
                      <p className="font-semibold group-hover:text-amber-800">{type}</p>
                      <p className="text-xs text-slate-400">{duration}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Today's stats */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Timer size={16} className="text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-900">Today's Stats</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Total Hours', value: today?.total_hours ? formatDuration(today.total_hours * 3600) : '—', color: 'text-indigo-700' },
                { label: 'Break Time', value: today?.break_minutes ? `${today.break_minutes}m` : '0m', color: 'text-amber-700' },
                { label: 'Status', value: today?.status || 'Absent', color: 'text-slate-900' },
              ].map(stat => (
                <div key={stat.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-500">{stat.label}</span>
                  <span className={cn('text-sm font-bold capitalize', stat.color)}>{String(stat.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'History' && (
        <div className="card overflow-hidden p-0">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Attendance History</h3>
          </div>
          <DataTable
            columns={historyColumns}
            data={history}
            loading={historyLoading}
            emptyText="No attendance records found"
          />
        </div>
      )}
    </div>
  )
}
