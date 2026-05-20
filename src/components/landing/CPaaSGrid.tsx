import { motion } from 'framer-motion'
import {
  Phone, MessageSquare, Bot, Mic, BarChart3, Users,
  GitBranch, Server,
} from 'lucide-react'

const cards = [
  {
    icon: Phone,
    title: 'Cloud PBX & SIP Trunking',
    desc: 'Enterprise-grade voice infrastructure with global number provisioning.',
    gradient: 'linear-gradient(135deg, #00BCD4, #0EA5E9)',
    glow: 'rgba(0,188,212,0.15)',
    glowBorder: 'rgba(0,188,212,0.35)',
    wide: false,
  },
  {
    icon: GitBranch,
    title: 'Inbound IVR & Call Routing',
    desc: 'Multi-level IVRs with intelligent routing by time, skills, or geography.',
    gradient: 'linear-gradient(135deg, #1B4DFF, #00BCD4)',
    glow: 'rgba(27,77,255,0.15)',
    glowBorder: 'rgba(27,77,255,0.35)',
    wide: true,
  },
  {
    icon: MessageSquare,
    title: 'SMS & MMS (10DLC)',
    desc: 'Campaign messaging with full 10DLC registration and compliance.',
    gradient: 'linear-gradient(135deg, #00C853, #10B981)',
    glow: 'rgba(0,200,83,0.15)',
    glowBorder: 'rgba(0,200,83,0.35)',
    wide: false,
  },
  {
    icon: Server,
    title: 'WhatsApp Business API',
    desc: 'Two-way WhatsApp with template management and automation.',
    gradient: 'linear-gradient(135deg, #10B981, #059669)',
    glow: 'rgba(16,185,129,0.15)',
    glowBorder: 'rgba(16,185,129,0.35)',
    wide: false,
  },
  {
    icon: Bot,
    title: 'Voice AI / AI Receptionist',
    desc: 'Intelligent voice agents that qualify leads and handle calls 24/7.',
    gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
    glow: 'rgba(139,92,246,0.15)',
    glowBorder: 'rgba(139,92,246,0.35)',
    wide: true,
  },
  {
    icon: Mic,
    title: 'Call Recording & Transcription',
    desc: 'Every call recorded and transcribed with searchable archives.',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
    glow: 'rgba(245,158,11,0.15)',
    glowBorder: 'rgba(245,158,11,0.35)',
    wide: false,
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics & Wallboards',
    desc: 'Live dashboards with agent monitoring and campaign metrics.',
    gradient: 'linear-gradient(135deg, #1B4DFF, #3B82F6)',
    glow: 'rgba(27,77,255,0.15)',
    glowBorder: 'rgba(27,77,255,0.35)',
    wide: false,
  },
  {
    icon: Users,
    title: 'Multi-tenant / White-label',
    desc: 'Run your own branded platform with isolated data and custom domains.',
    gradient: 'linear-gradient(135deg, #F43F5E, #EC4899)',
    glow: 'rgba(244,63,94,0.15)',
    glowBorder: 'rgba(244,63,94,0.35)',
    wide: false,
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
}

export default function CPaaSGrid() {
  return (
    <section
      id="features"
      className="py-24 sm:py-32 relative"
      style={{ background: '#0A1628' }}
    >
      {/* Subtle top gradient bleed */}
      <div
        className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(27,77,255,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          className="text-center max-w-[720px] mx-auto mb-16"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold mb-6 uppercase tracking-widest"
            style={{
              border: '1px solid rgba(27,77,255,0.25)',
              background: 'rgba(27,77,255,0.06)',
              color: '#6B8AFF',
            }}
          >
            Full Platform Capabilities
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.025em] mb-5 leading-[1.15]"
            style={{ color: '#E2E8F0' }}
          >
            Voice, SMS, AI — one platform, every channel
          </h2>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#94A3B8' }}>
            Everything a modern call center needs, built into a single platform
            you can brand as your own.
          </p>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {cards.map((c) => (
            <motion.div
              key={c.title}
              variants={cardVariants}
              className={`group relative rounded-2xl p-6 sm:p-7 transition-all duration-500 hover:-translate-y-1 cursor-default ${
                c.wide ? 'sm:col-span-2 lg:col-span-2' : ''
              }`}
              style={{
                background: '#0F1D32',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
              }}
              whileHover={{
                borderColor: c.glowBorder,
                boxShadow: `0 4px 30px ${c.glow}, 0 0 60px ${c.glow}`,
              }}
            >
              {/* Hover radial glow overlay */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 25% 15%, ${c.glow} 0%, transparent 55%)`,
                }}
              />

              <div className="relative z-10">
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: c.gradient,
                    boxShadow: `0 8px 24px ${c.glow}`,
                  }}
                >
                  <c.icon size={22} className="text-white" strokeWidth={1.8} />
                </div>

                {/* Title */}
                <h3
                  className="text-[15px] sm:text-base font-bold mb-2.5 tracking-tight"
                  style={{ color: '#E2E8F0' }}
                >
                  {c.title}
                </h3>

                {/* Description */}
                <p
                  className="text-[13px] sm:text-sm leading-relaxed"
                  style={{ color: '#94A3B8' }}
                >
                  {c.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
