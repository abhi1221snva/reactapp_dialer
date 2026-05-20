/* ──────────────────────────────────────────────────────────────────────
   META / SEO suggestions (add to <head> via react-helmet or index.html):
   <title>CRMLink -- Mobile-First Dialer + Customizable CRM | CPaaS Platform</title>
   <meta name="description" content="Run dialer campaigns from your agents' phones
   with a fully customizable CRM built in. CRMLink is the mobile-first CPaaS + CRM
   platform. BYOC available." />
   ──────────────────────────────────────────────────────────────────────

   Headline variants considered:
   1. "Your Call Center, Reimagined."  <-- SELECTED -- professional, forward-looking
   2. "The first dialer that doesn't need a desk."
   3. "Run campaigns from your phone. With your own carrier."
*/

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight, Play, Check, Phone, ChevronRight,
  Wifi, Signal, Battery, Users, PhoneCall, Shield, Zap,
} from 'lucide-react'

/* -- Color tokens -------------------------------------------------------- */
const C = {
  bg: '#FFFFFF',
  bgLight: '#F7F9FC',
  surface: '#0A1628',
  surfaceMid: '#0F1D32',
  accent: '#1B4DFF',
  accentHover: '#3366FF',
  accentCyan: '#00BCD4',
  textDark: '#1A1F36',
  textBody: '#4A5578',
  textLight: '#E2E8F0',
  textMutedDark: '#94A3B8',
  textMuted: '#64748B',
  success: '#00C853',
  borderLight: '#E5E9F2',
  borderDark: 'rgba(255,255,255,0.08)',
  cardShadow: '0 4px 24px rgba(0,0,0,0.06)',
  glow: 'rgba(27,77,255,0.25)',
}

/* -- Fade-up animation variants ------------------------------------------ */
const ease = [0.25, 0.1, 0.25, 1] as const
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, delay, ease } },
})

/* -- Animated counter hook ----------------------------------------------- */
function useCounter(target: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })

  useEffect(() => {
    if (!startOnView || !inView) return
    const start = performance.now()
    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [inView, target, duration, startOnView])

  return { count, ref }
}

/* -- Waveform bar component ---------------------------------------------- */
function WaveBar({ h, delay }: { h: number; delay: number }) {
  return (
    <div
      className="w-[3px] rounded-full bg-[#1B4DFF]/70"
      style={{
        height: h,
        animation: `waveform 1.2s ease-in-out ${delay}s infinite alternate`,
      }}
    />
  )
}

