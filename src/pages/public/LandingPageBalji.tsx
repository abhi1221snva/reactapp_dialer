import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Phone, Zap, Users, BarChart3, Brain, Megaphone,
  ArrowRight, Check, Star, Shield, Globe,
  Headphones, Clock, Target, Menu, X,
  PhoneCall, UserPlus, LineChart, Quote, Sparkles,
  ChevronRight, ChevronDown,
  Smartphone, ExternalLink, TrendingUp,
  Activity, DollarSign, Layers,
  Mic, MicOff, Pause, Hash, StickyNote,
  CreditCard, Briefcase, FileText, Building2, Receipt, Landmark,
  Mail, MessageSquare, Plug, ChevronUp,
  XCircle, CheckCircle2,
} from 'lucide-react'
import { useInView } from '../../hooks/useInView'
import { useCounter } from '../../hooks/useCounter'
import { AnimatedBg } from '../../components/public/AnimatedBg'
import { PublicFooter } from '../../components/public/PublicFooter'

const PORTAL = 'https://portal.balji.app'

/* ═══════════════════════════════════════════════════════════════════════════
   Navbar — Landing page specific (scroll-to sections)
   ═══════════════════════════════════════════════════════════════════════════ */

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Solutions', href: '#verticals' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Mobile App', href: '#mobile-app' },
  ]

  const scrollTo = (href: string) => {
    setMobileOpen(false)
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled
        ? 'bg-white/80 backdrop-blur-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-b border-gray-100/80'
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          <Link to="/website_balji" className="flex items-center gap-2.5">
            <img src="/balji-logo.svg" alt="Balji" className="h-8" />
          </Link>

          <div className="hidden md:flex items-center gap-1 bg-gray-100/60 backdrop-blur-sm rounded-full px-1.5 py-1.5">
            {navLinks.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.href)}
                className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-full transition-all duration-200"
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href={`${PORTAL}/login`} className="px-5 py-2.5 text-[13px] font-semibold text-gray-700 hover:text-gray-900 rounded-full transition-all">
              Login
            </a>
            <a href={`${PORTAL}/register`}
              className="px-6 py-2.5 text-[13px] font-semibold text-white rounded-full bg-gray-900 hover:bg-gray-800 shadow-lg shadow-gray-900/10 transition-all hover:-translate-y-px"
            >
              Get Started Free
            </a>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-600 hover:text-gray-900 rounded-xl">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 pb-6 pt-2 bg-white/95 backdrop-blur-xl border-t border-gray-100">
          <div className="flex flex-col gap-1">
            {navLinks.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.href)}
                className="block w-full text-left px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl"
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
            <a href={`${PORTAL}/login`} className="text-center px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Login</a>
            <a href={`${PORTAL}/register`} className="text-center px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-gray-900 hover:bg-gray-800">Get Started Free</a>
          </div>
        </div>
      </div>
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Hero — Animated metric cards & live data visualization
   ═══════════════════════════════════════════════════════════════════════════ */

function LiveMetricCard({ icon: Icon, label, value, change, color, delay }: {
  icon: typeof TrendingUp; label: string; value: string; change: string; color: string; delay: number
}) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLoaded(true), delay); return () => clearTimeout(t) }, [delay])

  const colorMap: Record<string, { bg: string; text: string; badge: string; ring: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', badge: 'bg-blue-50 text-blue-600', ring: 'ring-blue-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-100' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', badge: 'bg-violet-50 text-violet-600', ring: 'ring-violet-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-600', ring: 'ring-amber-100' },
  }
  const c = colorMap[color] || colorMap.blue

  return (
    <div className={`bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100/80 p-4 shadow-sm hover:shadow-md transition-all duration-700 ring-1 ${c.ring} ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon size={18} className={c.text} />
        </div>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 tracking-tight">{value}</div>
      <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.badge}`}>
        <TrendingUp size={10} />
        {change}
      </div>
    </div>
  )
}

