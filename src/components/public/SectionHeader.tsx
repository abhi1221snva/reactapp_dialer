import type { LucideIcon } from 'lucide-react'
import { useInView } from '../../hooks/useInView'

interface SectionHeaderProps {
  pill: string
  pillIcon: LucideIcon
  pillIconColor?: string
  title: string
  titleHighlight?: string
  subtitle?: string
}

export function SectionHeader({ pill, pillIcon: Icon, pillIconColor = 'text-indigo-600', title, titleHighlight, subtitle }: SectionHeaderProps) {
  const { ref, visible } = useInView()

  return (
    <div ref={ref} className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
        <Icon size={14} className={pillIconColor} />
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{pill}</span>
      </div>
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
        {title}{' '}
        {titleHighlight && (
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">{titleHighlight}</span>
        )}
      </h2>
      {subtitle && <p className="text-lg text-gray-500 leading-relaxed">{subtitle}</p>}
    </div>
  )
}
