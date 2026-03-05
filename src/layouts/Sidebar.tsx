import { NavLink } from 'react-router-dom'
import {
  Phone, LayoutDashboard, Users, BarChart3, MessageSquare,
  Settings, ChevronLeft, ChevronRight, Activity, UserCheck,
  CreditCard, Radio, MessagesSquare, Hash, UserCog, List, Tag, ListChecks, PhoneOff, FileText,
} from 'lucide-react'
import { cn } from '../utils/cn'
import { useUIStore } from '../stores/ui.store'
import { useAuth } from '../hooks/useAuth'
import { useNotificationStore } from '../stores/notification.store'
import { initials } from '../utils/format'
import { LEVELS } from '../utils/permissions'

type NavItem = {
  to: string
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>
  minLevel: number
}

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: 'MAIN',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, minLevel: 1 },
      { to: '/dialer',    label: 'Dialer',     icon: Phone,           minLevel: 1 },
      { to: '/crm',       label: 'CRM Leads',  icon: Users,           minLevel: 1 },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { to: '/campaigns',  label: 'Campaigns',     icon: Radio,         minLevel: LEVELS.MANAGER },
      { to: '/lists',      label: 'Lists',          icon: List,          minLevel: LEVELS.MANAGER },
      { to: '/users',      label: 'Users & Agents', icon: UserCog,       minLevel: LEVELS.ADMIN },
      { to: '/reports',    label: 'Reports',        icon: BarChart3,     minLevel: LEVELS.MANAGER },
      { to: '/sms',        label: 'SMS Center',     icon: MessageSquare, minLevel: 1 },
      { to: '/chat',       label: 'Team Chat',      icon: MessagesSquare,minLevel: 1 },
      { to: '/monitoring', label: 'Monitoring',     icon: Activity,      minLevel: LEVELS.MANAGER },
      { to: '/attendance', label: 'Attendance',     icon: UserCheck,     minLevel: 1 },
      { to: '/dids',       label: 'DID Management', icon: Hash,          minLevel: LEVELS.ADMIN },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { to: '/billing',               label: 'Billing',      icon: CreditCard, minLevel: LEVELS.ADMIN },
      { to: '/settings/labels',       label: 'Labels',       icon: Tag,        minLevel: LEVELS.ADMIN },
      { to: '/settings/dispositions', label: 'Dispositions', icon: ListChecks, minLevel: LEVELS.ADMIN },
      { to: '/settings/dnc',          label: 'DNC List',     icon: PhoneOff,   minLevel: LEVELS.ADMIN },
      { to: '/settings/fax',          label: 'Fax',          icon: FileText,   minLevel: LEVELS.ADMIN },
      { to: '/settings',              label: 'Settings',     icon: Settings,   minLevel: LEVELS.ADMIN },
    ],
  },
]

function getRoleLabel(level?: number): string {
  if (!level) return 'Agent'
  if (level >= 10) return 'Super Admin'
  if (level >= 7)  return 'Admin'
  if (level >= 5)  return 'Manager'
  return 'Agent'
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { user, canAccess } = useAuth()
  const { unreadSms } = useNotificationStore()

  return (
    <div
      className={cn(
        'relative flex flex-col h-full flex-shrink-0 transition-all duration-300 overflow-hidden bg-white border-r border-slate-200/80',
        sidebarCollapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-slate-200/80 flex-shrink-0',
        sidebarCollapsed && 'justify-center px-2'
      )}>
        <div
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            boxShadow:  '0 0 16px rgba(99,102,241,0.45)',
          }}
        >
          <Phone size={17} className="text-white" />
        </div>
        {!sidebarCollapsed && (
          <span className="font-bold text-[15px] tracking-tight text-slate-800">
            DialerCRM
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navSections.map((section) => {
          const visibleItems = section.items.filter(item => canAccess(item.minLevel))
          if (visibleItems.length === 0) return null

          return (
            <div key={section.label} className="mb-5">
              {!sidebarCollapsed ? (
                <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-slate-400 uppercase select-none">
                  {section.label}
                </p>
              ) : (
                <div className="mx-auto mb-2 w-6 border-t border-slate-200" />
              )}

              <div className="space-y-0.5">
                {visibleItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    title={sidebarCollapsed ? label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 outline-none',
                        sidebarCollapsed && 'justify-center px-2',
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-indigo-600" />
                        )}
                        <div className="relative flex-shrink-0">
                          <Icon
                            size={18}
                            className={cn(
                              'transition-colors duration-150',
                              isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-700'
                            )}
                          />
                          {label === 'SMS Center' && unreadSms > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                              {unreadSms > 9 ? '9+' : unreadSms}
                            </span>
                          )}
                        </div>
                        {!sidebarCollapsed && (
                          <span className="truncate leading-none">{label}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      {!sidebarCollapsed && user && (
        <div className="flex-shrink-0 border-t border-slate-200 p-3">
          <div className="flex items-center gap-2.5 px-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
            >
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-800 truncate leading-snug">{user.name}</p>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 leading-none mt-0.5">
                {getRoleLabel(user.level)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full flex items-center justify-center bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-150"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>
    </div>
  )
}
