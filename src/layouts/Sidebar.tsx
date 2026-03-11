import { useState, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Phone, LayoutDashboard, Users, BarChart3, MessageSquare,
  Settings, ChevronRight, Activity, UserCheck,
  CreditCard, Radio, MessagesSquare, Hash, UserCog, List, Tag, ListChecks, PhoneOff, FileText, ChevronUp,
  PhoneCall, Voicemail, Layers, Kanban, Link2, ShieldCheck, PieChart,
  Mail, Building2, LogOut, X, ChevronDown,
  Headphones, Clock, Globe, Zap, Bot, Cpu, BookOpen,
  MapPin, Mic, Inbox, BrainCircuit, Settings2, Rocket, User, Camera,
  Wifi, DollarSign, CalendarClock, TrendingUp,
} from 'lucide-react'
import { cn } from '../utils/cn'
import { useUIStore } from '../stores/ui.store'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../stores/auth.store'
import { useNotificationStore } from '../stores/notification.store'
import { initials } from '../utils/format'
import { LEVELS } from '../utils/permissions'
import api from '../api/axios'
import toast from 'react-hot-toast'

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
}

type NavSection = {
  label: string
  icon?: Icon
  items?: NavItem[]
  subSections?: NavSubSection[]   // for two-level nesting (e.g. Telecom → Twilio / Plivo)
  minLevel?: number
  expandable?: boolean
  defaultExpanded?: boolean
}

const profileMenuItems: { to: string; label: string; icon: Icon }[] = [
  { to: '/settings', label: 'Settings', icon: Settings },
]

function getRoleLabel(level?: number): string {
  if (!level) return 'Agent'
  if (level >= 10) return 'Super Admin'
  if (level >= 7)  return 'Admin'
  if (level >= 5)  return 'Manager'
  return 'Agent'
}

