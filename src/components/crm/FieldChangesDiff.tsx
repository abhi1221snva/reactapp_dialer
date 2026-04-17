import { useState } from 'react'
import { ArrowRight, ChevronDown, User, Globe, Code2 } from 'lucide-react'
import { cn } from '../../utils/cn'

interface FieldDiff {
  old: string | null
  new: string | null
  label?: string
}

interface Props {
  changes: Record<string, FieldDiff>
  source?: string | null
  collapseThreshold?: number
}

function humanizeFieldKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof User; cls: string }> = {
  merchant_portal: { label: 'Merchant',  icon: User,  cls: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  affiliate_form:  { label: 'Affiliate', icon: Globe, cls: 'bg-violet-50 text-violet-600 border-violet-100' },
  api:             { label: 'API',       icon: Code2, cls: 'bg-slate-50 text-slate-600 border-slate-100' },
  bulk_operation:  { label: 'Bulk',      icon: Code2, cls: 'bg-amber-50 text-amber-600 border-amber-100' },
  system:          { label: 'System',    icon: Code2, cls: 'bg-gray-50 text-gray-600 border-gray-100' },
}

export function FieldChangesDiff({ changes, source, collapseThreshold = 3 }: Props) {
  const [expanded, setExpanded] = useState(false)
  const entries = Object.entries(changes)
  if (!entries.length) return null

  const visible = expanded ? entries : entries.slice(0, collapseThreshold)
  const hiddenCount = entries.length - collapseThreshold

  const srcConf = source && source !== 'crm_ui' ? SOURCE_CONFIG[source] : null

  return (
    <div className="mt-1.5 space-y-1">
      {srcConf && (
        <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border', srcConf.cls)}>
          <srcConf.icon size={8} /> {srcConf.label}
        </span>
      )}

      {visible.map(([fieldKey, diff]) => {
        const label = diff.label || humanizeFieldKey(fieldKey)
        const oldVal = diff.old ?? '(empty)'
        const newVal = diff.new ?? '(empty)'
        return (
          <div key={fieldKey} className="flex items-start gap-1.5 text-[10px]">
            <span className="text-slate-500 font-medium min-w-[80px] flex-shrink-0 truncate" title={label}>
              {label}
            </span>
            <span className="text-red-400 line-through truncate max-w-[120px]" title={String(oldVal)}>
              {oldVal}
            </span>
            <ArrowRight size={9} className="text-slate-300 flex-shrink-0 mt-0.5" />
            <span className="text-emerald-600 font-semibold truncate max-w-[120px]" title={String(newVal)}>
              {newVal}
            </span>
          </div>
        )
      })}

      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-0.5 text-[9px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronDown size={9} className={cn('transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Show less' : `Show ${hiddenCount} more`}
        </button>
      )}
    </div>
  )
}
