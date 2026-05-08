import { ArrowRight, ExternalLink, Sparkles } from 'lucide-react'
import { useInView } from '../../hooks/useInView'

const PORTAL = 'https://portal.balji.app'

interface PublicCtaProps {
  title?: string
  subtitle?: string
}

export function PublicCta({
  title = 'Ready to Transform Your Financing Operations?',
  subtitle = 'Join hundreds of finance teams already using Balji to streamline collections, close more deals, and grow revenue faster.',
}: PublicCtaProps) {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="relative py-24 lg:py-32">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`relative bg-gray-900 rounded-3xl p-12 md:p-16 text-center overflow-hidden transition-all duration-700 ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.98]'}`}>
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-blue-500/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-500/20 to-transparent rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 mb-6">
              <Sparkles size={14} className="text-emerald-400" />
              <span className="text-sm font-medium text-gray-300">14-day free trial, no credit card</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
              {title}
            </h2>

            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
              {subtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={`${PORTAL}/register`}
                className="group inline-flex items-center gap-2.5 px-8 py-4 text-base font-semibold text-gray-900 rounded-2xl bg-white hover:bg-gray-100 shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                Start Free Trial
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a href={`${PORTAL}/login`}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Login to Dashboard
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
