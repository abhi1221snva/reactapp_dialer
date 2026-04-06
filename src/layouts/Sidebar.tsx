import { useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Phone, LayoutDashboard, Users, BarChart3, MessageSquare,
  ChevronRight, Activity,
  CreditCard, Radio, MessagesSquare, Hash, UserCog, List, Tag, ListChecks, FileText, ChevronUp,
  PhoneCall, Voicemail, Layers, Link2, ShieldCheck, PieChart, MinusCircle,
  Mail, Building2, X, ChevronDown, ArrowLeftToLine, ArrowRightFromLine,
  Headphones, Globe, Bot, Calendar,
  Mic, Inbox, BrainCircuit, Settings2, User,
  Wifi, DollarSign, BookMarked, Plug2,
  Target, CheckCircle2, Zap, Clock, CalendarDays, RefreshCw, FileSearch,
} from 'lucide-react'
import { cn } from '../utils/cn'
import { useUIStore } from '../stores/ui.store'
import { useAuth } from '../hooks/useAuth'
import { useNotificationStore } from '../stores/notification.store'
import { useEngineStore } from '../stores/engine.store'
import { initials } from '../utils/format'
import { LEVELS } from '../utils/permissions'

const ADMIN_ALLOWED_ROUTES = new Set([
  '/profile',
  '/crm/dashboard',
  '/crm/leads',
  '/crm/lead-status',
  '/crm/lead-fields',
  '/crm/email-templates',
  '/crm/sms-templates',
  '/crm/lenders',
  '/crm/lender-api-logs',
  '/crm/affiliate-links',
  '/crm/company-settings',
  '/crm/sms-inbox',
  '/crm/automations',
  '/crm/approvals',
  '/crm/email-settings',
  '/crm/agent-performance',
  '/crm/commissions',
  '/crm/renewals',
  '/sms',
  '/chat',
  '/gmail-mailbox',
  '/google-calendar',
])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Icon = React.ComponentType<any>

type NavItem = {
  to: string
  label: string
  icon: Icon
  minLevel: number
  badge?: number
}

type NavSubSection = {
  label: string
  icon: Icon
  items: NavItem[]
  minLevel?: number
  defaultExpanded?: boolean
}

type NavSection = {
  label: string
  icon?: Icon
  items?: NavItem[]
  subSections?: NavSubSection[]
  minLevel?: number
  expandable?: boolean
  defaultExpanded?: boolean
}

const profileMenuItems: { to: string; label: string; icon: Icon }[] = [
  { to: '/profile', label: 'My Profile', icon: User },
]

function getRoleLabel(level?: number): string {
  if (!level) return 'Agent'
  if (level >= 10) return 'Super Admin'
  if (level >= 7)  return 'Admin'
  if (level >= 5)  return 'Manager'
  return 'Agent'
}

type AccentSet = {
  active: string
  activeIcon: string
  activeBadge: string
  activeBar: string
  subActive: string
  subActiveIcon: string
  groupActive: string
  groupIcon: string
  roleColor: string
}

const ACCENT: Record<'dialer' | 'crm', AccentSet> = {
  dialer: {
    active: 'bg-indigo-50 text-indigo-700 font-semibold',
    activeIcon: 'text-indigo-600',
    activeBadge: 'bg-indigo-500',
    activeBar: 'bg-indigo-500',
    subActive: 'text-indigo-700',
    subActiveIcon: 'text-indigo-500',
    groupActive: 'text-indigo-700',
    groupIcon: 'text-indigo-500',
    roleColor: 'text-indigo-500',
  },
  crm: {
    active: 'bg-emerald-50 text-emerald-700 font-semibold',
    activeIcon: 'text-emerald-600',
    activeBadge: 'bg-emerald-500',
    activeBar: 'bg-emerald-500',
    subActive: 'text-emerald-700',
    subActiveIcon: 'text-emerald-500',
    groupActive: 'text-emerald-700',
    groupIcon: 'text-emerald-500',
    roleColor: 'text-emerald-500',
  },
}

