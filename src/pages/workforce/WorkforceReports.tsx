import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { workforceService } from '../../services/workforce.service'
import { cn } from '../../utils/cn'
import { formatDuration } from '../../utils/format'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { Download, BarChart3, Users, Clock } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductivityRow {
  user_id: number
  name: string
  email: string
  days_present: number
  days_late: number
  attendance_hours: number
  break_hours: number
  working_hours: number
  overtime_hours: number
  total_calls: number
  answered_calls: number
  talk_time_seconds: number
  talk_time_hours: number
  idle_hours: number
  utilization_percent: number
  [key: string]: unknown
}

interface IdleRow {
  user_id: number
  name: string
  work_hours: number
  talk_hours: number
  idle_hours: number
  idle_percent: number
  [key: string]: unknown
}

interface StaffingReportRow {
  campaign_id: number
  campaign_name: string
  required_agents: number
  avg_daily_agents: number
  coverage_pct: number
  is_active: boolean
  [key: string]: unknown
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function UtilBadge({ pct }: { pct: number }) {
  const variant = pct >= 70 ? 'green' : pct >= 40 ? 'yellow' : 'red'
  return <Badge variant={variant}>{pct}%</Badge>
}

function getDefaultDates() {
  const to   = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 29)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { from: fmt(from), to: fmt(to) }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ['Productivity', 'Campaign Staffing', 'Idle Time']

export function WorkforceReports() {
  const [tab, setTab] = useState('Productivity')
  const defaults = getDefaultDates()
  const [dateFrom, setDateFrom] = useState(defaults.from)
  const [dateTo, setDateTo]     = useState(defaults.to)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workforce Reports</h1>
          <p className="page-subtitle">Productivity, staffing coverage, and idle time analysis</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-5 py-1.5 rounded-lg text-sm font-semibold transition-all',
              tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t}
          </button>
        ))}
      </div>

      {/* Date filter — shared across tabs */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
      </div>

      {tab === 'Productivity'       && <ProductivityTab dateFrom={dateFrom} dateTo={dateTo} />}
      {tab === 'Campaign Staffing'  && <StaffingTab     dateFrom={dateFrom} dateTo={dateTo} />}
      {tab === 'Idle Time'          && <IdleTab         dateFrom={dateFrom} dateTo={dateTo} />}
    </div>
  )
}

// ─── Productivity Tab ─────────────────────────────────────────────────────────

function ProductivityTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['wf-productivity', dateFrom, dateTo],
    queryFn: () => workforceService.getProductivityReport({ date_from: dateFrom, date_to: dateTo, limit: 200 })
      .then(r => r.data as { data: ProductivityRow[]; total: number }),
    enabled: !!(dateFrom && dateTo),
  })

  const rows: ProductivityRow[] = data?.data ?? []

  const handleExport = () => {
    const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo, export: 'true' })
    window.open(`${import.meta.env.VITE_API_URL || ''}/workforce/report/productivity?${params}`)
  }

  const columns: Column<ProductivityRow>[] = [
    {
      key: 'name', header: 'Agent',
      render: r => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">{r.name}</p>
          <p className="text-xs text-slate-400">{r.email}</p>
        </div>
      ),
    },
    { key: 'days_present', header: 'Days Present', render: r => <span className="font-semibold">{r.days_present}</span> },
    {
      key: 'working_hours', header: 'Work Hours',
      render: r => <span className="font-mono text-sm">{r.working_hours}h</span>,
    },
    {
      key: 'total_calls', header: 'Calls',
      render: r => (
        <div className="text-sm">
          <p className="font-semibold">{r.total_calls}</p>
          <p className="text-xs text-slate-400">{r.answered_calls} answered</p>
        </div>
      ),
    },
    {
      key: 'talk_time_hours', header: 'Talk Time',
      render: r => <span className="font-mono text-sm">{r.talk_time_hours > 0 ? formatDuration(r.talk_time_seconds) : '—'}</span>,
    },
    {
      key: 'idle_hours', header: 'Idle Time',
      render: r => <span className="font-mono text-sm text-slate-500">{r.idle_hours}h</span>,
    },
    {
      key: 'utilization_percent', header: 'Utilization',
      render: r => <UtilBadge pct={r.utilization_percent} />,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">Agent productivity ranked by utilization score (Talk Time / Work Hours)</p>
        <button onClick={handleExport} className="btn-outline gap-2 text-sm">
          <Download size={14} /> Export CSV
        </button>
      </div>
      <div className="card overflow-hidden p-0">
        <DataTable columns={columns} data={rows} loading={isLoading} emptyText="No data for selected period" />
      </div>
    </div>
  )
}

