import { MessageSquare, Mail, Phone } from 'lucide-react'
import { cn } from '../../../utils/cn'

interface Props {
  onSms: () => void
  onEmail: () => void
  onCall: () => void
  disabled?: boolean
}

/**
 * Sticky right-side floating action pillar.
 * Vertical column of SMS / Email / Call buttons with tooltips.
 */
export function FloatingQuickActions({ onSms, onEmail, onCall, disabled }: Props) {
  const btns = [
    { id: 'sms',   icon: MessageSquare, label: 'Send SMS',   on: onSms,   color: 'from-sky-500 to-blue-600'       },
    { id: 'email', icon: Mail,          label: 'Send Email', on: onEmail, color: 'from-violet-500 to-fuchsia-600' },
    { id: 'call',  icon: Phone,         label: 'Call Now',   on: onCall,  color: 'from-emerald-500 to-teal-600'   },
  ]

  return (
    <div className="sticky top-24 flex flex-col items-center gap-2.5 z-10">
      {btns.map(({ id, icon: Icon, label, on, color }) => (
        <button
          key={id}
          onClick={on}
          disabled={disabled}
          className={cn(
            'group relative w-11 h-11 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center shadow-md hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
            color,
          )}
          title={label}
        >
          <Icon size={16} />
          {/* Tooltip */}
          <span className="absolute right-full mr-2 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg">
            {label}
            <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900" />
          </span>
        </button>
      ))}
    </div>
  )
}
