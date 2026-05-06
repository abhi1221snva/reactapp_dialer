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
   AnimatedBg — Dark version
   ═══════════════════════════════════════════════════════════════════════════ */

function AnimatedBg() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0f1629] to-[#0a0e1a]" />

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Floating orbs — very low opacity */}
      <div className="absolute w-[600px] h-[600px] rounded-full opacity-[0.07]" style={{
        background: 'radial-gradient(circle, rgba(99,102,241,0.8) 0%, transparent 70%)',
        top: '5%', left: '10%',
        animation: 'orbFloat1 20s ease-in-out infinite',
      }} />
      <div className="absolute w-[500px] h-[500px] rounded-full opacity-[0.06]" style={{
        background: 'radial-gradient(circle, rgba(139,92,246,0.8) 0%, transparent 70%)',
        top: '45%', right: '5%',
        animation: 'orbFloat2 25s ease-in-out infinite',
      }} />
      <div className="absolute w-[450px] h-[450px] rounded-full opacity-[0.06]" style={{
        background: 'radial-gradient(circle, rgba(59,130,246,0.8) 0%, transparent 70%)',
        bottom: '5%', left: '35%',
        animation: 'orbFloat3 22s ease-in-out infinite',
      }} />
      <div className="absolute w-[300px] h-[300px] rounded-full opacity-[0.08]" style={{
        background: 'radial-gradient(circle, rgba(99,102,241,0.6) 0%, transparent 60%)',
        top: '20%', right: '30%',
        animation: 'orbFloat2 18s ease-in-out infinite reverse',
      }} />

      {/* Particles effect */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Navbar — Dark glassmorphism
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
        ? 'bg-[#0f1629]/80 backdrop-blur-xl border-b border-white/5'
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex items-center gap-2.5">
            <img src="/balji-logo.svg" alt="Balji" className="h-8" />
          </a>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.href)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.04] transition-all"
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href={`${PORTAL}/login`} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.04] transition-all">
              Login
            </a>
            <a href={`${PORTAL}/register`}
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5"
            >
              Get Started Free
            </a>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-slate-400 hover:text-white">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 pb-6 pt-2 bg-[#0f1629]/95 backdrop-blur-xl border-t border-white/5">
          <div className="flex flex-col gap-1">
            {navLinks.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.href)}
                className="block w-full text-left px-4 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-lg"
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
            <a href={`${PORTAL}/login`} className="text-center px-4 py-2.5 text-sm font-medium text-slate-400 border border-white/10 rounded-xl hover:bg-white/[0.04]">Login</a>
            <a href={`${PORTAL}/register`} className="text-center px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500">Get Started Free</a>
          </div>
        </div>
      </div>
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Hero — Dark gradient + dual browser frame screenshots
   ═══════════════════════════════════════════════════════════════════════════ */

