import type { ReactNode } from 'react'

export interface RowAction {
  label: string
  icon: ReactNode
  onClick: () => void
  variant?: 'edit' | 'delete' | 'view' | 'success' | 'warning' | 'default'
  disabled?: boolean
  hidden?: boolean
}

// Per-variant: idle colour + hover background + hover text
const BTN_CLASSES: Record<string, string> = {
  edit:    'text-slate-400 hover:text-blue-600   hover:bg-blue-50   hover:border-blue-200',
  delete:  'text-slate-400 hover:text-red-600    hover:bg-red-50    hover:border-red-200',
  view:    'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200',
  success: 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200',
  warning: 'text-slate-400 hover:text-amber-600  hover:bg-amber-50  hover:border-amber-200',
  default: 'text-slate-400 hover:text-slate-600  hover:bg-slate-50  hover:border-slate-300',
}

export function RowActions({ actions }: { actions: RowAction[] }) {
  const visible = actions.filter(a => !a.hidden)

  return (
    <div className="flex items-center justify-end gap-1">
      {visible.map((action, i) => (
        <button
          key={i}
          type="button"
          title={action.label}
          onClick={action.onClick}
          disabled={action.disabled}
          className={[
            'inline-flex items-center justify-center',
            'w-7 h-7 rounded-md border border-transparent',
            'transition-all duration-150 select-none',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            BTN_CLASSES[action.variant ?? 'default'],
          ].join(' ')}
        >
          {action.icon}
        </button>
      ))}
    </div>
  )
}
