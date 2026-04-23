import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Phone, Zap, Users, BarChart3, Brain, Megaphone, Activity,
  ArrowRight, Check, ChevronRight, Star, Shield, Globe,
  Headphones, Clock, TrendingUp, Target, Menu, X,
  PhoneCall, UserPlus, LineChart, Quote, Sparkles,
  MousePointerClick, Layers, Send, ArrowUpRight, Cpu, Radio,
  MessageSquare, Mail, ChevronDown,
} from 'lucide-react'

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
   Animated Background — floating gradient orbs
   ═══════════════════════════════════════════════════════════════════════════ */

function AnimatedBg() {
  return (
    <div className="fixed inset-0 pointer-events-none select-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Base gradient */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(145deg, #020817 0%, #07091f 18%, #0b0e30 42%, #090c28 68%, #030714 100%)',
      }} />
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
        backgroundSize: '72px 72px',
      }} />
      {/* Floating orbs */}
      <div className="absolute w-[900px] h-[900px] rounded-full" style={{
        top: '-20%', right: '-10%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 60%)',
        filter: 'blur(100px)',
        animation: 'orbFloat1 20s ease-in-out infinite',
      }} />
      <div className="absolute w-[700px] h-[700px] rounded-full" style={{
        bottom: '10%', left: '-15%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 60%)',
        filter: 'blur(80px)',
        animation: 'orbFloat2 25s ease-in-out infinite',
      }} />
      <div className="absolute w-[500px] h-[500px] rounded-full" style={{
        top: '40%', left: '40%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 55%)',
        filter: 'blur(60px)',
        animation: 'orbFloat3 18s ease-in-out infinite',
      }} />
      <div className="absolute w-[300px] h-[300px] rounded-full" style={{
        top: '15%', left: '20%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 55%)',
        filter: 'blur(50px)',
        animation: 'orbFloat2 22s ease-in-out infinite reverse',
      }} />
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Navbar — sticky glassmorphism with smooth scroll links
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
    { label: 'Product', href: '#product' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Testimonials', href: '#testimonials' },
  ]

  const scrollTo = useCallback((href: string) => {
    setMobileOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#070a1f]/70 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_4px_30px_rgba(0,0,0,0.3)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 group" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #a78bfa 100%)',
                boxShadow: '0 0 20px rgba(99,102,241,0.35)',
              }}
            >
              <Phone size={17} className="text-white" />
            </div>
            <span className="text-xl font-extrabold bg-gradient-to-r from-white via-white to-slate-300 bg-clip-text text-transparent tracking-tight">
              DialerCRM
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <button
                key={l.label}
                onClick={() => scrollTo(l.href)}
                className="px-4 py-2 text-[13px] font-medium text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]"
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-5 py-2 text-[13px] font-medium text-slate-300 hover:text-white transition-all rounded-xl border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="group px-5 py-2.5 text-[13px] font-semibold text-white rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(99,102,241,0.5)]"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow: '0 4px 20px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-slate-400 hover:text-white">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-[#070a1f]/95 backdrop-blur-2xl border-t border-white/[0.06] pb-6">
          <div className="px-5 pt-4 space-y-1">
            {navLinks.map(l => (
              <button
                key={l.label}
                onClick={() => scrollTo(l.href)}
                className="block w-full text-left px-4 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-lg"
              >
                {l.label}
              </button>
            ))}
            <div className="pt-4 flex flex-col gap-3">
              <Link to="/login" className="text-center px-4 py-2.5 text-sm font-medium text-slate-300 border border-white/10 rounded-xl hover:bg-white/[0.04]">
                Login
              </Link>
              <Link to="/register" className="text-center px-4 py-2.5 text-sm font-semibold text-white rounded-xl"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Hero Section — with animated dashboard preview
   ═══════════════════════════════════════════════════════════════════════════ */