// ─── Phone System / Dialer nav sections ───────────────────────────────────────
const DIALER_SECTIONS: NavSection[] = [
  {
    label: 'CORE',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, minLevel: 1 },
      { to: '/dialer',    label: 'Dialer',     icon: Phone,           minLevel: 1 },
    ],
  },
  {
    label: 'USER MANAGEMENT',
    minLevel: LEVELS.ADMIN,
    items: [
      { to: '/users',            label: 'Users & Agents',  icon: UserCog, minLevel: LEVELS.ADMIN },
      { to: '/ring-groups',      label: 'Ring Groups',      icon: Users,   minLevel: LEVELS.ADMIN },
      { to: '/extension-groups', label: 'Extension Groups', icon: Layers,  minLevel: LEVELS.ADMIN },
    ],
  },
  {
    label: 'CAMPAIGN MANAGEMENT',
    items: [
      { to: '/campaigns',             label: 'Campaigns',    icon: Radio,      minLevel: LEVELS.AGENT },
      { to: '/settings/dispositions', label: 'Dispositions', icon: ListChecks, minLevel: LEVELS.ADMIN },
    ],
  },
  {
    label: 'LEAD MANAGEMENT',
    minLevel: LEVELS.MANAGER,
    items: [
      { to: '/settings/labels',              label: 'Labels',              icon: Tag,       minLevel: LEVELS.MANAGER },
      { to: '/leads',                        label: 'Leads',               icon: Target,    minLevel: LEVELS.MANAGER },
      { to: '/lists',                        label: 'Lists',               icon: List,      minLevel: LEVELS.MANAGER },
      { to: '/settings/recycle-rules',       label: 'Recycle Rules',       icon: RefreshCw, minLevel: LEVELS.ADMIN },
      { to: '/settings/lead-activity',       label: 'Lead Activity',       icon: Activity,  minLevel: LEVELS.MANAGER },
      { to: '/settings/custom-field-labels', label: 'Custom Field Labels', icon: Settings2, minLevel: LEVELS.ADMIN },
      { to: '/settings/lead-sources',        label: 'Lead Sources',        icon: Globe,     minLevel: LEVELS.ADMIN },
    ],
  },
  {
    label: 'REPORTS',
    minLevel: LEVELS.MANAGER,
    items: [
      { to: '/reports',                      label: 'CDR Report',           icon: BarChart3,  minLevel: LEVELS.MANAGER },
      { to: '/reports/daily',              label: 'Daily Report',         icon: Calendar,   minLevel: LEVELS.MANAGER },
      { to: '/reports/agent-summary',        label: 'Agent Summary',        icon: Users,      minLevel: LEVELS.MANAGER },
      { to: '/reports/disposition',          label: 'Disposition Report',   icon: ListChecks, minLevel: LEVELS.MANAGER },
      { to: '/reports/campaign-performance', label: 'Campaign Performance', icon: PieChart,   minLevel: LEVELS.MANAGER },
      { to: '/reports/live',               label: 'Live Calls',           icon: Radio,      minLevel: LEVELS.MANAGER },
      { to: '/reports/recordings',         label: 'Recording Report',     icon: Mic,        minLevel: LEVELS.MANAGER },
    ],
  },
  {
    label: 'VOICE',
    minLevel: LEVELS.ADMIN,
    items: [
      { to: '/dids',              label: 'DID Management',   icon: Hash,         minLevel: LEVELS.ADMIN },
      { to: '/ivr',               label: 'IVR Menus',        icon: PhoneCall,    minLevel: LEVELS.ADMIN },
      { to: '/voicemail',         label: 'Voicemail Drops',  icon: Voicemail,    minLevel: LEVELS.ADMIN },
      { to: '/voicemail/mailbox', label: 'Mailbox',          icon: Inbox,        minLevel: LEVELS.MANAGER },
      { to: '/call-times',        label: 'Call Times',       icon: Clock,        minLevel: LEVELS.ADMIN },
      { to: '/call-timers',       label: 'Call Timers',      icon: Clock,        minLevel: LEVELS.ADMIN },
      { to: '/holidays',          label: 'Holidays',         icon: CalendarDays, minLevel: LEVELS.ADMIN },
    ],
  },
  {
    label: 'AI & TOOLS',
    minLevel: LEVELS.ADMIN,
    items: [
      { to: '/ai/settings', label: 'AI Settings',        icon: Bot,        minLevel: LEVELS.ADMIN },
      { to: '/ai/coach',    label: 'AI Coach',           icon: Headphones, minLevel: LEVELS.ADMIN },
      { to: '/ringless',    label: 'Ringless Voicemail', icon: Voicemail,  minLevel: LEVELS.ADMIN },
    ],
  },
  {
    label: 'SMS AI',
    minLevel: LEVELS.ADMIN,
    items: [
      { to: '/smsai/demo',      label: 'AI Demo',          icon: BrainCircuit, minLevel: LEVELS.ADMIN },
      { to: '/smsai/campaigns', label: 'Campaigns',         icon: Radio,        minLevel: LEVELS.ADMIN },
      { to: '/smsai/lists',     label: 'Lists',             icon: List,         minLevel: LEVELS.ADMIN },
      { to: '/smsai/reports',   label: 'Reports',           icon: BarChart3,    minLevel: LEVELS.ADMIN },
      { to: '/smsai/templates', label: 'SMS AI Templates',  icon: FileText,     minLevel: LEVELS.ADMIN },
    ],
  },
  {
    label: 'COMMUNICATIONS',
    minLevel: 1,
    items: [
      { to: '/chat', label: 'Team Chat',  icon: MessagesSquare, minLevel: 1 },
    ],
  },
  {
    label: 'TELECOM',
    minLevel: LEVELS.MANAGER,
    items: [
      { to: '/telecom',                    label: 'Telecom Hub',    icon: Radio,       minLevel: LEVELS.MANAGER },
      { to: '/telecom?p=twilio&t=numbers', label: 'Phone Numbers',  icon: Hash,        minLevel: LEVELS.ADMIN   },
      { to: '/telecom?p=twilio&t=trunks',  label: 'SIP Trunks',     icon: Wifi,        minLevel: LEVELS.ADMIN   },
      { to: '/telecom?p=twilio&t=calls',   label: 'Call Logs',      icon: PhoneCall,   minLevel: LEVELS.MANAGER },
      { to: '/telecom?p=twilio&t=sms',     label: 'SMS Logs',       icon: MessageSquare, minLevel: LEVELS.MANAGER },
      { to: '/telecom?p=twilio&t=usage',   label: 'Usage & Billing',icon: DollarSign,  minLevel: LEVELS.ADMIN   },
    ],
  },
  {
    label: 'SETTINGS',
    minLevel: LEVELS.ADMIN,
    items: [
      { to: '/settings/dnc',     label: 'DNC List',          icon: ShieldCheck,  minLevel: LEVELS.ADMIN },
      { to: '/settings/exclude', label: 'Exclude From List', icon: MinusCircle,  minLevel: LEVELS.ADMIN },
      { to: '/settings/fax',     label: 'Fax Settings',      icon: FileText,     minLevel: LEVELS.ADMIN },
      { to: '/billing',       label: 'Billing',      icon: CreditCard, minLevel: LEVELS.ADMIN },
    ],
  },
  {
    label: 'SYSTEM ADMIN',
    minLevel: LEVELS.SUPERADMIN,
    items: [
      { to: '/admin/clients',        label: 'Client Management', icon: Building2,  minLevel: LEVELS.SUPERADMIN },
      { to: '/admin/system-monitor', label: 'System Monitor',    icon: Activity,   minLevel: LEVELS.SYSTEM_ADMIN },
      { to: '/system/swagger',       label: 'Swagger API Docs',  icon: BookMarked, minLevel: LEVELS.SYSTEM_ADMIN },
    ],
  },
]

