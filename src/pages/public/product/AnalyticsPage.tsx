import { useEffect, useState } from 'react'
import {
  BarChart3, TrendingUp, PieChart, Activity,
  DollarSign, Users, PhoneCall, Target,
  ArrowUpRight, ArrowDownRight, Clock, Calendar,
  Layers, Filter, Download,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'
import { PublicCta } from '../../../components/public/PublicCta'

/* ═══════════════════════════════════════════════════════════════════════════
   CSS-Rendered Bar Chart (12 months)
   ═══════════════════════════════════════════════════════════════════════════ */

function BarChartSection() {
  const { ref, visible } = useInView()

  const months = [
    { label: 'Jun', value: 180, display: '$180K' },
    { label: 'Jul', value: 220, display: '$220K' },
    { label: 'Aug', value: 195, display: '$195K' },
    { label: 'Sep', value: 280, display: '$280K' },
    { label: 'Oct', value: 245, display: '$245K' },
    { label: 'Nov', value: 320, display: '$320K' },
    { label: 'Dec', value: 290, display: '$290K' },
    { label: 'Jan', value: 350, display: '$350K' },
    { label: 'Feb', value: 310, display: '$310K' },
    { label: 'Mar', value: 400, display: '$400K' },
    { label: 'Apr', value: 380, display: '$380K' },
    { label: 'May', value: 460, display: '$460K' },
  ]

  const maxValue = Math.max(...months.map(m => m.value))

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-5 gap-12 items-start">
          {/* Chart */}
          <div className={`lg:col-span-3 transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-blue-100/30 via-transparent to-emerald-100/30 rounded-3xl blur-2xl pointer-events-none" />

              <div className="relative bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Monthly Revenue</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Last 12 months performance</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium bg-gray-900 text-white rounded-lg">
                      <Calendar size={10} /> Monthly
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium text-gray-500 bg-gray-100 rounded-lg">
                      <Filter size={10} /> Filter
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium text-gray-500 bg-gray-100 rounded-lg">
                      <Download size={10} /> Export
                    </button>
                  </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3 px-6 pt-5">
                  {[
                    { label: 'Total Revenue', value: '$3.63M', change: '+28%', up: true },
                    { label: 'Average Monthly', value: '$302K', change: '+18%', up: true },
                    { label: 'Growth Rate', value: '155%', change: 'YoY', up: true },
                  ].map(m => (
                    <div key={m.label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-400 font-medium mb-0.5">{m.label}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">{m.value}</span>
                        <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${m.up ? 'text-emerald-600' : 'text-red-500'}`}>
                          {m.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                          {m.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bar chart */}
                <div className="px-6 pt-6 pb-6">
                  {/* Y-axis labels and grid */}
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[9px] text-gray-400 font-medium pr-3 w-8">
                      <span>$500K</span>
                      <span>$375K</span>
                      <span>$250K</span>
                      <span>$125K</span>
                      <span>$0</span>
                    </div>
                    <div className="ml-10">
                      {/* Grid lines */}
                      <div className="absolute left-10 right-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
                        {[0, 1, 2, 3, 4].map(i => (
                          <div key={i} className="border-b border-gray-100 border-dashed" />
                        ))}
                      </div>

                      {/* Bars */}
                      <div className="relative flex items-end gap-2 h-56">
                        {months.map((m, i) => {
                          const heightPct = (m.value / maxValue) * 100
                          const isLast = i === months.length - 1
                          return (
                            <div key={m.label} className="flex-1 flex flex-col items-center gap-1 group relative">
                              {/* Tooltip */}
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[9px] font-medium px-2 py-1 rounded-md whitespace-nowrap pointer-events-none z-10">
                                {m.display}
                              </div>
                              <div
                                className={`w-full rounded-t-md transition-all duration-700 ease-out ${
                                  isLast
                                    ? 'bg-gradient-to-t from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20'
                                    : 'bg-gradient-to-t from-gray-200 to-gray-300 hover:from-blue-200 hover:to-blue-300'
                                }`}
                                style={{
                                  height: visible ? `${heightPct}%` : '0%',
                                  transitionDelay: `${i * 60}ms`,
                                }}
                              />
                              <span className={`text-[9px] font-medium ${isLast ? 'text-blue-600' : 'text-gray-400'}`}>{m.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right description */}
          <div className={`lg:col-span-2 transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
              <BarChart3 size={14} className="text-blue-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Revenue Analytics</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-5">
              Track Revenue Growth{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Month Over Month</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              Interactive charts that show your pipeline performance across every time period. Drill down into segments, agents, and campaigns.
            </p>
            <div className="space-y-4">
              {[
                'Customizable date ranges and comparison periods',
                'Drill-down from pipeline to individual deal level',
                'Export data to CSV, PDF, or integrate via API',
                'Automated weekly and monthly report delivery',
              ].map(item => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <ArrowUpRight size={11} className="text-blue-600" />
                  </div>
                  <span className="text-gray-600 text-[15px]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CSS-Rendered Donut/Ring Chart
   ═══════════════════════════════════════════════════════════════════════════ */

function DonutChartSection() {
  const { ref, visible } = useInView()

  const segments = [
    { label: 'SaaS', value: 35, color: '#4F46E5', display: '$1.27M' },
    { label: 'E-Commerce', value: 25, color: '#0EA5E9', display: '$908K' },
    { label: 'FinTech', value: 20, color: '#10B981', display: '$726K' },
    { label: 'Healthcare', value: 12, color: '#F59E0B', display: '$436K' },
    { label: 'Other', value: 8, color: '#8B5CF6', display: '$290K' },
  ]

  // Build conic gradient
  let cumulative = 0
  const gradientStops = segments.map(s => {
    const start = cumulative
    cumulative += s.value
    return `${s.color} ${start}% ${cumulative}%`
  }).join(', ')

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left description */}
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
              <PieChart size={14} className="text-indigo-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Pipeline Distribution</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-5">
              Understand Your{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Pipeline Mix</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              Visualize pipeline distribution by industry, risk level, or funding stage. Spot concentration risks and diversification opportunities at a glance.
            </p>

            {/* Legend */}
            <div className="space-y-3">
              {segments.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 shadow-sm transition-all duration-500 hover:shadow-md ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-sm font-medium text-gray-900">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-gray-900">{s.display}</span>
                    <span className="text-xs text-gray-400 w-8 text-right">{s.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Donut */}
          <div className={`flex justify-center transition-all duration-1000 delay-200 ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
            <div className="relative">
              <div className="absolute -inset-12 bg-gradient-to-br from-indigo-100/30 via-transparent to-emerald-100/30 rounded-full blur-2xl pointer-events-none" />

              <div className="relative bg-white rounded-3xl border border-gray-200 shadow-xl p-10">
                <div className="relative w-64 h-64 mx-auto">
                  {/* Donut ring */}
                  <div
                    className="w-full h-full rounded-full transition-all duration-1000"
                    style={{
                      background: visible ? `conic-gradient(${gradientStops})` : 'conic-gradient(#E5E7EB 0% 100%)',
                      mask: 'radial-gradient(farthest-side, transparent calc(100% - 40px), #fff calc(100% - 39px))',
                      WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 40px), #fff calc(100% - 39px))',
                    }}
                  />
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold text-gray-900">$3.63M</span>
                    <span className="text-sm text-gray-400 font-medium">Total Pipeline</span>
                    <div className="flex items-center gap-1 mt-1">
                      <ArrowUpRight size={12} className="text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-600">+28% YoY</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CSS-Rendered Trend Line
   ═══════════════════════════════════════════════════════════════════════════ */

function TrendLineSection() {
  const { ref, visible } = useInView()

  const dataPoints = [
    { week: 'W1', value: 62 },
    { week: 'W2', value: 58 },
    { week: 'W3', value: 65 },
    { week: 'W4', value: 71 },
    { week: 'W5', value: 68 },
    { week: 'W6', value: 74 },
    { week: 'W7', value: 72 },
    { week: 'W8', value: 79 },
    { week: 'W9', value: 83 },
    { week: 'W10', value: 78 },
    { week: 'W11', value: 86 },
    { week: 'W12', value: 92 },
  ]

  const maxVal = 100
  const svgWidth = 600
  const svgHeight = 200
  const padding = 20

  const points = dataPoints.map((d, i) => {
    const x = padding + (i / (dataPoints.length - 1)) * (svgWidth - padding * 2)
    const y = svgHeight - padding - ((d.value / maxVal) * (svgHeight - padding * 2))
    return { x, y, ...d }
  })

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ')
  const areaPoints = `${points[0].x},${svgHeight - padding} ${polylinePoints} ${points[points.length - 1].x},${svgHeight - padding}`

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Activity size={14} className="text-emerald-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Trend Analysis</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Connect Rate{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Trending Upward</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">Track key performance indicators over time to identify trends and optimize your operations.</p>
        </div>

        <div className={`transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute -inset-6 bg-gradient-to-br from-emerald-100/30 via-transparent to-blue-100/30 rounded-3xl blur-2xl pointer-events-none" />

            <div className="relative bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Connect Rate Trend</h3>
                  <p className="text-xs text-gray-400 mt-0.5">12-week rolling average</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg">
                    <ArrowUpRight size={12} className="text-emerald-600" />
                    <span className="text-[11px] font-semibold text-emerald-600">+30% improvement</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight + 30}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="50%" stopColor="#6366F1" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map(v => {
                    const y = svgHeight - padding - ((v / maxVal) * (svgHeight - padding * 2))
                    return (
                      <g key={v}>
                        <line x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4,4" />
                        <text x={padding - 5} y={y + 3} textAnchor="end" className="text-[10px]" fill="#9CA3AF">{v}%</text>
                      </g>
                    )
                  })}

                  {/* Area fill */}
                  <polygon
                    points={areaPoints}
                    fill="url(#areaGradient)"
                    className={`transition-opacity duration-1000 delay-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
                  />

                  {/* Line */}
                  <polyline
                    points={polylinePoints}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-all duration-1000 delay-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
                    style={{
                      strokeDasharray: visible ? 'none' : '1000',
                      strokeDashoffset: visible ? '0' : '1000',
                    }}
                  />

                  {/* Data points */}
                  {points.map((p, i) => (
                    <g key={i}>
                      <circle
                        cx={p.x} cy={p.y} r="5"
                        fill="white"
                        stroke="url(#lineGradient)"
                        strokeWidth="2.5"
                        className={`transition-all duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
                        style={{ transitionDelay: `${300 + i * 60}ms` }}
                      />
                      <text x={p.x} y={svgHeight + 15} textAnchor="middle" className="text-[9px]" fill="#9CA3AF">{p.week}</text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   KPI Metrics Grid
   ═══════════════════════════════════════════════════════════════════════════ */

function MetricsGrid() {
  const { ref, visible } = useInView()

  const metrics = [
    { icon: DollarSign, label: 'Total Revenue', value: '$3.63M', change: '+28%', up: true, color: 'from-emerald-500 to-emerald-600', bgLight: 'bg-emerald-50', textColor: 'text-emerald-600' },
    { icon: PhoneCall, label: 'Calls Completed', value: '42,847', change: '+34%', up: true, color: 'from-blue-500 to-blue-600', bgLight: 'bg-blue-50', textColor: 'text-blue-600' },
    { icon: Target, label: 'Connect Rate', value: '92.4%', change: '+5.2%', up: true, color: 'from-indigo-500 to-indigo-600', bgLight: 'bg-indigo-50', textColor: 'text-indigo-600' },
    { icon: Users, label: 'Active Merchants', value: '1,284', change: '+18%', up: true, color: 'from-violet-500 to-violet-600', bgLight: 'bg-violet-50', textColor: 'text-violet-600' },
    { icon: Clock, label: 'Avg. Close Time', value: '4.2 days', change: '-22%', up: true, color: 'from-amber-500 to-amber-600', bgLight: 'bg-amber-50', textColor: 'text-amber-600' },
    { icon: TrendingUp, label: 'Agent Productivity', value: '186/day', change: '+41%', up: true, color: 'from-pink-500 to-pink-600', bgLight: 'bg-pink-50', textColor: 'text-pink-600' },
  ]

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Layers size={14} className="text-violet-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Key Metrics</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            KPIs That{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Drive Decisions</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">Real-time dashboards for the metrics that matter most to your brokerage operations.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className={`group relative bg-white border border-gray-100 shadow-sm rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${m.bgLight} transition-transform duration-300 group-hover:scale-110`}>
                  <m.icon size={20} className={m.textColor} />
                </div>
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${m.up ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {m.up ? <ArrowUpRight size={11} className="text-emerald-600" /> : <ArrowDownRight size={11} className="text-red-500" />}
                  <span className={`text-[11px] font-semibold ${m.up ? 'text-emerald-600' : 'text-red-500'}`}>{m.change}</span>
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">{m.value}</p>
              <p className="text-sm text-gray-500">{m.label}</p>
              {/* Animated bar */}
              <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`bg-gradient-to-r ${m.color} h-1.5 rounded-full transition-all duration-1000 ease-out`}
                  style={{
                    width: visible ? `${60 + Math.random() * 35}%` : '0%',
                    transitionDelay: `${i * 80 + 300}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page Export
   ═══════════════════════════════════════════════════════════════════════════ */

export function AnalyticsPage() {
  useEffect(() => { document.title = 'Analytics | Balji' }, [])

  return (
    <div className="relative min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <PublicHero
        pill="Revenue Analytics"
        pillIcon={BarChart3}
        title="Real-Time Dashboards for"
        titleHighlight="Smarter Decisions"
        subtitle="Interactive charts, pipeline breakdowns, and trend analysis that give your team complete visibility into performance, revenue, and deal flow."
      />
      <BarChartSection />
      <DonutChartSection />
      <TrendLineSection />
      <MetricsGrid />
      <PublicCta />
    </div>
  )
}