function Hero() {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setLoaded(true)) }, [])

  return (
    <section className="relative pt-28 pb-8 sm:pt-36 sm:pb-12 overflow-hidden">
      <div className="relative max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center max-w-[820px] mx-auto">
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border border-indigo-500/20 bg-indigo-500/[0.07] text-indigo-300 transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400" />
            </span>
            AI-Powered Contact Center Platform
          </div>

          {/* Headline */}
          <h1 className={`text-[2.5rem] sm:text-[3.25rem] lg:text-[4.25rem] font-extrabold tracking-[-0.03em] leading-[1.08] mb-6 transition-all duration-700 delay-100 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-transparent">
              All-in-One Dialer + CRM
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-sky-400 bg-clip-text text-transparent">
              for High-Performance Teams
            </span>
          </h1>

          {/* Subheading */}
          <p className={`text-base sm:text-lg text-slate-400 max-w-[600px] mx-auto mb-10 leading-relaxed transition-all duration-700 delay-200 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Supercharge your sales team with predictive dialing, intelligent lead management,
            real-time analytics, and AI-powered insights &mdash; all in one platform.
          </p>

          {/* CTA buttons */}
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 transition-all duration-700 delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <Link
              to="/register"
              className="group relative flex items-center gap-2.5 px-8 py-[14px] text-[15px] font-semibold text-white rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(99,102,241,0.45)] overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 8px 32px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.12) 55%, transparent 60%)', backgroundSize: '200% 100%', animation: 'btnShimmer 1.5s ease-in-out infinite' }} />
              <span className="relative">Get Started Free</span>
              <ArrowRight size={18} className="relative transition-transform group-hover:translate-x-1" />
            </Link>
            <button
              onClick={() => document.querySelector('#product')?.scrollIntoView({ behavior: 'smooth' })}
              className="group flex items-center gap-2.5 px-8 py-[14px] text-[15px] font-medium text-slate-300 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-300"
            >
              <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                <MousePointerClick size={15} className="text-indigo-400" />
              </div>
              See It In Action
            </button>
          </div>

          {/* Trust badges */}
          <div className={`flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[11px] font-medium text-slate-500 mb-14 transition-all duration-700 delay-[400ms] ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {[
              { icon: Shield, label: 'SOC 2 Compliant', clr: 'text-emerald-400' },
              { icon: Globe, label: '99.99% Uptime', clr: 'text-blue-400' },
              { icon: Headphones, label: '24/7 Support', clr: 'text-purple-400' },
              { icon: Clock, label: '2-Min Setup', clr: 'text-amber-400' },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-1.5">
                <b.icon size={13} className={b.clr} />
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className={`relative max-w-[1080px] mx-auto transition-all duration-1000 delay-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          {/* Glow */}
          <div className="absolute -inset-8 rounded-[40px] opacity-50" style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.18) 0%, transparent 65%)',
            filter: 'blur(50px)',
          }} />

          <div className="relative rounded-2xl sm:rounded-[20px] overflow-hidden border border-white/[0.08]"
            style={{ boxShadow: '0 50px 100px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}>
            {/* Browser chrome */}
            <div className="bg-[#0c1029]/90 backdrop-blur-sm border-b border-white/[0.06] px-4 py-2.5 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]" />
                <div className="w-[10px] h-[10px] rounded-full bg-[#febc2e]" />
                <div className="w-[10px] h-[10px] rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 mx-12">
                <div className="bg-white/[0.05] rounded-lg px-4 py-1.5 text-[11px] text-slate-500 text-center max-w-sm mx-auto flex items-center justify-center gap-2">
                  <Shield size={10} className="text-emerald-400/70" />
                  app.dialercrm.com/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard mock */}
            <div className="bg-gradient-to-b from-[#0a0e26] to-[#080c1e] p-3 sm:p-5">
              {/* Sidebar + Content */}
              <div className="flex gap-3">
                {/* Mini sidebar */}
                <div className="hidden sm:flex flex-col w-[180px] shrink-0 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 gap-1">
                  <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                      <Phone size={9} className="text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-white/80">DialerCRM</span>
                  </div>
                  {[
                    { l: 'Dashboard', active: true },
                    { l: 'Campaigns' },
                    { l: 'Leads' },
                    { l: 'Dialer' },
                    { l: 'Analytics' },
                    { l: 'Team' },
                  ].map(item => (
                    <div key={item.l} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${item.active ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-600 hover:text-slate-400'}`}>
                      {item.l}
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="flex-1 space-y-3">
                  {/* Stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'Active Calls', value: '247', color: 'from-indigo-500 to-purple-500', pct: '+12.5%', icon: PhoneCall },
                      { label: 'Leads Today', value: '1,834', color: 'from-blue-500 to-cyan-500', pct: '+8.3%', icon: Users },
                      { label: 'Conversion', value: '34.7%', color: 'from-emerald-500 to-teal-500', pct: '+2.1%', icon: TrendingUp },
                      { label: 'Revenue', value: '$48.2K', color: 'from-amber-500 to-orange-500', pct: '+15.7%', icon: Target },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                            <s.icon size={12} className="text-white" />
                          </div>
                          <span className="text-[9px] font-semibold text-emerald-400/90 bg-emerald-400/[0.08] px-1.5 py-0.5 rounded">{s.pct}</span>
                        </div>
                        <div className="text-base sm:text-lg font-bold text-white">{s.value}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Chart + Call log */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2 rounded-xl bg-white/[0.025] border border-white/[0.05] p-3.5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-[10px] font-semibold text-white/70">Revenue Overview</div>
                        <div className="flex gap-1">
                          {['1D', '1W', '1M'].map(p => (
                            <div key={p} className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${p === '1W' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-600'}`}>{p}</div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-end gap-[3px] h-20 sm:h-28">
                        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 50, 72, 82, 68, 92, 78, 86, 70, 94, 80].map((h, i) => (
                          <div key={i} className="flex-1 rounded-t-sm" style={{
                            height: `${h}%`,
                            background: `linear-gradient(180deg, rgba(99,102,241,${0.5 + h / 200}) 0%, rgba(99,102,241,0.06) 100%)`,
                            animation: loaded ? `barGrow 0.8s ease-out ${0.8 + i * 0.03}s both` : 'none',
                          }} />
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/[0.025] border border-white/[0.05] p-3.5">
                      <div className="text-[10px] font-semibold text-white/70 mb-3">Live Calls</div>
                      {[
                        { name: 'Sarah M.', status: 'Connected', clr: 'bg-emerald-400' },
                        { name: 'James K.', status: 'Ringing', clr: 'bg-amber-400' },
                        { name: 'Lisa W.', status: 'Completed', clr: 'bg-blue-400' },
                        { name: 'Mark D.', status: 'Connected', clr: 'bg-emerald-400' },
                        { name: 'Amy R.', status: 'Queue', clr: 'bg-slate-500' },
                      ].map((c, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-[7px] font-bold text-indigo-300">
                              {c.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-[10px] text-slate-400">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${c.clr}`} />
                            <span className="text-[8px] text-slate-500">{c.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reflection gradient */}
          <div className="absolute -bottom-1 left-[10%] right-[10%] h-40 opacity-30" style={{
            background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 70%)',
            filter: 'blur(30px)',
          }} />
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Stats Bar — animated counters
   ═══════════════════════════════════════════════════════════════════════════ */

function StatsBar() {
  const { ref, visible } = useInView()
  const teams = useCounter(500, visible)
  const calls = useCounter(12, visible, 1500)
  const uptime = useCounter(99, visible, 1800)
  const countries = useCounter(45, visible, 1200)

  return (
    <section ref={ref} className="py-16 relative">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 sm:p-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              { val: `${teams}+`, label: 'Sales Teams', sub: 'Trust DialerCRM', icon: Users, clr: 'text-indigo-400' },
              { val: `${calls}M+`, label: 'Calls Made', sub: 'Every month', icon: PhoneCall, clr: 'text-blue-400' },
              { val: `${uptime}.99%`, label: 'Uptime SLA', sub: 'Guaranteed', icon: Activity, clr: 'text-emerald-400' },
              { val: `${countries}+`, label: 'Countries', sub: 'Worldwide', icon: Globe, clr: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center ${s.clr}`}>
                    <s.icon size={18} />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{s.val}</div>
                    <div className="text-[11px] text-slate-500">{s.label} &middot; {s.sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Logo Bar
   ═══════════════════════════════════════════════════════════════════════════ */

function LogoBar() {
  const { ref, visible } = useInView()
  return (
    <section ref={ref} className={`py-12 transition-all duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8">
        <p className="text-center text-[11px] font-semibold text-slate-600 uppercase tracking-[0.25em] mb-8">
          Trusted by industry leaders
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {['TechFlow', 'SalesForce Pro', 'CallHub', 'DataPulse', 'CloudVox', 'NetReach', 'VoxConnect'].map(name => (
            <div key={name} className="text-slate-600/50 font-bold text-lg tracking-tight hover:text-slate-400 transition-all duration-300 cursor-default">
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Features — premium glass cards with icon glow
   ═══════════════════════════════════════════════════════════════════════════ */

const features = [
  {
    icon: Zap, title: 'Auto Dialer',
    desc: 'Predictive, progressive, and preview dialing modes. Maximize agent talk time with intelligent call pacing.',
    gradient: 'from-amber-500 to-orange-500', glow: 'rgba(245,158,11,0.12)',
  },
  {
    icon: Users, title: 'Lead Management',
    desc: 'Full CRM pipeline with custom fields, lead scoring, and automated assignment rules.',
    gradient: 'from-blue-500 to-cyan-500', glow: 'rgba(59,130,246,0.12)',
  },
  {
    icon: PhoneCall, title: 'Call Tracking',
    desc: 'Every call recorded, logged, and analyzed. Disposition tracking with custom outcomes.',
    gradient: 'from-emerald-500 to-teal-500', glow: 'rgba(16,185,129,0.12)',
  },
  {
    icon: Brain, title: 'AI Insights',
    desc: 'Real-time sentiment analysis, call scoring, and intelligent coaching suggestions powered by AI.',
    gradient: 'from-purple-500 to-pink-500', glow: 'rgba(147,51,234,0.12)',
  },
  {
    icon: Megaphone, title: 'Campaign Management',
    desc: 'Multi-channel campaigns with list management, scheduling, and compliance tools built-in.',
    gradient: 'from-indigo-500 to-violet-500', glow: 'rgba(99,102,241,0.12)',
  },
  {
    icon: Activity, title: 'Real-time Analytics',
    desc: 'Live dashboards, agent monitoring, and performance metrics updated every second.',
    gradient: 'from-rose-500 to-red-500', glow: 'rgba(244,63,94,0.12)',
  },
]

function Features() {
  const { ref, visible } = useInView()
  return (
    <section id="features" className="py-24 sm:py-32 relative">
      <div ref={ref} className="relative max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className={`text-center max-w-[600px] mx-auto mb-14 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-semibold mb-5 border border-indigo-500/20 bg-indigo-500/[0.06] text-indigo-400 uppercase tracking-wider">
            <Layers size={12} />
            Features
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.02em] mb-4 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent leading-tight">
            Everything You Need to Close More Deals
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            A complete toolkit designed for modern sales teams that demand performance.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`group relative rounded-2xl p-6 border border-white/[0.06] bg-white/[0.015] transition-all duration-500 hover:bg-white/[0.04] hover:border-white/[0.1] hover:-translate-y-1 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 80}ms`, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle at 30% 20%, ${f.glow} 0%, transparent 60%)` }} />

              <div className="relative">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-5 transition-all duration-300 group-hover:shadow-lg`}
                  style={{ boxShadow: `0 6px 20px ${f.glow}` }}>
                  <f.icon size={22} className="text-white" />
                </div>
                <h3 className="text-base font-bold text-white mb-2 tracking-tight">{f.title}</h3>
                <p className="text-[13px] text-slate-400 leading-relaxed">{f.desc}</p>
                <div className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Learn more <ArrowUpRight size={13} />
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
   Product Preview — tabbed interactive showcase
   ═══════════════════════════════════════════════════════════════════════════ */

function ProductPreview() {
  const { ref, visible } = useInView()
  const [tab, setTab] = useState(0)
  const tabs = [
    { label: 'Dashboard', icon: BarChart3 },
    { label: 'Pipeline', icon: TrendingUp },
    { label: 'Dialer', icon: Phone },
  ]

  return (
    <section id="product" className="py-24 sm:py-32 relative">
      <div ref={ref} className="relative max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className={`text-center max-w-[600px] mx-auto mb-12 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-semibold mb-5 border border-purple-500/20 bg-purple-500/[0.06] text-purple-400 uppercase tracking-wider">
            <Cpu size={12} />
            Product
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.02em] mb-4 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent leading-tight">
            Built for Speed and Scale
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            A beautifully crafted workspace that your team will actually enjoy using.
          </p>
        </div>

        {/* Tabs */}
        <div className={`flex justify-center gap-2 mb-8 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {tabs.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setTab(i)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 ${
                tab === i
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/[0.06]'
              }`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Preview card */}
        <div className={`relative transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="absolute -inset-6 rounded-[36px] opacity-40" style={{
            background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.1) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }} />

          <div className="relative rounded-2xl sm:rounded-[20px] overflow-hidden border border-white/[0.08]"
            style={{ boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5)' }}>
            <div className="bg-gradient-to-b from-[#0a0e26] to-[#080c1e] p-5 sm:p-7">
              {/* Tab: Dashboard */}
              {tab === 0 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Total Calls', val: '12,847', icon: PhoneCall, ch: '+18%', clr: 'from-indigo-500 to-purple-500' },
                      { label: 'Active Agents', val: '64', icon: Users, ch: '98% online', clr: 'from-emerald-500 to-teal-500' },
                      { label: 'Avg Handle Time', val: '4m 23s', icon: Clock, ch: '-12s', clr: 'from-blue-500 to-cyan-500' },
                      { label: 'Deals Won', val: '$2.4M', icon: Target, ch: '+24%', clr: 'from-amber-500 to-orange-500' },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.clr} flex items-center justify-center`}>
                            <s.icon size={16} className="text-white" />
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-400">{s.ch}</span>
                        </div>
                        <div className="text-xl font-bold text-white">{s.val}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl bg-white/[0.025] border border-white/[0.05] p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm font-semibold text-white">Revenue Overview</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Monthly performance breakdown</div>
                      </div>
                    </div>
                    <div className="flex items-end gap-1.5 h-32 sm:h-40">
                      {[30, 45, 35, 60, 48, 72, 55, 80, 65, 90, 75, 95].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full rounded-t-md" style={{
                            height: `${h}%`,
                            background: i === 11
                              ? 'linear-gradient(180deg, #818cf8 0%, #6366f1 100%)'
                              : `linear-gradient(180deg, rgba(99,102,241,${0.3 + h / 300}) 0%, rgba(99,102,241,0.05) 100%)`,
                          }} />
                          <span className="text-[8px] text-slate-600">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Pipeline */}
              {tab === 1 && (
                <div className="animate-fadeIn">
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {[
                      { stage: 'New Leads', count: 42, clr: 'bg-blue-500' },
                      { stage: 'Contacted', count: 28, clr: 'bg-indigo-500' },
                      { stage: 'Qualified', count: 15, clr: 'bg-purple-500' },
                      { stage: 'Proposal', count: 8, clr: 'bg-amber-500' },
                      { stage: 'Won', count: 12, clr: 'bg-emerald-500' },
                    ].map(col => (
                      <div key={col.stage} className="flex-shrink-0 w-[200px] rounded-xl bg-white/[0.025] border border-white/[0.05] p-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${col.clr}`} />
                            <span className="text-[11px] font-semibold text-white">{col.stage}</span>
                          </div>
                          <span className="text-[10px] font-medium text-slate-500 bg-white/[0.06] px-2 py-0.5 rounded-full">{col.count}</span>
                        </div>
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, j) => (
                            <div key={j} className="rounded-lg bg-white/[0.04] border border-white/[0.04] p-2.5">
                              <div className="h-2 w-20 rounded bg-white/10 mb-2" />
                              <div className="h-1.5 w-14 rounded bg-white/[0.06]" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: Dialer */}
              {tab === 2 && (
                <div className="grid md:grid-cols-2 gap-4 animate-fadeIn">
                  <div className="rounded-xl bg-white/[0.025] border border-white/[0.05] p-5">
                    <div className="text-sm font-semibold text-white mb-4">Active Session</div>
                    <div className="space-y-2">
                      {[
                        { name: 'Michael Chen', duration: '03:42', status: 'On Call', dot: 'bg-emerald-400' },
                        { name: 'Jessica Park', duration: '01:18', status: 'Ringing', dot: 'bg-amber-400' },
                        { name: 'David Kim', duration: '—', status: 'Queue', dot: 'bg-slate-400' },
                        { name: 'Rachel Green', duration: '05:11', status: 'On Call', dot: 'bg-emerald-400' },
                      ].map((a, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.03] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                              {a.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="text-xs font-medium text-white">{a.name}</div>
                              <div className="text-[10px] text-slate-500">{a.duration}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
                            <span className="text-[10px] text-slate-400">{a.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.025] border border-white/[0.05] p-5">
                    <div className="text-sm font-semibold text-white mb-4">Campaign Progress</div>
                    <div className="space-y-4">
                      {[
                        { label: 'Progress', pct: 67, clr: 'bg-indigo-500' },
                        { label: 'Contact Rate', pct: 42, clr: 'bg-emerald-500' },
                        { label: 'Conversion', pct: 18, clr: 'bg-amber-500' },
                      ].map(p => (
                        <div key={p.label}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-slate-400">{p.label}</span>
                            <span className="text-white font-semibold">{p.pct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/[0.06]">
                            <div className={`h-2 rounded-full ${p.clr} transition-all duration-1000`} style={{ width: `${p.pct}%` }} />
                          </div>
                        </div>
                      ))}
                      <div className="pt-3 mt-3 border-t border-white/[0.06]">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {[
                            { val: '2,847', label: 'Total Calls' },
                            { val: '1,192', label: 'Reached' },
                            { val: '214', label: 'Converted' },
                          ].map(s => (
                            <div key={s.label}>
                              <div className="text-lg font-bold text-white">{s.val}</div>
                              <div className="text-[10px] text-slate-500">{s.label}</div>
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
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   How It Works — connected steps
   ═══════════════════════════════════════════════════════════════════════════ */

const steps = [
  { icon: UserPlus, title: 'Add Leads', desc: 'Import leads from CSV, API, or web forms. Auto-deduplicate and enrich data.', gradient: 'from-blue-500 to-cyan-500' },
  { icon: PhoneCall, title: 'Start Dialing', desc: 'Launch predictive campaigns. AI paces calls to maximize live connections.', gradient: 'from-indigo-500 to-purple-500' },
  { icon: LineChart, title: 'Track Performance', desc: 'Real-time dashboards show every metric. Coach agents with AI insights.', gradient: 'from-emerald-500 to-teal-500' },
  { icon: Target, title: 'Close Deals', desc: 'Move leads through your pipeline. Automated follow-ups seal every deal.', gradient: 'from-amber-500 to-orange-500' },
]

function HowItWorks() {
  const { ref, visible } = useInView()
  return (
    <section className="py-24 sm:py-32 relative">
      <div ref={ref} className="relative max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className={`text-center max-w-[600px] mx-auto mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-semibold mb-5 border border-sky-500/20 bg-sky-500/[0.06] text-sky-400 uppercase tracking-wider">
            <Radio size={12} />
            How It Works
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.02em] mb-4 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent leading-tight">
            From Lead to Close in 4 Steps
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Get up and running in minutes, not months.
          </p>
        </div>

        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-[52px] left-[12%] right-[12%] h-px" style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.2) 20%, rgba(139,92,246,0.2) 80%, transparent 100%)',
          }} />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div
                key={s.title}
                className={`relative text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div className="relative inline-flex mb-5">
                  <div className={`w-[88px] h-[88px] rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-xl transition-transform duration-300 hover:scale-105`}
                    style={{ boxShadow: `0 12px 40px rgba(99,102,241,0.2)` }}>
                    <s.icon size={32} className="text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#0a0e26] border-2 border-indigo-500 flex items-center justify-center text-[11px] font-extrabold text-indigo-400">
                    {i + 1}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 tracking-tight">{s.title}</h3>
                <p className="text-[13px] text-slate-400 leading-relaxed max-w-[220px] mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Pricing — 4 plans with feature comparison
   ═══════════════════════════════════════════════════════════════════════════ */

const plans = [
  {
    name: 'Starter', price: '$49', period: '/mo',
    desc: 'For small teams getting started with outbound calling.',
    features: ['Up to 5 agents', '1,000 calls/month', 'Basic CRM', 'Call recording', 'Email support'],
    cta: 'Start Free Trial', highlighted: false,
  },
  {
    name: 'Growth', price: '$99', period: '/mo',
    desc: 'Scale your outreach with advanced dialing and CRM.',
    features: ['Up to 25 agents', '10,000 calls/month', 'Full CRM pipeline', 'Predictive dialer', 'API access', 'Priority support'],
    cta: 'Start Free Trial', highlighted: false,
  },
  {
    name: 'Pro', price: '$199', period: '/mo',
    desc: 'The complete platform for high-performance teams.',
    features: ['Unlimited agents', 'Unlimited calls', 'AI insights & coaching', 'Custom integrations', 'Advanced analytics', 'Dedicated CSM', 'SSO & RBAC'],
    cta: 'Start Free Trial', highlighted: true,
  },
  {
    name: 'Enterprise', price: 'Custom', period: '',
    desc: 'Tailored solutions for large organizations.',
    features: ['Everything in Pro', 'On-premise option', 'Custom SLA', 'Dedicated infra', 'White-label', 'Training & onboarding', 'Compliance packages'],
    cta: 'Contact Sales', highlighted: false,
  },
]

function Pricing() {
  const { ref, visible } = useInView()
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" className="py-24 sm:py-32 relative">
      <div ref={ref} className="relative max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className={`text-center max-w-[600px] mx-auto mb-10 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-semibold mb-5 border border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400 uppercase tracking-wider">
            <Sparkles size={12} />
            Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.02em] mb-4 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent leading-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="text-slate-400 text-base sm:text-lg mb-8">
            Start free, scale as you grow. No hidden fees, no contracts.
          </p>

          {/* Annual toggle */}
          <div className="inline-flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-full px-1.5 py-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all ${!annual ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1.5 ${annual ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Annual
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-3">
          {plans.map((p, i) => {
            const displayPrice = p.price === 'Custom' ? 'Custom' : (annual ? `$${Math.round(parseInt(p.price.slice(1)) * 0.8)}` : p.price)
            return (
              <div
                key={p.name}
                className={`relative rounded-2xl transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${p.highlighted ? 'lg:-mt-4' : ''}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {p.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg whitespace-nowrap z-10"
                    style={{ boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
                    Most Popular
                  </div>
                )}

                <div className={`h-full rounded-2xl p-6 border transition-all duration-300 hover:border-white/[0.12] hover:-translate-y-1 ${
                  p.highlighted
                    ? 'border-indigo-500/30 bg-indigo-500/[0.04]'
                    : 'border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03]'
                }`}
                  style={p.highlighted ? { boxShadow: '0 0 60px rgba(99,102,241,0.08), 0 0 0 1px rgba(99,102,241,0.12)' } : {}}>
                  <h3 className="text-lg font-bold text-white mb-1">{p.name}</h3>
                  <p className="text-[11px] text-slate-500 mb-4 min-h-[28px] leading-relaxed">{p.desc}</p>

                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold text-white tracking-tight">{displayPrice}</span>
                    {p.period && <span className="text-[13px] text-slate-500">{p.period} per agent</span>}
                  </div>

                  <Link
                    to="/register"
                    className={`block text-center px-4 py-3 rounded-xl text-[13px] font-semibold transition-all duration-300 mb-6 ${
                      p.highlighted
                        ? 'text-white hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(99,102,241,0.4)]'
                        : 'text-slate-300 border border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                    }`}
                    style={p.highlighted ? {
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
                    } : {}}
                  >
                    {p.cta}
                  </Link>

                  <ul className="space-y-2.5">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px] text-slate-400">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${p.highlighted ? 'bg-indigo-500/15' : 'bg-white/[0.04]'}`}>
                          <Check size={10} className={p.highlighted ? 'text-indigo-400' : 'text-slate-500'} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>

        {/* Feature Comparison */}
        <div className={`mt-16 transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <FeatureComparison />
        </div>
      </div>
    </section>
  )
}

function FeatureComparison() {
  const [open, setOpen] = useState(false)
  const rows = [
    { feature: 'Agent Seats', vals: ['5', '25', 'Unlimited', 'Custom'] },
    { feature: 'Monthly Calls', vals: ['1,000', '10,000', 'Unlimited', 'Custom'] },
    { feature: 'Predictive Dialer', vals: [false, true, true, true] },
    { feature: 'CRM Pipeline', vals: ['Basic', 'Full', 'Full', 'Full'] },
    { feature: 'AI Coaching', vals: [false, false, true, true] },
    { feature: 'API Access', vals: [false, true, true, true] },
    { feature: 'Custom Integrations', vals: [false, false, true, true] },
    { feature: 'SSO & RBAC', vals: [false, false, true, true] },
    { feature: 'Dedicated CSM', vals: [false, false, true, true] },
    { feature: 'On-Premise Option', vals: [false, false, false, true] },
    { feature: 'White Label', vals: [false, false, false, true] },
  ]

  return (
    <div className="text-center">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-400 hover:text-white transition-colors"
      >
        Compare all features
        <ChevronDown size={16} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`overflow-hidden transition-all duration-500 ${open ? 'max-h-[800px] opacity-100 mt-8' : 'max-h-0 opacity-0'}`}>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[12px] font-semibold text-slate-400 px-5 py-3">Feature</th>
                  {['Starter', 'Growth', 'Pro', 'Enterprise'].map(n => (
                    <th key={n} className="text-center text-[12px] font-semibold text-white px-4 py-3">{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.feature} className={`border-b border-white/[0.03] ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                    <td className="text-left text-[12px] text-slate-400 px-5 py-2.5">{r.feature}</td>
                    {r.vals.map((v, j) => (
                      <td key={j} className="text-center px-4 py-2.5">
                        {typeof v === 'boolean' ? (
                          v ? <Check size={14} className="mx-auto text-emerald-400" /> : <span className="text-slate-600">&mdash;</span>
                        ) : (
                          <span className="text-[12px] text-slate-300 font-medium">{v}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Testimonials — premium quote cards
   ═══════════════════════════════════════════════════════════════════════════ */

const testimonials = [
  {
    name: 'Sarah Mitchell', role: 'VP of Sales', company: 'TechFlow',
    quote: 'DialerCRM transformed our outbound process. Our team went from 80 to 200+ calls per day with better conversion rates. The AI coaching feature is a game changer.',
    avatar: 'SM', rating: 5,
  },
  {
    name: 'James Rodriguez', role: 'Director', company: 'CallHub Solutions',
    quote: 'We evaluated 12 different platforms. DialerCRM was the only one that combined a real dialer with a CRM that our team actually wanted to use.',
    avatar: 'JR', rating: 5,
  },
  {
    name: 'Emily Chen', role: 'COO', company: 'DataPulse',
    quote: 'The real-time analytics alone paid for the platform in the first month. We identified bottlenecks we didn\'t know existed and improved conversion by 34%.',
    avatar: 'EC', rating: 5,
  },
]

function Testimonials() {
  const { ref, visible } = useInView()
  return (
    <section id="testimonials" className="py-24 sm:py-32 relative">
      <div ref={ref} className="relative max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className={`text-center max-w-[600px] mx-auto mb-14 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-semibold mb-5 border border-amber-500/20 bg-amber-500/[0.06] text-amber-400 uppercase tracking-wider">
            <MessageSquare size={12} />
            Testimonials
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.02em] mb-4 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent leading-tight">
            Loved by Sales Teams Everywhere
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Don't take our word for it &mdash; hear from teams that use DialerCRM every day.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`group relative rounded-2xl p-6 border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500 hover:-translate-y-1 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 100}ms`, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'radial-gradient(circle at 80% 20%, rgba(99,102,241,0.06) 0%, transparent 60%)' }} />

              <div className="relative">
                <Quote size={28} className="text-indigo-500/15 mb-3" />

                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={13} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>

                <p className="text-[13px] text-slate-300 leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>

                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white shadow-lg"
                    style={{ boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-white">{t.name}</div>
                    <div className="text-[11px] text-slate-500">{t.role}, {t.company}</div>
                  </div>
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
   CTA Banner — final conversion section
   ═══════════════════════════════════════════════════════════════════════════ */

function CtaBanner() {
  const { ref, visible } = useInView()
  return (
    <section ref={ref} className={`py-20 sm:py-28 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      <div className="max-w-[1080px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className="relative rounded-[28px] p-10 sm:p-16 text-center overflow-hidden border border-white/[0.08]"
          style={{
            background: 'linear-gradient(145deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 50%, rgba(59,130,246,0.07) 100%)',
            boxShadow: '0 40px 80px -20px rgba(0,0,0,0.3)',
          }}>
          {/* Glow effects */}
          <div className="absolute inset-0 pointer-events-none select-none">
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 55%)', filter: 'blur(60px)' }} />
            <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 55%)', filter: 'blur(60px)' }} />
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold mb-6 border border-indigo-500/20 bg-indigo-500/[0.08] text-indigo-300">
              <Sparkles size={12} />
              14-day free trial, no credit card
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.02em] mb-4 bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
              Ready to Transform Your Sales?
            </h2>
            <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              Join 500+ teams already using DialerCRM to close more deals, faster.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="group flex items-center gap-2.5 px-8 py-[14px] text-[15px] font-semibold text-white rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(99,102,241,0.45)]"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  boxShadow: '0 8px 32px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
              >
                Start Free Trial
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/login"
                className="flex items-center gap-2 px-8 py-[14px] text-[15px] font-medium text-slate-300 hover:text-white transition-colors"
              >
                Login to Dashboard
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Footer — comprehensive with branding
   ═══════════════════════════════════════════════════════════════════════════ */

function Footer() {
  const columns = [
    {
      title: 'Product',
      links: [
        { label: 'Auto Dialer', href: '#features' },
        { label: 'CRM Pipeline', href: '#features' },
        { label: 'Analytics', href: '#features' },
        { label: 'AI Insights', href: '#features' },
        { label: 'Integrations', href: '#features' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '#' },
        { label: 'Careers', href: '#' },
        { label: 'Blog', href: '#' },
        { label: 'Press', href: '#' },
        { label: 'Partners', href: '#' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', href: '#' },
        { label: 'API Reference', href: '#' },
        { label: 'Status Page', href: '#' },
        { label: 'Changelog', href: '#' },
        { label: 'Community', href: '#' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '#' },
        { label: 'Terms of Service', href: '#' },
        { label: 'Cookie Policy', href: '#' },
        { label: 'GDPR', href: '#' },
        { label: 'Security', href: '#' },
      ],
    },
  ]

  return (
    <footer className="border-t border-white/[0.04] pt-16 pb-8 relative">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 16px rgba(99,102,241,0.25)' }}>
                <Phone size={15} className="text-white" />
              </div>
              <span className="text-lg font-extrabold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
                DialerCRM
              </span>
            </div>
            <p className="text-[13px] text-slate-500 leading-relaxed max-w-[280px] mb-6">
              The all-in-one dialer and CRM platform built for modern sales teams that demand results.
            </p>
            {/* Social icons */}
            <div className="flex gap-2">
              {[
                { label: 'X', icon: Send },
                { label: 'Li', icon: Users },
                { label: 'Fb', icon: Globe },
                { label: 'Yt', icon: Mail },
              ].map(s => (
                <a
                  key={s.label}
                  href="#"
                  className="w-8 h-8 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.1] transition-all"
                >
                  <s.icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map(col => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.15em] mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(l => (
                  <li key={l.label}>
                    <a href={l.href} className="text-[13px] text-slate-500 hover:text-slate-300 transition-colors">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.04] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-slate-600">
            &copy; {new Date().getFullYear()} DialerCRM. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-[11px] text-slate-600">
            <a href="#" className="hover:text-slate-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Cookies</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Landing Page — composed
   ═══════════════════════════════════════════════════════════════════════════ */

export function LandingPage() {
  useEffect(() => {
    // Smooth scrolling for anchor links
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => { document.documentElement.style.scrollBehavior = '' }
  }, [])

  return (
    <div className="min-h-screen text-white overflow-x-hidden relative">
      <AnimatedBg />
      <div className="relative" style={{ zIndex: 1 }}>
        <Navbar />
        <Hero />
        <StatsBar />
        <LogoBar />
        <Features />
        <ProductPreview />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <CtaBanner />
        <Footer />
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(1.05); }
          66% { transform: translate(20px, -15px) scale(0.97); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(25px, -20px) scale(0.98); }
          66% { transform: translate(-15px, 25px) scale(1.03); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }
        @keyframes barGrow {
          from { transform: scaleY(0); transform-origin: bottom; }
          to { transform: scaleY(1); transform-origin: bottom; }
        }
        @keyframes btnShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
