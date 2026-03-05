import { cn } from '../../utils/cn'
import type { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  icon: LucideIcon
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  color?: 'indigo' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet'
  loading?: boolean
}

const colors = {
  indigo: 'bg-indigo-50 text-indigo-600',
  sky: 'bg-sky-50 text-sky-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  violet: 'bg-violet-50 text-violet-600',
}

export function StatCard({ title, value, icon: Icon, change, changeType = 'neutral', color = 'indigo', loading }: Props) {
  return (
    <div className="card flex items-start gap-4 hover:shadow-card-hover transition-shadow">
      <div className={cn('flex-shrink-0 rounded-xl p-2.5', colors[color])}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
        {loading ? (
          <div className="h-7 w-20 bg-slate-200 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        )}
        {change && (
          <p className={cn('text-xs mt-1', {
            'text-emerald-600': changeType === 'up',
            'text-red-600': changeType === 'down',
            'text-slate-500': changeType === 'neutral',
          })}>
            {change}
          </p>
        )}
      </div>
    </div>
  )
}
