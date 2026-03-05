import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Phone, Users, Radio, MessageSquare, Voicemail, List, BarChart2, TrendingUp,
  UserPlus, BarChart3,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { StatCard } from '../../components/ui/StatCard'
import { dashboardService } from '../../services/dashboard.service'
import { useAuthStore } from '../../stores/auth.store'

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const mockBar = [
  { name: 'Mon', calls: 120 }, { name: 'Tue', calls: 185 }, { name: 'Wed', calls: 140 },
  { name: 'Thu', calls: 210 }, { name: 'Fri', calls: 175 }, { name: 'Sat', calls: 90 }, { name: 'Sun', calls: 60 },
]

const mockPie = [
  { name: 'Interested', value: 35 }, { name: 'Not Interested', value: 25 },
  { name: 'Callback', value: 20 }, { name: 'No Answer', value: 15 }, { name: 'Other', value: 5 },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

const PERIOD_OPTIONS = ['7D', '30D', '90D'] as const
type Period = typeof PERIOD_OPTIONS[number]

export function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [activePeriod, setActivePeriod] = useState<Period>('7D')

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardService.getStats(),
  })

  const stats = data?.data?.data || {}
  const greeting = getGreeting()
  const displayName = user?.first_name || user?.name || ''

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}{displayName ? `, ${displayName}` : '!'}
          </h1>
          <p className="page-subtitle mt-1">Here's your performance overview for today</p>
        </div>
        <span className="bg-slate-100 text-slate-600 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap">
          {getTodayLabel()}
        </span>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/dialer')}
          className="rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-transform bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-md"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <Phone size={20} className="text-white" />
          </div>
          <p className="text-white font-semibold text-base">Start Dialing</p>
          <p className="text-indigo-200 text-xs mt-0.5">Launch the dialer</p>
        </div>

        <div
          onClick={() => navigate('/crm/create')}
          className="rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-transform bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-md"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <UserPlus size={20} className="text-white" />
          </div>
          <p className="text-white font-semibold text-base">Add Lead</p>
          <p className="text-emerald-200 text-xs mt-0.5">Create new lead</p>
        </div>

        <div
          onClick={() => navigate('/reports')}
          className="rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-transform bg-gradient-to-br from-violet-500 to-violet-700 shadow-md"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <BarChart3 size={20} className="text-white" />
          </div>
          <p className="text-white font-semibold text-base">Reports</p>
          <p className="text-violet-200 text-xs mt-0.5">Analytics &amp; insights</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Calls" value={stats.totalCallbacks ?? 0} icon={Phone} color="indigo" loading={isLoading} />
        <StatCard title="Agents Online" value={stats.totalUsers ?? 0} icon={Users} color="sky" loading={isLoading} />
        <StatCard title="Campaigns" value={stats.totalCampaigns ?? 0} icon={Radio} color="emerald" loading={isLoading} />
        <StatCard title="Total Leads" value={stats.totalLeads ?? 0} icon={List} color="amber" loading={isLoading} />
        <StatCard title="Inbound SMS" value={stats.incomingSms ?? 0} icon={MessageSquare} color="violet" loading={isLoading} />
        <StatCard title="Outbound SMS" value={stats.outgoingSms ?? 0} icon={TrendingUp} color="sky" loading={isLoading} />
        <StatCard title="Voicemails" value={stats.unreadVoicemail ?? 0} icon={Voicemail} color="rose" loading={isLoading} />
        <StatCard title="Total Lists" value={stats.totalList ?? 0} icon={BarChart2} color="indigo" loading={isLoading} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart — col-span-2 */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-900">Call Volume — Last 7 Days</h3>
            <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setActivePeriod(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    activePeriod === p
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mockBar} barSize={32}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                  fontSize: 12,
                }}
                cursor={{ fill: 'rgba(79,70,229,0.06)' }}
              />
              <Bar dataKey="calls" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Chart */}
        <div className="card">
          <h3 className="font-semibold text-slate-900 mb-4">Disposition Breakdown</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={mockPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={72}
                paddingAngle={3}
              >
                {mockPie.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Custom Legend */}
          <div className="mt-4 space-y-2">
            {mockPie.map((entry, i) => {
              const total = mockPie.reduce((sum, e) => sum + e.value, 0)
              const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0
              return (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-slate-600">{entry.name}</span>
                  </div>
                  <span className="font-semibold text-slate-800">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