function Hero() {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setLoaded(true)) }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Dark gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#111833] to-[#0d1225]" />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-indigo-900/20 via-violet-900/10 to-transparent rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-900/15 via-indigo-900/10 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8 transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-r from-indigo-400 to-violet-400" />
            </span>
            <span className="text-sm font-medium text-indigo-300">CPaaS Platform for Revenue-Based Financing</span>
          </div>

          {/* Title */}
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 transition-all duration-700 delay-100 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="text-white">Smart Communications for{' '}</span>
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Revenue-Based Financing
            </span>
          </h1>

          {/* Subtitle */}
          <p className={`text-lg sm:text-xl text-slate-400 leading-relaxed max-w-3xl mx-auto mb-10 transition-all duration-700 delay-200 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Power your lending operations with an integrated CPaaS platform &mdash; auto-dialer, CRM pipeline,
            real-time analytics, and AI-powered collections &mdash; all in one place.
          </p>

          {/* CTAs */}
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 transition-all duration-700 delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <a href={`${PORTAL}/register`}
              className="group inline-flex items-center gap-2.5 px-8 py-4 text-base font-semibold text-white rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300 hover:-translate-y-0.5"
            >
              Start Free Trial
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </a>
            <button onClick={() => document.querySelector('#platform')?.scrollIntoView({ behavior: 'smooth' })}
              className="group inline-flex items-center gap-2.5 px-8 py-4 text-base font-semibold text-slate-300 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300 hover:-translate-y-0.5"
            >
              <Play size={16} className="text-indigo-400" />
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
              <div key={b.label} className="flex items-center gap-2 text-slate-500">
                <b.icon size={16} className="text-indigo-400" />
                <span className="text-sm font-medium">{b.label}</span>
              </div>
            ))}
          </div>

          {/* Dual dashboard screenshots */}
          <div className={`relative max-w-6xl mx-auto transition-all duration-1000 delay-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Floating accent decorations */}
            <div className="absolute -top-8 -left-8 w-20 h-20 border border-indigo-500/10 rounded-2xl rotate-12 hidden lg:block" />
            <div className="absolute -bottom-6 -right-6 w-16 h-16 border border-violet-500/10 rounded-xl -rotate-12 hidden lg:block" />
            <div className="absolute top-1/2 -left-12 w-3 h-3 rounded-full bg-indigo-500/20 hidden lg:block" />
            <div className="absolute top-1/4 -right-10 w-2 h-2 rounded-full bg-violet-500/30 hidden lg:block" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {/* Left: Dialer Dashboard */}
              <div className="relative">
                <div className="absolute -inset-4 bg-indigo-500/10 rounded-3xl blur-3xl" />
                <div className="relative">
                  <p className="text-sm font-semibold text-slate-400 mb-3 tracking-wide uppercase">Dialer Dashboard</p>
                  <div className="bg-[#0c1029] rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/40 overflow-hidden">
                    {/* Dark browser chrome */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0e1f] border-b border-white/[0.06]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                      </div>
                      <div className="flex-1 mx-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.05] rounded-lg border border-white/[0.06] text-xs text-slate-500 max-w-md mx-auto">
                          <Shield size={12} className="text-emerald-400/70" />
                          portal.balji.app/dialer
                        </div>
                      </div>
                    </div>
                    <img src="/screenshots/dialer-studio-clean.jpeg" alt="Balji Dialer Dashboard" className="w-full h-auto" loading="eager" />
                  </div>
                </div>
              </div>

              {/* Right: CRM Pipeline */}
              <div className="relative">
                <div className="absolute -inset-4 bg-indigo-500/10 rounded-3xl blur-3xl" />
                <div className="relative">
                  <p className="text-sm font-semibold text-slate-400 mb-3 tracking-wide uppercase">CRM Pipeline</p>
                  <div className="bg-[#0c1029] rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/40 overflow-hidden">
                    {/* Dark browser chrome */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0e1f] border-b border-white/[0.06]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                      </div>
                      <div className="flex-1 mx-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.05] rounded-lg border border-white/[0.06] text-xs text-slate-500 max-w-md mx-auto">
                          <Shield size={12} className="text-emerald-400/70" />
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
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   StatsBar — Dark animated counters
   ═══════════════════════════════════════════════════════════════════════════ */

