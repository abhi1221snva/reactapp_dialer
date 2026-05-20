import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function FinalCTA() {
  return (
    <section
      className="py-20 sm:py-28"
      style={{ backgroundColor: '#F7F9FC' }}
    >
      <div className="max-w-[1080px] mx-auto px-5 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          className="relative rounded-[28px] p-10 sm:p-16 text-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1B4DFF, #00BCD4)',
            boxShadow: '0 40px 80px -20px rgba(27,77,255,0.3)',
          }}
        >
          {/* Glow effects */}
          <div className="absolute inset-0 pointer-events-none select-none">
            <div
              className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 55%)',
                filter: 'blur(60px)',
              }}
            />
            <div
              className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(0,188,212,0.25) 0%, transparent 55%)',
                filter: 'blur(60px)',
              }}
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full"
              style={{
                background:
                  'radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 60%)',
                filter: 'blur(80px)',
              }}
            />
          </div>

          <div className="relative">
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.02em] mb-4 leading-tight max-w-[700px] mx-auto"
              style={{ color: '#FFFFFF' }}
            >
              Stop paying for desks your agents don&rsquo;t sit at.
            </h2>
            <p
              className="text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              Run dialer campaigns from your agents&rsquo; phones. Plans start
              at $29.99/user/month. 14-day free trial, no credit card.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="group flex items-center gap-2.5 px-8 py-[14px] text-[15px] font-semibold rounded-2xl transition-all duration-300 hover:-translate-y-1"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#1B4DFF',
                  boxShadow:
                    '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
                }}
              >
                Start Free Trial
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <a
                href="#"
                className="text-[14px] font-medium transition-colors"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              >
                Book a demo &rarr;
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
