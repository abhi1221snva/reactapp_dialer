import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Users, TrendingUp, UserPlus, Send, CheckCircle2,
  DollarSign, Loader2, ArrowRight, FileText,
  Clock, MessageSquare, Mail, AlertTriangle,
  CalendarCheck, ClipboardList,
} from 'lucide-react'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { useAuthStore } from '../../stores/auth.store'
import { cn } from '../../utils/cn'

// ─── Types ──────────────────────────────────────────────────────────────────

interface AgentDashboardData {
  summary: {
    total_leads: number
    new_today: number
    submitted: number
    approved: number
    funded: number
    conversion_rate: number
  }
  recent_leads: {
    id: number
    business_name?: string
    lead_status: string
    lead_type: string
    created_at: string
  }[]
  status_breakdown: { status: string; count: number }[]
  monthly_trend: { month: string; leads: number }[]
  recent_activity: {
    id: number
    lead_id: number
    activity_type: string
    subject: string
    created_at: string
  }[]
  tasks: {
    today: TaskItem[]
    overdue: TaskItem[]
    upcoming: TaskItem[]
  }
}

interface TaskItem {
  id: number
  lead_id: number
  task_name: string
  date: string
  time: string
  notes?: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

const STATUS_COLORS: Record<string, string> = {
  new_lead: 'bg-slate-100 text-slate-600',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  docs_in: 'bg-cyan-100 text-cyan-700',
  app_out: 'bg-indigo-100 text-indigo-700',
  funded: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-600',
  contract_in: 'bg-teal-100 text-teal-700',
  contract_out: 'bg-violet-100 text-violet-700',
  missing_docs_info: 'bg-orange-100 text-orange-700',
}

const TYPE_COLORS: Record<string, string> = {
  hot: 'bg-red-100 text-red-700',
  warm: 'bg-amber-100 text-amber-700',
  cold: 'bg-blue-100 text-blue-700',
}

const ACTIVITY_ICONS: Record<string, typeof FileText> = {
  note_added: MessageSquare,
  email_sent: Mail,
  system: Clock,
  lender_submitted: Send,
  lender_response: CheckCircle2,
  lead_created: UserPlus,
  field_update: ClipboardList,
  document_uploaded: FileText,
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  return 'Good evening'
}

const num = (n: number) => new Intl.NumberFormat('en-US').format(n ?? 0)
const pct = (n: number) => `${(n ?? 0).toFixed(1)}%`

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtMonth(m: string) {
  const [, mo] = m.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[parseInt(mo, 10) - 1] ?? mo
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function fmtStatus(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CrmAgentDashboard() {
  const navigate = useNavigate()
  const { setDescription, setActions } = useCrmHeader()
  const { user } = useAuthStore()

  const greeting = getGreeting()
  const displayName = user?.first_name || user?.name?.split(' ')[0] || ''
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  useEffect(() => {
    setDescription('Your sales command center')
    setActions(null)
    return () => { setDescription(undefined); setActions(undefined) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['agent-dashboard'],
    queryFn: async () => {
      const res = await crmService.getAgentDashboard()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((res.data as any)?.data ?? res.data) as AgentDashboardData
    },
    staleTime: 60_000,
  })

  const data = rawData ?? null

  // ── Summary values ────────────────────────────────────────────────────────
  const summary = data?.summary
  const recentLeads = data?.recent_leads ?? []
  const statusBreakdown = data?.status_breakdown ?? []
  const monthlyTrend = data?.monthly_trend ?? []
  const recentActivity = data?.recent_activity ?? []
  const tasks = data?.tasks ?? { today: [], overdue: [], upcoming: [] }
  const hasTasks = tasks.today.length > 0 || tasks.overdue.length > 0 || tasks.upcoming.length > 0

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-6">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-6 py-5 flex items-center justify-between relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)',
          boxShadow: '0 8px 32px rgba(16,185,129,0.28)',
        }}
      >
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute right-32 -bottom-12 w-40 h-40 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-emerald-300 text-sm font-medium">{today}</p>
          <h1 className="text-white text-2xl font-bold mt-0.5">
            {greeting}{displayName ? `, ${displayName}` : '!'}
          </h1>
          <p className="text-emerald-300 text-sm mt-1">Your sales command center — stay on top of your leads.</p>
        </div>
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => navigate('/crm/leads/create')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold bg-white/10 hover:bg-white/20 transition-all"
          >
            <UserPlus size={15} /> Add Lead
          </button>
          <button
            onClick={() => navigate('/crm/leads')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold bg-white/10 hover:bg-white/20 transition-all"
          >
            <Users size={15} /> My Leads
          </button>
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'My Leads',        value: num(summary.total_leads),         icon: Users,        gradient: 'from-indigo-500 to-indigo-600' },
            { label: 'New Today',        value: num(summary.new_today),           icon: UserPlus,     gradient: 'from-blue-500 to-blue-600' },
            { label: 'Submitted',        value: num(summary.submitted),           icon: Send,         gradient: 'from-amber-500 to-orange-500' },
            { label: 'Approved',         value: num(summary.approved),            icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-600' },
            { label: 'Funded',           value: num(summary.funded),              icon: DollarSign,   gradient: 'from-green-500 to-green-600' },
            { label: 'Conversion',       value: pct(summary.conversion_rate),     icon: TrendingUp,   gradient: 'from-purple-500 to-indigo-500' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br flex-shrink-0', card.gradient)}>
                <card.icon size={17} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate">{card.label}</p>
                <p className="font-bold text-slate-900 text-lg leading-none mt-0.5">{card.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Row: Recent Leads + Status Breakdown ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Recent Leads — 3/5 width */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-[15px]">My Recent Leads</h3>
            <button onClick={() => navigate('/crm/leads')} className="text-xs text-emerald-600 font-semibold flex items-center gap-1 hover:underline">
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  {['ID', 'Business', 'Status', 'Type', 'Date'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentLeads.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">No leads yet</td></tr>
                ) : recentLeads.map(l => (
                  <tr
                    key={l.id}
                    onClick={() => navigate(`/crm/lead/${l.id}`)}
                    className="border-b border-slate-50 cursor-pointer hover:bg-emerald-50/40 transition-colors"
                  >
                    <td className="px-4 py-2.5"><span className="text-sm font-mono text-slate-500">#{l.id}</span></td>
                    <td className="px-4 py-2.5"><span className="text-sm font-medium text-slate-900 truncate block max-w-[180px]">{l.business_name || '—'}</span></td>
                    <td className="px-4 py-2.5">
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold', STATUS_COLORS[l.lead_status] ?? 'bg-slate-100 text-slate-600')}>
                        {fmtStatus(l.lead_status)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {l.lead_type ? (
                        <span className={cn('inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize', TYPE_COLORS[l.lead_type] ?? 'bg-slate-100 text-slate-600')}>
                          {l.lead_type}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5"><span className="text-sm text-slate-500">{fmtDate(l.created_at)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status Breakdown Donut — 2/5 width */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 text-[15px] mb-4">Lead Distribution</h3>
          {statusBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No data</p>
          ) : (
            <>
              <div className="flex justify-center">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={80}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {statusBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                {statusBreakdown.slice(0, 6).map((s, i) => (
                  <div key={s.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-slate-600 capitalize">{fmtStatus(s.status)}</span>
                    </div>
                    <span className="font-semibold text-slate-800">{num(s.count)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row: Monthly Trend + Recent Activity ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Monthly Trend */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 text-[15px] mb-4">Monthly Lead Trend</h3>
          {monthlyTrend.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [`${v} leads`, 'Leads']} labelFormatter={fmtMonth} />
                <Bar dataKey="leads" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-[15px]">Recent Activity</h3>
          </div>
          <div className="divide-y divide-slate-50 max-h-[340px] overflow-y-auto">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">No recent activity</p>
            ) : recentActivity.map(a => {
              const Icon = ACTIVITY_ICONS[a.activity_type] ?? Clock
              return (
                <div
                  key={a.id}
                  onClick={() => navigate(`/crm/lead/${a.lead_id}`)}
                  className="px-5 py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={13} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{a.subject}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">Lead #{a.lead_id}</span>
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className="text-[10px] text-slate-400">{timeAgo(a.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Tasks Section (only if tasks exist) ───────────────────────────── */}
      {hasTasks && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-[15px] flex items-center gap-2">
              <CalendarCheck size={16} className="text-emerald-500" />
              Tasks & Reminders
            </h3>
          </div>
          <div className="p-5 space-y-4">
            {/* Overdue */}
            {tasks.overdue.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <AlertTriangle size={12} /> Overdue ({tasks.overdue.length})
                </p>
                <div className="space-y-2">
                  {tasks.overdue.map(t => (
                    <div key={t.id} onClick={() => navigate(`/crm/lead/${t.lead_id}`)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-50 border border-red-100 cursor-pointer hover:bg-red-100/60 transition-colors">
                      <ClipboardList size={14} className="text-red-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{t.task_name}</p>
                        <p className="text-[10px] text-slate-500">Lead #{t.lead_id} · {t.date} {t.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Today */}
            {tasks.today.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">Today ({tasks.today.length})</p>
                <div className="space-y-2">
                  {tasks.today.map(t => (
                    <div key={t.id} onClick={() => navigate(`/crm/lead/${t.lead_id}`)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 cursor-pointer hover:bg-emerald-100/60 transition-colors">
                      <ClipboardList size={14} className="text-emerald-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{t.task_name}</p>
                        <p className="text-[10px] text-slate-500">Lead #{t.lead_id} · {t.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Upcoming */}
            {tasks.upcoming.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Upcoming ({tasks.upcoming.length})</p>
                <div className="space-y-2">
                  {tasks.upcoming.map(t => (
                    <div key={t.id} onClick={() => navigate(`/crm/lead/${t.lead_id}`)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 cursor-pointer hover:bg-blue-100/60 transition-colors">
                      <ClipboardList size={14} className="text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{t.task_name}</p>
                        <p className="text-[10px] text-slate-500">Lead #{t.lead_id} · {t.date} {t.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
