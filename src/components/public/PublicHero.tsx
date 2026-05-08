import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'

interface PublicHeroProps {
  pill: string
  pillIcon: LucideIcon
  title: string
  titleHighlight?: string
  subtitle: string
}

export function PublicHero({ pill, pillIcon: Icon, title, titleHighlight, subtitle }: PublicHeroProps) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setLoaded(true)) }, [])

  return (
    <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-20 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-indigo-50/80 via-blue-50/40 to-transparent rounded-full blur-3xl -translate-y-1/4 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-50/60 via-teal-50/30 to-transparent rounded-full blur-3xl translate-y-1/4 -translate-x-1/4" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200/80 shadow-sm mb-8 transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Icon size={14} className="text-indigo-600" />
          <span className="text-[13px] font-medium text-gray-600">{pill}</span>
        </div>

        <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6 transition-all duration-700 delay-100 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <span className="text-gray-900">{title} </span>
          {titleHighlight && (
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">{titleHighlight}</span>
          )}
        </h1>

        <p className={`text-lg lg:text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto transition-all duration-700 delay-200 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {subtitle}
        </p>
      </div>
    </section>
  )
}
