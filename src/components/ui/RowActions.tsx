import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'

export interface RowAction {
  label: string
  icon: ReactNode
  onClick: () => void
  variant?: 'edit' | 'delete' | 'view' | 'success' | 'warning' | 'default'
  disabled?: boolean
  hidden?: boolean
}

const ITEM_CLASSES: Record<string, string> = {
  edit:    'text-slate-700 hover:bg-blue-50 hover:text-blue-700',
  delete:  'text-red-600 hover:bg-red-50 hover:text-red-700',
  view:    'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700',
  success: 'text-emerald-700 hover:bg-emerald-50',
  warning: 'text-amber-700 hover:bg-amber-50',
  default: 'text-slate-600 hover:bg-slate-50',
}

const ICON_CLASSES: Record<string, string> = {
  edit:    'text-blue-500',
  delete:  'text-red-500',
  view:    'text-indigo-500',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  default: 'text-slate-400',
}

export function RowActions({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const visible = actions.filter(a => !a.hidden)

  // First delete action index — used to render a separator above destructive items
  const firstDeleteIdx = visible.findIndex(a => a.variant === 'delete')

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative flex justify-end" ref={ref}>

      {/* ── Trigger: three-dot icon button ── */}
      <button
        type="button"
        title="Actions"
        onClick={() => setOpen(o => !o)}
        className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-150 select-none ${
          open
            ? 'bg-slate-100 border-slate-300 text-slate-700 shadow-inner'
            : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:bg-slate-50 hover:shadow-sm'
        }`}
      >
        <MoreHorizontal size={15} />
      </button>

      {/* ── Dropdown menu ── */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl overflow-hidden"
          style={{
            minWidth: '172px',
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12), 0 2px 8px -2px rgba(0,0,0,0.06)',
          }}
        >
          {visible.map((action, i) => (
            <div key={i}>
              {/* Separator above first destructive (delete) action */}
              {i === firstDeleteIdx && firstDeleteIdx > 0 && (
                <div className="border-t border-slate-100 mx-2 my-1" />
              )}

              <button
                type="button"
                onClick={() => { action.onClick(); setOpen(false) }}
                disabled={action.disabled}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-left transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed ${
                  ITEM_CLASSES[action.variant ?? 'default']
                }`}
              >
                <span className={`flex-shrink-0 ${ICON_CLASSES[action.variant ?? 'default']}`}>
                  {action.icon}
                </span>
                <span className="flex-1">{action.label}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
