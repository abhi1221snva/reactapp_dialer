import { useEffect, useRef, useState } from 'react'
import {
  Phone, Zap, Users, BarChart3, Brain, Megaphone,
  ArrowRight, Check, Star, Shield, Globe,
  Headphones, Clock, Target, Menu, X,
  PhoneCall, UserPlus, LineChart, Quote, Sparkles,
  ChevronRight, ChevronDown, Play,
  Smartphone, ExternalLink,
} from 'lucide-react'

const PORTAL = 'https://portal.balji.app'

/* ═══════════════════════════════════════════════════════════════════════════
   Hooks
   ═══════════════════════════════════════════════════════════════════════════ */

function useInView(opts?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1, ...opts },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

function useCounter(end: number, active: boolean, duration = 2000) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    let start = 0
    const step = end / (duration / 16)
    const id = setInterval(() => {
      start += step
      if (start >= end) { setVal(end); clearInterval(id) }
      else setVal(Math.floor(start))
    }, 16)
    return () => clearInterval(id)
  }, [active, end, duration])
  return val
}

/* ═══════════════════════════════════════════════════════════════════════════
   AnimatedBg — Subtle white base with soft blue/green washes
   ═══════════════════════════════════════════════════════════════════════════ */

function AnimatedBg() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* White base */}
      <div className="absolute inset-0 bg-white" />

      {/* Soft blue gradient wash — top right */}
      <div className="absolute w-[800px] h-[800px] rounded-full opacity-[0.04]" style={{
        background: 'radial-gradient(circle, rgba(37,99,235,0.9) 0%, transparent 70%)',
        top: '-10%', right: '-5%',
        animation: 'orbFloat1 20s ease-in-out infinite',
      }} />

      {/* Soft green gradient wash — bottom left */}
      <div className="absolute w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{
        background: 'radial-gradient(circle, rgba(16,185,129,0.9) 0%, transparent 70%)',
        bottom: '5%', left: '-5%',
        animation: 'orbFloat2 25s ease-in-out infinite',
      }} />

      {/* Secondary blue orb — center-left */}
      <div className="absolute w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{
        background: 'radial-gradient(circle, rgba(59,130,246,0.8) 0%, transparent 65%)',
        top: '40%', left: '15%',
        animation: 'orbFloat3 22s ease-in-out infinite',
      }} />

      {/* Light green orb — top-center */}
      <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.05]" style={{
        background: 'radial-gradient(circle, rgba(209,250,229,0.8) 0%, transparent 60%)',
        top: '20%', right: '30%',
        animation: 'orbFloat2 18s ease-in-out infinite reverse',
      }} />

      {/* Subtle dot grid pattern */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'radial-gradient(circle, rgba(37,99,235,0.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Navbar — Clean white glassmorphism
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
    { label: 'Platform', href: '#platform' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Mobile App', href: '#mobile-app' },
  ]

  const scrollTo = (href: string) => {
    setMobileOpen(false)
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-blue-100/50'
        : 'bg-white/60 backdrop-blur-md'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex items-center gap-2.5">
            <img src="/balji-logo.svg" alt="Balji" className="h-8" />
          </a>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.href)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-700 rounded-lg transition-all"
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href={`${PORTAL}/login`} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-700 rounded-lg transition-all">
              Login
            </a>
            <a href={`${PORTAL}/register`}
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
            >
              Get Started Free
            </a>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-600 hover:text-blue-700">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 pb-6 pt-2 bg-white border-t border-gray-100">
          <div className="flex flex-col gap-1">
            {navLinks.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.href)}
                className="block w-full text-left px-4 py-3 text-sm font-medium text-gray-600 hover:text-blue-700 hover:bg-blue-50/50 rounded-lg"
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
            <a href={`${PORTAL}/login`} className="text-center px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Login</a>
            <a href={`${PORTAL}/register`} className="text-center px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-emerald-600 hover:bg-emerald-500">Get Started Free</a>
          </div>
        </div>
      </div>
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Hero — White bg with subtle blue/green gradient washes + dual screenshots
   ═══════════════════════════════════════════════════════════════════════════ */

