import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Phone, LayoutDashboard, Users, BarChart3, MessageSquare,
  Settings, ChevronLeft, ChevronRight, Activity, UserCheck,
  CreditCard, Radio, MessagesSquare, Hash, UserCog, List, Tag, ListChecks, PhoneOff, FileText, ChevronUp,
  PhoneCall, Voicemail, Layers, Kanban, Link2, ShieldCheck, PieChart,
  Sliders, Mail, Building2, LogOut, X,
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
    ],
  },
  {
    label: 'CRM',
    items: [
      { to: '/crm/dashboard',        label: 'CRM Dashboard',   icon: PieChart,      minLevel: 1 },
      { to: '/crm/pipeline',         label: 'Pipeline Board',  icon: Kanban,        minLevel: 1 },
      { to: '/crm/leads',            label: 'All Leads',       icon: Users,         minLevel: 1 },
      { to: '/crm/lead-status',      label: 'Lead Status',     icon: Tag,           minLevel: LEVELS.MANAGER },
      { to: '/crm/custom-fields',    label: 'Custom Fields',   icon: Sliders,       minLevel: LEVELS.MANAGER },
      { to: '/crm/email-templates',  label: 'Email Templates', icon: Mail,          minLevel: LEVELS.MANAGER },
      { to: '/crm/sms-templates',    label: 'SMS Templates',   icon: MessageSquare, minLevel: LEVELS.MANAGER },
      { to: '/crm/lenders',          label: 'Lenders',         icon: Building2,     minLevel: LEVELS.MANAGER },
      { to: '/crm/affiliate-links',  label: 'Affiliate Links', icon: Link2,         minLevel: LEVELS.MANAGER },
      { to: '/crm/approvals',        label: 'Approvals',       icon: ShieldCheck,   minLevel: LEVELS.MANAGER },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { to: '/campaigns',         label: 'Campaigns',       icon: Radio,          minLevel: LEVELS.MANAGER },
      { to: '/lists',             label: 'Lists',           icon: List,           minLevel: LEVELS.MANAGER },
      { to: '/users',             label: 'Users & Agents',  icon: UserCog,        minLevel: LEVELS.ADMIN },
      { to: '/reports',           label: 'Reports',         icon: BarChart3,      minLevel: LEVELS.MANAGER },
      { to: '/sms',               label: 'SMS Center',      icon: MessageSquare,  minLevel: 1 },
      { to: '/chat',              label: 'Team Chat',       icon: MessagesSquare, minLevel: 1 },
      { to: '/monitoring',        label: 'Monitoring',      icon: Activity,       minLevel: LEVELS.MANAGER },
      { to: '/attendance',        label: 'Attendance',      icon: UserCheck,      minLevel: 1 },
      { to: '/dids',              label: 'DID Management',  icon: Hash,           minLevel: LEVELS.ADMIN },
      { to: '/ivr',               label: 'IVR',             icon: PhoneCall,      minLevel: LEVELS.ADMIN },
      { to: '/voicemail',         label: 'Voicemail Drops', icon: Voicemail,      minLevel: LEVELS.ADMIN },
      { to: '/voicemail/mailbox', label: 'Mailbox',         icon: Layers,         minLevel: LEVELS.MANAGER },
      { to: '/ring-groups',       label: 'Ring Groups',     icon: Users,          minLevel: LEVELS.ADMIN },
      { to: '/extension-groups',  label: 'Extension Groups',icon: Layers,         minLevel: LEVELS.ADMIN },
    ],
  },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const profileMenuItems: { to: string; label: string; icon: React.ComponentType<any> }[] = [
  { to: '/billing',               label: 'Billing',      icon: CreditCard  },
  { to: '/settings/labels',       label: 'Labels',       icon: Tag         },
  { to: '/settings/dispositions', label: 'Dispositions', icon: ListChecks  },
  { to: '/settings/dnc',          label: 'DNC List',     icon: PhoneOff    },
  { to: '/settings/fax',          label: 'Fax',          icon: FileText    },
  { to: '/settings',              label: 'Settings',     icon: Settings    },
]

function getRoleLabel(level?: number): string {
  if (!level) return 'Agent'
  if (level >= 10) return 'Super Admin'
  if (level >= 7)  return 'Admin'
  if (level >= 5)  return 'Manager'
  return 'Agent'
}

