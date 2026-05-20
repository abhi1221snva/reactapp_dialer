import { motion } from 'framer-motion'
import { Check, Phone, LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'

const plans = [
  {
    name: 'Phone',
    price: '$29.99',
    period: '/user/month',
    icon: Phone,
    desc: 'Everything you need to run dialer campaigns from any device.',
    features: [
      'Unlimited US calling*',
      'Mobile + desktop dialer app',
      'Predictive, progressive, preview modes',
      'Call recording & monitoring',
      'Real-time analytics',
      'BYOC option included',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Phone + CRM',
    price: '$39.99',
    period: '/user/month',
    icon: LayoutDashboard,
    desc: 'Full dialer plus a customizable CRM built for high-volume teams.',
    features: [
      'Everything in Phone plan',
      'Full customizable CRM',
      'Custom pipelines & fields',
      'Workflow automation',
      'Lead management & scoring',
      'REST API & webhooks',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
]

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="py-24 sm:py-32 relative"
      style={{ backgroundColor: '#0A1628' }}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8">
        {/* BYOC callout strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-4"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold mb-8"
            style={{
              border: '1px solid rgba(27,77,255,0.25)',
              backgroundColor: 'rgba(27,77,255,0.08)',
              color: '#6B8AFF',
            }}
          >
            <Check size={14} />
            All plans include mobile dialer + BYOC at no extra cost.
          </div>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-[600px] mx-auto mb-14"
        >
          <h2
            className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.02em] mb-4 leading-tight"
            style={{ color: '#E2E8F0' }}
          >
            Simple, transparent pricing
          </h2>
          <p
            className="text-base sm:text-lg"
            style={{ color: '#94A3B8' }}
          >
            Start free, scale as you grow. No hidden fees, no contracts.
          </p>
        </motion.div>

        {/* Cards — 2-column layout */}
        <div className="grid sm:grid-cols-2 gap-5 max-w-[780px] mx-auto">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{
                delay: i * 0.12,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94] as const,
              }}
              className={`relative rounded-2xl ${p.highlighted ? 'sm:-mt-4 sm:-mb-4' : ''}`}
            >
              {p.highlighted && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white whitespace-nowrap z-10"
                  style={{
                    backgroundColor: '#1B4DFF',
                    boxShadow: '0 4px 20px rgba(27,77,255,0.4)',
                  }}
                >
                  Most Popular
                </div>
              )}

              <div
                className="h-full rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1"
                style={{
                  backgroundColor: '#0F1D32',
                  border: p.highlighted
                    ? '1px solid rgba(27,77,255,0.35)'
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: p.highlighted
                    ? '0 0 60px rgba(27,77,255,0.08), 0 0 0 1px rgba(27,77,255,0.15)'
                    : 'none',
                }}
              >
                {/* Plan icon + name */}
                <div className="flex items-center gap-2.5 mb-1">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: p.highlighted
                        ? 'rgba(27,77,255,0.15)'
                        : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <p.icon
                      size={16}
                      style={{
                        color: p.highlighted ? '#1B4DFF' : '#94A3B8',
                      }}
                    />
                  </div>
                  <h3
                    className="text-lg font-bold"
                    style={{ color: '#FFFFFF' }}
                  >
                    {p.name}
                  </h3>
                </div>

                <p
                  className="text-[11px] mb-5 leading-relaxed"
                  style={{ color: '#94A3B8' }}
                >
                  {p.desc}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-6">
                  <span
                    className="text-4xl font-extrabold tracking-tight"
                    style={{ color: '#FFFFFF' }}
                  >
                    {p.price}
                  </span>
                  <span
                    className="text-[13px]"
                    style={{ color: '#94A3B8' }}
                  >
                    {p.period}
                  </span>
                </div>

                {/* CTA */}
                <Link
                  to="/register"
                  className="block text-center px-4 py-3 rounded-xl text-[13px] font-semibold transition-all duration-300 mb-6 hover:-translate-y-0.5"
                  style={
                    p.highlighted
                      ? {
                          color: '#FFFFFF',
                          backgroundColor: '#1B4DFF',
                          boxShadow: '0 8px 30px rgba(27,77,255,0.35)',
                        }
                      : {
                          color: '#E2E8F0',
                          backgroundColor: 'transparent',
                          border: '1px solid rgba(255,255,255,0.15)',
                        }
                  }
                >
                  {p.cta}
                </Link>

                {/* Features */}
                <ul className="space-y-2.5">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[13px]"
                      style={{ color: '#94A3B8' }}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          backgroundColor: p.highlighted
                            ? 'rgba(27,77,255,0.15)'
                            : 'rgba(255,255,255,0.04)',
                        }}
                      >
                        <Check
                          size={10}
                          style={{
                            color: p.highlighted ? '#1B4DFF' : '#94A3B8',
                          }}
                        />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center text-[11px] mt-8 max-w-lg mx-auto"
          style={{ color: '#94A3B8' }}
        >
          * Fair use policy applies. BYOC available on all plans at no extra
          cost.
        </motion.p>
      </div>
    </section>
  )
}
