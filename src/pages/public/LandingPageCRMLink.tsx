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
  Send, User, Loader2, MapPin,
} from 'lucide-react'
import { useInView } from '../../hooks/useInView'
import { useCounter } from '../../hooks/useCounter'
import { AnimatedBg } from '../../components/public/AnimatedBg'

/* ═══════════════════════════════════════════════════════════════════════════
   CRMLink — AI-Powered CRM & Dialer Landing Page

   This file is an independent landing page for crmlink.ai/website_crmlink.
   It intentionally does NOT modify Balji assets/components — it ships its
   own Navbar, Footer, and shared logo asset (/crmlink-logo.svg).
   ═══════════════════════════════════════════════════════════════════════════ */

// Same origin in production (crmlink.ai). Empty string keeps links relative.
const PORTAL = ''

/* ═══════════════════════════════════════════════════════════════════════════
   Navbar — Landing-page specific
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
    { label: 'Contact', href: '#contact' },
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
          <Link to="/website_crmlink" className="flex items-center gap-2.5">
            <img src="/crmlink-logo.svg" alt="CRMLink" className="h-9" />
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
              className="group px-6 py-2.5 text-[13px] font-semibold text-white rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-600 shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-px"
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
            <a href={`${PORTAL}/register`} className="text-center px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 shadow-lg shadow-indigo-500/25">Get Started Free</a>
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
    cyan:   { bg: 'bg-cyan-50',   text: 'text-cyan-600',   badge: 'bg-cyan-50 text-cyan-600',     ring: 'ring-cyan-100' },
    emerald:{ bg: 'bg-emerald-50',text: 'text-emerald-600',badge: 'bg-emerald-50 text-emerald-600',ring: 'ring-emerald-100' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', badge: 'bg-violet-50 text-violet-600', ring: 'ring-violet-100' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  badge: 'bg-amber-50 text-amber-600',   ring: 'ring-amber-100' },
  }
  const c = colorMap[color] || colorMap.cyan

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
          className="w-[3px] rounded-full bg-gradient-to-t from-cyan-500 via-indigo-500 to-violet-500"
          style={{
            height: `${h}%`,
            animation: `cl-waveform 1.5s ease-in-out ${i * 0.08}s infinite alternate`,
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
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-violet-50/80 via-indigo-50/40 to-transparent rounded-full blur-3xl -translate-y-1/4 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-50/60 via-sky-50/30 to-transparent rounded-full blur-3xl translate-y-1/4 -translate-x-1/4" />
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
              <span className="text-[13px] font-medium text-gray-600">AI-Powered CRM &amp; Dialer for Modern Sales Teams</span>
            </div>

            <h1 className={`text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6 transition-all duration-700 delay-100 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  Connect. Convert.
                </span>
              </span>
              <br />
              <span className="text-gray-900">Close — Faster.</span>
            </h1>

            <p className={`text-lg text-gray-500 leading-relaxed max-w-xl mb-10 transition-all duration-700 delay-200 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              CRMLink unifies an AI auto dialer, intelligent CRM pipeline, real-time analytics, and multi-channel outreach &mdash; one platform that learns from every conversation and helps your team close more deals.
            </p>

            <div className={`flex flex-col sm:flex-row items-start gap-4 mb-12 transition-all duration-700 delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <a href={`${PORTAL}/register`}
                className="group inline-flex items-center gap-2.5 px-8 py-4 text-[15px] font-semibold text-white rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-600 shadow-xl shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-0.5"
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
            <div className="absolute -inset-8 bg-gradient-to-br from-cyan-100/30 via-transparent to-violet-100/30 rounded-3xl blur-2xl pointer-events-none" />
            <div className="relative grid grid-cols-2 gap-3">
              <LiveMetricCard icon={PhoneCall} label="Live Calls" value="1,284" change="+23% vs avg" color="cyan" delay={500} />
              <LiveMetricCard icon={Target} label="Closed Today" value="47" change="+18% this week" color="emerald" delay={650} />
              <LiveMetricCard icon={DollarSign} label="Pipeline Value" value="$2.4M" change="+31% MoM" color="violet" delay={800} />
              <LiveMetricCard icon={Users} label="Agents Online" value="128" change="98% online" color="amber" delay={950} />

              {/* Live call activity card */}
              <div className={`col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100/80 p-5 shadow-sm ring-1 ring-gray-100 transition-all duration-700 delay-[1100ms] ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 via-indigo-500 to-violet-600 flex items-center justify-center">
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
   Logo Marquee Ticker
   ═══════════════════════════════════════════════════════════════════════════ */

function LogoMarquee() {
  const logos = [
    'CapitalStack', 'FundingCircle', 'MerchantGrowth', 'ApexFunding', 'VelocityCapital',
    'IronBridge Finance', 'BlueHarbor', 'SwiftFund', 'PinnacleISO', 'TridentCapital',
    'SummitFunding', 'NorthStar', 'OakTree Lending', 'PrimeRate', 'FundVault',
  ]

  return (
    <section className="relative py-10 bg-white/50 border-y border-gray-100/50 overflow-hidden">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-6 hidden">
        Trusted by 1,200+ sales teams nationwide
      </p>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        <div className="flex gap-12 cl-animate-marquee">
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
   StatsBar
   ═══════════════════════════════════════════════════════════════════════════ */

function StatsBar() {
  const { ref, visible } = useInView()
  const c0 = useCounter(1200, visible)
  const c1 = useCounter(25, visible, 1500)
  const c2 = useCounter(99, visible, 1800)
  const c3 = useCounter(4, visible, 1200)

  const stats = [
    { val: `${c0}+`, label: 'Active Teams', icon: Users, color: 'from-cyan-500 to-cyan-600' },
    { val: `${c1}M+`, label: 'Calls Placed', icon: PhoneCall, color: 'from-indigo-500 to-indigo-600' },
    { val: `${c2}.99%`, label: 'Uptime', icon: Clock, color: 'from-emerald-500 to-emerald-600' },
    { val: `$${c3}B+`, label: 'Revenue Influenced', icon: DollarSign, color: 'from-violet-500 to-violet-600' },
  ]

  return (
    <section ref={ref} className="relative py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-indigo-950 rounded-3xl p-8 lg:p-12 shadow-2xl shadow-indigo-900/20 ring-1 ring-white/5">
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
   Features
   ═══════════════════════════════════════════════════════════════════════════ */

const features = [
  { icon: Zap, title: 'AI Auto Dialer', desc: 'Progressive and preview modes that maximize connect rates. AI-paced dialing adapts to your team\'s capacity in real time.', iconBg: 'bg-amber-50 ring-amber-100', iconColor: 'text-amber-600', to: '/product/auto-dialer' },
  { icon: Users, title: 'Intelligent CRM', desc: 'Track every contact from first touch to close. Custom stages, deal history, and 360-degree contact intelligence.', iconBg: 'bg-cyan-50 ring-cyan-100', iconColor: 'text-cyan-600', to: '/product/crm-pipeline' },
  { icon: BarChart3, title: 'Revenue Analytics', desc: 'Real-time dashboards for deal performance, agent productivity, and pipeline forecasting powered by AI.', iconBg: 'bg-emerald-50 ring-emerald-100', iconColor: 'text-emerald-600', to: '/product/analytics' },
  { icon: Brain, title: 'AI Insights & Coaching', desc: 'Sentiment analysis on every call. Smart deal scoring and automated coaching suggestions for every rep.', iconBg: 'bg-violet-50 ring-violet-100', iconColor: 'text-violet-600', to: '/product/ai-insights' },
  { icon: Megaphone, title: 'Multi-Channel Outreach', desc: 'Voice, SMS, and email unified in one workspace. Automated drip campaigns for prospects and renewals.', iconBg: 'bg-pink-50 ring-pink-100', iconColor: 'text-pink-600', to: '/product/auto-dialer' },
  { icon: Shield, title: 'Compliance & Recording', desc: 'Every call recorded with full audit trails. Built-in TCPA tools, DNC scrubbing, and consent management.', iconBg: 'bg-rose-50 ring-rose-100', iconColor: 'text-rose-600', to: '/legal/security' },
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
            <span className="bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 bg-clip-text text-transparent">Close More Deals</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">A complete AI-powered communications and CRM platform purpose-built for modern sales and revenue teams.</p>
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
   Built for Every Vertical
   ═══════════════════════════════════════════════════════════════════════════ */

function FundingVerticals() {
  const { ref, visible } = useInView()

  const verticals = [
    { icon: CreditCard, title: 'Merchant Cash Advance', desc: 'Reach merchants faster with AI-paced dialing and fast-track MCA deals through your pipeline.', color: 'bg-cyan-50 text-cyan-600 ring-cyan-100' },
    { icon: Briefcase, title: 'Equipment Financing', desc: 'Manage complex equipment deals with multi-stage pipelines and document tracking.', color: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
    { icon: Landmark, title: 'SBA Loans', desc: 'Stay organized through lengthy SBA processes with automated follow-ups and status tracking.', color: 'bg-violet-50 text-violet-600 ring-violet-100' },
    { icon: LineChart, title: 'Lines of Credit', desc: 'Nurture relationships with intelligent drip campaigns and renewal reminders.', color: 'bg-amber-50 text-amber-600 ring-amber-100' },
    { icon: TrendingUp, title: 'SaaS & Subscriptions', desc: 'Manage trials, demos, and renewals with AI-scored opportunities and forecasting.', color: 'bg-pink-50 text-pink-600 ring-pink-100' },
    { icon: Receipt, title: 'Insurance & Financial Services', desc: 'Streamline outreach, quoting, and compliance with integrated workflows.', color: 'bg-rose-50 text-rose-600 ring-rose-100' },
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
            <span className="bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 bg-clip-text text-transparent">Revenue Team</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">Whatever you sell, CRMLink adapts to your workflow.</p>
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
   Platform Showcase
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
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">A beautifully crafted workspace your team will actually love using.</p>
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
          <div className="absolute -inset-10 bg-gradient-to-br from-cyan-100/30 via-transparent to-violet-100/30 rounded-3xl blur-2xl pointer-events-none" />

          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl shadow-indigo-200/30 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-b border-gray-200/80">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-1.5 text-xs text-gray-400 min-w-[260px]">
                  <Shield size={11} className="text-emerald-500" />
                  app.crmlink.ai/{tabs[tab].label.toLowerCase()}
                </div>
              </div>
              <div className="w-[52px]" />
            </div>

            {tab === 0 && (
              <div className="p-6 bg-gray-50/50 min-h-[420px]">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Pipeline Value', val: '$2.4M', change: '+18%', color: 'text-emerald-600' },
                    { label: 'Active Deals', val: '284', change: '+12%', color: 'text-cyan-600' },
                    { label: 'Calls Today', val: '1,847', change: '+23%', color: 'text-indigo-600' },
                    { label: 'Win Rate', val: '94.2%', change: '+5.3%', color: 'text-violet-600' },
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
                      <span className="text-sm font-semibold text-gray-900">Revenue Trend</span>
                      <div className="flex gap-2 text-[10px]">
                        <span className="px-2 py-1 bg-gray-900 text-white rounded-md font-medium">Monthly</span>
                        <span className="px-2 py-1 text-gray-500 rounded-md font-medium">Weekly</span>
                      </div>
                    </div>
                    <div className="flex items-end gap-2 h-40">
                      {[45, 52, 48, 61, 55, 72, 68, 78, 65, 82, 75, 90].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className={`w-full rounded-md transition-all duration-500 ${i === 11 ? 'bg-gradient-to-t from-cyan-500 via-indigo-500 to-violet-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                            style={{ height: `${h}%`, transitionDelay: `${i * 40}ms` }}
                          />
                          <span className="text-[8px] text-gray-400">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <span className="text-sm font-semibold text-gray-900">Top Performers</span>
                    <div className="mt-4 space-y-3">
                      {[
                        { name: 'Sarah M.', calls: 142, rate: '96%' },
                        { name: 'James R.', calls: 128, rate: '93%' },
                        { name: 'Emily C.', calls: 118, rate: '91%' },
                        { name: 'David A.', calls: 106, rate: '89%' },
                      ].map((a, ai) => (
                        <div key={ai} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 via-indigo-500 to-violet-600 flex items-center justify-center text-white text-[9px] font-bold">
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

            {tab === 1 && (
              <div className="p-6 bg-gray-50/50 min-h-[420px]">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-sm font-semibold text-gray-900">Deal Pipeline</span>
                  <span className="text-[11px] text-gray-400 font-medium">$8.2M total value</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { stage: 'New Leads', count: 48, value: '$1.2M', color: 'border-t-cyan-400', items: [
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
                    { stage: 'Closed Won', count: 12, value: '$2.1M', color: 'border-t-emerald-400', items: [
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
                        { name: 'David Alvarez', status: 'Ready', statusColor: 'bg-cyan-400', dur: '' },
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
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 via-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
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
                      <span className="text-sm font-semibold text-gray-900">Campaign: Outreach Q2</span>
                      <div className="mt-3 space-y-3">
                        {[
                          { label: 'Total Contacts', val: '2,847' },
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
                        <div className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 h-2 rounded-full" style={{ width: '45%' }} />
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
                          <div key={ii} className="flex items-center gap-2 p-2 bg-indigo-50/60 rounded-lg">
                            <ins.icon size={12} className="text-indigo-600 flex-shrink-0" />
                            <span className="text-[10px] text-indigo-700 font-medium">{ins.text}</span>
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
   How It Works
   ═══════════════════════════════════════════════════════════════════════════ */

const steps = [
  { icon: UserPlus, title: 'Import Contacts', desc: 'Import leads from CSV, API, or web forms. Auto-deduplicate and enrich contact data with AI.', gradient: 'from-cyan-500 to-sky-400', bgLight: 'bg-cyan-50', border: 'border-cyan-100' },
  { icon: PhoneCall, title: 'Launch Campaigns', desc: 'Start automated outreach across voice, SMS, and email. AI paces calls for maximum live connections.', gradient: 'from-indigo-500 to-blue-400', bgLight: 'bg-indigo-50', border: 'border-indigo-100' },
  { icon: LineChart, title: 'Track & Coach', desc: 'Real-time dashboards show every metric. Coach reps with AI-powered call insights.', gradient: 'from-violet-500 to-fuchsia-400', bgLight: 'bg-violet-50', border: 'border-violet-100' },
  { icon: Target, title: 'Close Deals', desc: 'Move deals through your pipeline. Automated follow-ups ensure every opportunity gets closed.', gradient: 'from-emerald-600 to-green-400', bgLight: 'bg-green-50', border: 'border-green-100' },
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
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">From Lead to Closed in 4 Steps</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">Get up and running in minutes, not months.</p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
          <div className="hidden md:block absolute top-[60px] left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-[2px]">
            <div className="w-full h-full bg-gradient-to-r from-cyan-200 via-indigo-200 to-violet-200 rounded-full" />
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
   Integrations
   ═══════════════════════════════════════════════════════════════════════════ */

function Integrations() {
  const { ref, visible } = useInView()

  const integrations = [
    { name: 'Twilio', desc: 'Voice & SMS', icon: Phone, color: 'bg-red-50 text-red-600 ring-red-100' },
    { name: 'Plivo', desc: 'Voice & SMS', icon: PhoneCall, color: 'bg-green-50 text-green-600 ring-green-100' },
    { name: 'Stripe', desc: 'Payments', icon: CreditCard, color: 'bg-violet-50 text-violet-600 ring-violet-100' },
    { name: 'Gmail', desc: 'Email', icon: Mail, color: 'bg-cyan-50 text-cyan-600 ring-cyan-100' },
    { name: 'Salesforce', desc: 'CRM Sync', icon: Globe, color: 'bg-sky-50 text-sky-600 ring-sky-100' },
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
            <span className="bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 bg-clip-text text-transparent">Already Use</span>
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
   Mobile App
   ═══════════════════════════════════════════════════════════════════════════ */

function MobileApp() {
  const { ref, visible } = useInView()
  const [activeView, setActiveView] = useState<'phone' | 'crm'>('phone')
  const mobileFeatures = [
    'Real-time lead notifications and call alerts',
    'Full CRM access — view and update contact records',
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
              Your CRM, On The Go
            </h2>
            <p className="text-lg text-gray-500 max-w-lg mb-10">
              Manage your deals, track calls, and close prospects from anywhere with native mobile apps for Android &amp; iOS.
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
              <div className="relative w-[260px] h-[540px] bg-gray-900 rounded-[40px] p-[6px] shadow-2xl shadow-indigo-400/30">
                <div className="relative w-full h-full bg-white rounded-[34px] overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-32 h-7 bg-gray-900 rounded-b-2xl" />
                  <div className="absolute top-7 left-0 right-0 z-20 bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-600 px-4 py-2 flex items-center gap-2">
                    <img src="/crmlink-logo.svg" alt="CRMLink" className="h-4 brightness-0 invert" />
                    <span className="text-white text-[11px] font-semibold">
                      {activeView === 'phone' ? 'Dialer' : 'CRM'}
                    </span>
                  </div>

                  <div className={`absolute inset-0 pt-[72px] transition-opacity duration-500 ${activeView === 'phone' ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="h-full bg-white p-4 space-y-3">
                      <div className="text-center pt-2 pb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 via-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/30">
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

                  <div className={`absolute inset-0 pt-[72px] transition-opacity duration-500 ${activeView === 'crm' ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="h-full bg-white p-4 space-y-3 overflow-hidden">
                      <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center">
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
                          { action: 'Email sent — proposal', time: '1h ago', dot: 'bg-cyan-400' },
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
                        <button className="flex-1 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-semibold shadow-sm">Call</button>
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
    'AI auto dialer',
    'Call recording & logging',
    'Agent scripts',
    'Campaign management',
    'Real-time call monitoring',
    'Priority support',
  ]

  const crmFeatures = [
    'Everything in Dialer',
    'Full CRM pipeline',
    'Lead management & AI scoring',
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
            Start free, scale as your team grows. No hidden fees, no contracts.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className={`bg-white border border-gray-200 shadow-sm rounded-2xl p-8 flex flex-col transition-all duration-700 delay-200 hover:shadow-lg ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Dialer</h3>
              <p className="text-sm text-gray-500">AI power dialer with unlimited calls for your outreach team.</p>
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

          <div className={`relative bg-white shadow-xl rounded-2xl p-8 flex flex-col transition-all duration-700 delay-300 hover:shadow-2xl ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{
              borderWidth: '2px',
              borderStyle: 'solid',
              borderImage: 'linear-gradient(135deg, #06b6d4, #4f46e5, #a855f7) 1',
            }}
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 px-4 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 text-white shadow-lg">
                <Sparkles size={11} /> Best Value
              </span>
            </div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Dialer + CRM</h3>
              <p className="text-sm text-gray-500">The complete combo &mdash; AI dialer and CRM in one platform for your team.</p>
            </div>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-5xl font-extrabold bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 bg-clip-text text-transparent">$29.99</span>
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
              className="block w-full text-center px-6 py-3.5 text-sm font-semibold bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-600 hover:-translate-y-px rounded-xl transition-all duration-300"
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
      role: 'CEO, Apex Funding Group',
      initials: 'MS',
      gradient: 'from-cyan-500 to-indigo-600',
      quote: 'CRMLink transformed our operation. Our team went from 80 to 200+ calls per day with better connect rates. The AI coaching feature is a game changer for ramping new reps.',
    },
    {
      name: 'Jessica Chen',
      role: 'VP Revenue, BrightPath Capital',
      initials: 'JC',
      gradient: 'from-emerald-500 to-teal-500',
      quote: 'We evaluated 12 platforms. CRMLink was the only one that combined a real AI dialer with a CRM our reps actually wanted to use. Pipeline grew 40% in the first quarter.',
    },
    {
      name: 'David Alvarez',
      role: 'Founder, SwiftFund Solutions',
      initials: 'DA',
      gradient: 'from-violet-500 to-fuchsia-500',
      quote: 'The real-time analytics alone paid for the platform in the first month. We identified bottlenecks we didn\'t know existed and improved our close rate by 34%.',
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
            Trusted by Revenue Teams Everywhere
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
   FAQ
   ═══════════════════════════════════════════════════════════════════════════ */

function FAQ() {
  const { ref, visible } = useInView()
  const [open, setOpen] = useState<number | null>(null)

  const faqs = [
    {
      q: 'How quickly can my team get set up?',
      a: 'Most teams are up and running within 15 minutes. Import your contact list, configure your campaigns, and start dialing. Our onboarding team is available 24/7 to help with migration from other platforms.',
    },
    {
      q: 'Is CRMLink TCPA and DNC compliant?',
      a: 'Yes. CRMLink includes built-in TCPA compliance tools, automatic DNC list scrubbing, consent management, and full call recording with audit trails. We help you stay compliant so you can focus on closing deals.',
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
      a: 'CRMLink integrates with Twilio, Plivo, Stripe, Gmail, Salesforce, Zapier, Slack, QuickBooks, and more. Our REST API and webhook system lets you connect to virtually any tool in your stack.',
    },
    {
      q: 'Can I migrate from my current dialer or CRM?',
      a: 'Yes. We offer free migration assistance for any team switching from another platform. We will help you import contacts, call history, deal data, and recordings so nothing is lost.',
    },
    {
      q: 'Do you offer volume discounts for larger teams?',
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
          <p className="text-lg text-gray-500 leading-relaxed">Everything you need to know about getting started with CRMLink.</p>
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
   Why CRMLink — Before/After
   ═══════════════════════════════════════════════════════════════════════════ */

function WhyCRMLink() {
  const { ref, visible } = useInView()

  const comparisons = [
    { without: 'Spreadsheets & sticky notes to track deals', with: 'Visual pipeline with drag-and-drop deal stages' },
    { without: 'Manual dialing — 40 calls/day per agent', with: 'AI auto dialer — 200+ calls/day per agent' },
    { without: 'No visibility into rep performance', with: 'Real-time dashboards & AI coaching' },
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
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Why CRMLink</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            The Difference is{' '}
            <span className="bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 bg-clip-text text-transparent">Night and Day</span>
          </h2>
        </div>

        <div className={`bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="grid grid-cols-2">
            <div className="bg-gray-50 p-6 border-b border-r border-gray-200">
              <div className="flex items-center gap-2">
                <XCircle size={18} className="text-red-400" />
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Without CRMLink</span>
              </div>
            </div>
            <div className="bg-emerald-50/50 p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider">With CRMLink</span>
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
   Contact — Premium contact form with split layout
   ═══════════════════════════════════════════════════════════════════════════ */

type ContactForm = {
  name: string
  email: string
  company: string
  phone: string
  teamSize: string
  message: string
}

const TEAM_SIZES = ['1 - 5', '6 - 25', '26 - 100', '101 - 500', '500+']

function ContactSection() {
  const { ref, visible } = useInView()
  const [form, setForm] = useState<ContactForm>({ name: '', email: '', company: '', phone: '', teamSize: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const update = <K extends keyof ContactForm>(key: K, value: ContactForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')

    const subject = encodeURIComponent(`CRMLink inquiry from ${form.name}${form.company ? ` (${form.company})` : ''}`)
    const body = encodeURIComponent(
      `Name: ${form.name}\n` +
      `Email: ${form.email}\n` +
      `Company: ${form.company || '—'}\n` +
      `Phone: ${form.phone || '—'}\n` +
      `Team size: ${form.teamSize || '—'}\n\n` +
      `Message:\n${form.message}\n`
    )
    const mailto = `mailto:hello@crmlink.ai?subject=${subject}&body=${body}`

    // Lightweight UX: small delay so the success state is visible, then
    // open the user's email client with the message prefilled.
    await new Promise(r => setTimeout(r, 700))
    try {
      window.location.href = mailto
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <section id="contact" ref={ref} className="relative py-24 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/30 to-white" />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-10 lg:p-14 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6">
              <CheckCircle2 size={32} className="text-white" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-3">Message ready to send</h3>
            <p className="text-gray-500 leading-relaxed mb-8">
              We opened your email client with your message pre-filled. If nothing happened, drop us a note at{' '}
              <a href="mailto:hello@crmlink.ai" className="font-semibold text-indigo-600 hover:text-indigo-700">hello@crmlink.ai</a>{' '}
              and a CRMLink specialist will reply within one business day.
            </p>
            <button
              onClick={() => { setStatus('idle'); setForm({ name: '', email: '', company: '', phone: '', teamSize: '', message: '' }) }}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-gray-700 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all"
            >
              Send another message
            </button>
          </div>
        </div>
      </section>
    )
  }

  const inputBase =
    'w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 ' +
    'focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all'

  const valueProps = [
    { icon: Mail,       title: 'Email us',        body: 'hello@crmlink.ai',                href: 'mailto:hello@crmlink.ai' },
    { icon: Phone,      title: 'Talk to sales',   body: '+1 (855) 555-CRM-LINK',           href: 'tel:+18555557265' },
    { icon: Headphones, title: '24/7 support',    body: 'Around-the-clock for paid plans', href: null },
    { icon: MapPin,     title: 'Headquarters',    body: 'San Francisco, CA · Remote-first',href: null },
  ]

  return (
    <section id="contact" ref={ref} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/40 to-white" />
      <div className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full bg-gradient-to-bl from-cyan-100/40 via-indigo-100/30 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-violet-100/40 via-fuchsia-100/30 to-transparent blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-14 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <MessageSquare size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact Us</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Let&rsquo;s Build Your{' '}
            <span className="bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 bg-clip-text text-transparent">Revenue Engine</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Tell us a bit about your team and what you&rsquo;re trying to solve. A CRMLink specialist will reply within one business day.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 lg:gap-10 items-stretch">
          {/* Left — value props / contact info */}
          <div className={`lg:col-span-2 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="h-full bg-gradient-to-br from-gray-900 via-slate-900 to-indigo-950 rounded-3xl p-8 lg:p-10 ring-1 ring-white/5 shadow-xl shadow-indigo-900/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-cyan-500/20 to-transparent rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-violet-500/20 to-transparent rounded-full blur-3xl" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm mb-6">
                  <Sparkles size={12} className="text-cyan-300" />
                  <span className="text-[11px] font-medium text-gray-200 uppercase tracking-wider">We&rsquo;re here to help</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Reach the right team, fast</h3>
                <p className="text-sm text-gray-300 leading-relaxed mb-8">
                  Whether you&rsquo;re scaling an SDR team, evaluating an AI dialer, or migrating from another CRM, we&rsquo;ll point you to the right resources.
                </p>

                <ul className="space-y-5">
                  {valueProps.map(v => {
                    const inner = (
                      <>
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                          <v.icon size={16} className="text-cyan-300" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{v.title}</div>
                          <div className="text-sm font-medium text-white truncate">{v.body}</div>
                        </div>
                      </>
                    )
                    return (
                      <li key={v.title}>
                        {v.href ? (
                          <a href={v.href} className="flex items-center gap-3.5 group">
                            <div className="flex items-center gap-3.5 group-hover:opacity-90 transition-opacity">{inner}</div>
                          </a>
                        ) : (
                          <div className="flex items-center gap-3.5">{inner}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>

                <div className="mt-10 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Live now</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Average reply time today: <span className="font-semibold text-white">37 minutes</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — form card */}
          <div className={`lg:col-span-3 transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-indigo-100/30 p-7 sm:p-9 lg:p-10"
            >
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="cl-name" className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
                    <User size={13} className="text-gray-400" /> Full name <span className="text-rose-500">*</span>
                  </label>
                  <input id="cl-name" required type="text" value={form.name}
                    onChange={e => update('name', e.target.value)}
                    placeholder="Jane Doe"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label htmlFor="cl-email" className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
                    <Mail size={13} className="text-gray-400" /> Work email <span className="text-rose-500">*</span>
                  </label>
                  <input id="cl-email" required type="email" value={form.email}
                    onChange={e => update('email', e.target.value)}
                    placeholder="jane@acme.com"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label htmlFor="cl-company" className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
                    <Building2 size={13} className="text-gray-400" /> Company
                  </label>
                  <input id="cl-company" type="text" value={form.company}
                    onChange={e => update('company', e.target.value)}
                    placeholder="Acme Inc."
                    className={inputBase}
                  />
                </div>
                <div>
                  <label htmlFor="cl-phone" className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
                    <Phone size={13} className="text-gray-400" /> Phone <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input id="cl-phone" type="tel" value={form.phone}
                    onChange={e => update('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className={inputBase}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="cl-team" className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
                    <Users size={13} className="text-gray-400" /> Team size
                  </label>
                  <select id="cl-team" value={form.teamSize}
                    onChange={e => update('teamSize', e.target.value)}
                    className={inputBase + ' appearance-none bg-no-repeat bg-[right_1rem_center] pr-10'}
                    style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\' fill=\'none\'><path d=\'M1 1.5L6 6.5L11 1.5\' stroke=\'%239ca3af\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/></svg>")' }}
                  >
                    <option value="">Select team size</option>
                    {TEAM_SIZES.map(s => (
                      <option key={s} value={s}>{s} {s === '1 - 5' ? 'reps' : 'reps'}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="cl-message" className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
                    <MessageSquare size={13} className="text-gray-400" /> How can we help? <span className="text-rose-500">*</span>
                  </label>
                  <textarea id="cl-message" required rows={5} value={form.message}
                    onChange={e => update('message', e.target.value)}
                    placeholder="Tell us about your team, current stack, and what you&rsquo;re trying to improve…"
                    className={inputBase + ' resize-y min-h-[120px]'}
                  />
                </div>
              </div>

              <div className="mt-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="text-[11px] text-gray-400 leading-relaxed max-w-sm">
                  By submitting, you agree to our{' '}
                  <Link to="/legal/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>{' '}
                  and{' '}
                  <Link to="/legal/terms" className="underline hover:text-gray-600">Terms</Link>. We&rsquo;ll never share your info.
                </p>
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 hover:from-indigo-700 hover:via-violet-700 hover:to-fuchsia-600 shadow-lg shadow-indigo-500/25 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 hover:-translate-y-px disabled:hover:translate-y-0 w-full sm:w-auto"
                >
                  {status === 'sending' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      Send Message
                      <Send size={15} className="group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>

              {status === 'error' && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs">
                  <XCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>Something went wrong. Please email <a href="mailto:hello@crmlink.ai" className="font-semibold underline">hello@crmlink.ai</a> directly.</span>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CTA Banner
   ═══════════════════════════════════════════════════════════════════════════ */

function CtaBanner() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="relative py-24 lg:py-32">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`relative bg-gradient-to-br from-gray-900 via-slate-900 to-indigo-950 rounded-3xl p-12 md:p-16 text-center overflow-hidden transition-all duration-700 ring-1 ring-white/5 ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.98]'}`}>
          <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-gradient-to-bl from-cyan-500/20 via-indigo-500/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-gradient-to-tr from-violet-500/20 via-fuchsia-500/15 to-transparent rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 mb-6 backdrop-blur-sm">
              <Sparkles size={14} className="text-cyan-300" />
              <span className="text-sm font-medium text-gray-200">14-day free trial, no credit card</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
              Ready to Transform Your<br className="hidden sm:inline" /> Sales Operation?
            </h2>

            <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10">
              Join 1,200+ revenue teams already using CRMLink to close more deals, ramp faster, and grow predictable revenue.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={`${PORTAL}/register`}
                className="group inline-flex items-center gap-2.5 px-8 py-4 text-base font-semibold text-gray-900 rounded-2xl bg-white hover:bg-gray-100 shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                Start Free Trial
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a href={`${PORTAL}/login`}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
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
   Footer (CRMLink-branded — independent from PublicFooter to avoid mutating
   any shared component that other landing pages use)
   ═══════════════════════════════════════════════════════════════════════════ */

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Auto Dialer', to: '/product/auto-dialer' },
      { label: 'CRM Pipeline', to: '/product/crm-pipeline' },
      { label: 'Analytics', to: '/product/analytics' },
      { label: 'AI Insights', to: '/product/ai-insights' },
      { label: 'Mobile App', to: '/product/mobile-app' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/company/about' },
      { label: 'Careers', to: '/company/careers' },
      { label: 'Blog', to: '/company/blog' },
      { label: 'Press', to: '/company/press' },
      { label: 'Partners', to: '/company/partners' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', to: '/resources/docs' },
      { label: 'API Reference', to: '/resources/api' },
      { label: 'Status Page', to: '/resources/status' },
      { label: 'Changelog', to: '/resources/changelog' },
      { label: 'Community', to: '/resources/community' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/legal/privacy' },
      { label: 'Terms of Service', to: '/legal/terms' },
      { label: 'Cookie Policy', to: '/legal/cookies' },
      { label: 'GDPR', to: '/legal/gdpr' },
      { label: 'Security', to: '/legal/security' },
    ],
  },
]

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12">
          <div className="col-span-2">
            <img src="/crmlink-logo.svg" alt="CRMLink" className="h-9 mb-4" />
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              The AI-powered CRM &amp; dialer built for modern revenue teams. Auto dialer, CRM, analytics, and intelligent coaching &mdash; all in one.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a href="mailto:hello@crmlink.ai" className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                <Mail size={13} /> hello@crmlink.ai
              </a>
            </div>
          </div>

          {footerColumns.map(col => (
            <div key={col.title}>
              <h4 className="text-gray-900 font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map(link => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} CRMLink. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link to="/legal/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link to="/legal/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
            <Link to="/legal/cookies" className="hover:text-gray-600 transition-colors">Cookies</Link>
            <Link to="/legal/security" className="hover:text-gray-600 transition-colors">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Export
   ═══════════════════════════════════════════════════════════════════════════ */

export function LandingPageCRMLink() {
  useEffect(() => {
    document.title = 'CRMLink — AI-Powered CRM & Dialer for Modern Sales Teams'

    // Meta description
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('name', name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }
    setMeta('description', 'CRMLink unifies AI auto dialer, intelligent CRM pipeline, real-time analytics, and multi-channel outreach in one platform built for modern revenue teams.')
    setMeta('keywords', 'CRMLink, AI CRM, auto dialer, sales CRM, pipeline management, AI sales coaching, multi-channel outreach, MCA dialer, ISO CRM')

    // Open Graph
    const setProp = (property: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('property', property)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }
    setProp('og:title', 'CRMLink — AI-Powered CRM & Dialer')
    setProp('og:description', 'AI auto dialer, CRM pipeline, analytics, and multi-channel outreach for modern revenue teams.')
    setProp('og:type', 'website')
    setProp('og:url', 'https://crmlink.ai/website_crmlink')
    setProp('og:image', 'https://crmlink.ai/crmlink-logo.svg')

    // Per-page favicon swap (restored on unmount)
    const iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    const prevHref = iconLink?.getAttribute('href') ?? null
    if (iconLink) iconLink.setAttribute('href', '/crmlink-favicon.svg')

    document.documentElement.style.scrollBehavior = 'smooth'
    return () => {
      document.documentElement.style.scrollBehavior = ''
      if (iconLink && prevHref !== null) iconLink.setAttribute('href', prevHref)
    }
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
      <WhyCRMLink />
      <FAQ />
      <ContactSection />
      <CtaBanner />
      <Footer />
      <style>{`
        @keyframes cl-waveform { 0% { transform: scaleY(0.4); } 100% { transform: scaleY(1); } }
        @keyframes cl-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .cl-animate-marquee { animation: cl-marquee 30s linear infinite; display: flex; width: max-content; }
      `}</style>
    </div>
  )
}