export function Sidebar() {
  const { sidebarCollapsed, mobileSidebarOpen, toggleSidebar, closeMobileSidebar } = useUIStore()
  const { user, canAccess, logout } = useAuth()
  const { unreadSms } = useNotificationStore()
  const navigate = useNavigate()
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  function handleNav(to: string) {
    navigate(to)
    closeMobileSidebar()
    setShowProfileMenu(false)
  }

  return (
    <div
      className={cn(
        // Base: flex column, full height, border
        'flex flex-col h-full flex-shrink-0 border-r border-slate-200 overflow-visible bg-white',
        'transition-all duration-300',
        // Mobile (default): fixed overlay, slides in/out
        'fixed inset-y-0 left-0 z-30',
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: relative in layout flow, always visible
        'lg:relative lg:z-auto lg:translate-x-0',
        // Width
        sidebarCollapsed ? 'lg:w-[68px] w-64' : 'w-64'
      )}
    >

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-4 flex-shrink-0 border-b border-slate-200',
          sidebarCollapsed && 'lg:justify-center lg:px-2'
        )}
      >
        <div
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            boxShadow: '0 2px 10px rgba(99,102,241,0.35)',
          }}
        >
          <Phone size={17} className="text-white" />
        </div>

        {(!sidebarCollapsed) && (
          <span className="font-bold text-[15px] tracking-tight text-slate-900">
            DialerCRM
          </span>
        )}

        {/* Mobile close button */}
        <button
          onClick={closeMobileSidebar}
          className="lg:hidden ml-auto action-btn"
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto py-4 px-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#E5E7EB transparent' }}
      >
        {navSections.map((section) => {
          const visibleItems = section.items.filter(item => canAccess(item.minLevel))
          if (visibleItems.length === 0) return null

          return (
            <div key={section.label} className="mb-5">
              {!sidebarCollapsed ? (
                <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none">
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
                    onClick={closeMobileSidebar}
                    title={sidebarCollapsed ? label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none',
                        'transition-all duration-150',
                        sidebarCollapsed && 'lg:justify-center lg:px-2',
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active indicator bar */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-indigo-500" />
                        )}

                        <div className="relative flex-shrink-0">
                          <Icon
                            size={18}
                            className={cn(
                              'transition-colors duration-150',
                              isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                            )}
                          />
                          {label === 'SMS Center' && unreadSms > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                              {unreadSms > 9 ? '9+' : unreadSms}
                            </span>
                          )}
                        </div>

                        {(!sidebarCollapsed) && (
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

      {/* ── User footer ───────────────────────────────────────────────────── */}
      {user && (
        <div className="flex-shrink-0 relative px-2 py-2 border-t border-slate-200">

          {/* Profile dropdown — opens upward */}
          {showProfileMenu && !sidebarCollapsed && (
            <div className="absolute bottom-full left-2 right-2 mb-1 rounded-xl py-1.5 z-50 overflow-hidden bg-white border border-slate-200 shadow-lg">
              {profileMenuItems.map(({ to, label, icon: Icon }) => (
                <button
                  key={to}
                  onClick={() => handleNav(to)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                >
                  <Icon size={15} className="flex-shrink-0 text-slate-400" />
                  {label}
                </button>
              ))}
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={() => { logout(); navigate('/login'); closeMobileSidebar() }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} className="flex-shrink-0 text-red-500" />
                Sign out
              </button>
            </div>
          )}

          {/* Profile trigger card */}
          {!sidebarCollapsed ? (
            <button
              onClick={() => setShowProfileMenu(p => !p)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all duration-200"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                style={{ background: '#6366F1', boxShadow: '0 2px 6px rgba(99,102,241,0.30)' }}
              >
                {initials(user.name)}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[13px] font-semibold truncate leading-snug text-slate-900">
                  {user.name}
                </p>
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium leading-none mt-0.5 bg-indigo-50 text-indigo-600 rounded-md">
                  {getRoleLabel(user.level)}
                </span>
              </div>
              <ChevronUp
                size={14}
                className={cn('flex-shrink-0 text-slate-400 transition-transform duration-200', !showProfileMenu && 'rotate-180')}
              />
            </button>
          ) : (
            /* Collapsed: just avatar */
            <div className="flex justify-center py-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                style={{ background: '#6366F1', boxShadow: '0 2px 6px rgba(99,102,241,0.30)' }}
                title={user.name}
              >
                {initials(user.name)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Collapse toggle (desktop only) ────────────────────────────────── */}
      <button
        onClick={toggleSidebar}
        className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all duration-150"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>
    </div>
  )
}
