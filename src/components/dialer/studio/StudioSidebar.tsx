import { User, MessageSquare, Mail, FileText, StickyNote, Activity, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '../../../utils/cn'
import type { SidebarTab } from './types'

interface Props {
  active: SidebarTab
  onChange: (tab: SidebarTab) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const TABS: { id: SidebarTab; label: string; icon: React.ElementType; hint?: string; badge?: number }[] = [
  { id: 'lead',   label: 'Lead Details', icon: User,          hint: '1' },
  { id: 'sms',    label: 'Send SMS',     icon: MessageSquare, hint: '2' },
  { id: 'email',  label: 'Send Email',   icon: Mail,          hint: '3' },
  { id: 'script', label: 'Agent Script', icon: FileText,      hint: '4' },
  { id: 'notes',  label: 'Notes',        icon: StickyNote,    hint: '5', badge: 2 },
  { id: 'events', label: 'Events',       icon: Activity,      hint: '6', badge: 5 },
]

/**
 * Left dark sidebar — Lead action tabs.
 * Collapsible. Icon-only when collapsed.
 */
export function StudioSidebar({ active, onChange, collapsed, onToggleCollapse }: Props) {
  return (
    <aside
      className={cn(
        'relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 shrink-0',
        collapsed ? 'w-[68px]' : 'w-[232px]',
      )}
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #0c1322 100%)',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-4 border-b border-white/5',
        collapsed && 'justify-center px-2',
      )}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
          <Activity size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">Actions</p>
            <p className="text-xs text-white/80 font-medium truncate">Lead Workspace</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <nav className={cn('flex-1 py-3', collapsed ? 'px-2' : 'px-3')}>
        <ul className="space-y-1">
          {TABS.map((tab) => {
            const isActive = active === tab.id
            const Icon = tab.icon
            return (
              <li key={tab.id}>
                <button
                  onClick={() => onChange(tab.id)}
                  className={cn(
                    'w-full group relative flex items-center gap-3 rounded-xl transition-all duration-150',
                    collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5',
                    isActive
                      ? 'bg-indigo-500/15 text-indigo-200'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5',
                  )}
                  title={collapsed ? tab.label : undefined}
                >
                  {/* Active left bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-gradient-to-b from-indigo-400 to-violet-500" />
                  )}
                  <Icon
                    size={17}
                    className={cn(
                      'shrink-0 transition-colors',
                      isActive ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-200',
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className={cn(
                        'text-[13px] font-medium flex-1 text-left',
                        isActive && 'font-semibold',
                      )}>
                        {tab.label}
                      </span>
                      {tab.badge !== undefined && (
                        <span className="text-[10px] font-bold px-1.5 h-[18px] min-w-[18px] rounded-full bg-indigo-500/20 text-indigo-300 inline-flex items-center justify-center">
                          {tab.badge}
                        </span>
                      )}
                      {tab.hint && tab.badge === undefined && (
                        <kbd className="text-[9px] font-mono text-slate-500 bg-white/5 border border-white/10 rounded px-1 py-[1px]">
                          {tab.hint}
                        </kbd>
                      )}
                    </>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer — agent status */}
      <div className={cn('p-3 border-t border-white/5', collapsed && 'px-2')}>
        {!collapsed ? (
          <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-white/5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              PS
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-white truncate">Priya Sharma</p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[10px] text-slate-400">Available · Ext 1024</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[11px] font-bold text-white">
                PS
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0c1322]" />
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={cn(
            'mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors',
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight size={14} /> : <><ChevronsLeft size={14} /> Collapse</>}
        </button>
      </div>
    </aside>
  )
}
