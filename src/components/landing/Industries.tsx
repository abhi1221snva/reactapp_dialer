import { useRef } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign, Headphones, Building2, Shield, Landmark,
  Heart, GraduationCap, ChevronLeft, ChevronRight,
} from 'lucide-react'

const industries = [
  {
    icon: DollarSign,
    name: 'MCA & Lending',
    desc: 'Dial through funding leads at scale. Track deals from submission to funded — all from a phone.',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    glow: 'rgba(16,185,129,0.15)',
    glowBorder: 'rgba(16,185,129,0.35)',
  },
  {
    icon: Headphones,
    name: 'BPO / Call Centers',
    desc: 'Give remote agents a mobile dialer with campaign controls. No VPN, no hardware.',
    color: '#1B4DFF',
    bg: 'rgba(27,77,255,0.12)',
    glow: 'rgba(27,77,255,0.15)',
    glowBorder: 'rgba(27,77,255,0.35)',
  },
  {
    icon: Building2,
    name: 'Real Estate',
    desc: 'Agents on the road stay in the campaign. Push-to-call from lead cards between showings.',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    glow: 'rgba(245,158,11,0.15)',
    glowBorder: 'rgba(245,158,11,0.35)',
  },
  {
    icon: Shield,
    name: 'Insurance',
    desc: 'Compliance-ready outbound dialing with recording, consent tracking, and TCPA safeguards.',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.12)',
    glow: 'rgba(139,92,246,0.15)',
    glowBorder: 'rgba(139,92,246,0.35)',
  },
  {
    icon: Landmark,
    name: 'Collections',
    desc: 'Reach more debtors with predictive dialing. Disposition and schedule callbacks on the spot.',
    color: '#00BCD4',
    bg: 'rgba(0,188,212,0.12)',
    glow: 'rgba(0,188,212,0.15)',
    glowBorder: 'rgba(0,188,212,0.35)',
  },
  {
    icon: Heart,
    name: 'Healthcare',
    desc: 'HIPAA-compliant patient outreach with encrypted recordings and role-based data access.',
    color: '#EC4899',
    bg: 'rgba(236,72,153,0.12)',
    glow: 'rgba(236,72,153,0.15)',
    glowBorder: 'rgba(236,72,153,0.35)',
  },
  {
    icon: GraduationCap,
    name: 'Education',
    desc: 'Enrollment teams run campaigns from campus or home. Track every prospective student touchpoint.',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.12)',
    glow: 'rgba(249,115,22,0.15)',
    glowBorder: 'rgba(249,115,22,0.35)',
  },
]

export default function Industries() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = 320
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  return (
    <section
      id="industries"
      className="py-24 sm:py-32 relative overflow-hidden"
      style={{ background: '#0A1628' }}
    >
      {/* Ambient background glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center bottom, rgba(27,77,255,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8 relative">
        {/* Header row */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12 gap-4"
        >
          <div>
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold mb-6 uppercase tracking-widest"
              style={{
                border: '1px solid rgba(245,158,11,0.25)',
                background: 'rgba(245,158,11,0.06)',
                color: '#FBBF24',
              }}
            >
              Built For Your Industry
            </div>
            <h2
              className="text-3xl sm:text-4xl font-extrabold tracking-[-0.025em] leading-[1.15]"
              style={{ color: '#E2E8F0' }}
            >
              One Platform. Every Vertical.
            </h2>
          </div>

          {/* Scroll arrows */}
          <div className="hidden sm:flex items-center gap-2.5">
            <button
              onClick={() => scroll('left')}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: '#94A3B8',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                e.currentTarget.style.color = '#E2E8F0'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.color = '#94A3B8'
              }}
              aria-label="Scroll left"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: '#94A3B8',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                e.currentTarget.style.color = '#E2E8F0'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.color = '#94A3B8'
              }}
              aria-label="Scroll right"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>

        {/* Horizontal scrolling row */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        >
          {industries.map((ind, i) => (
            <motion.div
              key={ind.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{
                delay: i * 0.07,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94] as const,
              }}
              className="flex-shrink-0 w-[280px] sm:w-[300px] snap-start rounded-2xl p-6 group relative cursor-default transition-all duration-500 hover:-translate-y-1"
              style={{
                background: '#0F1D32',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
              }}
              whileHover={{
                borderColor: ind.glowBorder,
                boxShadow: `0 4px 30px ${ind.glow}, 0 0 60px ${ind.glow}`,
              }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 30% 20%, ${ind.glow} 0%, transparent 60%)`,
                }}
              />

              <div className="relative z-10">
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: ind.bg }}
                >
                  <ind.icon size={20} style={{ color: ind.color }} strokeWidth={1.8} />
                </div>

                {/* Name */}
                <h3
                  className="text-[15px] sm:text-base font-bold mb-2.5 tracking-tight"
                  style={{ color: '#E2E8F0' }}
                >
                  {ind.name}
                </h3>

                {/* Description */}
                <p
                  className="text-[13px] sm:text-sm leading-relaxed mb-5"
                  style={{ color: '#94A3B8' }}
                >
                  {ind.desc}
                </p>

                {/* Learn more link - visible on hover */}
                <span
                  className="text-[12px] sm:text-[13px] font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1 inline-flex items-center gap-1"
                  style={{ color: ind.color }}
                >
                  Learn more
                  <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                    &rarr;
                  </span>
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  )
}