// ─── Staffing Tab ─────────────────────────────────────────────────────────────

function StaffingTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['wf-staffing-report', dateFrom, dateTo],
    queryFn: () => workforceService.getStaffingReport({ date_from: dateFrom, date_to: dateTo })
      .then(r => r.data as { data: StaffingReportRow[] }),
    enabled: !!(dateFrom && dateTo),
  })

  const rows: StaffingReportRow[] = data?.data ?? []

  const columns: Column<StaffingReportRow>[] = [
    {
      key: 'campaign_name', header: 'Campaign',
      render: r => (
        <div>
          <p className="font-semibold text-sm">{r.campaign_name}</p>
          <Badge variant={r.is_active ? 'green' : 'gray'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
        </div>
      ),
    },
    { key: 'required_agents', header: 'Required', render: r => <span className="font-semibold">{r.required_agents}</span> },
    { key: 'avg_daily_agents', header: 'Avg Daily Agents', render: r => <span className="font-mono">{r.avg_daily_agents}</span> },
    {
      key: 'coverage_pct', header: 'Coverage',
      render: r => (
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', r.coverage_pct >= 100 ? 'bg-emerald-500' : r.coverage_pct >= 70 ? 'bg-amber-500' : 'bg-red-500')}
              style={{ width: `${Math.min(100, r.coverage_pct)}%` }}
            />
          </div>
          <span className="text-sm font-semibold">{r.coverage_pct}%</span>
        </div>
      ),
    },
  ]

  return (
    <div className="card overflow-hidden p-0">
      <DataTable columns={columns} data={rows} loading={isLoading} emptyText="No staffing data. Configure requirements in Campaign Settings first." />
    </div>
  )
}

// ─── Idle Time Tab ────────────────────────────────────────────────────────────

function IdleTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['wf-idle', dateFrom, dateTo],
    queryFn: () => workforceService.getIdleReport({ date_from: dateFrom, date_to: dateTo })
      .then(r => r.data as { data: IdleRow[] }),
    enabled: !!(dateFrom && dateTo),
  })

  const rows: IdleRow[] = data?.data ?? []

  const columns: Column<IdleRow>[] = [
    { key: 'name', header: 'Agent', render: r => <span className="font-semibold text-sm">{r.name}</span> },
    { key: 'work_hours', header: 'Work Hours', render: r => <span className="font-mono text-sm">{r.work_hours}h</span> },
    { key: 'talk_hours', header: 'Talk Hours', render: r => <span className="font-mono text-sm text-blue-700">{r.talk_hours}h</span> },
    { key: 'idle_hours', header: 'Idle Hours', render: r => <span className="font-mono text-sm text-amber-700">{r.idle_hours}h</span> },
    {
      key: 'idle_percent', header: 'Idle %',
      render: r => (
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', r.idle_percent > 50 ? 'bg-red-400' : r.idle_percent > 25 ? 'bg-amber-400' : 'bg-emerald-400')}
              style={{ width: `${r.idle_percent}%` }}
            />
          </div>
          <span className="text-sm font-semibold">{r.idle_percent}%</span>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Agents sorted by highest idle time. Idle = Work Hours − Talk Hours.</p>
      <div className="card overflow-hidden p-0">
        <DataTable columns={columns} data={rows} loading={isLoading} emptyText="No data for selected period" />
      </div>
    </div>
  )
}
