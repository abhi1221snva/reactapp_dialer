import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'
import { useInView, useCounter } from './hooks'

const stats = [
  { end: 500, suffix: '+', label: 'Call centers on CRMLink' },
  { end: 50, suffix: 'M+', label: 'Calls dialed per month' },
  { end: 99, suffix: '.9%', label: 'Platform uptime' },
  { end: 30, suffix: 's', label: 'Average agent onboarding' },
]

const testimonials = [
  {
    name: 'Marcus Rivera',
    role: 'Operations Director',
    company: 'PrimeFund Capital',
    quote:
      'We moved 40 remote agents off desktop softphones and onto CRMLink mobile in a week. Connection rates went up 22%.',
    initials: 'MR',
  },
  {
    name: 'David Okafor',
    role: 'CEO',
    company: 'VoxReach BPO',
    quote:
      'The mobile dialer changed everything. Our agents work from anywhere and the CRM keeps all their data in one place.',
    initials: 'DO',
  },
  {
    name: 'Sarah Nguyen',
    role: 'VP Sales',
    company: 'MeridianLend',
    quote:
      'Our MCA brokers close deals between appointments now. The mobile dialer with CRM data on their phone changed how we operate.',
    initials: 'SN',
  },
]

function StatCounter({
  end,
  suffix,
  label,
}: {
  end: number
  suffix: string
  label: string
}) {
  const { ref, visible } = useInView()
  const val = useCounter(end, visible)

  return (
    <div ref={ref} className="text-center">
      <div
        className="text-3xl sm:text-4xl font-extrabold tracking-tight"
        style={{ color: '#1A1F36' }}
      >
        {val}
        {suffix}
      </div>
      <div
        className="text-[12px] mt-1"
        style={{ color: '#4A5578' }}
      >
        {label}
      </div>
    </div>
  )
}

export default function SocialProof() {
  return (
    <section
      id="social-proof"
      className="py-24 sm:py-32 relative"
      style={{ backgroundColor: '#F7F9FC' }}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8">
        {/* Animated counter row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl p-8 sm:p-10 mb-20"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E9F2',
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
          }}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((s) => (
              <StatCounter key={s.label} {...s} />
            ))}
          </div>
        </motion.div>

        {/* Testimonials heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2
            className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] leading-tight"
            style={{ color: '#1A1F36' }}
          >
            Trusted by teams who dial for a living
          </h2>
          <p
            className="text-sm sm:text-base mt-3 max-w-lg mx-auto"
            style={{ color: '#4A5578' }}
          >
            See why hundreds of call centers chose CRMLink as their mobile-first
            dialer platform.
          </p>
        </motion.div>

        {/* Testimonial cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{
                delay: i * 0.12,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94] as const,
              }}
              className="group relative rounded-2xl p-6 transition-all duration-500 hover:-translate-y-1"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E9F2',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              }}
            >
              <Quote size={24} className="mb-3" style={{ color: '#1B4DFF', opacity: 0.15 }} />

              {/* Star rating */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    size={13}
                    className="text-amber-400 fill-amber-400"
                  />
                ))}
              </div>

              <p
                className="text-[13px] leading-relaxed mb-6"
                style={{ color: '#1A1F36' }}
              >
                &ldquo;{t.quote}&rdquo;
              </p>

              <div
                className="flex items-center gap-3 pt-4"
                style={{ borderTop: '1px solid #E5E9F2' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #1B4DFF, #3366FF)',
                    boxShadow: '0 4px 12px rgba(27,77,255,0.25)',
                  }}
                >
                  {t.initials}
                </div>
                <div>
                  <div
                    className="text-[13px] font-semibold"
                    style={{ color: '#1A1F36' }}
                  >
                    {t.name}
                  </div>
                  <div
                    className="text-[11px]"
                    style={{ color: '#4A5578' }}
                  >
                    {t.role}, {t.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