/* -- Signal pulse rings -------------------------------------------------- */
function PulseRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border border-[#1B4DFF]/10"
          style={{
            width: `${280 + i * 80}px`,
            height: `${280 + i * 80}px`,
            animation: `pulseRing 3s ease-out ${i * 0.8}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

/* -- Dashboard metrics widget -------------------------------------------- */
function MetricsWidget() {
  const teams = useCounter(524, 2200)
  const calls = useCounter(12, 1800)  // will display as 1.2M+
  const uptime = useCounter(999, 2000) // will display as 99.9%

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.7, ease }}
      className="w-full max-w-[900px] mx-auto mt-12 sm:mt-16"
    >
      <div
        className="relative rounded-2xl border overflow-hidden"
        style={{
          borderColor: C.borderLight,
          background: C.bg,
          boxShadow: C.cardShadow,
        }}
      >
        <div className="rounded-2xl px-6 py-6 sm:px-8 sm:py-7">
          {/* Header */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-[#00C853] animate-pulse" />
            <span className="text-[11px] font-semibold text-[#4A5578] uppercase tracking-[0.15em]">
              Platform Performance -- Live
            </span>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Active Teams */}
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
                <Users size={14} className="text-[#1B4DFF]" />
                <span className="text-[10px] font-semibold text-[#4A5578] uppercase tracking-wider">
                  Active Teams
                </span>
              </div>
              <span ref={teams.ref} className="text-2xl sm:text-3xl font-bold text-[#1A1F36] tabular-nums">
                {teams.count}
              </span>
            </div>

            {/* Calls/Month */}
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
                <PhoneCall size={14} className="text-[#00BCD4]" />
                <span className="text-[10px] font-semibold text-[#4A5578] uppercase tracking-wider">
                  Calls/Month
                </span>
              </div>
              <span ref={calls.ref} className="text-2xl sm:text-3xl font-bold text-[#1A1F36] tabular-nums">
                1.{Math.min(calls.count, 2)}M+
              </span>
            </div>

            {/* Uptime */}
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
                <Shield size={14} className="text-[#00C853]" />
                <span className="text-[10px] font-semibold text-[#4A5578] uppercase tracking-wider">
                  Uptime
                </span>
              </div>
              <span ref={uptime.ref} className="text-2xl sm:text-3xl font-bold text-[#00C853] tabular-nums">
                {(uptime.count / 10).toFixed(1)}%
              </span>
            </div>

            {/* Agent Onboarding */}
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
                <Zap size={14} className="text-amber-500" />
                <span className="text-[10px] font-semibold text-[#4A5578] uppercase tracking-wider">
                  Agent Onboarding
                </span>
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-[#1A1F36] tabular-nums">
                30<span className="text-lg text-[#94A3B8] font-medium">s</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* -- Phone mockup with live dialer screen -------------------------------- */
function PhoneMockup() {
  const [callTime, setCallTime] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setCallTime((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const mins = String(Math.floor(callTime / 60)).padStart(2, '0')
  const secs = String(callTime % 60).padStart(2, '0')

  return (
    <div className="relative">
      {/* Pulse rings behind phone */}
      <PulseRings />

      {/* Phone glow — subtle blue on light bg */}
      <div
        className="absolute inset-0 -m-8 rounded-[60px]"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(27,77,255,0.08) 0%, transparent 60%)',
          filter: 'blur(40px)',
        }}
      />

      {/* iPhone frame */}
      <motion.div
        className="relative w-[280px] sm:w-[300px] mx-auto"
        initial={{ opacity: 0, y: 40, rotateY: -8 }}
        animate={{ opacity: 1, y: 0, rotateY: 0 }}
        transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ perspective: 1000 }}
      >
        {/* Float animation wrapper */}
        <div style={{ animation: 'phoneFloat 6s ease-in-out infinite' }}>
          {/* Device shell */}
          <div
            className="rounded-[40px] p-[3px] relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(27,77,255,0.15) 0%, rgba(0,0,0,0.08) 50%, rgba(27,77,255,0.10) 100%)',
              boxShadow: `0 25px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05), 0 0 60px rgba(27,77,255,0.06)`,
            }}
          >
            <div className="bg-[#0A1628] rounded-[38px] overflow-hidden">
              {/* Notch / Dynamic Island */}
              <div className="flex justify-center pt-3 pb-1 relative">
                <div className="w-[100px] h-[28px] bg-black rounded-full flex items-center justify-center gap-2">
                  <div className="w-[8px] h-[8px] rounded-full bg-[#0F1D32] ring-1 ring-white/10" />
                </div>
              </div>

              {/* Status bar */}
              <div className="flex items-center justify-between px-6 py-1 text-[10px] text-white/40">
                <span className="font-semibold">9:41</span>
                <div className="flex items-center gap-1.5">
                  <Signal size={10} />
                  <Wifi size={10} />
                  <Battery size={10} />
                </div>
              </div>

              {/* App screen */}
              <div className="px-4 pb-6 pt-2 min-h-[420px] sm:min-h-[460px]">
                {/* Campaign header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] text-[#1B4DFF] font-semibold tracking-wider uppercase">
                      Predictive Mode
                    </div>
                    <div className="text-[15px] font-bold text-[#E2E8F0] mt-0.5">
                      Sales Campaign Q2
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#00C853]/15 border border-[#00C853]/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />
                    <span className="text-[9px] font-semibold text-[#00C853]">LIVE</span>
                  </div>
                </div>

                {/* Active call card */}
                <div
                  className="rounded-2xl p-3.5 mb-3 border"
                  style={{
                    background: `linear-gradient(to bottom, rgba(27,77,255,0.10), rgba(27,77,255,0.03))`,
                    borderColor: 'rgba(27,77,255,0.18)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, ${C.accent}, ${C.accentCyan})`,
                        boxShadow: '0 4px 12px rgba(27,77,255,0.3)',
                      }}
                    >
                      JS
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-[#E2E8F0]">John Smith</div>
                      <div className="text-[11px] text-[#94A3B8]">Acme Corp &middot; VP Sales</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-mono font-semibold text-[#1B4DFF]">{mins}:{secs}</div>
                      <div className="text-[9px] text-[#64748B]">Connected</div>
                    </div>
                  </div>

                  {/* Audio waveform */}
                  <div className="flex items-center justify-center gap-[3px] h-6 mb-2">
                    {[12, 18, 8, 22, 14, 20, 10, 24, 16, 12, 20, 8, 18, 14, 22, 10, 16, 20, 12, 18].map((h, i) => (
                      <WaveBar key={i} h={h} delay={i * 0.05} />
                    ))}
                  </div>

                  {/* Deal value badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]">
                      <Phone size={10} className="text-[#1B4DFF]" />
                      +1 (555) 234-5678
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-amber-500/15 text-[9px] font-semibold text-amber-400">
                      $45,000 deal
                    </div>
                  </div>
                </div>

                {/* Queue */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Queue
                    </span>
                    <span className="text-[10px] text-[#64748B]/60">12 remaining</span>
                  </div>
                  {[
                    { name: 'Sarah Chen', co: 'GlobalTech', initials: 'SC' },
                    { name: 'Mike Johnson', co: 'DataFlow Inc', initials: 'MJ' },
                    { name: 'Lisa Park', co: 'Nexus Group', initials: 'LP' },
                  ].map((lead, i) => (
                    <div
                      key={lead.name}
                      className="flex items-center gap-2.5 py-2 border-b border-white/[0.04] last:border-0"
                      style={{ animation: `queueSlide 0.4s ease-out ${1.5 + i * 0.15}s both` }}
                    >
                      <div className="w-7 h-7 rounded-full bg-white/[0.05] flex items-center justify-center text-[9px] font-bold text-[#94A3B8]">
                        {lead.initials}
                      </div>
                      <div className="flex-1">
                        <div className="text-[11px] font-medium text-[#E2E8F0]">{lead.name}</div>
                        <div className="text-[9px] text-[#64748B]">{lead.co}</div>
                      </div>
                      <ChevronRight size={12} className="text-[#64748B]/60" />
                    </div>
                  ))}
                </div>

                {/* Disposition buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Not Int.', color: 'bg-red-500/12 text-red-400 border-red-500/15' },
                    { label: 'Callback', color: 'bg-amber-500/12 text-amber-400 border-amber-500/15' },
                    { label: 'Qualified', color: 'bg-[#00C853]/12 text-[#00C853] border-[#00C853]/15' },
                  ].map((d) => (
                    <div
                      key={d.label}
                      className={`text-center py-2 rounded-xl text-[10px] font-semibold border ${d.color}`}
                    >
                      {d.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Glass reflection */}
          <div
            className="absolute top-0 left-0 right-0 h-1/3 rounded-t-[40px] pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
            }}
          />
        </div>
      </motion.div>
    </div>
  )
}