function AnimatedWaveform({ loaded }: { loaded: boolean }) {
  return (
    <div className={`flex items-end gap-[3px] h-12 transition-all duration-1000 delay-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
      {[40, 65, 35, 80, 50, 70, 30, 90, 55, 45, 75, 38, 60, 85, 42, 68, 48, 72, 36, 58].map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-blue-500 to-emerald-400"
          style={{
            height: `${h}%`,
            animation: `waveform 1.5s ease-in-out ${i * 0.08}s infinite alternate`,
          }}
        />
      ))}
    </div>
  )
}

function Hero() {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setLoaded(true)) }, [])

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20 pb-8">
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-indigo-50/80 via-blue-50/40 to-transparent rounded-full blur-3xl -translate-y-1/4 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-50/60 via-teal-50/30 to-transparent rounded-full blur-3xl translate-y-1/4 -translate-x-1/4" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200/80 shadow-sm mb-8 transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[13px] font-medium text-gray-600">The #1 CPaaS Platform for Brokers &amp; ISOs</span>
            </div>

            <h1 className={`text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6 transition-all duration-700 delay-100 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">
                  Close More Deals.
                </span>
              </span>
              <br />
              <span className="text-gray-900">Faster.</span>
            </h1>

            <p className={`text-lg text-gray-500 leading-relaxed max-w-xl mb-10 transition-all duration-700 delay-200 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              Auto dialer, CRM pipeline, real-time analytics, and AI-powered outreach &mdash; unified in one platform built for MCA brokers, equipment financing, SBA lenders, and ISOs.
            </p>

            <div className={`flex flex-col sm:flex-row items-start gap-4 mb-12 transition-all duration-700 delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <a href={`${PORTAL}/register`}
                className="group inline-flex items-center gap-2.5 px-8 py-4 text-[15px] font-semibold text-white rounded-2xl bg-gray-900 hover:bg-gray-800 shadow-xl shadow-gray-900/10 transition-all duration-300 hover:-translate-y-0.5"
              >
                Start Free Trial
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </a>
              <button onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
                className="group inline-flex items-center gap-2.5 px-8 py-4 text-[15px] font-semibold text-gray-700 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 transition-all duration-300"
              >
                Explore Features
                <ChevronDown size={16} className="text-gray-400 group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>

            <div className={`flex flex-wrap items-center gap-6 transition-all duration-700 delay-[400ms] ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {[
                { icon: Shield, label: 'SOC 2 Compliant' },
                { icon: Globe, label: '99.99% Uptime' },
                { icon: Headphones, label: '24/7 Support' },
                { icon: Clock, label: '2-Min Setup' },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-2 text-gray-400">
                  <b.icon size={14} className="text-gray-400" />
                  <span className="text-[13px] font-medium">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Live data visualization */}
          <div className={`relative transition-all duration-1000 delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="absolute -inset-8 bg-gradient-to-br from-blue-100/30 via-transparent to-emerald-100/30 rounded-3xl blur-2xl pointer-events-none" />
            <div className="relative grid grid-cols-2 gap-3">
              <LiveMetricCard icon={PhoneCall} label="Live Calls" value="1,284" change="+23% vs avg" color="blue" delay={500} />
              <LiveMetricCard icon={Target} label="Funded Today" value="47" change="+18% this week" color="emerald" delay={650} />
              <LiveMetricCard icon={DollarSign} label="Pipeline Value" value="$2.4M" change="+31% MoM" color="violet" delay={800} />
              <LiveMetricCard icon={Users} label="Agents Online" value="128" change="98% online" color="amber" delay={950} />

              {/* Live call activity card */}
              <div className={`col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100/80 p-5 shadow-sm ring-1 ring-gray-100 transition-all duration-700 delay-[1100ms] ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <Activity size={16} className="text-white" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-gray-900">Live Call Activity</span>
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                        <span className="text-[10px] text-emerald-600 font-medium">42 active calls</span>
                      </div>
                    </div>
                  </div>
                  <AnimatedWaveform loaded={loaded} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Avg Duration', value: '4:32', sub: 'min' },
                    { label: 'Connect Rate', value: '68%', sub: 'today' },
                    { label: 'AI Sentiment', value: '8.4', sub: '/10' },
                  ].map(m => (
                    <div key={m.label} className="bg-gray-50/80 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-gray-900">{m.value}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{m.label}</div>
                    </div>
                  ))}
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
   Logo Marquee Ticker — CSS-animated infinite horizontal scroll
   ═══════════════════════════════════════════════════════════════════════════ */

function LogoMarquee() {
  const logos = [
    'CapitalStack', 'FundingCircle', 'MerchantGrowth', 'ApexFunding', 'VelocityCapital',
    'IronBridge Finance', 'BlueHarbor', 'SwiftFund', 'PinnacleISO', 'TridentCapital',
    'SummitFunding', 'NorthStar MCA', 'OakTree Lending', 'PrimeRate ISO', 'FundVault',
  ]

  return (
    <section className="relative py-10 bg-white/50 border-y border-gray-100/50 overflow-hidden">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-6">
        Trusted by 1,200+ brokers &amp; ISOs nationwide
      </p>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        <div className="flex gap-12 animate-marquee">
          {[...logos, ...logos].map((name, i) => (
            <span key={`${name}-${i}`} className="text-lg font-bold text-gray-300 tracking-tight whitespace-nowrap flex-shrink-0 select-none">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   StatsBar — Animated counters in a highlight row
   ═══════════════════════════════════════════════════════════════════════════ */

function StatsBar() {
  const { ref, visible } = useInView()
  const c0 = useCounter(1200, visible)
  const c1 = useCounter(25, visible, 1500)
  const c2 = useCounter(99, visible, 1800)
  const c3 = useCounter(4, visible, 1200)

  const stats = [
    { val: `${c0}+`, label: 'Brokers & ISOs', icon: Users, color: 'from-blue-500 to-blue-600' },
    { val: `${c1}M+`, label: 'Calls Placed', icon: PhoneCall, color: 'from-indigo-500 to-indigo-600' },
    { val: `${c2}.99%`, label: 'Uptime', icon: Clock, color: 'from-emerald-500 to-emerald-600' },
    { val: `$${c3}B+`, label: 'Funded', icon: DollarSign, color: 'from-violet-500 to-violet-600' },
  ]

  return (
    <section ref={ref} className="relative py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 rounded-3xl p-8 lg:p-12 shadow-2xl shadow-gray-900/20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {stats.map((s, i) => (
              <div key={s.label}
                className={`text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} mb-4 shadow-lg`}>
                  <s.icon size={22} className="text-white" />
                </div>
                <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-1">
                  {s.val}
                </div>
                <div className="text-sm font-medium text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Features — Bento grid layout
   ═══════════════════════════════════════════════════════════════════════════ */

const features = [
  { icon: Zap, title: 'Auto Dialer', desc: 'Progressive and preview modes that maximize connect rates. AI-paced dialing adapts to your team\'s capacity in real time.', iconBg: 'bg-amber-50 ring-amber-100', iconColor: 'text-amber-600', to: '/product/auto-dialer' },
  { icon: Users, title: 'CRM Pipeline', desc: 'Track every merchant from first contact to funding. Custom stages, deal history, and 360-degree contact views.', iconBg: 'bg-blue-50 ring-blue-100', iconColor: 'text-blue-600', to: '/product/crm-pipeline' },
  { icon: BarChart3, title: 'Revenue Analytics', desc: 'Real-time dashboards for deal performance, agent productivity, and pipeline forecasting.', iconBg: 'bg-emerald-50 ring-emerald-100', iconColor: 'text-emerald-600', to: '/product/analytics' },
  { icon: Brain, title: 'AI-Powered Insights', desc: 'Sentiment analysis on every call. Smart deal scoring and automated agent coaching suggestions.', iconBg: 'bg-violet-50 ring-violet-100', iconColor: 'text-violet-600', to: '/product/ai-insights' },
  { icon: Megaphone, title: 'Multi-Channel Outreach', desc: 'Voice, SMS, and email unified in one workspace. Automated drip campaigns for merchant follow-ups.', iconBg: 'bg-pink-50 ring-pink-100', iconColor: 'text-pink-600', to: '/product/auto-dialer' },
  { icon: Shield, title: 'Compliance & Recording', desc: 'Every call recorded with full audit trails. Built-in TCPA compliance tools and consent management.', iconBg: 'bg-rose-50 ring-rose-100', iconColor: 'text-rose-600', to: '/legal/security' },
]

function Features() {
  const { ref, visible } = useInView()
  return (
    <section ref={ref} id="features" className="relative py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Layers size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Platform Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">Close More Deals</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">A complete communications and CRM platform purpose-built for brokers and ISOs in business financing.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {features.map((f, i) => (
            <Link key={f.title} to={f.to}
              className={`group relative p-7 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${f.iconBg} ring-1 mb-5 transition-transform duration-300 group-hover:scale-110`}>
                <f.icon size={22} className={f.iconColor} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2.5">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              <div className="flex items-center gap-1.5 mt-5 text-sm font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-1">
                Learn more <ChevronRight size={14} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Built for Every Funding Vertical
   ═══════════════════════════════════════════════════════════════════════════ */

function FundingVerticals() {
  const { ref, visible } = useInView()

  const verticals = [
    { icon: CreditCard, title: 'Merchant Cash Advance', desc: 'Reach merchants faster with automated dialing and fast-track MCA deals through your pipeline.', color: 'bg-blue-50 text-blue-600 ring-blue-100' },
    { icon: Briefcase, title: 'Equipment Financing', desc: 'Manage complex equipment deals with multi-stage pipelines and document tracking.', color: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
    { icon: Landmark, title: 'SBA Loans', desc: 'Stay organized through lengthy SBA processes with automated follow-ups and status tracking.', color: 'bg-violet-50 text-violet-600 ring-violet-100' },
    { icon: LineChart, title: 'Lines of Credit', desc: 'Nurture merchant relationships with drip campaigns and renewal reminders.', color: 'bg-amber-50 text-amber-600 ring-amber-100' },
    { icon: TrendingUp, title: 'Revenue-Based Financing', desc: 'Track revenue metrics and automate outreach for RBF-specific deal flows.', color: 'bg-pink-50 text-pink-600 ring-pink-100' },
    { icon: Receipt, title: 'Invoice Factoring', desc: 'Streamline invoice verification and merchant communication with integrated workflows.', color: 'bg-rose-50 text-rose-600 ring-rose-100' },
  ]

  return (
    <section id="verticals" ref={ref} className="relative py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/30 to-white" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Building2 size={14} className="text-emerald-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Solutions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Built for Every{' '}
            <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">Funding Vertical</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">Whatever product you broker, Balji adapts to your workflow.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {verticals.map((v, i) => (
            <div key={v.title}
              className={`group p-7 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ring-1 mb-5 transition-transform duration-300 group-hover:scale-110 ${v.color}`}>
                <v.icon size={22} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2.5">{v.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Platform Showcase — Interactive rendered UI panels (no screenshots)
   ═══════════════════════════════════════════════════════════════════════════ */

function PlatformShowcase() {
  const { ref, visible } = useInView()
  const [tab, setTab] = useState(0)

  const tabs = [
    { label: 'Dashboard', icon: BarChart3 },
    { label: 'Pipeline', icon: Users },
    { label: 'Dialer', icon: Phone },
  ]

  return (
    <section id="platform" ref={ref} className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/30 to-white" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-14 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <BarChart3 size={14} className="text-emerald-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">Built for Speed and Scale</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">A beautifully crafted workspace your brokerage team will love.</p>
        </div>

        <div className={`flex justify-center mb-10 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-flex items-center bg-gray-100 rounded-2xl p-1.5 gap-1">
            {tabs.map((t, i) => (
              <button key={t.label} onClick={() => setTab(i)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  tab === i ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <t.icon size={16} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`relative max-w-5xl mx-auto transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="absolute -inset-10 bg-gradient-to-br from-blue-100/30 via-transparent to-emerald-100/30 rounded-3xl blur-2xl pointer-events-none" />

          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl shadow-gray-200/40 overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-b border-gray-200/80">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-1.5 text-xs text-gray-400 min-w-[260px]">
                  <Shield size={11} className="text-emerald-500" />
                  portal.balji.app/{tabs[tab].label.toLowerCase()}
                </div>
              </div>
              <div className="w-[52px]" />
            </div>

            {/* Dashboard View */}
            {tab === 0 && (
              <div className="p-6 bg-gray-50/50 min-h-[420px]">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Pipeline Value', val: '$2.4M', change: '+18%', color: 'text-emerald-600' },
                    { label: 'Active Deals', val: '284', change: '+12%', color: 'text-blue-600' },
                    { label: 'Calls Today', val: '1,847', change: '+23%', color: 'text-indigo-600' },
                    { label: 'Funding Rate', val: '94.2%', change: '+5.3%', color: 'text-violet-600' },
                  ].map(m => (
                    <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4">
                      <p className="text-[11px] font-medium text-gray-400 mb-1">{m.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{m.val}</p>
                      <span className={`text-[11px] font-semibold ${m.color}`}>{m.change}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-gray-900">Funding Trend</span>
                      <div className="flex gap-2 text-[10px]">
                        <span className="px-2 py-1 bg-gray-900 text-white rounded-md font-medium">Monthly</span>
                        <span className="px-2 py-1 text-gray-500 rounded-md font-medium">Weekly</span>
                      </div>
                    </div>
                    <div className="flex items-end gap-2 h-40">
                      {[45, 52, 48, 61, 55, 72, 68, 78, 65, 82, 75, 90].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className={`w-full rounded-md transition-all duration-500 ${i === 11 ? 'bg-gradient-to-t from-blue-500 to-indigo-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                            style={{ height: `${h}%`, transitionDelay: `${i * 40}ms` }}
                          />
                          <span className="text-[8px] text-gray-400">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <span className="text-sm font-semibold text-gray-900">Top Agents</span>
                    <div className="mt-4 space-y-3">
                      {[
                        { name: 'Sarah M.', calls: 142, rate: '96%' },
                        { name: 'James R.', calls: 128, rate: '93%' },
                        { name: 'Emily C.', calls: 118, rate: '91%' },
                        { name: 'David A.', calls: 106, rate: '89%' },
                      ].map((a, ai) => (
                        <div key={ai} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold">
                            {a.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{a.name}</p>
                            <p className="text-[10px] text-gray-400">{a.calls} calls</p>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-600">{a.rate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pipeline View */}
            {tab === 1 && (
              <div className="p-6 bg-gray-50/50 min-h-[420px]">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-sm font-semibold text-gray-900">Deal Pipeline</span>
                  <span className="text-[11px] text-gray-400 font-medium">$8.2M total value</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { stage: 'New Leads', count: 48, value: '$1.2M', color: 'border-t-blue-400', items: [
                      { name: 'FastServ Logistics', amount: '$85K', time: '2h ago' },
                      { name: 'Metro Auto Parts', amount: '$120K', time: '4h ago' },
                      { name: 'Sunrise Deli LLC', amount: '$45K', time: '6h ago' },
                    ]},
                    { stage: 'Qualified', count: 32, value: '$2.8M', color: 'border-t-indigo-400', items: [
                      { name: 'BrightPath Medical', amount: '$250K', time: '1d ago' },
                      { name: 'Harbor Construction', amount: '$180K', time: '1d ago' },
                      { name: 'Coastal Dining Co', amount: '$95K', time: '2d ago' },
                    ]},
                    { stage: 'Proposal', count: 18, value: '$2.1M', color: 'border-t-violet-400', items: [
                      { name: 'GreenField Trucking', amount: '$320K', time: '3h ago' },
                      { name: 'BlueSky Retail', amount: '$150K', time: '1d ago' },
                      { name: 'Apex Plumbing Co', amount: '$200K', time: '2d ago' },
                    ]},
                    { stage: 'Funded', count: 12, value: '$2.1M', color: 'border-t-emerald-400', items: [
                      { name: 'NovaPay Services', amount: '$175K', time: '1h ago' },
                      { name: 'SwiftHaul LLC', amount: '$290K', time: '5h ago' },
                      { name: 'PrimeFleet Group', amount: '$340K', time: '1d ago' },
                    ]},
                  ].map(col => (
                    <div key={col.stage} className={`bg-white rounded-xl border border-gray-100 border-t-2 ${col.color} overflow-hidden`}>
                      <div className="p-3 border-b border-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-900">{col.stage}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">{col.count}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">{col.value}</span>
                      </div>
                      <div className="p-2 space-y-2">
                        {col.items.map(item => (
                          <div key={item.name} className="p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <p className="text-[11px] font-semibold text-gray-900 mb-1">{item.name}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-medium text-emerald-600">{item.amount}</span>
                              <span className="text-[9px] text-gray-400">{item.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dialer View */}
            {tab === 2 && (
              <div className="p-6 bg-gray-50/50 min-h-[420px]">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-gray-900">Agents</span>
                      <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">8 Online</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { name: 'Sarah Mitchell', status: 'On Call', statusColor: 'bg-emerald-400', dur: '3:42' },
                        { name: 'James Rodriguez', status: 'Wrapping', statusColor: 'bg-amber-400', dur: '0:15' },
                        { name: 'Emily Chen', status: 'On Call', statusColor: 'bg-emerald-400', dur: '1:28' },
                        { name: 'David Alvarez', status: 'Ready', statusColor: 'bg-blue-400', dur: '' },
                        { name: 'Lisa Park', status: 'On Call', statusColor: 'bg-emerald-400', dur: '5:11' },
                        { name: 'Mark Johnson', status: 'Break', statusColor: 'bg-gray-400', dur: '' },
                      ].map(a => (
                        <div key={a.name} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-600">
                              {a.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${a.statusColor} border-2 border-white`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-gray-900 truncate">{a.name}</p>
                            <p className="text-[9px] text-gray-400">{a.status}{a.dur ? ` - ${a.dur}` : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                      <span className="text-white text-2xl font-bold">RA</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">Rachel Adams</p>
                    <p className="text-sm text-gray-400 mb-1">+1 (555) 842-9173</p>
                    <p className="text-sm text-emerald-500 font-semibold mb-6 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
                      Connected &mdash; 03:42
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
                        <button key={b.label} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-colors">
                          <b.icon size={16} className="text-gray-500" />
                          <span className="text-[9px] text-gray-500 font-medium">{b.label}</span>
                        </button>
                      ))}
                    </div>
                    <button className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-colors">
                      <Phone size={22} className="text-white rotate-[135deg]" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <span className="text-sm font-semibold text-gray-900">Campaign: MCA Outreach Q2</span>
                      <div className="mt-3 space-y-3">
                        {[
                          { label: 'Total Merchants', val: '2,847' },
                          { label: 'Reached', val: '1,284' },
                          { label: 'Pending', val: '1,563' },
                          { label: 'Connect Rate', val: '68.4%' },
                        ].map(s => (
                          <div key={s.label} className="flex justify-between items-center">
                            <span className="text-[11px] text-gray-500">{s.label}</span>
                            <span className="text-[11px] font-semibold text-gray-900">{s.val}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full" style={{ width: '45%' }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1.5">45% complete</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <span className="text-xs font-semibold text-gray-900">AI Insights</span>
                      <div className="mt-3 space-y-2">
                        {[
                          { text: 'Best call hours: 10am-12pm', icon: Clock },
                          { text: 'Sentiment trending positive', icon: TrendingUp },
                          { text: '3 agents need coaching', icon: Brain },
                        ].map((ins, ii) => (
                          <div key={ii} className="flex items-center gap-2 p-2 bg-blue-50/60 rounded-lg">
                            <ins.icon size={12} className="text-blue-600 flex-shrink-0" />
                            <span className="text-[10px] text-blue-700 font-medium">{ins.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   How It Works — 4 connected steps
   ═══════════════════════════════════════════════════════════════════════════ */

const steps = [
  { icon: UserPlus, title: 'Import Merchants', desc: 'Import leads from CSV, API, or web forms. Auto-deduplicate and enrich merchant data.', gradient: 'from-blue-500 to-cyan-400', bgLight: 'bg-blue-50', border: 'border-blue-100' },
  { icon: PhoneCall, title: 'Launch Campaigns', desc: 'Start automated outreach campaigns. AI paces calls to maximize live connections with merchants.', gradient: 'from-indigo-500 to-blue-400', bgLight: 'bg-indigo-50', border: 'border-indigo-100' },
  { icon: LineChart, title: 'Track Deals', desc: 'Real-time dashboards show every metric. Coach agents with AI-powered insights.', gradient: 'from-emerald-500 to-teal-400', bgLight: 'bg-emerald-50', border: 'border-emerald-100' },
  { icon: Target, title: 'Fund & Close', desc: 'Move merchants through your pipeline. Automated follow-ups ensure every deal gets funded.', gradient: 'from-emerald-600 to-green-400', bgLight: 'bg-green-50', border: 'border-green-100' },
]

function HowItWorks() {
  const { ref, visible } = useInView()
  return (
    <section ref={ref} id="how-it-works" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/80 to-white" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <PhoneCall size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">How It Works</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">From Lead to Funded in 4 Steps</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">Get up and running in minutes, not months.</p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
          <div className="hidden md:block absolute top-[60px] left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-[2px]">
            <div className="w-full h-full bg-gradient-to-r from-blue-200 via-indigo-200 to-emerald-200 rounded-full" />
          </div>

          {steps.map((s, i) => (
            <div key={s.title} className={`relative flex flex-col items-center text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: `${i * 120}ms` }}>
              <div className="relative mb-6">
                <div className={`relative z-10 w-[104px] h-[104px] rounded-2xl bg-white border ${s.border} shadow-sm flex items-center justify-center`}>
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-lg`}>
                    <s.icon size={28} className="text-white" strokeWidth={1.8} />
                  </div>
                </div>
                <div className={`absolute -top-2 -right-2 z-20 w-7 h-7 rounded-full bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-md ring-[3px] ring-white`}>
                  <span className="text-xs font-bold text-white">{i + 1}</span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-[240px]">{s.desc}</p>
              {i < 3 && (
                <div className="md:hidden flex flex-col items-center mt-6 mb-2">
                  <div className="w-[2px] h-8 bg-gray-200 rounded-full" />
                  <ChevronDown size={16} className="text-gray-300 -mt-1" />
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
   Integrations Section
   ═══════════════════════════════════════════════════════════════════════════ */

function Integrations() {
  const { ref, visible } = useInView()

  const integrations = [
    { name: 'Twilio', desc: 'Voice & SMS', icon: Phone, color: 'bg-red-50 text-red-600 ring-red-100' },
    { name: 'Plivo', desc: 'Voice & SMS', icon: PhoneCall, color: 'bg-green-50 text-green-600 ring-green-100' },
    { name: 'Stripe', desc: 'Payments', icon: CreditCard, color: 'bg-violet-50 text-violet-600 ring-violet-100' },
    { name: 'Gmail', desc: 'Email', icon: Mail, color: 'bg-blue-50 text-blue-600 ring-blue-100' },
    { name: 'Salesforce', desc: 'CRM Sync', icon: Globe, color: 'bg-cyan-50 text-cyan-600 ring-cyan-100' },
    { name: 'Zapier', desc: 'Automation', icon: Zap, color: 'bg-orange-50 text-orange-600 ring-orange-100' },
    { name: 'Slack', desc: 'Notifications', icon: MessageSquare, color: 'bg-purple-50 text-purple-600 ring-purple-100' },
    { name: 'QuickBooks', desc: 'Accounting', icon: FileText, color: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
  ]

  return (
    <section ref={ref} className="relative py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Plug size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Integrations</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Connects to Tools You{' '}
            <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">Already Use</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">Plug into your existing tech stack in minutes. No custom development required.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {integrations.map((int, i) => (
            <div key={int.name}
              className={`group p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 hover:-translate-y-1 transition-all duration-500 text-center ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ring-1 mb-4 transition-transform duration-300 group-hover:scale-110 ${int.color}`}>
                <int.icon size={22} />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{int.name}</h3>
              <p className="text-xs text-gray-400">{int.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Mobile App — Phone mockup with auto-toggle
   ═══════════════════════════════════════════════════════════════════════════ */

function MobileApp() {
  const { ref, visible } = useInView()
  const [activeView, setActiveView] = useState<'phone' | 'crm'>('phone')
  const mobileFeatures = [
    'Real-time lead notifications and call alerts',
    'Full CRM access — view and update merchant records',
    'One-tap dialing with call recording',
    'Dashboard analytics on the go',
    'Team chat and collaboration',
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveView(prev => prev === 'phone' ? 'crm' : 'phone')
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  return (
    <section id="mobile-app" ref={ref} className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/30 to-white" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
              <Smartphone size={14} className="text-emerald-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Mobile App</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              Your Platform, On The Go
            </h2>
            <p className="text-lg text-gray-500 max-w-lg mb-10">
              Manage your deals, track calls, and close merchants from anywhere with our native mobile apps for Android &amp; iOS.
            </p>

            <ul className="space-y-4 mb-10">
              {mobileFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <Check size={14} className="text-emerald-600" strokeWidth={2.5} />
                  </div>
                  <span className="text-gray-600 text-[15px] leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3">
              <Link to="/product/mobile-app" className="inline-flex items-center gap-3 bg-gray-900 hover:bg-gray-800 text-white pl-4 pr-6 py-3 rounded-xl transition-all shadow-lg hover:-translate-y-px">
                <Phone size={22} />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 leading-none">Download on the</div>
                  <div className="text-[15px] font-semibold leading-tight mt-0.5">App Store</div>
                </div>
              </Link>
              <Link to="/product/mobile-app" className="inline-flex items-center gap-3 bg-gray-900 hover:bg-gray-800 text-white pl-4 pr-6 py-3 rounded-xl transition-all shadow-lg hover:-translate-y-px">
                <Smartphone size={22} />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 leading-none">Get it on</div>
                  <div className="text-[15px] font-semibold leading-tight mt-0.5">Google Play</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Right column — phone mockup */}
          <div className={`relative flex flex-col items-center min-h-[600px] transition-all duration-1000 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="inline-flex items-center bg-gray-100 rounded-xl p-1.5 gap-1 mb-8">
              <button onClick={() => setActiveView('phone')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeView === 'phone' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Phone size={15} /> Dialer
              </button>
              <button onClick={() => setActiveView('crm')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeView === 'crm' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Users size={15} /> CRM
              </button>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-72 h-8 bg-gray-200/40 rounded-full blur-xl" />

            <div className="relative">
              <div className="relative w-[260px] h-[540px] bg-gray-900 rounded-[40px] p-[6px] shadow-2xl shadow-gray-400/30">
                <div className="relative w-full h-full bg-white rounded-[34px] overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-32 h-7 bg-gray-900 rounded-b-2xl" />
                  <div className="absolute top-7 left-0 right-0 z-20 bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-2 flex items-center gap-2">
                    <img src="/balji-logo.svg" alt="Balji" className="h-4 brightness-0 invert" />
                    <span className="text-white text-[11px] font-semibold">
                      {activeView === 'phone' ? 'Dialer' : 'CRM'}
                    </span>
                  </div>

                  {/* Dialer view */}
                  <div className={`absolute inset-0 pt-[72px] transition-opacity duration-500 ${activeView === 'phone' ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="h-full bg-white p-4 space-y-3">
                      <div className="text-center pt-2 pb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20">
                          <span className="text-white text-lg font-bold">RA</span>
                        </div>
                        <p className="text-gray-900 font-bold text-lg">Rachel Adams</p>
                        <p className="text-gray-400 text-sm">+1 (555) 842-9173</p>
                        <p className="text-emerald-500 text-xs font-semibold mt-1 animate-pulse">Connected — 03:42</p>
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

                  {/* CRM view */}
                  <div className={`absolute inset-0 pt-[72px] transition-opacity duration-500 ${activeView === 'crm' ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="h-full bg-white p-4 space-y-3 overflow-hidden">
                      <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">DA</span>
                          </div>
                          <div>
                            <p className="text-gray-900 font-semibold text-sm">David Alvarez</p>
                            <p className="text-gray-400 text-[10px]">Metro Auto Parts</p>
                          </div>
                          <span className="ml-auto text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Qualified</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="bg-white rounded-lg p-2 border border-gray-100"><span className="text-gray-400">Phone</span><br/><span className="text-gray-700 font-medium">+1 (555) 317-4820</span></div>
                          <div className="bg-white rounded-lg p-2 border border-gray-100"><span className="text-gray-400">Email</span><br/><span className="text-gray-700 font-medium">d.alvarez@map.io</span></div>
                          <div className="bg-white rounded-lg p-2 border border-gray-100"><span className="text-gray-400">Deal Size</span><br/><span className="text-gray-700 font-medium">$125,000</span></div>
                          <div className="bg-white rounded-lg p-2 border border-gray-100"><span className="text-gray-400">Stage</span><br/><span className="text-gray-700 font-medium">Proposal</span></div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                        <p className="text-[10px] font-semibold text-gray-700 mb-2">Recent Activity</p>
                        {[
                          { action: 'Call completed', time: '2m ago', dot: 'bg-emerald-400' },
                          { action: 'Email sent — proposal', time: '1h ago', dot: 'bg-blue-400' },
                          { action: 'Note added', time: '3h ago', dot: 'bg-amber-400' },
                        ].map((a, ai) => (
                          <div key={ai} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                            <div className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
                            <span className="text-[10px] text-gray-500 flex-1">{a.action}</span>
                            <span className="text-[9px] text-gray-400">{a.time}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 py-2 rounded-lg bg-gray-900 text-white text-[10px] font-semibold shadow-sm">Call</button>
                        <button className="flex-1 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-[10px] font-semibold">SMS</button>
                        <button className="flex-1 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-[10px] font-semibold">Email</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-gray-500 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Pricing
   ═══════════════════════════════════════════════════════════════════════════ */

function Pricing() {
  const { ref, visible } = useInView()

  const dialerFeatures = [
    'Unlimited calls*',
    'Auto dialer',
    'Call recording & logging',
    'Agent scripts',
    'Campaign management',
    'Real-time call monitoring',
    'Priority support',
  ]

  const crmFeatures = [
    'Everything in Dialer',
    'Full CRM pipeline',
    'Lead management & scoring',
    'Multi-channel outreach (Voice, SMS, Email)',
    'AI insights & coaching',
    'Advanced analytics & reporting',
    'Mobile app access',
    'API access',
    'SSO & RBAC',
  ]

  return (
    <section id="pricing" ref={ref} className="relative py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/80 to-white" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Sparkles size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Pricing</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Simple, Transparent Pricing
          </h2>
          <p className={`text-lg text-gray-500 max-w-2xl mx-auto transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Start free, scale as your brokerage grows. No hidden fees, no contracts.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className={`bg-white border border-gray-200 shadow-sm rounded-2xl p-8 flex flex-col transition-all duration-700 delay-200 hover:shadow-lg ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Dialer</h3>
              <p className="text-sm text-gray-500">Power dialer with unlimited calls for your outreach team.</p>
            </div>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-5xl font-extrabold text-gray-900">$19.99</span>
              <span className="text-gray-500 font-medium">/mo per user</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {dialerFeatures.map(f => (
                <li key={f} className="flex items-start gap-3">
                  <Check size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-600">{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-400 mb-4">* Fair usage policy applies</p>
            <a href={`${PORTAL}/register`}
              className="block w-full text-center px-6 py-3.5 text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-all duration-300"
            >
              Start Free Trial
            </a>
          </div>

          <div className={`relative bg-white border-2 border-gray-900 shadow-xl rounded-2xl p-8 flex flex-col transition-all duration-700 delay-300 hover:shadow-2xl ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center px-4 py-1 rounded-full text-xs font-bold bg-gray-900 text-white shadow-lg">
                Best Value
              </span>
            </div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Dialer + CRM</h3>
              <p className="text-sm text-gray-500">The complete combo &mdash; dialer and CRM in one platform for your ISO.</p>
            </div>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-5xl font-extrabold text-gray-900">$29.99</span>
              <span className="text-gray-500 font-medium">/mo per user</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {crmFeatures.map(f => (
                <li key={f} className="flex items-start gap-3">
                  <Check size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-600">{f}</span>
                </li>
              ))}
            </ul>
            <a href={`${PORTAL}/register`}
              className="block w-full text-center px-6 py-3.5 text-sm font-semibold bg-gray-900 text-white shadow-lg shadow-gray-900/10 hover:bg-gray-800 hover:-translate-y-px rounded-xl transition-all duration-300"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Testimonials
   ═══════════════════════════════════════════════════════════════════════════ */

function Testimonials() {
  const { ref, visible } = useInView()

  const testimonials = [
    {
      name: 'Mike Santoro',
      role: 'CEO, Apex Funding Group (ISO)',
      initials: 'MS',
      gradient: 'from-blue-500 to-indigo-600',
      quote: 'Balji transformed our operation. Our team went from 80 to 200+ calls per day with better connect rates. The AI coaching feature is a game changer for training new brokers.',
    },
    {
      name: 'Jessica Chen',
      role: 'Managing Partner, BrightPath Capital',
      initials: 'JC',
      gradient: 'from-emerald-500 to-teal-500',
      quote: 'We evaluated 12 platforms. Balji was the only one that combined a real dialer with a CRM our brokers actually wanted to use. Deal flow increased 40% in the first quarter.',
    },
    {
      name: 'David Alvarez',
      role: 'ISO Owner, SwiftFund Solutions',
      initials: 'DA',
      gradient: 'from-violet-500 to-purple-500',
      quote: 'The real-time analytics alone paid for the platform in the first month. We identified bottlenecks we didn\'t know existed and improved our funding rate by 34%.',
    },
  ]

  return (
    <section ref={ref} className="relative py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Star size={14} className="text-amber-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Testimonials</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Trusted by Brokers &amp; ISOs Everywhere
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={t.name}
              className={`bg-white border border-gray-100 shadow-sm hover:shadow-lg rounded-2xl p-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${200 + i * 100}ms` }}
            >
              <Quote size={28} className="text-gray-200 mb-4" />
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, si) => (
                  <Star key={si} size={14} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-gray-600 leading-relaxed mb-8 text-[15px]">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                  <div className="text-xs text-gray-400">{t.role}</div>
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
   FAQ — Expandable accordion
   ═══════════════════════════════════════════════════════════════════════════ */

function FAQ() {
  const { ref, visible } = useInView()
  const [open, setOpen] = useState<number | null>(null)

  const faqs = [
    {
      q: 'How quickly can my team get set up?',
      a: 'Most brokerages are up and running within 15 minutes. Import your merchant list, configure your campaigns, and start dialing. Our onboarding team is available 24/7 to help with migration from other platforms.',
    },
    {
      q: 'Is Balji TCPA and DNC compliant?',
      a: 'Yes. Balji includes built-in TCPA compliance tools, automatic DNC list scrubbing, consent management, and full call recording with audit trails. We help you stay compliant so you can focus on closing deals.',
    },
    {
      q: 'How is my data secured?',
      a: 'We are SOC 2 Type II certified and use AES-256 encryption at rest and TLS 1.3 in transit. All data is hosted in US-based data centers with 99.99% uptime SLA. Role-based access control ensures your team only sees what they need.',
    },
    {
      q: 'Can I keep my existing phone numbers?',
      a: 'Absolutely. We support number porting from any carrier and integrate directly with Twilio and Plivo. You can also provision new local and toll-free numbers instantly from within the platform.',
    },
    {
      q: 'What integrations do you support?',
      a: 'Balji integrates with Twilio, Plivo, Stripe, Gmail, Salesforce, Zapier, Slack, QuickBooks, and more. Our REST API and webhook system lets you connect to virtually any tool in your stack.',
    },
    {
      q: 'Can I migrate from my current dialer or CRM?',
      a: 'Yes. We offer free migration assistance for any brokerage switching from another platform. Our team will help you import merchants, call history, deal data, and recordings so nothing is lost.',
    },
    {
      q: 'Do you offer volume discounts for larger ISOs?',
      a: 'Yes. For teams of 10+ users we offer custom enterprise pricing with dedicated account management, custom SLAs, and priority support. Contact our sales team for a tailored quote.',
    },
    {
      q: 'Is there a contract or commitment?',
      a: 'No contracts, no commitments. All plans are month-to-month and you can cancel anytime. We also offer a 14-day free trial so you can experience the full platform risk-free.',
    },
  ]

  return (
    <section id="faq" ref={ref} className="relative py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/30 to-white" />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <MessageSquare size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">FAQ</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">Everything you need to know about getting started with Balji.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i}
              className={`bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden transition-all duration-500 hover:shadow-md ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 p-6 text-left"
              >
                <span className="text-[15px] font-semibold text-gray-900">{faq.q}</span>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`}>
                  <ChevronUp size={16} className="text-gray-500" />
                </div>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${open === i ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-6 text-sm text-gray-500 leading-relaxed">
                  {faq.a}
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
   Why Balji — Before / After comparison strip
   ═══════════════════════════════════════════════════════════════════════════ */

function WhyBalji() {
  const { ref, visible } = useInView()

  const comparisons = [
    { without: 'Spreadsheets & sticky notes to track deals', with: 'Visual pipeline with drag-and-drop deal stages' },
    { without: 'Manual dialing — 40 calls/day per agent', with: 'Auto dialer — 200+ calls/day per agent' },
    { without: 'No visibility into agent performance', with: 'Real-time dashboards & AI coaching' },
    { without: 'Juggling 5+ tools that don\'t talk to each other', with: 'One platform: dialer, CRM, SMS, email, analytics' },
    { without: 'Compliance anxiety & missed follow-ups', with: 'Built-in TCPA tools & automated follow-up sequences' },
  ]

  return (
    <section ref={ref} className="relative py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Sparkles size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Why Balji</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            The Difference is{' '}
            <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">Night and Day</span>
          </h2>
        </div>

        <div className={`bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="grid grid-cols-2">
            <div className="bg-gray-50 p-6 border-b border-r border-gray-200">
              <div className="flex items-center gap-2">
                <XCircle size={18} className="text-red-400" />
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Without Balji</span>
              </div>
            </div>
            <div className="bg-emerald-50/50 p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider">With Balji</span>
              </div>
            </div>
          </div>
          {comparisons.map((c, i) => (
            <div key={i}
              className={`grid grid-cols-2 transition-all duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
              style={{ transitionDelay: `${200 + i * 80}ms` }}
            >
              <div className={`p-5 border-r border-gray-200 ${i < comparisons.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <p className="text-sm text-gray-400 leading-relaxed">{c.without}</p>
              </div>
              <div className={`p-5 bg-emerald-50/20 ${i < comparisons.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <p className="text-sm text-gray-700 font-medium leading-relaxed">{c.with}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CtaBanner
   ═══════════════════════════════════════════════════════════════════════════ */

function CtaBanner() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="relative py-24 lg:py-32">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`relative bg-gray-900 rounded-3xl p-12 md:p-16 text-center overflow-hidden transition-all duration-700 ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.98]'}`}>
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-blue-500/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-500/20 to-transparent rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 mb-6">
              <Sparkles size={14} className="text-emerald-400" />
              <span className="text-sm font-medium text-gray-300">14-day free trial, no credit card</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
              Ready to Transform Your<br className="hidden sm:inline" /> Business?
            </h2>

            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
              Join 1,200+ brokers and ISOs already using Balji to close more deals, fund faster, and grow revenue.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={`${PORTAL}/register`}
                className="group inline-flex items-center gap-2.5 px-8 py-4 text-base font-semibold text-gray-900 rounded-2xl bg-white hover:bg-gray-100 shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                Start Free Trial
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a href={`${PORTAL}/login`}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Login to Dashboard
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Export
   ═══════════════════════════════════════════════════════════════════════════ */

export function LandingPageBalji() {
  useEffect(() => {
    document.title = 'Balji — The #1 CPaaS Platform for Brokers & ISOs'
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => { document.documentElement.style.scrollBehavior = '' }
  }, [])

  return (
    <div className="relative min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <AnimatedBg />
      <Navbar />
      <Hero />
      <LogoMarquee />
      <StatsBar />
      <Features />
      <FundingVerticals />
      <PlatformShowcase />
      <HowItWorks />
      <Integrations />
      <MobileApp />
      <Pricing />
      <Testimonials />
      <WhyBalji />
      <FAQ />
      <CtaBanner />
      <PublicFooter />
      <style>{`
        @keyframes waveform { 0% { transform: scaleY(0.4); } 100% { transform: scaleY(1); } }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 30s linear infinite; display: flex; width: max-content; }
      `}</style>
    </div>
  )
}