function Hero() {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setLoaded(true)) }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* White bg with subtle washes */}
      <div className="absolute inset-0 bg-white" />
      <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-bl from-blue-50/80 via-blue-100/30 to-transparent rounded-full blur-3xl -translate-y-1/4 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-green-50/60 via-emerald-100/20 to-transparent rounded-full blur-3xl translate-y-1/4 -translate-x-1/4" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, rgba(37,99,235,0.5) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge pill */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 mb-8 transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
            </span>
            <span className="text-sm font-medium text-blue-700">CPaaS Platform for Revenue-Based Financing</span>
          </div>

          {/* Title */}
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 transition-all duration-700 delay-100 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="text-gray-900">Smart Communications for{' '}</span>
            <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
              Revenue-Based Financing
            </span>
          </h1>

          {/* Subtitle */}
          <p className={`text-lg sm:text-xl text-gray-500 leading-relaxed max-w-3xl mx-auto mb-10 transition-all duration-700 delay-200 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Power your lending operations with an integrated CPaaS platform &mdash; auto dialer, CRM pipeline,
            real-time analytics, and AI-powered collections &mdash; all in one place.
          </p>

          {/* CTAs */}
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 transition-all duration-700 delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <a href={`${PORTAL}/register`}
              className="group inline-flex items-center gap-2.5 px-8 py-4 text-base font-semibold text-white rounded-2xl bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5"
            >
              Start Free Trial
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </a>
            <button onClick={() => document.querySelector('#platform')?.scrollIntoView({ behavior: 'smooth' })}
              className="group inline-flex items-center gap-2.5 px-8 py-4 text-base font-semibold text-gray-700 rounded-2xl border border-gray-200 bg-white hover:border-blue-300 transition-all duration-300 hover:-translate-y-0.5"
            >
              <Play size={16} className="text-blue-600" />
              See Platform
            </button>
          </div>

          {/* Trust badges */}
          <div className={`flex flex-wrap items-center justify-center gap-6 sm:gap-8 mb-16 transition-all duration-700 delay-[400ms] ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {[
              { icon: Shield, label: 'SOC 2 Compliant' },
              { icon: Globe, label: '99.99% Uptime' },
              { icon: Headphones, label: '24/7 Support' },
              { icon: Clock, label: '2-Min Setup' },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-2 text-gray-400">
                <b.icon size={16} className="text-blue-600" />
                <span className="text-sm font-medium">{b.label}</span>
              </div>
            ))}
          </div>

          {/* Dual dashboard screenshots in browser frames */}
          <div className={`relative max-w-6xl mx-auto transition-all duration-1000 delay-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Subtle blue glow behind */}
            <div className="absolute inset-0 -inset-x-8 -inset-y-8 bg-blue-200/30 rounded-3xl blur-3xl pointer-events-none" />

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Dialer Dashboard */}
              <div className="relative">
                <p className="text-sm font-semibold text-gray-500 mb-3 tracking-wide uppercase">Dialer Dashboard</p>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                  {/* Light browser chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs text-gray-400 max-w-md mx-auto">
                        <Shield size={12} className="text-green-500" />
                        portal.balji.app/dialer
                      </div>
                    </div>
                  </div>
                  <img src="/screenshots/dialer-studio-clean.jpeg" alt="Balji Dialer Dashboard" className="w-full h-auto" loading="eager" />
                </div>
              </div>

              {/* Right: CRM Pipeline */}
              <div className="relative">
                <p className="text-sm font-semibold text-gray-500 mb-3 tracking-wide uppercase">CRM Pipeline</p>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                  {/* Light browser chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs text-gray-400 max-w-md mx-auto">
                        <Shield size={12} className="text-green-500" />
                        portal.balji.app/crm
                      </div>
                    </div>
                  </div>
                  <img src="/screenshots/feature-leads.png" alt="Balji CRM Pipeline" className="w-full h-auto" loading="eager" />
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
   StatsBar — White bg, clean cards with counter animations
   ═══════════════════════════════════════════════════════════════════════════ */

function StatsBar() {
  const { ref, visible } = useInView()
  const c0 = useCounter(500, visible)
  const c1 = useCounter(12, visible, 1500)
  const c2 = useCounter(99, visible, 1800)
  const c3 = useCounter(45, visible, 1200)

  const stats = [
    { val: `${c0}+`, label: 'Finance Teams', icon: Users },
    { val: `${c1}M+`, label: 'Calls Made', icon: PhoneCall },
    { val: `${c2}.99%`, label: 'Uptime', icon: Clock },
    { val: `${c3}+`, label: 'Countries', icon: Globe },
  ]

  return (
    <section ref={ref} className="relative py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {stats.map((s, i) => (
            <div key={s.label}
              className={`group relative p-6 lg:p-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200/60 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-blue-50 group-hover:bg-blue-100/70 transition-colors">
                  <s.icon size={20} className="text-blue-600" />
                </div>
              </div>
              <div className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
                {s.val}
              </div>
              <div className="text-sm font-medium text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Features — 6 feature cards on gray-50
   ═══════════════════════════════════════════════════════════════════════════ */

const features = [
  { icon: Zap, title: 'Auto Dialer', desc: 'Auto-dial borrowers with progressive and preview modes. Maximize agent connect rates.', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  { icon: Users, title: 'CRM Pipeline', desc: 'Track every borrower from application to funding. Custom pipeline stages and deal history.', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
  { icon: BarChart3, title: 'Revenue Analytics', desc: 'Real-time dashboards for portfolio performance, collection rates, and productivity.', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { icon: Brain, title: 'AI-Powered Insights', desc: 'Sentiment analysis, smart scoring for repayment likelihood, and AI agent coaching.', iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
  { icon: Megaphone, title: 'Multi-Channel Outreach', desc: 'Voice, SMS, and email from one platform. Automated drip campaigns for reminders.', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
  { icon: Shield, title: 'Compliance & Recording', desc: 'Every call recorded. Built-in TCPA compliance tools and audit trails.', iconBg: 'bg-rose-50', iconColor: 'text-rose-600' },
]

function Features() {
  const { ref, visible } = useInView()
  return (
    <section ref={ref} id="features" className="relative py-24 lg:py-32 bg-gray-50">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 mb-6">
            <Zap size={14} className="text-blue-700" />
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Platform Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">Finance Smarter</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">A complete communications and CRM platform built for revenue-based financing.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {features.map((f, i) => (
            <div key={f.title}
              className={`group relative p-7 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-200/60 hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${f.iconBg} mb-5 transition-transform duration-300 group-hover:scale-110`}>
                <f.icon size={24} className={f.iconColor} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2.5">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              <div className="flex items-center gap-1.5 mt-5 text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-300">
                Learn more <ChevronRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Platform Preview — Tabbed screenshot showcase (Light)
   ═══════════════════════════════════════════════════════════════════════════ */

function PlatformPreview() {
  const { ref, visible } = useInView()
  const [tab, setTab] = useState(0)
  const tabs = [
    { label: 'Dashboard', icon: BarChart3, image: '/screenshots/dialer-studio-clean.jpeg', slug: 'dashboard' },
    { label: 'Pipeline', icon: Users, image: '/screenshots/feature-leads.png', slug: 'pipeline' },
    { label: 'Dialer', icon: Phone, image: '/screenshots/feature-webphone.png', slug: 'dialer' },
  ]

  return (
    <section id="platform" ref={ref} className="relative py-24 bg-white overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 mb-6">
            <BarChart3 size={14} className="text-emerald-700" />
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Product</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">Built for Speed and Scale</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">A beautifully crafted workspace your finance team will love.</p>
        </div>

        <div className={`flex justify-center mb-10 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-flex items-center bg-gray-100 rounded-xl p-1.5 gap-1">
            {tabs.map((t, i) => (
              <button key={t.label} onClick={() => setTab(i)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  tab === i ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <t.icon size={15} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`relative max-w-5xl mx-auto transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Outer glow */}
          <div className="absolute -inset-8 bg-blue-100/40 rounded-3xl blur-2xl" />

          {/* Frame */}
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl shadow-blue-100/30 overflow-hidden">
            {/* Browser chrome bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-1.5 text-xs text-gray-400 min-w-[280px]">
                  <Shield size={12} className="text-emerald-500" />
                  portal.balji.app/{tabs[tab].slug}
                </div>
              </div>
              <div className="w-[52px]" />
            </div>
            <div className="relative bg-white">
              <img key={tab} src={tabs[tab].image} alt={`Balji ${tabs[tab].label} view`} className="w-full h-auto object-cover object-top" style={{ maxHeight: 540 }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   How It Works — 4 connected steps (Light)
   ═══════════════════════════════════════════════════════════════════════════ */

const steps = [
  { icon: UserPlus, title: 'Import Borrowers', desc: 'Import leads from CSV, API, or web forms. Auto-deduplicate and enrich borrower data.', gradient: 'from-blue-500 to-cyan-400', bgLight: 'bg-blue-50', border: 'border-blue-100' },
  { icon: PhoneCall, title: 'Start Outreach', desc: 'Launch automated campaigns. AI paces calls to maximize live connections with borrowers.', gradient: 'from-blue-600 to-blue-400', bgLight: 'bg-blue-50', border: 'border-blue-100' },
  { icon: LineChart, title: 'Track Portfolio', desc: 'Real-time dashboards show every metric. Coach agents with AI-powered insights.', gradient: 'from-emerald-500 to-teal-400', bgLight: 'bg-emerald-50', border: 'border-emerald-100' },
  { icon: Target, title: 'Close Deals', desc: 'Move borrowers through your pipeline. Automated follow-ups ensure every deal gets funded.', gradient: 'from-emerald-600 to-green-400', bgLight: 'bg-green-50', border: 'border-green-100' },
]

function HowItWorks() {
  const { ref, visible } = useInView()
  return (
    <section ref={ref} className="relative py-24 bg-gray-50 overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 mb-6">
            <PhoneCall size={14} className="text-blue-700" />
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">How It Works</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">From Application to Funding in 4 Steps</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">Get up and running in minutes, not months.</p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
          {/* Connector line on desktop */}
          <div className="hidden md:block absolute top-[60px] left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-[2px]">
            <div className="w-full h-full bg-gradient-to-r from-blue-200 via-blue-300 to-emerald-200 rounded-full" />
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
                  <div className="w-[2px] h-8 bg-blue-200 rounded-full" />
                  <ChevronDown size={16} className="text-blue-300 -mt-1" />
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
   Mobile App — Phone mockup with auto-toggle (Light)
   ═══════════════════════════════════════════════════════════════════════════ */

function MobileApp() {
  const { ref, visible } = useInView()
  const [activeView, setActiveView] = useState<'phone' | 'crm'>('phone')
  const mobileFeatures = [
    'Real-time lead notifications and call alerts',
    'Full CRM access — view and update borrower records',
    'One-tap dialing with call recording',
    'Dashboard analytics on the go',
    'Team chat and collaboration',
  ]

  // Auto-toggle between Dialer and CRM views
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveView(prev => prev === 'phone' ? 'crm' : 'phone')
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section id="mobile-app" ref={ref} className="relative py-24 bg-white overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left column — text content */}
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 mb-6">
              <Smartphone size={14} className="text-emerald-700" />
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Mobile App</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              Your Platform, On The Go
            </h2>
            <p className="text-lg text-gray-500 max-w-lg mb-10">
              Manage your portfolio, track calls, and close deals from anywhere with our native mobile apps for Android &amp; iOS.
            </p>

            <ul className="space-y-4 mb-10">
              {mobileFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <Check size={14} className="text-blue-600" strokeWidth={2.5} />
                  </div>
                  <span className="text-gray-600 text-[15px] leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-4">
              <a href="#" className="inline-flex items-center gap-3 bg-gray-900 hover:bg-gray-800 text-white pl-4 pr-6 py-3 rounded-xl transition-colors shadow-lg">
                <Phone size={24} />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 leading-none">Download on the</div>
                  <div className="text-base font-semibold leading-tight mt-0.5">App Store</div>
                </div>
              </a>
              <a href="#" className="inline-flex items-center gap-3 bg-gray-900 hover:bg-gray-800 text-white pl-4 pr-6 py-3 rounded-xl transition-colors shadow-lg">
                <Smartphone size={24} />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 leading-none">Get it on</div>
                  <div className="text-base font-semibold leading-tight mt-0.5">Google Play</div>
                </div>
              </a>
            </div>
          </div>

          {/* Right column — phone mockup */}
          <div className={`relative flex flex-col items-center min-h-[600px] transition-all duration-1000 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            {/* Toggle buttons */}
            <div className="inline-flex items-center bg-gray-100 rounded-xl p-1.5 gap-1 mb-8">
              <button onClick={() => setActiveView('phone')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeView === 'phone' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Phone size={15} /> Dialer
              </button>
              <button onClick={() => setActiveView('crm')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeView === 'crm' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Users size={15} /> CRM
              </button>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-72 h-8 bg-blue-100/40 rounded-full blur-xl" />

            {/* Single phone mockup with crossfade */}
            <div className="relative">
              <div className="relative w-[260px] h-[540px] bg-gray-900 rounded-[40px] p-[6px] shadow-2xl shadow-gray-300/50">
                <div className="relative w-full h-full bg-white rounded-[34px] overflow-hidden">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-32 h-7 bg-gray-900 rounded-b-2xl" />

                  {/* Balji branding bar */}
                  <div className="absolute top-7 left-0 right-0 z-20 bg-gradient-to-r from-blue-600 to-emerald-500 px-4 py-2 flex items-center gap-2">
                    <img src="/balji-logo.svg" alt="Balji" className="h-4 brightness-0 invert" />
                    <span className="text-white text-[11px] font-semibold">
                      {activeView === 'phone' ? 'Dialer' : 'CRM'}
                    </span>
                  </div>

                  {/* Dialer view */}
                  <div className={`absolute inset-0 pt-[72px] transition-opacity duration-500 ${activeView === 'phone' ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="h-full bg-white p-4 space-y-3">
                      <div className="text-center pt-2 pb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center mx-auto mb-3">
                          <span className="text-white text-lg font-bold">RA</span>
                        </div>
                        <p className="text-gray-900 font-bold text-lg">Rachel Adams</p>
                        <p className="text-gray-400 text-sm">+1 (555) 842-9173</p>
                        <p className="text-emerald-500 text-xs font-semibold mt-1 animate-pulse">Connected — 03:42</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 px-2">
                        {['Mute', 'Hold', 'Transfer', 'Record', 'Keypad', 'Notes'].map(btn => (
                          <div key={btn} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white border border-gray-200 shadow-sm">
                            <div className="w-6 h-6 rounded-full bg-gray-100" />
                            <span className="text-[9px] text-gray-500 font-medium">{btn}</span>
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
                            <p className="text-gray-400 text-[10px]">CapitalBridge Inc.</p>
                          </div>
                          <span className="ml-auto text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Qualified</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100"><span className="text-gray-400">Phone</span><br/><span className="text-gray-700 font-medium">+1 (555) 317-4820</span></div>
                          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100"><span className="text-gray-400">Email</span><br/><span className="text-gray-700 font-medium">d.alvarez@cb.io</span></div>
                          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100"><span className="text-gray-400">Deal Size</span><br/><span className="text-gray-700 font-medium">$125,000</span></div>
                          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100"><span className="text-gray-400">Stage</span><br/><span className="text-gray-700 font-medium">Proposal</span></div>
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
                        <button className="flex-1 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-emerald-500 text-white text-[10px] font-semibold shadow-sm">Call</button>
                        <button className="flex-1 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-[10px] font-semibold">SMS</button>
                        <button className="flex-1 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-[10px] font-semibold">Email</button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Home indicator */}
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
   Pricing — Two-plan grid on gray-50 background
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
    <section id="pricing" ref={ref} className="relative py-24 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 mb-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Sparkles size={14} className="text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Pricing</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Simple, Transparent Pricing
          </h2>
          <p className={`text-lg text-gray-500 max-w-2xl mx-auto transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Start free, scale as you grow. No hidden fees, no contracts.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Dialer Plan */}
          <div className={`bg-white border border-gray-200 shadow-sm rounded-2xl p-8 flex flex-col transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Dialer</h3>
              <p className="text-sm text-gray-500">Power dialer with unlimited calls for your outreach team.</p>
            </div>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-extrabold text-gray-900">$19.99</span>
              <span className="text-gray-500 font-medium">/mo per user</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {dialerFeatures.map(f => (
                <li key={f} className="flex items-start gap-3">
                  <Check size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-600">{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-400 mb-4">* Fair usage policy applies</p>
            <a href={`${PORTAL}/register`}
              className="block w-full text-center px-6 py-3 text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-all duration-300"
            >
              Start Free Trial
            </a>
          </div>

          {/* Dialer + CRM Plan */}
          <div className={`relative bg-white border-2 border-blue-500 shadow-lg shadow-blue-100/40 ring-1 ring-blue-100 rounded-2xl p-8 flex flex-col transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Best Value badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center px-4 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-md">
                Best Value
              </span>
            </div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Dialer + CRM</h3>
              <p className="text-sm text-gray-500">The complete combo — dialer and CRM in one platform.</p>
            </div>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-extrabold text-gray-900">$29.99</span>
              <span className="text-gray-500 font-medium">/mo per user</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {crmFeatures.map(f => (
                <li key={f} className="flex items-start gap-3">
                  <Check size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-600">{f}</span>
                </li>
              ))}
            </ul>
            <a href={`${PORTAL}/register`}
              className="block w-full text-center px-6 py-3 text-sm font-semibold bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-md shadow-blue-200/40 hover:-translate-y-0.5 rounded-xl transition-all duration-300"
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
   Testimonials — Three social-proof cards on white background
   ═══════════════════════════════════════════════════════════════════════════ */

function Testimonials() {
  const { ref, visible } = useInView()

  const testimonials = [
    {
      name: 'Sarah Mitchell',
      role: 'VP Collections, FinanceFlow',
      initials: 'SM',
      gradient: 'from-blue-500 to-blue-600',
      quote: 'Balji transformed our collections process. Our team went from 80 to 200+ calls per day with better recovery rates. The AI coaching feature is a game changer.',
    },
    {
      name: 'James Rodriguez',
      role: 'Director, LendHub Solutions',
      initials: 'JR',
      gradient: 'from-emerald-500 to-green-500',
      quote: 'We evaluated 12 platforms. Balji was the only one that combined a real dialer with a CRM our finance team actually wanted to use.',
    },
    {
      name: 'Emily Chen',
      role: 'COO, CapitalPulse',
      initials: 'EC',
      gradient: 'from-blue-400 to-emerald-400',
      quote: 'The real-time analytics alone paid for the platform in the first month. We identified bottlenecks we didn\'t know existed and improved collection rates by 34%.',
    },
  ]

  return (
    <section ref={ref} className="relative py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 mb-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Star size={14} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-700">Testimonials</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Trusted by Finance Teams Everywhere
          </h2>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={t.name}
              className={`bg-white border border-gray-100 shadow-sm hover:shadow-md rounded-2xl p-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${200 + i * 100}ms` }}
            >
              {/* Quote icon */}
              <Quote size={32} className="text-blue-200 mb-4" />

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, si) => (
                  <Star key={si} size={16} className="text-amber-400 fill-amber-400" />
                ))}
              </div>

              {/* Quote text */}
              <p className="text-gray-600 leading-relaxed mb-6">
                "{t.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-sm font-bold`}>
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
   CtaBanner — Gradient card CTA on gray-50 background
   ═══════════════════════════════════════════════════════════════════════════ */

function CtaBanner() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="relative py-24 lg:py-32 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`bg-gradient-to-br from-blue-50 via-white to-emerald-50 border border-blue-100/80 shadow-lg shadow-blue-100/20 rounded-3xl p-12 md:p-16 text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.98]'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-blue-200/60 mb-6">
            <Sparkles size={14} className="text-blue-600" />
            <span className="text-sm font-medium text-blue-600">14-day free trial, no credit card</span>
          </div>

          {/* Title */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Ready to Transform Your<br className="hidden sm:inline" /> Financing Operations?
          </h2>

          {/* Subtitle */}
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10">
            Join hundreds of finance teams already using Balji to streamline collections, close more deals, and grow revenue faster.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={`${PORTAL}/register`}
              className="group inline-flex items-center gap-2.5 px-8 py-4 text-base font-semibold text-white rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-500 shadow-md shadow-blue-200/40 transition-all duration-300 hover:-translate-y-0.5"
            >
              Start Free Trial
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a href={`${PORTAL}/login`}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              Login to Dashboard
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Footer — Dark footer with 4-column link grid
   ═══════════════════════════════════════════════════════════════════════════ */

function Footer() {
  const columns = [
    {
      title: 'Product',
      links: ['Auto Dialer', 'CRM Pipeline', 'Analytics', 'AI Insights', 'Mobile App'],
    },
    {
      title: 'Company',
      links: ['About', 'Careers', 'Blog', 'Press', 'Partners'],
    },
    {
      title: 'Resources',
      links: ['Documentation', 'API Reference', 'Status Page', 'Changelog', 'Community'],
    },
    {
      title: 'Legal',
      links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR', 'Security'],
    },
  ]

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2">
            <img src="/balji-logo.svg" alt="Balji" className="h-8 mb-4" />
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              The complete CPaaS platform built for revenue-based financing teams. Auto dialer, CRM, analytics, and AI — all in one.
            </p>
          </div>

          {/* Link columns */}
          {columns.map(col => (
            <div key={col.title}>
              <h4 className="text-gray-900 font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map(link => (
                  <li key={link}>
                    <a href="#" className="text-gray-500 hover:text-blue-600 text-sm transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Balji. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Cookies</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Export — LandingPageBalji
   ═══════════════════════════════════════════════════════════════════════════ */

export function LandingPageBalji() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => { document.documentElement.style.scrollBehavior = '' }
  }, [])

  return (
    <div className="relative min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <AnimatedBg />
      <Navbar />
      <Hero />
      <StatsBar />
      <Features />
      <PlatformPreview />
      <HowItWorks />
      <MobileApp />
      <Pricing />
      <Testimonials />
      <CtaBanner />
      <Footer />
      <style>{`
        @keyframes orbFloat1 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -40px) scale(1.05); } 66% { transform: translate(-20px, 20px) scale(0.95); } }
        @keyframes orbFloat2 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(-40px, 30px) scale(1.08); } 66% { transform: translate(25px, -25px) scale(0.92); } }
        @keyframes orbFloat3 { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(25px, 35px) scale(1.03); } 66% { transform: translate(-35px, -15px) scale(0.97); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}