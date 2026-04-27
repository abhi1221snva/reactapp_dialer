import { MessageSquare, Mail, FileText, StickyNote, Activity } from 'lucide-react'
import { cn } from '../../../utils/cn'
import type { SidebarTab } from './types'

interface Props {
  active: SidebarTab | null
  onChange: (tab: SidebarTab) => void
}

const TABS: { id: SidebarTab; label: string; icon: React.ElementType; badge?: number }[] = [
  { id: 'sms',    label: 'Send SMS',     icon: MessageSquare },
  { id: 'email',  label: 'Send Email',   icon: Mail          },
  { id: 'script', label: 'Agent Script', icon: FileText      },
  { id: 'notes',  label: 'Notes',        icon: StickyNote, badge: 2 },
  { id: 'events', label: 'Events',       icon: Activity,   badge: 5 },
]

/**
 * Horizontal tab bar for studio action tabs.
 * Displays icon + label inline with an active bottom-border indicator.
 */
export function StudioSidebar({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-1">
      {TABS.map((tab) => {
        const isActive = active === tab.id
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-150',
              isActive
                ? 'bg-indigo-50 text-indigo-600 font-semibold'
                : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700',
            )}
          >
            <Icon size={15} className="shrink-0" />
            <span>{tab.label}</span>

            {tab.badge !== undefined && (
              <span
                className={cn(
                  'text-[10px] font-semibold min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center',
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-600'
                    : 'bg-slate-100 text-slate-500',
                )}
              >
                {tab.badge}
              </span>
            )}

            {isActive && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-3/4 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #818cf8, #6366f1, #7c3aed)',
                }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
