import { useEffect, useState } from 'react'
import {
  Phone, PhoneCall, PhoneOff, Mic, MicOff, Pause, Play,
  Users, Zap, Brain, Radio, Voicemail, FolderKanban,
  ArrowRight, ChevronRight, Clock, TrendingUp,
  Activity, Hash, StickyNote, BarChart3,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'
import { PublicCta } from '../../../components/public/PublicCta'

/* ═══════════════════════════════════════════════════════════════════════════
   Animated Dialer Interface Mockup
   ═══════════════════════════════════════════════════════════════════════════ */

function DialerMockup() {
  const { ref, visible } = useInView()
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'idle'>('idle')
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!visible) return
    const sequence = [
      setTimeout(() => setCallState('ringing'), 800),
      setTimeout(() => setCallState('connected'), 2800),
    ]
    return () => sequence.forEach(clearTimeout)
  }, [visible])

  useEffect(() => {
    if (callState !== 'connected') return
    const id = setInterval(() => setElapsed(p => p + 1), 1000)
    return () => clearInterval(id)
  }, [callState])

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Dialer UI */}
          <div className={`transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-to-br from-blue-100/40 via-transparent to-indigo-100/40 rounded-3xl blur-2xl pointer-events-none" />

              <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl shadow-gray-200/40 overflow-hidden">
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-b border-gray-200/80">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-300" />
                    <div className="w-3 h-3 rounded-full bg-amber-300" />
                    <div className="w-3 h-3 rounded-full bg-emerald-300" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-1.5 text-xs text-gray-400 min-w-[240px]">
                      <Phone size={11} className="text-emerald-500" />
                      portal.balji.app/dialer
                    </div>
                  </div>
                  <div className="w-[52px]" />
                </div>

                {/* Dialer content */}
                <div className="p-8 bg-gray-50/50">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Agent list */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-gray-900">Queue</span>
                        <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">12 pending</span>
                      </div>
                      <div className="space-y-2">
                        {[
                          { name: 'Rachel Adams', company: 'TechFlow Inc.', status: 'Next' },
                          { name: 'Mark Chen', company: 'DataBridge Co.', status: 'Queued' },
                          { name: 'Lisa Park', company: 'CloudNine LLC', status: 'Queued' },
                          { name: 'James Wilson', company: 'PayScale Corp', status: 'Queued' },
                        ].map((c, i) => (
                          <div key={c.name} className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${i === 0 ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-600">
                              {c.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-gray-900 truncate">{c.name}</p>
                              <p className="text-[9px] text-gray-400">{c.company}</p>
                            </div>
                            {i === 0 && (
                              <span className="text-[8px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">NEXT</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Active call center */}
                    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col items-center justify-center text-center">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-lg transition-all duration-500 ${
                        callState === 'connected'
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20'
                          : callState === 'ringing'
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20 animate-pulse'
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20'
                      }`}>
                        <span className="text-white text-2xl font-bold">RA</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">Rachel Adams</p>
                      <p className="text-sm text-gray-400 mb-1">+1 (555) 842-9173</p>
                      <p className={`text-sm font-semibold mb-6 flex items-center gap-1.5 ${
                        callState === 'connected' ? 'text-emerald-500' : callState === 'ringing' ? 'text-amber-500' : 'text-gray-400'
                      }`}>
                        {callState === 'connected' && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                        )}
                        {callState === 'ringing' && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                          </span>
                        )}
                        {callState === 'connected' ? `Connected - ${formatTime(elapsed)}` : callState === 'ringing' ? 'Ringing...' : 'Ready'}
                      </p>

                      <div className="grid grid-cols-3 gap-2 w-full mb-5">
                        {[
                          { icon: MicOff, label: 'Mute' },
                          { icon: Pause, label: 'Hold' },
                          { icon: PhoneCall, label: 'Transfer' },
                          { icon: Mic, label: 'Record' },
                          { icon: Hash, label: 'Keypad' },
                          { icon: StickyNote, label: 'Notes' },
                        ].map(b => (
                          <div key={b.label} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-colors cursor-pointer">
                            <b.icon size={16} className="text-gray-500" />
                            <span className="text-[9px] text-gray-500 font-medium">{b.label}</span>
                          </div>
                        ))}
                      </div>

                      <button className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-colors">
                        <PhoneOff size={22} className="text-white" />
                      </button>
                    </div>

                    {/* Campaign stats */}
                    <div className="space-y-3">
                      <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <span className="text-sm font-semibold text-gray-900">Campaign: Q2 Collections</span>
                        <div className="mt-3 space-y-3">
                          {[
                            { label: 'Total Contacts', val: '2,847' },
                            { label: 'Reached', val: '1,284' },
                            { label: 'Connect Rate', val: '68.4%' },
                            { label: 'Avg Duration', val: '4:32' },
                          ].map(s => (
                            <div key={s.label} className="flex justify-between items-center">
                              <span className="text-[11px] text-gray-500">{s.label}</span>
                              <span className="text-[11px] font-semibold text-gray-900">{s.val}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 w-full bg-gray-100 rounded-full h-2">
                          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-1000" style={{ width: visible ? '45%' : '0%' }} />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1.5">45% complete</p>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <span className="text-xs font-semibold text-gray-900">Live Waveform</span>
                        <div className="mt-3 flex items-end gap-[3px] h-12">
                          {[40, 65, 35, 80, 50, 70, 30, 90, 55, 45, 75, 38, 60, 85, 42, 68].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-full bg-gradient-to-t from-blue-500 to-emerald-400"
                              style={{
                                height: `${h}%`,
                                animation: callState === 'connected' ? `waveform 1.5s ease-in-out ${i * 0.08}s infinite alternate` : 'none',
                                opacity: callState === 'connected' ? 1 : 0.3,
                                transition: 'opacity 0.5s',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Description */}
          <div className={`transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
              <Activity size={14} className="text-blue-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Live Dialer Interface</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-5">
              A Dialer Built for{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">High-Volume Teams</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              See your entire queue, manage active calls, and track campaign progress in real time. Every call is recorded, scored, and logged automatically.
            </p>
            <div className="space-y-4">
              {[
                'AI-paced dialing adapts to your team capacity',
                'One-click voicemail drops save agent time',
                'Live call monitoring for managers',
                'Automatic call disposition and logging',
              ].map(item => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <ChevronRight size={12} className="text-emerald-600" />
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
   Call Flow Visualization
   ═══════════════════════════════════════════════════════════════════════════ */

function CallFlowSection() {
  const { ref, visible } = useInView()

  const stages = [
    {
      icon: Users,
      title: 'Queue',
      subtitle: 'Contacts loaded & prioritized',
      color: 'from-blue-500 to-cyan-400',
      bgLight: 'bg-blue-50',
      borderColor: 'border-blue-200',
      indicator: (
        <div className="flex items-center gap-1.5 mt-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[8px] font-bold text-blue-600">
              {i}
            </div>
          ))}
          <span className="text-[9px] text-blue-400 ml-1">+248</span>
        </div>
      ),
    },
    {
      icon: Phone,
      title: 'Dialing',
      subtitle: 'AI-paced outbound calls',
      color: 'from-amber-500 to-orange-400',
      bgLight: 'bg-amber-50',
      borderColor: 'border-amber-200',
      indicator: (
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="text-[10px] font-medium text-amber-600">Ringing</span>
          </div>
          <div className="text-[10px] text-gray-400">3 concurrent</div>
        </div>
      ),
    },
    {
      icon: PhoneCall,
      title: 'Connected',
      subtitle: 'Live conversation & recording',
      color: 'from-emerald-500 to-teal-400',
      bgLight: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      indicator: (
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-end gap-[2px] h-4">
            {[60, 80, 40, 90, 50, 70, 35, 85].map((h, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-emerald-400"
                style={{
                  height: `${h}%`,
                  animation: `waveform 1.2s ease-in-out ${i * 0.1}s infinite alternate`,
                }}
              />
            ))}
          </div>
          <span className="text-[10px] font-medium text-emerald-600">04:32</span>
        </div>
      ),
    },
  ]

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <ArrowRight size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Call Flow</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            From Queue to{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Conversation</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">Every call follows an intelligent flow that maximizes connect rates and agent efficiency.</p>
        </div>

        <div className="relative flex flex-col md:flex-row items-center justify-center gap-6 md:gap-0">
          {/* Connecting lines */}
          <div className="hidden md:block absolute top-1/2 left-[calc(33.33%-20px)] right-[calc(33.33%-20px)] h-[2px] -translate-y-1/2">
            <div className="w-full h-full bg-gradient-to-r from-blue-200 via-amber-200 to-emerald-200 rounded-full" />
          </div>

          {stages.map((stage, i) => (
            <div key={stage.title} className="relative flex-1 flex justify-center">
              <div
                className={`relative z-10 w-full max-w-[280px] bg-white border ${stage.borderColor} shadow-sm rounded-2xl p-6 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="absolute -top-3 -right-3 z-20 w-7 h-7 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shadow-md ring-[3px] ring-white">
                  <span className="text-xs font-bold text-white">{i + 1}</span>
                </div>
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${stage.color} shadow-lg mb-4`}>
                  <stage.icon size={26} className="text-white" strokeWidth={1.8} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{stage.title}</h3>
                <p className="text-sm text-gray-500">{stage.subtitle}</p>
                <div className="flex justify-center">{stage.indicator}</div>
              </div>

              {/* Arrow between items on mobile */}
              {i < 2 && (
                <div className="md:hidden absolute -bottom-4 left-1/2 -translate-x-1/2">
                  <ArrowRight size={16} className="text-gray-300 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Features Grid
   ═══════════════════════════════════════════════════════════════════════════ */

function FeaturesGrid() {
  const { ref, visible } = useInView()

  const features = [
    { icon: Zap, title: 'Progressive Dialing', desc: 'Automatically dials the next contact when an agent becomes available. Maximizes talk time and eliminates manual dialing.', iconBg: 'bg-amber-50 ring-amber-100', iconColor: 'text-amber-600' },
    { icon: Play, title: 'Preview Mode', desc: 'Agents review borrower details before each call. Perfect for high-value accounts requiring personalized outreach.', iconBg: 'bg-blue-50 ring-blue-100', iconColor: 'text-blue-600' },
    { icon: Brain, title: 'AI Pacing', desc: 'Machine learning optimizes call pacing based on agent availability, time zones, and historical connect rates.', iconBg: 'bg-violet-50 ring-violet-100', iconColor: 'text-violet-600' },
    { icon: Radio, title: 'Call Recording', desc: 'Every call recorded with full transcription. Searchable archives for compliance, training, and quality assurance.', iconBg: 'bg-emerald-50 ring-emerald-100', iconColor: 'text-emerald-600' },
    { icon: Voicemail, title: 'Voicemail Drop', desc: 'Pre-recorded messages dropped in one click. Agents save 30+ seconds per voicemail and move to the next call instantly.', iconBg: 'bg-pink-50 ring-pink-100', iconColor: 'text-pink-600' },
    { icon: FolderKanban, title: 'Campaign Management', desc: 'Create and manage multiple campaigns with custom scripts, dispositions, and call schedules for every team.', iconBg: 'bg-indigo-50 ring-indigo-100', iconColor: 'text-indigo-600' },
  ]

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Phone size={14} className="text-blue-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Dialer Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Every Tool Your Agents{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Need to Succeed</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">Six powerful capabilities that turn your dialer into a revenue machine.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`group relative p-7 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${f.iconBg} ring-1 mb-5 transition-transform duration-300 group-hover:scale-110`}>
                <f.icon size={22} className={f.iconColor} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2.5">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Stats Section
   ═══════════════════════════════════════════════════════════════════════════ */

function StatsSection() {
  const { ref, visible } = useInView()
  const [counts, setCounts] = useState([0, 0, 0, 0])

  useEffect(() => {
    if (!visible) return
    const targets = [340, 68, 42, 99.9]
    const durations = [2000, 1800, 1600, 2200]
    targets.forEach((target, idx) => {
      let start = 0
      const step = target / (durations[idx] / 16)
      const id = setInterval(() => {
        start += step
        if (start >= target) {
          setCounts(p => { const n = [...p]; n[idx] = target; return n })
          clearInterval(id)
        } else {
          setCounts(p => { const n = [...p]; n[idx] = Math.floor(start * 10) / 10; return n })
        }
      }, 16)
    })
  }, [visible])

  const stats = [
    { val: `${Math.floor(counts[0])}%`, label: 'More Calls per Agent', sub: 'vs. manual dialing', icon: TrendingUp, color: 'from-blue-500 to-blue-600' },
    { val: `${Math.floor(counts[1])}%`, label: 'Connect Rate', sub: 'industry-leading', icon: PhoneCall, color: 'from-indigo-500 to-indigo-600' },
    { val: `${Math.floor(counts[2])}s`, label: 'Avg Wait Time', sub: 'between calls', icon: Clock, color: 'from-emerald-500 to-emerald-600' },
    { val: `${counts[3].toFixed(1)}%`, label: 'Uptime SLA', sub: 'guaranteed', icon: BarChart3, color: 'from-violet-500 to-violet-600' },
  ]

  return (
    <section ref={ref} className="py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 rounded-3xl p-8 lg:p-12 shadow-2xl shadow-gray-900/20">
          <div className={`text-center mb-10 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">Dialer Performance Metrics</h2>
            <p className="text-gray-400">Real results from teams using Balji's Auto Dialer</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100 + 200}ms` }}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} mb-4 shadow-lg`}>
                  <s.icon size={22} className="text-white" />
                </div>
                <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-1">{s.val}</div>
                <div className="text-sm font-medium text-gray-300">{s.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page Export
   ═══════════════════════════════════════════════════════════════════════════ */

export function AutoDialerPage() {
  useEffect(() => { document.title = 'Auto Dialer | Balji' }, [])

  return (
    <div className="relative min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <PublicHero
        pill="Auto Dialer"
        pillIcon={Phone}
        title="Power Dialer Built for"
        titleHighlight="Revenue Teams"
        subtitle="Progressive and preview dialing modes with AI pacing, voicemail drops, and real-time campaign management. Maximize agent talk time and connect rates."
      />
      <DialerMockup />
      <CallFlowSection />
      <FeaturesGrid />
      <StatsSection />
      <PublicCta />
      <style>{`
        @keyframes waveform { 0% { transform: scaleY(0.4); } 100% { transform: scaleY(1); } }
      `}</style>
    </div>
  )
}