// ─── CRM nav sections ─────────────────────────────────────────────────────────
const CRM_SECTIONS: NavSection[] = [
  {
    label: 'OVERVIEW',
    items: [
      { to: '/crm/dashboard', label: 'Dashboard', icon: PieChart, minLevel: 1 },
    ],
  },
  {
    label: 'MERCHANT MANAGEMENT',
    minLevel: 1,
    items: [
      { to: '/crm/leads',       label: 'Leads',       icon: Target,    minLevel: 1 },
      { to: '/crm/lead-fields', label: 'Labels',      icon: Settings2, minLevel: LEVELS.MANAGER },
      { to: '/crm/lead-status', label: 'Lead Status', icon: Tag,       minLevel: LEVELS.MANAGER },
    ],
  },
  {
    label: 'INBOX',
    minLevel: 1,
    items: [
      { to: '/chat',          label: 'Chat',   icon: MessagesSquare,minLevel: 1 },
      { to: '/crm/sms-inbox', label: 'SMS',   icon: MessageSquare, minLevel: 1 },
      { to: '/gmail-mailbox', label: 'Gmail Inbox',  icon: Inbox,   minLevel: 1 },
      { to: '/email-parser',  label: 'Email Parser', icon: FileSearch, minLevel: LEVELS.MANAGER },
    ],
  },
  {
    label: 'TEMPLATE MANAGEMENT',
    minLevel: LEVELS.MANAGER,
    items: [
      { to: '/crm/email-templates',  label: 'Email Templates',  icon: Mail,          minLevel: LEVELS.MANAGER },
      { to: '/crm/sms-templates',    label: 'SMS Templates',    icon: MessageSquare, minLevel: LEVELS.MANAGER },
      { to: '/crm/pdf-templates',    label: 'PDF Templates',    icon: FileText,      minLevel: LEVELS.MANAGER },
    ],
  },
  {
    label: 'SETTINGS',
    minLevel: LEVELS.MANAGER,
    items: [
      { to: '/crm/email-settings',   label: 'Email Settings',   icon: Mail,          minLevel: LEVELS.MANAGER },
      { to: '/crm/document-types',   label: 'Document Types',   icon: Tag,           minLevel: LEVELS.MANAGER },
    ],
  },
  {
    label: 'INTEGRATIONS',
    minLevel: 1,
    items: [
      { to: '/google-calendar',    label: 'Google Calendar',   icon: Calendar, minLevel: 1 },
      { to: '/crm/integrations',   label: 'API Integrations',  icon: Plug2,    minLevel: LEVELS.ADMIN },
    ],
  },
  {
    label: 'PERFORMANCE',
    minLevel: LEVELS.ADMIN,
    items: [
      { to: '/crm/agent-performance', label: 'Agent Performance', icon: BarChart3, minLevel: LEVELS.ADMIN },
      { to: '/crm/commissions',       label: 'Commissions',       icon: DollarSign, minLevel: LEVELS.ADMIN },
      { to: '/crm/renewals',          label: 'Renewal Pipeline',  icon: RefreshCw,  minLevel: LEVELS.ADMIN },
    ],
  },
  {
    label: 'PARTNERS',
    minLevel: LEVELS.MANAGER,
    items: [
      { to: '/crm/lenders',         label: 'Lenders',      icon: Building2, minLevel: LEVELS.MANAGER },
      { to: '/crm/lender-api-logs', label: 'API Call Logs', icon: Activity,  minLevel: LEVELS.MANAGER },
    ],
  },
  {
    label: 'SYSTEM ADMIN',
    minLevel: LEVELS.SUPERADMIN,
    items: [
      { to: '/admin/clients',        label: 'Client Management', icon: Building2,  minLevel: LEVELS.SUPERADMIN },
      { to: '/admin/system-monitor', label: 'System Monitor',    icon: Activity,   minLevel: LEVELS.SYSTEM_ADMIN },
      { to: '/system/swagger',       label: 'Swagger API Docs',  icon: BookMarked, minLevel: LEVELS.SYSTEM_ADMIN },
    ],
  },
]