/* -- Hero Section -------------------------------------------------------- */
export default function Hero() {
  return (
    <section className="relative pt-28 pb-8 sm:pt-36 sm:pb-12 lg:pt-40 lg:pb-16 overflow-hidden">
      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left column -- copy */}
          <div className="text-center lg:text-left max-w-[640px] mx-auto lg:mx-0">
            {/* Eyebrow */}
            <motion.div
              {...fadeUp(0)}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border bg-[#1B4DFF]/[0.06] text-[#1B4DFF]"
              style={{ borderColor: 'rgba(27,77,255,0.2)' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1B4DFF] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1B4DFF]" />
              </span>
              Mobile-First CPaaS + CRM
            </motion.div>

            {/* Headline */}
            <motion.h1
              {...fadeUp(0.1)}
              className="text-[2.5rem] sm:text-[3.25rem] lg:text-[4rem] font-extrabold tracking-[-0.03em] leading-[1.08] mb-4"
            >
              <span className="text-[#1A1F36]">
                Your Call Center,
              </span>
              <br />
              <span className="text-[#1A1F36]">
                Reimagined.
              </span>
            </motion.h1>

            {/* Subline in gradient blue */}
            <motion.p
              {...fadeUp(0.15)}
              className="text-xl sm:text-2xl font-extrabold tracking-tight mb-6"
              style={{
                background: 'linear-gradient(135deg, #1B4DFF, #00BCD4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Mobile-first. AI-powered. Built to scale.
            </motion.p>

            {/* Description */}
            <motion.p
              {...fadeUp(0.2)}
              className="text-base sm:text-lg text-[#4A5578] max-w-[540px] mx-auto lg:mx-0 mb-10 leading-relaxed"
            >
              CRMLink is the mobile-first CPaaS platform where agents run predictive
              dialer campaigns and manage a fully customizable CRM — all from a single app.
              No desktops required.
            </motion.p>

            {/* Dual CTA */}
            <motion.div
              {...fadeUp(0.3)}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10"
            >
              <Link
                to="/register"
                className="group relative flex items-center gap-2.5 px-8 py-[14px] text-[15px] font-semibold text-white rounded-2xl transition-all duration-300 hover:-translate-y-1 bg-[#1B4DFF] hover:bg-[#3366FF] overflow-hidden"
                style={{
                  boxShadow: `0 8px 32px rgba(27,77,255,0.25), inset 0 1px 0 rgba(255,255,255,0.12)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 20px 50px ${C.glow}, inset 0 1px 0 rgba(255,255,255,0.15)`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `0 8px 32px rgba(27,77,255,0.25), inset 0 1px 0 rgba(255,255,255,0.12)`
                }}
              >
                <span className="relative">Start Free Trial</span>
                <ArrowRight size={18} className="relative transition-transform group-hover:translate-x-1" />
              </Link>

              <button
                className="group flex items-center gap-2.5 px-8 py-[14px] text-[15px] font-medium text-[#1A1F36] rounded-2xl border border-[#E5E9F2] bg-white hover:bg-[#F7F9FC] hover:border-[#1B4DFF]/20 transition-all duration-300"
              >
                <div className="w-8 h-8 rounded-full bg-[#1B4DFF]/[0.08] flex items-center justify-center group-hover:bg-[#1B4DFF]/15 transition-colors">
                  <Play size={14} fill="currentColor" className="text-[#1B4DFF] ml-0.5" />
                </div>
                Watch Demo
              </button>
            </motion.div>

            {/* Trust strip */}
            <motion.div {...fadeUp(0.4)}>
              <p className="text-[11px] font-semibold text-[#4A5578]/60 uppercase tracking-[0.2em] mb-4">
                Trusted by 500+ call centers worldwide
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 mb-6">
                {['FastFund', 'RapidLend', 'VoxReach', 'PrimeCall', 'TrustBPO', 'ApexDial'].map((name) => (
                  <span
                    key={name}
                    className="text-[#94A3B8]/50 font-bold text-sm tracking-tight"
                  >
                    {name}
                  </span>
                ))}
              </div>

              {/* Pill row */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                {[
                  'Mobile-first dialing',
                  'Fully customizable CRM',
                  'Bring your own carrier',
                ].map((pill) => (
                  <div
                    key={pill}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border text-[11px] font-medium text-[#4A5578]"
                    style={{ borderColor: C.borderLight, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                  >
                    <Check size={12} className="text-[#1B4DFF]" />
                    {pill}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right column -- phone mockup */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <PhoneMockup />
          </div>
        </div>

        {/* Dashboard metrics widget -- below the hero grid */}
        <MetricsWidget />
      </div>
    </section>
  )
}