function StatsBar() {
  const { ref, visible } = useInView()
  const c0 = useCounter(500, visible)
  const c1 = useCounter(12, visible, 1500)
  const c2 = useCounter(99, visible, 1800)
  const c3 = useCounter(45, visible, 1200)

  const stats = [
    { val: `${c0}+`, label: 'Finance Teams', icon: Users, iconColor: 'text-indigo-400' },
    { val: `${c1}M+`, label: 'Calls Made', icon: PhoneCall, iconColor: 'text-indigo-400' },
    { val: `${c2}.99%`, label: 'Uptime', icon: Clock, iconColor: 'text-indigo-400' },
    { val: `${c3}+`, label: 'Countries', icon: Globe, iconColor: 'text-indigo-400' },
  ]

  return (
    <section ref={ref} className="relative py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {stats.map((s, i) => (
            <div key={s.label}
              className={`group relative p-6 lg:p-8 bg-white/[0.03] rounded-2xl border border-white/5 hover:border-indigo-500/20 hover:bg-white/[0.05] transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/15 transition-colors">
                  <s.icon size={20} className={s.iconColor} />
                </div>
              </div>
              <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                {s.val}
              </div>
              <div className="text-sm font-medium text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Features — CPaaS + CRM + RBF (Dark)
   ═══════════════════════════════════════════════════════════════════════════ */

const features = [
  { icon: Zap, title: 'Auto Dialer', desc: 'Auto-dial borrowers with progressive and preview modes. Maximize agent connect rates during collections and follow-ups.', iconColor: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  { icon: Users, title: 'CRM Pipeline', desc: 'Track every borrower from application to funding. Custom pipeline stages, automated follow-ups, and full deal history.', iconColor: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { icon: BarChart3, title: 'Revenue Analytics', desc: 'Real-time dashboards for portfolio performance, collection rates, and agent productivity.', iconColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  { icon: Brain, title: 'AI-Powered Insights', desc: 'Sentiment analysis on borrower calls, smart scoring for repayment likelihood, and AI coaching.', iconColor: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  { icon: Megaphone, title: 'Multi-Channel Outreach', desc: 'Reach borrowers via voice, SMS, and email from one platform. Automated drip campaigns.', iconColor: 'text-indigo-400', bgColor: 'bg-indigo-500/10' },
  { icon: Shield, title: 'Compliance & Recording', desc: 'Every call recorded and logged. Built-in compliance tools for TCPA and audit trails.', iconColor: 'text-rose-400', bgColor: 'bg-rose-500/10' },
]

function Features() {
  const { ref, visible } = useInView()
  return (
    <section ref={ref} id="features" className="relative py-24 lg:py-32 bg-[#0a0e1a]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-500/5 to-transparent rounded-full blur-3xl" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
            <Zap size={14} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Platform Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-5">
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Finance Smarter</span>
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed">A complete communications and CRM platform built for revenue-based financing.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {features.map((f, i) => (
            <div key={f.title}
              className={`group relative p-7 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/30 hover:bg-white/[0.05] transition-all duration-500 hover:-translate-y-1 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${f.bgColor} mb-5 transition-transform duration-300 group-hover:scale-110`}>
                <f.icon size={24} className={f.iconColor} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2.5">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              <div className="flex items-center gap-1.5 mt-5 text-sm font-medium text-indigo-400 opacity-0 group-hover:opacity-100 transition-all duration-300">
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
   Platform Preview — Tabbed screenshot showcase (Dark)
   ═══════════════════════════════════════════════════════════════════════════ */

function PlatformPreview() {
  const { ref, visible } = useInView()
  const [tab, setTab] = useState(0)
  const tabs = [
    { label: 'Dashboard', icon: BarChart3, image: '/screenshots/dialer-studio-clean.jpeg' },
    { label: 'Pipeline', icon: Users, image: '/screenshots/feature-leads.png' },
    { label: 'Dialer', icon: Phone, image: '/screenshots/feature-webphone.png' },
  ]

  return (
    <section id="platform" ref={ref} className="relative py-24 bg-[#060914] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.06)_0%,_transparent_70%)]" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
            <BarChart3 size={14} className="text-purple-400" />
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Product</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">Built for Speed and Scale</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">A beautifully crafted workspace your finance team will love.</p>
        </div>

        <div className={`flex justify-center mb-10 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-flex items-center bg-white/[0.05] rounded-xl p-1.5 gap-1">
            {tabs.map((t, i) => (
              <button key={t.label} onClick={() => setTab(i)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  tab === i ? 'bg-white/10 text-white shadow-lg shadow-black/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                }`}
              >
                <t.icon size={15} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`relative max-w-5xl mx-auto transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="absolute -inset-8 bg-indigo-500/10 rounded-3xl blur-3xl" />
          <div className="relative bg-[#0d1117] rounded-2xl shadow-2xl shadow-black/50 border border-white/[0.06] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-[#161b22] border-b border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-lg px-4 py-1.5 text-xs text-slate-500 min-w-[280px]">
                  <Shield size={12} className="text-emerald-400" />
                  portal.balji.app/{['dashboard', 'pipeline', 'dialer'][tab]}
                </div>
              </div>
              <div className="w-[52px]" />
            </div>
            <div className="relative bg-[#0d1117]">
              <img key={tab} src={tabs[tab].image} alt={`Balji ${tabs[tab].label} view`} className="w-full h-auto object-cover object-top" style={{ maxHeight: 540 }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   How It Works — 4 connected steps (Dark)
   ═══════════════════════════════════════════════════════════════════════════ */

const steps = [
  { icon: UserPlus, title: 'Import Borrowers', desc: 'Import leads from CSV, API, or web forms. Auto-deduplicate and enrich borrower data.', gradient: 'from-blue-500 to-cyan-400', dotColor: 'bg-blue-500', textColor: 'text-blue-400' },
  { icon: PhoneCall, title: 'Start Outreach', desc: 'Launch automated campaigns. AI paces calls to maximize live connections with borrowers.', gradient: 'from-indigo-500 to-purple-500', dotColor: 'bg-indigo-500', textColor: 'text-indigo-400' },
  { icon: LineChart, title: 'Track Portfolio', desc: 'Real-time dashboards show every metric. Coach agents with AI-powered insights.', gradient: 'from-emerald-500 to-teal-400', dotColor: 'bg-emerald-500', textColor: 'text-emerald-400' },
  { icon: Target, title: 'Close Deals', desc: 'Move borrowers through your pipeline. Automated follow-ups ensure every deal gets funded.', gradient: 'from-amber-500 to-orange-500', dotColor: 'bg-amber-500', textColor: 'text-amber-400' },
]

function HowItWorks() {
  const { ref, visible } = useInView()
  return (
    <section ref={ref} className="relative py-24 bg-[#0a0e1a] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_rgba(99,102,241,0.04)_0%,_transparent_50%),radial-gradient(circle_at_80%_20%,_rgba(16,185,129,0.04)_0%,_transparent_50%)]" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 mb-6">
            <PhoneCall size={14} className="text-sky-400" />
            <span className="text-xs font-semibold text-sky-300 uppercase tracking-wider">How It Works</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">From Application to Funding in 4 Steps</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">Get up and running in minutes, not months.</p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
          {/* Connector line on desktop */}
          <div className="hidden md:block absolute top-[52px] left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-[2px]">
            <div className="w-full h-full bg-gradient-to-r from-blue-500/30 via-indigo-500/30 via-emerald-500/30 to-amber-500/30 rounded-full" />
          </div>

          {steps.map((s, i) => (
            <div key={s.title} className={`relative flex flex-col items-center text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: `${i * 120}ms` }}>
              <div className="relative mb-6">
                <div className="relative z-10 w-[104px] h-[104px] rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-lg`}>
                    <s.icon size={28} className="text-white" strokeWidth={1.8} />
                  </div>
                </div>
                <div className={`absolute -top-2 -right-2 z-20 w-7 h-7 rounded-full bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-md ring-2 ring-[#0a0e1a]`}>
                  <span className="text-xs font-bold text-white">{i + 1}</span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed max-w-[240px]">{s.desc}</p>
              {i < 3 && (
                <div className="md:hidden flex flex-col items-center mt-6 mb-2">
                  <div className={`w-[2px] h-8 ${s.dotColor} opacity-20 rounded-full`} />
                  <ChevronDown size={16} className={`${s.textColor} opacity-40 -mt-1`} />
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
   Mobile App — Phone mockups + features (Dark)
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

  // Auto-toggle between Phone and CRM views
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveView(prev => prev === 'phone' ? 'crm' : 'phone')
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section id="mobile-app" ref={ref} className="relative py-24 bg-[#060914] overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/[0.04] via-transparent to-transparent" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/[0.06] rounded-full blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left column — text content */}
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
              <Smartphone size={14} className="text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Mobile App</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
              Your Platform, On The Go
            </h2>
            <p className="text-lg text-slate-400 max-w-lg mb-10">
              Manage your portfolio, track calls, and close deals from anywhere with our native mobile apps for Android &amp; iOS.
            </p>

            <ul className="space-y-4 mb-10">
              {mobileFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Check size={14} className="text-indigo-400" strokeWidth={2.5} />
                  </div>
                  <span className="text-slate-300 text-[15px] leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-4">
              <a href="#" className="inline-flex items-center gap-3 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] text-white pl-4 pr-6 py-3 rounded-xl transition-colors shadow-lg shadow-black/20">
                <Phone size={24} />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 leading-none">Download on the</div>
                  <div className="text-base font-semibold leading-tight mt-0.5">App Store</div>
                </div>
              </a>
              <a href="#" className="inline-flex items-center gap-3 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] text-white pl-4 pr-6 py-3 rounded-xl transition-colors shadow-lg shadow-black/20">
                <Smartphone size={24} />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 leading-none">Get it on</div>
                  <div className="text-base font-semibold leading-tight mt-0.5">Google Play</div>
                </div>
              </a>
            </div>
          </div>

          {/* Right column — phone mockup */}
          <div className={`relative flex flex-col items-center min-h-[600px] transition-all duration-1000 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            {/* Toggle buttons */}
            <div className="inline-flex items-center bg-white/[0.05] rounded-xl p-1.5 gap-1 mb-8">
              <button onClick={() => setActiveView('phone')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeView === 'phone' ? 'bg-white/10 text-white shadow-lg shadow-black/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Phone size={15} /> Dialer
              </button>
              <button onClick={() => setActiveView('crm')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeView === 'crm' ? 'bg-white/10 text-white shadow-lg shadow-black/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Users size={15} /> CRM
              </button>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-72 h-8 bg-indigo-500/10 rounded-full blur-xl" />

            {/* Single phone mockup with crossfade */}
            <div className="relative">
              <div className="relative w-[260px] h-[540px] bg-slate-800 rounded-[40px] p-[6px] shadow-2xl shadow-black/60">
                <div className="relative w-full h-full bg-[#0f1629] rounded-[34px] overflow-hidden">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-32 h-7 bg-slate-800 rounded-b-2xl" />

                  {/* Balji branding bar */}
                  <div className="absolute top-7 left-0 right-0 z-20 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 flex items-center gap-2">
                    <img src="/balji-logo.svg" alt="Balji" className="h-4 brightness-0 invert" />
                    <span className="text-white text-[11px] font-semibold">
                      {activeView === 'phone' ? 'Dialer' : 'CRM'}
                    </span>
                  </div>

                  {/* Phone view — mock dialer UI */}
                  <div className={`absolute inset-0 pt-[72px] transition-opacity duration-500 ${activeView === 'phone' ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="h-full bg-[#0f1629] p-4 space-y-3">
                      <div className="text-center pt-2 pb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-3">
                          <span className="text-white text-lg font-bold">RA</span>
                        </div>
                        <p className="text-white font-bold text-lg">Rachel Adams</p>
                        <p className="text-slate-400 text-sm">+1 (555) 842-9173</p>
                        <p className="text-emerald-400 text-xs font-semibold mt-1 animate-pulse">Connected — 03:42</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 px-2">
                        {['Mute', 'Hold', 'Transfer', 'Record', 'Keypad', 'Notes'].map(btn => (
                          <div key={btn} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                            <div className="w-6 h-6 rounded-full bg-white/[0.08]" />
                            <span className="text-[9px] text-slate-400 font-medium">{btn}</span>
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

                  {/* CRM view — mock lead detail */}
                  <div className={`absolute inset-0 pt-[72px] transition-opacity duration-500 ${activeView === 'crm' ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="h-full bg-[#0f1629] p-4 space-y-3 overflow-hidden">
                      <div className="bg-white/[0.05] rounded-xl border border-white/[0.08] p-3">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">DA</span>
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm">David Alvarez</p>
                            <p className="text-slate-500 text-[10px]">CapitalBridge Inc.</p>
                          </div>
                          <span className="ml-auto text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Qualified</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="bg-white/[0.03] rounded-lg p-2"><span className="text-slate-500">Phone</span><br/><span className="text-slate-300 font-medium">+1 (555) 317-4820</span></div>
                          <div className="bg-white/[0.03] rounded-lg p-2"><span className="text-slate-500">Email</span><br/><span className="text-slate-300 font-medium">d.alvarez@cb.io</span></div>
                          <div className="bg-white/[0.03] rounded-lg p-2"><span className="text-slate-500">Deal Size</span><br/><span className="text-slate-300 font-medium">$125,000</span></div>
                          <div className="bg-white/[0.03] rounded-lg p-2"><span className="text-slate-500">Stage</span><br/><span className="text-slate-300 font-medium">Proposal</span></div>
                        </div>
                      </div>
                      <div className="bg-white/[0.05] rounded-xl border border-white/[0.08] p-3">
                        <p className="text-[10px] font-semibold text-slate-300 mb-2">Recent Activity</p>
                        {[
                          { action: 'Call completed', time: '2m ago', dot: 'bg-emerald-400' },
                          { action: 'Email sent — proposal', time: '1h ago', dot: 'bg-blue-400' },
                          { action: 'Note added', time: '3h ago', dot: 'bg-amber-400' },
                        ].map((a, i) => (
                          <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
                            <div className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
                            <span className="text-[10px] text-slate-400 flex-1">{a.action}</span>
                            <span className="text-[9px] text-slate-500">{a.time}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] font-semibold shadow-sm">Call</button>
                        <button className="flex-1 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-300 text-[10px] font-semibold">SMS</button>
                        <button className="flex-1 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-300 text-[10px] font-semibold">Email</button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Home indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-500 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Pricing — 2 plans (dark)
   ═══════════════════════════════════════════════════════════════════════════ */

function Pricing() {
  const { ref, visible } = useInView()

  const plans = [
    {
      name: 'Dialer', price: '19.99', period: '/mo per user',
      desc: 'Power dialer with unlimited calls for your outreach team.',
      features: ['Unlimited calls*', 'Auto dialer', 'Call recording & logging', 'Agent scripts', 'Campaign management', 'Real-time call monitoring', 'Priority support'],
      highlighted: false, note: '* Fair usage policy applies',
    },
    {
      name: 'Dialer + CRM', price: '29.99', period: '/mo per user',
      desc: 'The complete combo — dialer and CRM in one platform.',
      features: ['Everything in Dialer', 'Full CRM pipeline', 'Lead management & scoring', 'Multi-channel outreach (Voice, SMS, Email)', 'AI insights & coaching', 'Advanced analytics & reporting', 'Mobile app access', 'API access', 'SSO & RBAC'],
      highlighted: true, badge: 'Best Value',
    },
  ]

  return (
    <section id="pricing" ref={ref} className="relative py-24 lg:py-32 bg-[#0a0e1a]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.08)_0%,_transparent_60%)]" />
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Sparkles size={14} className="text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">Simple, Transparent Pricing</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">Start free, scale as you grow. No hidden fees, no contracts.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((p, i) => (
            <div key={p.name}
              className={`relative rounded-2xl p-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${
                p.highlighted
                  ? 'border border-indigo-500/40 bg-indigo-500/[0.05] shadow-lg shadow-indigo-500/10'
                  : 'bg-white/[0.03] border border-white/[0.06]'
              }`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              {p.highlighted && (
                <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-indigo-500/20 via-transparent to-indigo-500/10 pointer-events-none" />
              )}
              {p.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-indigo-500/30">{p.badge}</span>
                </div>
              )}
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white mb-2">{p.name}</h3>
                <p className="text-slate-400 text-sm mb-6">{p.desc}</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-extrabold text-white">${p.price}</span>
                  <span className="text-slate-500 text-sm">{p.period}</span>
                </div>
                <ul className="space-y-3.5 mb-8">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-3">
                      <Check size={18} className="text-indigo-400 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                      <span className="text-slate-300 text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                {p.note && <p className="text-xs text-slate-500 mb-4">{p.note}</p>}
                <a href={`${PORTAL}/register`}
                  className={`block w-full text-center py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${
                    p.highlighted
                      ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5'
                      : 'border border-white/[0.1] text-slate-300 hover:bg-white/[0.05] hover:border-white/[0.15] hover:text-white'
                  }`}
                >
                  Start Free Trial
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Testimonials — 3 quote cards (dark)
   ═══════════════════════════════════════════════════════════════════════════ */

const testimonials = [
  { name: 'Sarah Mitchell', role: 'VP Collections', company: 'FinanceFlow', initials: 'SM', gradient: 'from-indigo-400 to-violet-400', quote: 'Balji transformed our collections process. Our team went from 80 to 200+ calls per day with better recovery rates. The AI coaching feature is a game changer.', rating: 5 },
  { name: 'James Rodriguez', role: 'Director', company: 'LendHub Solutions', initials: 'JR', gradient: 'from-violet-400 to-purple-400', quote: 'We evaluated 12 platforms. Balji was the only one that combined a real dialer with a CRM our finance team actually wanted to use.', rating: 5 },
  { name: 'Emily Chen', role: 'COO', company: 'CapitalPulse', initials: 'EC', gradient: 'from-blue-400 to-indigo-400', quote: 'The real-time analytics alone paid for the platform in the first month. We identified bottlenecks we didn\'t know existed and improved collection rates by 34%.', rating: 5 },
]

function Testimonials() {
  const { ref, visible } = useInView()
  return (
    <section id="testimonials" ref={ref} className="relative py-24 lg:py-32 bg-[#0a0e1a]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(139,92,246,0.06)_0%,_transparent_60%)]" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
            <Quote size={14} className="text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Testimonials</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">Trusted by Finance Teams Everywhere</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">Hear from teams that use Balji every day.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((t, i) => (
            <div key={t.name}
              className={`bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <Quote size={28} className="text-indigo-500/30 mb-4" />
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} size={14} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center`}>
                  <span className="text-white text-xs font-bold">{t.initials}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}, {t.company}</p>
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
   CTA Banner (dark)
   ═══════════════════════════════════════════════════════════════════════════ */

function CtaBanner() {
  const { ref, visible } = useInView()
  return (
    <section ref={ref} className="relative py-24 lg:py-32 bg-[#0a0e1a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600/20 via-[#0f1629] to-violet-600/20 border border-white/[0.08] p-12 md:p-16 text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 w-48 h-48 bg-blue-500/[0.08] rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 bg-white/[0.06] backdrop-blur-sm border border-white/[0.1] text-indigo-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
              <Sparkles size={14} />
              14-day free trial, no credit card
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Ready to Transform Your<br />Financing Operations?
            </h2>
            <p className="text-lg text-slate-400 max-w-xl mx-auto mb-8">Join 500+ finance teams already using Balji to close more deals, faster.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={`${PORTAL}/register`}
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-8 py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                Start Free Trial
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a href={`${PORTAL}/login`} className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-400 font-medium text-sm transition-colors duration-300">
                Login to Dashboard
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Footer — Dark
   ═══════════════════════════════════════════════════════════════════════════ */

function Footer() {
  const columns = [
    { title: 'Product', links: ['Auto Dialer', 'CRM Pipeline', 'Analytics', 'AI Insights', 'Mobile App'] },
    { title: 'Company', links: ['About', 'Careers', 'Blog', 'Press', 'Partners'] },
    { title: 'Resources', links: ['Documentation', 'API Reference', 'Status Page', 'Changelog', 'Community'] },
    { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR', 'Security'] },
  ]

  return (
    <footer className="relative bg-[#060a14] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-6 gap-12 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/balji-logo.svg" alt="Balji" className="h-8" />
            </div>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              The all-in-one CPaaS and CRM platform built for modern revenue-based financing teams.
            </p>
          </div>
          {columns.map(col => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(l => (
                  <li key={l}><a href="#" className="text-sm text-slate-500 hover:text-indigo-400 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} Balji. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-indigo-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Cookies</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Export
   ═══════════════════════════════════════════════════════════════════════════ */

export function LandingPageBalji() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => { document.documentElement.style.scrollBehavior = '' }
  }, [])

  return (
    <div className="relative min-h-screen bg-[#0a0e1a] text-white overflow-x-hidden">
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