// ─── Inner sub-group (e.g. Twilio / Plivo inside Telecom) ─────────────────────
function NavSubGroup({
  sub, canAccess, onItemClick, accent,
}: {
  sub: NavSubSection
  canAccess: (n: number) => boolean
  onItemClick: () => void
  accent: AccentSet
}) {
  const location = useLocation()
  const visibleItems = sub.items.filter(item => canAccess(item.minLevel))
  if (visibleItems.length === 0) return null
  if (sub.minLevel !== undefined && !canAccess(sub.minLevel)) return null

  const isAnyActive = visibleItems.some(item => location.pathname.startsWith(item.to))
  const [expanded, setExpanded] = useState(sub.defaultExpanded ?? isAnyActive)

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className={cn(
          'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all duration-150',
          isAnyActive ? accent.subActive : 'text-slate-500 hover:text-slate-800',
        )}
      >
        <sub.icon size={13} className={cn(isAnyActive ? accent.subActiveIcon : 'text-slate-400')} />
        <span className="flex-1 text-left truncate">{sub.label}</span>
        <ChevronDown size={11} className={cn('transition-transform duration-200 flex-shrink-0', expanded ? 'rotate-0' : '-rotate-90')} />
      </button>
      {expanded && (
        <div className="ml-3 pl-3 border-l border-slate-200 mt-0.5 space-y-0.5">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end onClick={onItemClick}
              className={({ isActive }) => cn(
                'group flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive ? accent.active : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon size={14} className={cn(isActive ? accent.activeIcon : 'text-slate-400 group-hover:text-slate-600')} />
                  <span className="truncate leading-none flex-1">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Expandable group component ───────────────────────────────────────────────
function NavGroup({
  section, collapsed, canAccess, unreadSms, onItemClick, accent, showTooltip, hideTooltip,
}: {
  section: NavSection
  collapsed: boolean
  canAccess: (n: number) => boolean
  unreadSms: number
  onItemClick: () => void
  accent: AccentSet
  showTooltip: (label: string, el: HTMLElement) => void
  hideTooltip: () => void
}) {
  const location = useLocation()
  const visibleItems = (section.items ?? []).filter(item => canAccess(item.minLevel))
  const hasVisibleSubs = (section.subSections ?? []).some(sub =>
    sub.items.some(item => canAccess(item.minLevel))
  )
  if (visibleItems.length === 0 && !hasVisibleSubs) return null
  if (section.minLevel !== undefined && !canAccess(section.minLevel)) return null

  const isAnyChildActive =
    visibleItems.some(item => location.pathname.startsWith(item.to)) ||
    (section.subSections ?? []).some(sub => sub.items.some(item => location.pathname.startsWith(item.to)))
  const [expanded, setExpanded] = useState(section.defaultExpanded ?? isAnyChildActive)

  if (collapsed) {
    const collapsedItems: NavItem[] = visibleItems.length > 0
      ? visibleItems
      : (section.subSections ?? []).flatMap(sub => sub.items.filter(item => canAccess(item.minLevel)).slice(0, 1))
    return (
      <div className="mb-1">
        {collapsedItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onItemClick}
            onMouseEnter={(e) => showTooltip(label, e.currentTarget)}
            onMouseLeave={hideTooltip}
            className={({ isActive }) => cn(
              'group/nav relative flex items-center justify-center rounded-lg p-2.5 my-0.5 transition-all duration-150',
              isActive ? accent.active : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && <span className={cn('absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full', accent.activeBar)} />}
                <Icon size={17} className={cn(isActive ? accent.activeIcon : 'text-slate-400 group-hover/nav:text-slate-600')} />
                {label === 'SMS Center' && unreadSms > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold leading-none">
                    {unreadSms > 9 ? '9+' : unreadSms}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    )
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(v => !v)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
          isAnyChildActive ? accent.groupActive : 'text-slate-500 hover:text-slate-800',
        )}
      >
        {section.icon && <section.icon size={16} className={cn(isAnyChildActive ? accent.groupIcon : 'text-slate-400')} />}
        <span className="flex-1 text-left truncate">{section.label}</span>
        <ChevronDown size={13} className={cn('transition-transform duration-200 flex-shrink-0', expanded ? 'rotate-0' : '-rotate-90')} />
      </button>
      {expanded && (
        <div className="ml-3 pl-3 border-l border-slate-200 mt-0.5 space-y-0.5">
          {visibleItems.map(({ to, label, icon: Icon, badge }) => (
            <NavLink key={to} to={to} end onClick={onItemClick}
              className={({ isActive }) => cn(
                'group flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive ? accent.active : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} className={cn(isActive ? accent.activeIcon : 'text-slate-400 group-hover:text-slate-600')} />
                  <span className="truncate leading-none flex-1">{label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className="min-w-[18px] h-4.5 px-1 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
          {(section.subSections ?? []).map(sub => (
            <NavSubGroup key={sub.label} sub={sub} canAccess={canAccess} onItemClick={onItemClick} accent={accent} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, mobileSidebarOpen, toggleSidebar, closeMobileSidebar } = useUIStore()
  const { user, canAccess } = useAuth()
  const { unreadSms } = useNotificationStore()
  const { engine } = useEngineStore()
  const navigate = useNavigate()

  const accent = ACCENT[engine]

  // Fixed-position tooltip state for collapsed sidebar
  const [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(null)
  const showTooltip = useCallback((label: string, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    setTooltip({ label, top: rect.top + rect.height / 2 })
  }, [])
  const hideTooltip = useCallback(() => setTooltip(null), [])

  function handleNav(to: string) { navigate(to); closeMobileSidebar() }

  const rawSections = engine === 'dialer' ? DIALER_SECTIONS : CRM_SECTIONS
  const effectiveSections = rawSections.filter(s => s.label !== 'SYSTEM ADMIN' || canAccess(LEVELS.SUPERADMIN))

  const logoGradient = engine === 'dialer'
    ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
    : 'linear-gradient(135deg, #059669 0%, #10B981 100%)'
  const logoShadow = engine === 'dialer'
    ? '0 2px 10px rgba(99,102,241,0.35)'
    : '0 2px 10px rgba(16,185,129,0.35)'
  return (
    <>
    <div
      className={cn(
        'flex flex-col h-full flex-shrink-0 border-r border-slate-200 overflow-visible bg-white',
        'transition-all duration-300',
        'fixed inset-y-0 left-0 z-30',
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:relative lg:z-auto lg:translate-x-0',
        sidebarCollapsed ? 'lg:w-[60px] w-64' : 'w-64'
      )}
    >
      {/* ── Logo + Collapse toggle ──────────────────────────────────────── */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-4 flex-shrink-0 border-b border-slate-200',
        sidebarCollapsed && 'lg:flex-col lg:gap-2 lg:px-2 lg:py-3'
      )}>
        <div className={cn('flex items-center gap-3', sidebarCollapsed && 'lg:justify-center')}>
          <div
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300"
            style={{ background: logoGradient, boxShadow: logoShadow }}
          >
            {engine === 'dialer' ? <Phone size={17} className="text-white" /> : <Target size={17} className="text-white" />}
          </div>
          {!sidebarCollapsed && (
            <span className="font-bold text-[15px] tracking-tight text-slate-900 flex-1">
              {engine === 'dialer' ? 'Phone System' : 'CRM'}
            </span>
          )}
        </div>
        {/* Collapse button — expanded state */}
        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-200 ml-auto flex-shrink-0 shadow-sm"
            title="Collapse sidebar"
          >
            <ArrowLeftToLine size={15} />
          </button>
        )}
        {/* Expand button — collapsed state */}
        {sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex items-center justify-center w-9 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-200 shadow-sm"
            title="Expand sidebar"
          >
            <ArrowRightFromLine size={15} />
          </button>
        )}
        <button
          onClick={closeMobileSidebar}
          className="lg:hidden ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto py-2 px-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#E5E7EB transparent' }}
      >
        {effectiveSections.map((section, idx) => {
          const visibleItems = (section.items ?? []).filter(item => canAccess(item.minLevel))
          const hasVisibleSubs = (section.subSections ?? []).some(sub => sub.items.some(item => canAccess(item.minLevel)))
          if (visibleItems.length === 0 && !hasVisibleSubs) return null
          if (section.minLevel !== undefined && !canAccess(section.minLevel)) return null

          return (
            <div key={`${engine}-${section.label}-${idx}`} className="mb-1">
              {idx > 0 && !(section.expandable && effectiveSections[idx - 1]?.expandable) && (
                <div className="mx-2 my-2 border-t border-slate-100" />
              )}
              {!section.expandable && (
                !sidebarCollapsed ? (
                  <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 select-none">
                    {section.label}
                  </p>
                ) : (
                  <div className="mx-auto mb-1 w-4 border-t border-slate-200" />
                )
              )}

              {section.expandable ? (
                <NavGroup
                  section={section}
                  collapsed={sidebarCollapsed}
                  canAccess={canAccess}
                  unreadSms={unreadSms}
                  onItemClick={() => { closeMobileSidebar() }}
                  accent={accent}
                  showTooltip={showTooltip}
                  hideTooltip={hideTooltip}
                />
              ) : (
                <div className={cn('space-y-0.5', sidebarCollapsed && 'flex flex-col items-center')}>
                  {visibleItems.map(({ to, label, icon: Icon, badge }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => { closeMobileSidebar() }}
                      onMouseEnter={sidebarCollapsed ? (e) => showTooltip(label, e.currentTarget) : undefined}
                      onMouseLeave={sidebarCollapsed ? hideTooltip : undefined}
                      className={({ isActive }) => cn(
                        'group/nav relative flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium outline-none',
                        'transition-all duration-150',
                        sidebarCollapsed && 'lg:justify-center lg:px-2.5 w-full',
                        isActive ? accent.active : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && <span className={cn('absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full', accent.activeBar)} />}
                          <div className="relative flex-shrink-0">
                            <Icon size={17} className={cn('transition-colors duration-150', isActive ? accent.activeIcon : 'text-slate-400 group-hover/nav:text-slate-600')} />
                            {label === 'SMS Center' && unreadSms > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                                {unreadSms > 9 ? '9+' : unreadSms}
                              </span>
                            )}
                          </div>
                          {!sidebarCollapsed && (
                            <>
                              <span className="truncate leading-none flex-1">{label}</span>
                              {badge !== undefined && badge > 0 && (
                                <span className="min-w-[18px] px-1 py-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                                  {badge}
                                </span>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

    </div>
    {/* ── Tooltip portal — rendered on document.body so it's always on top ── */}
    {sidebarCollapsed && tooltip && createPortal(
      <div
        className="pointer-events-none"
        style={{ position: 'fixed', left: 68, top: tooltip.top, transform: 'translateY(-50%)', zIndex: 99999 }}
      >
        <div className="relative px-3 py-1.5 rounded-md bg-indigo-600 text-white text-[11px] font-semibold whitespace-nowrap shadow-2xl border border-indigo-500">
          {tooltip.label}
          <span className="absolute top-1/2 -translate-y-1/2 -left-[5px] w-2.5 h-2.5 bg-indigo-600 border-l border-b border-indigo-500 rotate-45" />
        </div>
      </div>,
      document.body,
    )}
    </>
  )
}
