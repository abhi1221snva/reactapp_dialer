import { useEffect, useState } from 'react'
import {
  Smartphone, Phone, Users, Check, PhoneCall,
  Bell, BarChart3, MessageSquare, Shield,
  Star, Download, Globe, Clock, Zap,
  ChevronRight, Mail, Hash, StickyNote,
  Mic, MicOff, Pause, TrendingUp,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'
import { PublicCta } from '../../../components/public/PublicCta'

/* ═══════════════════════════════════════════════════════════════════════════
   Phone Device Mockup
   ═══════════════════════════════════════════════════════════════════════════ */

function PhoneMockupSection() {
  const { ref, visible } = useInView()
  const [activeView, setActiveView] = useState<'crm' | 'dialer' | 'dashboard'>('crm')

  useEffect(() => {
    if (!visible) return
    const views: Array<'crm' | 'dialer' | 'dashboard'> = ['crm', 'dialer', 'dashboard']
    let idx = 0
    const id = setInterval(() => {
      idx = (idx + 1) % views.length
      setActiveView(views[idx])
    }, 3500)
    return () => clearInterval(id)
  }, [visible])

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Phone mockup */}
          <div className={`relative flex flex-col items-center transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            {/* View toggle */}
            <div className="inline-flex items-center bg-gray-100 rounded-xl p-1.5 gap-1 mb-8">
              {[
                { key: 'crm' as const, label: 'CRM', icon: Users },
                { key: 'dialer' as const, label: 'Dialer', icon: Phone },
                { key: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveView(tab.key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    activeView === tab.key ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon size={15} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Shadow under phone */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-72 h-8 bg-gray-200/40 rounded-full blur-xl" />

            <div className="relative">
              <div className="absolute -inset-12 bg-gradient-to-br from-blue-100/30 via-transparent to-emerald-100/30 rounded-full blur-2xl pointer-events-none" />

              {/* Phone frame */}
              <div className="relative w-[260px] h-[540px] bg-gray-900 rounded-[40px] p-[6px] shadow-2xl shadow-gray-400/30">
                <div className="relative w-full h-full bg-white rounded-[34px] overflow-hidden">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-32 h-7 bg-gray-900 rounded-b-2xl" />

                  {/* Status bar area */}
                  <div className="absolute top-7 left-0 right-0 z-20 bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <span className="text-white text-[6px] font-bold">B</span>
                      </div>
                      <span className="text-white text-[11px] font-semibold">
                        {activeView === 'crm' ? 'CRM' : activeView === 'dialer' ? 'Dialer' : 'Dashboard'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bell size={12} className="text-gray-400" />
                    </div>
                  </div>

                  {/* CRM View */}
                  <div className={`absolute inset-0 pt-[72px] transition-opacity duration-500 ${activeView === 'crm' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="h-full bg-gray-50 p-3 space-y-2.5 overflow-hidden">
                      {/* Contact card */}
                      <div className="bg-white rounded-xl border border-gray-200 p-3">
                        <div className="flex items-center gap-3 mb-2.5">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                            <span className="text-white text-xs font-bold">SM</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 font-semibold text-sm">Sarah Mitchell</p>
                            <p className="text-gray-400 text-[10px]">TechFlow Inc.</p>
                          </div>
                          <span className="text-[8px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Qualified</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                            <span className="text-gray-400 block">Deal Size</span>
                            <span className="text-gray-800 font-semibold">$250,000</span>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                            <span className="text-gray-400 block">Stage</span>
                            <span className="text-gray-800 font-semibold">Proposal</span>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                            <span className="text-gray-400 block">Phone</span>
                            <span className="text-gray-800 font-semibold">+1 (555) 842</span>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                            <span className="text-gray-400 block">Score</span>
                            <span className="text-emerald-600 font-semibold">94/100</span>
                          </div>
                        </div>
                      </div>

                      {/* Activity */}
                      <div className="bg-white rounded-xl border border-gray-200 p-3">
                        <p className="text-[10px] font-semibold text-gray-700 mb-2">Recent Activity</p>
                        {[
                          { action: 'Call completed', time: '2m ago', dot: 'bg-emerald-400' },
                          { action: 'Email sent - proposal', time: '1h ago', dot: 'bg-blue-400' },
                          { action: 'Note added', time: '3h ago', dot: 'bg-amber-400' },
                        ].map((a, ai) => (
                          <div key={ai} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                            <div className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
                            <span className="text-[10px] text-gray-500 flex-1">{a.action}</span>
                            <span className="text-[9px] text-gray-400">{a.time}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-[10px] font-semibold shadow-sm flex items-center justify-center gap-1">
                          <Phone size={10} /> Call
                        </button>
                        <button className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-[10px] font-semibold flex items-center justify-center gap-1">
                          <MessageSquare size={10} /> SMS
                        </button>
                        <button className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-[10px] font-semibold flex items-center justify-center gap-1">
                          <Mail size={10} /> Email
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dialer View */}
                  <div className={`absolute inset-0 pt-[72px] transition-opacity duration-500 ${activeView === 'dialer' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="h-full bg-white p-4 space-y-3">
                      <div className="text-center pt-4 pb-3">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
                          <span className="text-white text-lg font-bold">JR</span>
                        </div>
                        <p className="text-gray-900 font-bold text-lg">James Rodriguez</p>
                        <p className="text-gray-400 text-sm">+1 (555) 317-4820</p>
                        <p className="text-emerald-500 text-xs font-semibold mt-1 flex items-center justify-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          Connected - 02:15
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 px-2">
                        {[
                          { icon: MicOff, label: 'Mute' },
                          { icon: Pause, label: 'Hold' },
                          { icon: PhoneCall, label: 'Transfer' },
                          { icon: Mic, label: 'Record' },
                          { icon: Hash, label: 'Keypad' },
                          { icon: StickyNote, label: 'Notes' },
                        ].map(btn => (
                          <div key={btn.label} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white border border-gray-200 shadow-sm">
                            <btn.icon size={14} className="text-gray-500" />
                            <span className="text-[9px] text-gray-500 font-medium">{btn.label}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-center pt-4">
                        <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                          <Phone size={22} className="text-white rotate-[135deg]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dashboard View */}
                  <div className={`absolute inset-0 pt-[72px] transition-opacity duration-500 ${activeView === 'dashboard' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="h-full bg-gray-50 p-3 space-y-2.5 overflow-hidden">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Revenue', val: '$2.4M', change: '+18%', color: 'text-emerald-600' },
                          { label: 'Calls', val: '1,847', change: '+23%', color: 'text-blue-600' },
                          { label: 'Deals', val: '284', change: '+12%', color: 'text-indigo-600' },
                          { label: 'Rate', val: '94.2%', change: '+5%', color: 'text-violet-600' },
                        ].map(m => (
                          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-2.5">
                            <p className="text-[9px] font-medium text-gray-400">{m.label}</p>
                            <p className="text-base font-bold text-gray-900">{m.val}</p>
                            <span className={`text-[9px] font-semibold ${m.color}`}>{m.change}</span>
                          </div>
                        ))}
                      </div>

                      {/* Mini chart */}
                      <div className="bg-white rounded-xl border border-gray-100 p-3">
                        <p className="text-[10px] font-semibold text-gray-700 mb-2">Weekly Calls</p>
                        <div className="flex items-end gap-1.5 h-16">
                          {[45, 62, 38, 78, 55, 82, 70].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                className={`w-full rounded-sm ${i === 5 ? 'bg-gradient-to-t from-blue-500 to-indigo-500' : 'bg-gray-200'}`}
                                style={{ height: `${h}%` }}
                              />
                              <span className="text-[7px] text-gray-400">
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top agents */}
                      <div className="bg-white rounded-xl border border-gray-100 p-3">
                        <p className="text-[10px] font-semibold text-gray-700 mb-2">Top Agents</p>
                        {[
                          { name: 'Sarah M.', calls: 142 },
                          { name: 'James R.', calls: 128 },
                          { name: 'Emily C.', calls: 118 },
                        ].map((a, ai) => (
                          <div key={ai} className="flex items-center gap-2 py-1.5">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[7px] font-bold">
                              {a.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-[10px] text-gray-700 flex-1">{a.name}</span>
                            <span className="text-[9px] text-gray-400">{a.calls} calls</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-gray-500 rounded-full" />
              </div>
            </div>
          </div>

          {/* Right: Description & feature list */}
          <div className={`transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
              <Smartphone size={14} className="text-emerald-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Mobile App</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-5">
              Your Entire Platform,{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">In Your Pocket</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-10">
              Manage your pipeline, take calls, and close deals from anywhere with native apps for iOS and Android. Full functionality, zero compromises.
            </p>

            {/* Feature checklist */}
            <ul className="space-y-4 mb-10">
              {[
                'Full CRM access -- view and update merchant records on the go',
                'One-tap dialing with call recording and disposition',
                'Real-time push notifications for new leads and tasks',
                'Dashboard analytics with pipeline performance metrics',
                'Team chat and collaboration with @mentions',
                'Offline mode -- sync when connection returns',
              ].map((feature, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-3 transition-all duration-500 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                  style={{ transitionDelay: `${200 + i * 80}ms` }}
                >
                  <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <Check size={14} className="text-emerald-600" strokeWidth={2.5} />
                  </div>
                  <span className="text-gray-600 text-[15px] leading-relaxed">{feature}</span>
                </li>
              ))}
            </ul>

            {/* App store buttons */}
            <div className="flex flex-wrap gap-3">
              <a href="#" className="inline-flex items-center gap-3 bg-gray-900 hover:bg-gray-800 text-white pl-4 pr-6 py-3.5 rounded-xl transition-all shadow-lg hover:-translate-y-px">
                <Phone size={22} />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 leading-none">Download on the</div>
                  <div className="text-[15px] font-semibold leading-tight mt-0.5">App Store</div>
                </div>
              </a>
              <a href="#" className="inline-flex items-center gap-3 bg-gray-900 hover:bg-gray-800 text-white pl-4 pr-6 py-3.5 rounded-xl transition-all shadow-lg hover:-translate-y-px">
                <Smartphone size={22} />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 leading-none">Get it on</div>
                  <div className="text-[15px] font-semibold leading-tight mt-0.5">Google Play</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Platform Stats Section
   ═══════════════════════════════════════════════════════════════════════════ */

function PlatformStats() {
  const { ref, visible } = useInView()

  const stats = [
    { icon: Download, val: '50K+', label: 'Downloads', sub: 'iOS & Android combined', color: 'from-blue-500 to-blue-600' },
    { icon: Star, val: '4.9', label: 'App Rating', sub: 'across both stores', color: 'from-amber-500 to-amber-600' },
    { icon: Globe, val: '45+', label: 'Countries', sub: 'global reach', color: 'from-emerald-500 to-emerald-600' },
    { icon: Shield, val: '99.9%', label: 'Uptime', sub: 'mobile API SLA', color: 'from-violet-500 to-violet-600' },
  ]

  return (
    <section ref={ref} className="py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 rounded-3xl p-8 lg:p-12 shadow-2xl shadow-gray-900/20">
          <div className={`text-center mb-10 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">Trusted by Mobile Teams Worldwide</h2>
            <p className="text-gray-400">Join thousands of financing professionals managing deals on the go</p>
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
   Mobile-Specific Features
   ═══════════════════════════════════════════════════════════════════════════ */

function MobileFeatures() {
  const { ref, visible } = useInView()

  const features = [
    { icon: Bell, title: 'Push Notifications', desc: 'Instant alerts for new leads, task reminders, deal updates, and team messages. Never miss a critical event.', iconBg: 'bg-blue-50 ring-blue-100', iconColor: 'text-blue-600' },
    { icon: PhoneCall, title: 'Native Calling', desc: 'Crystal-clear VoIP calling with automatic recording. Call disposition and notes right from the call screen.', iconBg: 'bg-emerald-50 ring-emerald-100', iconColor: 'text-emerald-600' },
    { icon: Shield, title: 'Biometric Security', desc: 'Face ID and fingerprint authentication protect sensitive financial data. Enterprise-grade encryption at rest.', iconBg: 'bg-violet-50 ring-violet-100', iconColor: 'text-violet-600' },
    { icon: Zap, title: 'Offline Mode', desc: 'View contacts, notes, and deal info without an internet connection. Changes sync automatically when reconnected.', iconBg: 'bg-amber-50 ring-amber-100', iconColor: 'text-amber-600' },
    { icon: BarChart3, title: 'Mobile Analytics', desc: 'Full dashboard experience optimized for smaller screens. Swipe through charts, filter data, and share reports.', iconBg: 'bg-pink-50 ring-pink-100', iconColor: 'text-pink-600' },
    { icon: MessageSquare, title: 'Team Collaboration', desc: 'In-app messaging, @mentions, and file sharing. Stay connected with your team from anywhere in the field.', iconBg: 'bg-indigo-50 ring-indigo-100', iconColor: 'text-indigo-600' },
  ]

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Smartphone size={14} className="text-blue-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Mobile Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Desktop Power,{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Mobile Freedom</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">Every feature you love on desktop, reimagined for mobile workflows.</p>
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
   App Reviews Section
   ═══════════════════════════════════════════════════════════════════════════ */

function AppReviews() {
  const { ref, visible } = useInView()

  const reviews = [
    { name: 'Lisa Park', role: 'Account Manager', stars: 5, review: 'Finally a finance CRM that works perfectly on mobile. I close deals from coffee shops now. The push notifications for hot leads are a game changer.', platform: 'iOS' },
    { name: 'Mark Torres', role: 'Sales Manager', stars: 5, review: 'The mobile dialer is just as good as desktop. Call quality is excellent and having the full CRM context on screen during calls makes all the difference.', platform: 'Android' },
    { name: 'Anna Kim', role: 'Team Lead', stars: 5, review: 'Our field team adopted this in a week. The offline mode is critical for us since we often visit clients in areas with poor connectivity.', platform: 'iOS' },
  ]

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Star size={14} className="text-amber-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">User Reviews</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Loved by Teams{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Everywhere</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {reviews.map((r, i) => (
            <div
              key={r.name}
              className={`bg-white border border-gray-100 shadow-sm rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-0.5">
                  {[...Array(r.stars)].map((_, si) => (
                    <Star key={si} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{r.platform}</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">&ldquo;{r.review}&rdquo;</p>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shadow">
                  {r.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                  <p className="text-[11px] text-gray-400">{r.role}</p>
                </div>
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

export function MobileAppPage() {
  useEffect(() => { document.title = 'Mobile App | Balji' }, [])

  return (
    <div className="relative min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <PublicHero
        pill="Mobile App"
        pillIcon={Smartphone}
        title="Your Platform,"
        titleHighlight="In Your Pocket"
        subtitle="Native iOS and Android apps with full CRM, dialer, analytics, and team collaboration. Manage your entire pipeline from anywhere."
      />
      <PhoneMockupSection />
      <MobileFeatures />
      <PlatformStats />
      <AppReviews />
      <PublicCta />
    </div>
  )
}