// ─── Inner sub-group (e.g. Twilio / Plivo inside Telecom) ─────────────────────
function NavSubGroup({
  sub,
  canAccess,
  onItemClick,
}: {
  sub: NavSubSection
  canAccess: (n: number) => boolean
  onItemClick: () => void
}) {
  const location = useLocation()
  const visibleItems = sub.items.filter(item => canAccess(item.minLevel))
  if (visibleItems.length === 0) return null
  if (sub.minLevel !== undefined && !canAccess(sub.minLevel)) return null

  const isAnyActive = visibleItems.some(item => location.pathname.startsWith(item.to))
  const [expanded, setExpanded] = useState(isAnyActive)

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className={cn(
          'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all duration-150',
          isAnyActive ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-800',
        )}
      >
        <sub.icon size={13} className={cn(isAnyActive ? 'text-indigo-500' : 'text-slate-400')} />
        <span className="flex-1 text-left truncate">{sub.label}</span>
        <ChevronDown
          size={11}
          className={cn('transition-transform duration-200 flex-shrink-0', expanded ? 'rotate-0' : '-rotate-90')}
        />
      </button>

      {expanded && (
        <div className="ml-3 pl-3 border-l border-slate-200 mt-0.5 space-y-0.5">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              onClick={onItemClick}
              className={({ isActive }) => cn(
                'group flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon size={14} className={cn(isActive ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-600')} />
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
  section,
  collapsed,
  canAccess,
  unreadSms,
  onItemClick,
}: {
  section: NavSection
  collapsed: boolean
  canAccess: (n: number) => boolean
  unreadSms: number
  onItemClick: () => void
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
    (section.subSections ?? []).some(sub =>
      sub.items.some(item => location.pathname.startsWith(item.to))
    )
  const [expanded, setExpanded] = useState(section.defaultExpanded ?? isAnyChildActive)

  if (collapsed) {
    // In collapsed mode render icons only — for sub-sections show the first item of each sub
    const collapsedItems: NavItem[] = visibleItems.length > 0
      ? visibleItems
      : (section.subSections ?? []).flatMap(sub =>
          sub.items.filter(item => canAccess(item.minLevel)).slice(0, 1)
        )
    return (
      <div className="mb-1">
        {collapsedItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onItemClick}
            title={label}
            className={({ isActive }) => cn(
              'group relative flex items-center justify-center rounded-lg p-2.5 my-0.5 transition-all duration-150',
              isActive
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-indigo-500" />
                )}
                <Icon size={17} className={cn(
                  isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                )} />
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

  if (section.expandable) {
    return (
      <div className="mb-1">
        <button
          onClick={() => setExpanded(v => !v)}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
            isAnyChildActive ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-800',
          )}
        >
          {section.icon && (
            <section.icon size={16} className={cn(isAnyChildActive ? 'text-indigo-500' : 'text-slate-400')} />
          )}
          <span className="flex-1 text-left truncate">{section.label}</span>
          <ChevronDown
            size={13}
            className={cn('transition-transform duration-200 flex-shrink-0', expanded ? 'rotate-0' : '-rotate-90')}
          />
        </button>

        {expanded && (
          <div className="ml-3 pl-3 border-l border-slate-200 mt-0.5 space-y-0.5">
            {visibleItems.map(({ to, label, icon: Icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                end
                onClick={onItemClick}
                className={({ isActive }) => cn(
                  'group flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={15} className={cn(isActive ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-600')} />
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

            {/* Nested sub-sections (e.g. Twilio / Plivo under Telecom) */}
            {(section.subSections ?? []).map((sub) => (
              <NavSubGroup
                key={sub.label}
                sub={sub}
                canAccess={canAccess}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Non-expandable flat group
  return (
    <div className="space-y-0.5">
      {visibleItems.map(({ to, label, icon: Icon, badge }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onItemClick}
          title={collapsed ? label : undefined}
          className={({ isActive }) => cn(
            'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-all duration-150',
            isActive
              ? 'bg-indigo-50 text-indigo-700 font-semibold'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          )}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-indigo-500" />
              )}
              <div className="relative flex-shrink-0">
                <Icon size={17} className={cn(isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600')} />
                {label === 'SMS Center' && unreadSms > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                    {unreadSms > 9 ? '9+' : unreadSms}
                  </span>
                )}
              </div>
              <span className="truncate leading-none flex-1">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className="min-w-[18px] px-1 py-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, mobileSidebarOpen, toggleSidebar, closeMobileSidebar } = useUIStore()
  const { user, canAccess, logout } = useAuth()
  const { updateUser } = useAuthStore()
  const { unreadSms } = useNotificationStore()
  const navigate = useNavigate()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 4 * 1024 * 1024) { toast.error('Image must be under 4 MB'); return }

    const fd = new FormData()
    fd.append('avatar', file)
    setAvatarUploading(true)
    try {
      const res = await api.post('/profile/upload-avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = res.data?.data?.profile_pic
      if (url) {
        updateUser({ profile_pic: url })
        toast.success('Profile picture updated!')
      }
    } catch {
      // handled by interceptor
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  function handleNav(to: string) {
    navigate(to)
    closeMobileSidebar()
    setShowProfileMenu(false)
  }

  const sections: (NavSection & { type?: 'section-label' })[] = [
    // ─── MAIN ─────────────────────────────────────────────────────────────────
    {
      label: 'MAIN',
      items: [
        { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard, minLevel: 1 },
        { to: '/dialer',    label: 'Dialer',      icon: Phone,           minLevel: 1 },
        { to: '/profile',   label: 'My Profile',  icon: User,            minLevel: 1 },
      ],
    },

    // ─── CRM ─────────────────────────────────────────────────────────────────
    {
      label: 'CRM',
      items: [
        { to: '/crm/dashboard',        label: 'CRM Dashboard',   icon: PieChart,      minLevel: 1 },
        { to: '/crm/pipeline',         label: 'Pipeline Board',  icon: Kanban,        minLevel: 1 },
        { to: '/crm/leads',            label: 'All Leads',       icon: Users,         minLevel: 1 },
        { to: '/crm/lead-status',      label: 'Lead Status',     icon: Tag,           minLevel: LEVELS.MANAGER },
        { to: '/crm/lead-fields',      label: 'Lead Fields',     icon: Settings2,     minLevel: LEVELS.MANAGER },
        { to: '/crm/email-templates',  label: 'Email Templates', icon: Mail,          minLevel: LEVELS.MANAGER },
        { to: '/crm/sms-templates',    label: 'SMS Templates',   icon: MessageSquare, minLevel: LEVELS.MANAGER },
        { to: '/crm/lenders',          label: 'Lenders',         icon: Building2,     minLevel: LEVELS.MANAGER },
        { to: '/crm/affiliate-links',  label: 'Affiliate Links', icon: Link2,         minLevel: LEVELS.MANAGER },
        { to: '/crm/approvals',        label: 'Approvals',       icon: ShieldCheck,   minLevel: LEVELS.MANAGER },
      ],
    },

    // ─── MANAGEMENT ──────────────────────────────────────────────────────────
    {
      label: 'MANAGEMENT',
      items: [
        { to: '/campaigns',    label: 'Campaigns',      icon: Radio,         minLevel: LEVELS.MANAGER },
        { to: '/lists',        label: 'Lead Lists',     icon: List,          minLevel: LEVELS.MANAGER },
        { to: '/agents',       label: 'Agents',         icon: Users,         minLevel: LEVELS.ADMIN },
        { to: '/users',        label: 'Users & Agents', icon: UserCog,       minLevel: LEVELS.ADMIN },
        { to: '/dids',         label: 'DID Management', icon: Hash,          minLevel: LEVELS.ADMIN },
        { to: '/monitoring',   label: 'Monitoring',     icon: Activity,      minLevel: LEVELS.MANAGER },
        { to: '/attendance',   label: 'Attendance',     icon: UserCheck,     minLevel: 1 },
        { to: '/onboarding',   label: 'Onboarding',     icon: Rocket,        minLevel: LEVELS.ADMIN },
        { to: '/billing',      label: 'Billing',        icon: CreditCard,    minLevel: LEVELS.ADMIN },
      ],
    },

    // ─── WORKFORCE ───────────────────────────────────────────────────────────
    {
      label: 'WORKFORCE',
      icon: CalendarClock,
      expandable: true,
      defaultExpanded: false,
      minLevel: LEVELS.MANAGER,
      items: [
        { to: '/workforce',            label: 'Live Dashboard',    icon: Activity,      minLevel: LEVELS.MANAGER },
        { to: '/workforce/shifts',     label: 'Shift Management',  icon: Clock,         minLevel: LEVELS.MANAGER },
        { to: '/workforce/staffing',   label: 'Campaign & Breaks', icon: Users,         minLevel: LEVELS.MANAGER },
        { to: '/workforce/reports',    label: 'WFM Reports',       icon: BarChart3,     minLevel: LEVELS.MANAGER },
        { to: '/workforce/analytics',  label: 'WFM Analytics',     icon: TrendingUp,    minLevel: LEVELS.MANAGER },
      ],
    },

    // ─── COMMUNICATIONS ──────────────────────────────────────────────────────
    {
      label: 'COMMUNICATIONS',
      items: [
        { to: '/sms',          label: 'SMS Center',  icon: MessageSquare,  minLevel: 1 },
        { to: '/chat',         label: 'Team Chat',   icon: MessagesSquare, minLevel: 1 },
        { to: '/gmail-mailbox',    label: 'Gmail Inbox',      icon: Mail,           minLevel: 1 },
        { to: '/google-calendar',  label: 'Google Calendar',  icon: Clock,          minLevel: 1 },
      ],
    },

    // ─── REPORTS ─────────────────────────────────────────────────────────────
    {
      label: 'Reports',
      icon: BarChart3,
      expandable: true,
      defaultExpanded: false,
      minLevel: LEVELS.MANAGER,
      items: [
        { to: '/reports',                  label: 'CDR Report',         icon: BarChart3,  minLevel: LEVELS.MANAGER },
        { to: '/reports/daily',            label: 'Daily Report',       icon: Clock,      minLevel: LEVELS.MANAGER },
        { to: '/reports/agent-summary',    label: 'Agent Summary',      icon: Users,      minLevel: LEVELS.MANAGER },
        { to: '/reports/disposition',      label: 'Disposition Report', icon: ListChecks, minLevel: LEVELS.MANAGER },
        { to: '/reports/live',             label: 'Live Calls',         icon: PhoneCall,  minLevel: LEVELS.MANAGER },
        { to: '/reports/campaign-performance', label: 'Campaign Performance', icon: PieChart,   minLevel: LEVELS.MANAGER },
      ],
    },

    // ─── VOICE ───────────────────────────────────────────────────────────────
    {
      label: 'Voice',
      icon: Mic,
      expandable: true,
      defaultExpanded: false,
      minLevel: LEVELS.ADMIN,
      items: [
        { to: '/ivr',               label: 'IVR Menus',         icon: PhoneCall,  minLevel: LEVELS.ADMIN },
        { to: '/voicemail',         label: 'Voicemail Drops',   icon: Voicemail,  minLevel: LEVELS.ADMIN },
        { to: '/voicemail/mailbox', label: 'Mailbox',           icon: Inbox,      minLevel: LEVELS.MANAGER },
        { to: '/ring-groups',       label: 'Ring Groups',       icon: Users,      minLevel: LEVELS.ADMIN },
        { to: '/extension-groups',  label: 'Extension Groups',  icon: Layers,     minLevel: LEVELS.ADMIN },
      ],
    },

    // ─── AI & TOOLS ──────────────────────────────────────────────────────────
    {
      label: 'AI & Tools',
      icon: BrainCircuit,
      expandable: true,
      defaultExpanded: false,
      minLevel: LEVELS.ADMIN,
      items: [
        { to: '/ai/settings',     label: 'AI Settings',        icon: Bot,        minLevel: LEVELS.ADMIN },
        { to: '/ai/coach',        label: 'AI Coach',           icon: Headphones, minLevel: LEVELS.ADMIN },
        { to: '/ringless',        label: 'Ringless Voicemail', icon: Voicemail,  minLevel: LEVELS.ADMIN },
      ],
    },

    // ─── TELECOM ─────────────────────────────────────────────────────────────
    {
      label: 'Telecom',
      icon: Globe,
      expandable: true,
      defaultExpanded: false,
      minLevel: LEVELS.ADMIN,
      items: [],
      subSections: [
        {
          label: 'Twilio',
          icon: Phone,
          minLevel: LEVELS.ADMIN,
          items: [
            { to: '/twilio',         label: 'Dashboard',       icon: LayoutDashboard, minLevel: LEVELS.ADMIN },
            { to: '/twilio/numbers', label: 'Phone Numbers',   icon: Hash,            minLevel: LEVELS.ADMIN },
            { to: '/twilio/trunks',  label: 'SIP Trunks',      icon: Wifi,            minLevel: LEVELS.ADMIN },
            { to: '/twilio/calls',   label: 'Call Logs',       icon: PhoneCall,       minLevel: LEVELS.MANAGER },
            { to: '/twilio/sms',     label: 'SMS Logs',        icon: MessageSquare,   minLevel: LEVELS.MANAGER },
            { to: '/twilio/usage',   label: 'Usage & Billing', icon: DollarSign,      minLevel: LEVELS.ADMIN },
          ],
        },
        {
          label: 'Plivo',
          icon: Wifi,
          minLevel: LEVELS.ADMIN,
          items: [
            { to: '/plivo',         label: 'Dashboard',       icon: LayoutDashboard, minLevel: LEVELS.ADMIN },
            { to: '/plivo/numbers', label: 'Phone Numbers',   icon: Hash,            minLevel: LEVELS.ADMIN },
            { to: '/plivo/trunks',  label: 'SIP Trunks',      icon: Wifi,            minLevel: LEVELS.ADMIN },
            { to: '/plivo/calls',   label: 'Call Logs',       icon: PhoneCall,       minLevel: LEVELS.MANAGER },
            { to: '/plivo/sms',     label: 'SMS Logs',        icon: MessageSquare,   minLevel: LEVELS.MANAGER },
            { to: '/plivo/usage',   label: 'Usage & Billing', icon: DollarSign,      minLevel: LEVELS.ADMIN },
          ],
        },
      ],
    },

    // ─── SYSTEM ADMIN ────────────────────────────────────────────────────────
    {
      label: 'SYSTEM ADMIN',
      minLevel: LEVELS.SUPERADMIN,
      items: [
        { to: '/admin/clients', label: 'Client Management', icon: Building2, minLevel: LEVELS.SUPERADMIN },
        { to: '/admin/system-health', label: 'System Health', icon: Activity, minLevel: LEVELS.ADMIN },
      ],
    },

    // ─── SETTINGS ────────────────────────────────────────────────────────────
    {
      label: 'Settings',
      icon: Settings,
      expandable: true,
      defaultExpanded: false,
      minLevel: LEVELS.MANAGER,
      items: [
        { to: '/settings',              label: 'General',      icon: Settings2,   minLevel: LEVELS.ADMIN },
        { to: '/settings/labels',       label: 'Labels',       icon: Tag,         minLevel: LEVELS.MANAGER },
        { to: '/settings/dispositions', label: 'Dispositions', icon: ListChecks,  minLevel: LEVELS.MANAGER },
        { to: '/settings/dnc',          label: 'DNC List',     icon: PhoneOff,    minLevel: LEVELS.MANAGER },
        { to: '/settings/fax',          label: 'Fax',          icon: FileText,    minLevel: LEVELS.MANAGER },
        { to: '/settings/security',     label: 'Security',     icon: ShieldCheck, minLevel: LEVELS.ADMIN },
      ],
    },
  ]

  return (
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
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-4 flex-shrink-0 border-b border-slate-200',
        sidebarCollapsed && 'lg:justify-center lg:px-2'
      )}>
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
        {sections.map((section, idx) => {
          const visibleItems = (section.items ?? []).filter(item => canAccess(item.minLevel))
          const hasVisibleSubs = (section.subSections ?? []).some(sub =>
            sub.items.some(item => canAccess(item.minLevel))
          )
          if (visibleItems.length === 0 && !hasVisibleSubs) return null
          if (section.minLevel !== undefined && !canAccess(section.minLevel)) return null

          return (
            <div key={section.label} className="mb-1">
              {idx > 0 && !(section.expandable && sections[idx - 1]?.expandable) && (
                <div className="mx-2 my-2 border-t border-slate-100" />
              )}
              {!section.expandable && (
                !sidebarCollapsed ? (
                  <p className="px-3 mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400 select-none">
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
                  onItemClick={() => { closeMobileSidebar(); setShowProfileMenu(false) }}
                />
              ) : (
                <div className={cn('space-y-0.5', sidebarCollapsed && 'flex flex-col items-center')}>
                  {visibleItems.map(({ to, label, icon: Icon, badge }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => { closeMobileSidebar(); setShowProfileMenu(false) }}
                      title={sidebarCollapsed ? label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium outline-none',
                          'transition-all duration-150',
                          sidebarCollapsed && 'lg:justify-center lg:px-2.5 w-full',
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 font-semibold'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-indigo-500" />
                          )}
                          <div className="relative flex-shrink-0">
                            <Icon size={17} className={cn(
                              'transition-colors duration-150',
                              isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                            )} />
                            {label === 'SMS Center' && unreadSms > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                                {unreadSms > 9 ? '9+' : unreadSms}
                              </span>
                            )}
                          </div>
                          {(!sidebarCollapsed) && (
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

      {/* ── User footer ───────────────────────────────────────────────────── */}
      {user && (
        <div className="flex-shrink-0 relative px-2 py-1.5 border-t border-slate-200">
          {showProfileMenu && !sidebarCollapsed && (
            <div className="absolute bottom-full left-2 right-2 mb-1 rounded-xl py-1 z-50 overflow-hidden bg-white border border-slate-200 shadow-xl">
              {profileMenuItems.map(({ to, label, icon: Icon }) => (
                <button
                  key={to}
                  onClick={() => handleNav(to)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                >
                  <Icon size={14} className="flex-shrink-0 text-slate-400" />
                  {label}
                </button>
              ))}
              <div className="border-t border-slate-100 my-0.5" />
              <button
                onClick={() => { logout(); navigate('/login'); closeMobileSidebar() }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} className="flex-shrink-0 text-red-500" />
                Sign out
              </button>
            </div>
          )}

          {/* Hidden file input for avatar upload */}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />

          {!sidebarCollapsed ? (
            <button
              onClick={() => setShowProfileMenu(p => !p)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all duration-200"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              {/* Avatar with camera overlay */}
              <div
                className="relative w-7 h-7 flex-shrink-0 group/av"
                onClick={e => { e.stopPropagation(); avatarInputRef.current?.click() }}
                title="Change profile picture"
              >
                {user.profile_pic ? (
                  <img
                    src={user.profile_pic}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover"
                    style={{ boxShadow: '0 2px 6px rgba(99,102,241,0.30)' }}
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: '#6366F1', boxShadow: '0 2px 6px rgba(99,102,241,0.30)' }}
                  >
                    {avatarUploading ? '…' : initials(user.name)}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover/av:opacity-100 transition-opacity cursor-pointer">
                  <Camera size={10} className="text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1 text-left leading-none">
                <p className="text-[12px] font-semibold truncate text-slate-900">{user.name}</p>
                <p className="text-[10px] text-indigo-500 font-medium truncate">{getRoleLabel(user.level)}</p>
              </div>
              <ChevronUp
                size={13}
                className={cn('flex-shrink-0 text-slate-400 transition-transform duration-200', !showProfileMenu && 'rotate-180')}
              />
            </button>
          ) : (
            <div className="flex justify-center py-0.5">
              {/* Collapsed avatar with camera overlay */}
              <div className="relative group/av" title="Change profile picture">
                <button
                  onClick={() => setShowProfileMenu(p => !p)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden"
                  style={user.profile_pic ? {} : { background: '#6366F1', boxShadow: '0 2px 6px rgba(99,102,241,0.30)' }}
                >
                  {user.profile_pic
                    ? <img src={user.profile_pic} alt={user.name} className="w-7 h-7 object-cover" />
                    : (avatarUploading ? '…' : initials(user.name))
                  }
                </button>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover/av:opacity-100 transition-opacity cursor-pointer"
                  title="Change profile picture"
                >
                  <Camera size={10} className="text-white" />
                </button>
              </div>
              {showProfileMenu && (
                <div className="absolute bottom-full left-1 mb-1 w-40 rounded-xl py-1 z-50 overflow-hidden bg-white border border-slate-200 shadow-xl">
                  {profileMenuItems.map(({ to, label, icon: Icon }) => (
                    <button key={to} onClick={() => handleNav(to)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      <Icon size={13} className="flex-shrink-0 text-slate-400" />{label}
                    </button>
                  ))}
                  <div className="border-t border-slate-100 my-0.5" />
                  <button
                    onClick={() => { logout(); navigate('/login'); closeMobileSidebar() }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={13} className="flex-shrink-0 text-red-500" />Sign out
                  </button>
                </div>
              )}
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
        {sidebarCollapsed ? <ChevronRight size={11} /> : <ChevronRight size={11} className="rotate-180" />}
      </button>
    </div>
  )
}
