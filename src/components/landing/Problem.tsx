import { motion } from 'framer-motion'
import {
  Monitor, Smartphone, DollarSign, Download,
  ShieldAlert, Clock, LayoutDashboard, Smartphone as MobileIcon,
  CreditCard, BadgeDollarSign, ArrowRight,
} from 'lucide-react'

const rows = [
  {
    old: { icon: Monitor, text: 'Agents stuck at desks with desktop softphones' },
    new: { icon: Smartphone, text: 'Agents dial campaigns from anywhere on mobile' },
  },
  {
    old: { icon: DollarSign, text: 'Expensive desktop softphone setups and hardware' },
    new: { icon: Download, text: 'Just download the app and start dialing' },
  },
  {
    old: { icon: ShieldAlert, text: 'VPNs, IT tickets, hardware provisioning' },
    new: { icon: Clock, text: 'Login and dial in 30 seconds' },
  },
  {
    old: { icon: LayoutDashboard, text: 'Separate CRM and dialer tools that don\u2019t talk' },
    new: { icon: MobileIcon, text: 'CRM + dialer unified in one mobile app' },
  },
  {
    old: { icon: CreditCard, text: 'Per-seat desktop licenses that add up fast' },
    new: { icon: BadgeDollarSign, text: 'Start at $29.99/user/month \u2014 everything included' },
  },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
}

export default function Problem() {
  return (
    <section
      className="py-24 sm:py-32 relative"
      style={{ backgroundColor: '#0A1628' }}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const }}
          className="text-center max-w-[720px] mx-auto mb-16"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold mb-6 uppercase tracking-wider"
            style={{
              border: '1px solid rgba(239, 68, 68, 0.2)',
              backgroundColor: 'rgba(239, 68, 68, 0.06)',
              color: '#F87171',
            }}
          >
            The Status Quo Is Broken
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.02em] mb-5 leading-tight text-white">
            Your agents deserve better
            <br />
            than a desk phone
          </h2>
          <p className="text-base sm:text-lg leading-relaxed max-w-[560px] mx-auto" style={{ color: '#94A3B8' }}>
            Every other dialer assumes your agents are sitting at a computer.
            We built CRMLink for the way teams actually work.
          </p>
        </motion.div>

        {/* Comparison grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="max-w-[1000px] mx-auto"
        >
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 sm:gap-5 mb-4 px-1">
            <div
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'rgba(248, 113, 113, 0.5)' }}
            >
              The old way
            </div>
            <div className="w-5" />
            <div
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'rgba(27, 77, 255, 0.7)' }}
            >
              The CRMLink way
            </div>
          </div>

          {/* Comparison rows */}
          <div className="space-y-3">
            {rows.map((row, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="grid grid-cols-[1fr_auto_1fr] gap-3 sm:gap-5 items-center"
              >
                {/* Old way card */}
                <div
                  className="flex items-center gap-3 rounded-xl p-3.5 sm:p-4 group"
                  style={{
                    backgroundColor: '#0F1D32',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)' }}
                  >
                    <row.old.icon size={17} style={{ color: 'rgba(248, 113, 113, 0.6)' }} />
                  </div>
                  <span
                    className="text-[13px] sm:text-sm leading-snug line-through"
                    style={{
                      color: '#94A3B8',
                      textDecorationColor: 'rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    {row.old.text}
                  </span>
                </div>

                {/* Arrow separator */}
                <div className="flex items-center justify-center">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <ArrowRight size={12} style={{ color: '#4A5578' }} />
                  </div>
                </div>

                {/* New way card */}
                <div
                  className="flex items-center gap-3 rounded-xl p-3.5 sm:p-4"
                  style={{
                    backgroundColor: '#0F1D32',
                    border: '1px solid rgba(27, 77, 255, 0.15)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(27, 77, 255, 0.12)' }}
                  >
                    <row.new.icon size={17} style={{ color: '#00BCD4' }} />
                  </div>
                  <span className="text-[13px] sm:text-sm leading-snug font-medium text-white">
                    {row.new.text}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom accent line */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] as const }}
          className="max-w-[200px] mx-auto mt-14 h-px"
          style={{
            background: 'linear-gradient(to right, transparent, rgba(27, 77, 255, 0.3), transparent)',
          }}
        />
      </div>
    </section>
  )
}
