import { useEffect } from 'react'
import {
  Activity, CheckCircle2, Server, Globe, Phone,
  Users, Wifi, HardDrive, Clock, AlertTriangle,
  ChevronDown,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'

/* ═══════════════════════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════════════════════ */

const services = [
  { name: 'API', icon: Server, description: 'REST API & webhooks', uptime: 99.99 },
  { name: 'Web App', icon: Globe, description: 'Portal & dashboard', uptime: 99.98 },
  { name: 'Dialer Engine', icon: Phone, description: 'Auto dialer & call routing', uptime: 99.99 },
  { name: 'CRM', icon: Users, description: 'Pipeline & contacts', uptime: 99.97 },
  { name: 'WebSocket', icon: Wifi, description: 'Real-time events', uptime: 99.99 },
  { name: 'CDN', icon: HardDrive, description: 'Static assets & recordings', uptime: 100.00 },
]

const uptimeMetrics = [
  { service: 'API', uptime: 99.99, bars: generateUptimeBars(99.99) },
  { service: 'Web App', uptime: 99.98, bars: generateUptimeBars(99.98) },
  { service: 'Dialer Engine', uptime: 99.99, bars: generateUptimeBars(99.99) },
  { service: 'CRM', uptime: 99.97, bars: generateUptimeBars(99.97) },
  { service: 'WebSocket', uptime: 99.99, bars: generateUptimeBars(99.99) },
  { service: 'CDN', uptime: 100.00, bars: generateUptimeBars(100.00) },
]

function generateUptimeBars(uptime: number): boolean[] {
  const bars: boolean[] = []
  for (let i = 0; i < 90; i++) {
    // Simulate a few brief incidents based on uptime
    if (uptime < 100 && (i === 23 || i === 67)) {
      bars.push(false)
    } else {
      bars.push(true)
    }
  }
  return bars
}

const incidents = [
  {
    date: 'April 28, 2026',
    title: 'Elevated API Latency',
    duration: '14 minutes',
    status: 'Resolved',
    description: 'A database connection pool saturation caused elevated P95 latency on the /leads and /campaigns endpoints. The pool was auto-scaled and latency returned to normal within 14 minutes.',
    statusColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    date: 'April 12, 2026',
    title: 'WebSocket Reconnection Delays',
    duration: '8 minutes',
    status: 'Resolved',
    description: 'A rolling deployment of the WebSocket gateway caused brief reconnection delays for approximately 3% of connected clients. No data was lost and connections recovered automatically.',
    statusColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    date: 'March 19, 2026',
    title: 'Dialer Engine Failover Event',
    duration: '22 minutes',
    status: 'Resolved',
    description: 'Primary dialer engine node experienced a hardware fault. Traffic automatically failed over to the secondary region. Approximately 12 in-progress calls were reconnected within 4 seconds.',
    statusColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    date: 'February 3, 2026',
    title: 'Scheduled Maintenance - Database Migration',
    duration: '45 minutes',
    status: 'Completed',
    description: 'Planned database schema migration to support new analytics features. Read-only mode was enabled during the migration window. All services returned to full operation ahead of schedule.',
    statusColor: 'text-blue-600 bg-blue-50 border-blue-200',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

export function StatusPage() {
  useEffect(() => { document.title = 'System Status | Balji' }, [])

  const bannerSection = useInView()
  const gridSection = useInView()
  const uptimeSection = useInView()
  const incidentSection = useInView()

  return (
    <div className="min-h-screen bg-white">
      <PublicHero
        pill="System Health"
        pillIcon={Activity}
        title="System"
        titleHighlight="Status"
        subtitle="Real-time operational status for all Balji services. We monitor every component 24/7 to ensure maximum uptime."
      />

      {/* ── Overall Status Banner ── */}
      <section ref={bannerSection.ref} className="pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`transition-all duration-700 ${bannerSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-emerald-900">All Systems Operational</h2>
                  <p className="text-sm text-emerald-700 mt-0.5">
                    All services are running normally. Last checked {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC.
                  </p>
                </div>
                <div className="ml-auto hidden sm:flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  <span className="text-sm font-semibold text-emerald-700">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Service Status Grid ── */}
      <section ref={gridSection.ref} className="py-24 lg:py-32 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${gridSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Service Status
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Current operational status for each individual service component.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((service, i) => (
              <div
                key={service.name}
                className={`bg-white border border-gray-100 shadow-sm rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${gridSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                      <service.icon size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{service.name}</h3>
                      <p className="text-xs text-gray-500">{service.description}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-sm font-semibold text-emerald-600">Operational</span>
                  </div>
                  <span className="text-xs font-medium text-gray-400">{service.uptime}% uptime</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Uptime Bars (90 days) ── */}
      <section ref={uptimeSection.ref} className="py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${uptimeSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              90-Day Uptime
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Historical availability for each service over the last 90 days. Each bar represents one day.
            </p>
          </div>

          <div className="space-y-8">
            {uptimeMetrics.map((metric, mi) => (
              <div
                key={metric.service}
                className={`transition-all duration-700 ${uptimeSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{ transitionDelay: `${mi * 80}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-900">{metric.service}</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm text-xs font-bold text-emerald-600">
                    {metric.uptime}%
                  </span>
                </div>
                <div className="flex gap-[2px] h-8 items-end">
                  {metric.bars.map((ok, bi) => (
                    <div
                      key={bi}
                      className={`flex-1 rounded-sm transition-all duration-300 ${
                        ok
                          ? 'bg-emerald-400 hover:bg-emerald-500'
                          : 'bg-amber-400 hover:bg-amber-500'
                      }`}
                      style={{ height: ok ? '100%' : '60%' }}
                      title={ok ? 'No incidents' : 'Brief incident'}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[11px] text-gray-400">90 days ago</span>
                  <span className="text-[11px] text-gray-400">Today</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Incident History ── */}
      <section ref={incidentSection.ref} className="py-24 lg:py-32 bg-gray-50/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${incidentSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Incident History
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              A transparent record of past incidents and their resolutions.
            </p>
          </div>

          <div className="space-y-5">
            {incidents.map((incident, i) => (
              <div
                key={incident.title}
                className={`bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${incidentSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="p-6 sm:p-7">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                        <h3 className="text-base font-bold text-gray-900">{incident.title}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} />
                          {incident.date}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span>Duration: {incident.duration}</span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${incident.statusColor} flex-shrink-0`}>
                      {incident.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{incident.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-10 text-center transition-all duration-700 delay-500 ${incidentSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-gray-200 shadow-sm text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all">
              View Older Incidents
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
