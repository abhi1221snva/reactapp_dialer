import { useState, useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Phone, LayoutDashboard, Target, Sparkles, Zap,
  ChevronDown, ArrowLeftToLine, ArrowRightFromLine, X,
} from 'lucide-react'
import { cn } from '../utils/cn'
import { useUIStore } from '../stores/ui.store'
import { useAuth } from '../hooks/useAuth'
import { useNotificationStore } from '../stores/notification.store'
import { useEngineStore } from '../stores/engine.store'
import { useMenuStore, type MenuSectionApi } from '../stores/menu.store'
import { resolveIcon } from '../utils/iconMap'
import { initials } from '../utils/format'

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

function getRoleLabel(level?: number): string {
  if (!level) return 'Agent'
  if (level >= 11) return 'System Administrator'
  if (level >= 9)  return 'Super Admin'
  if (level >= 7)  return 'Admin'
  if (level >= 5)  return 'Manager'
  if (level >= 3)  return 'Associate'
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

/** Minimal fallback menu if API fails */
const FALLBACK_SECTIONS: NavSection[] = [
  {
    label: 'CORE',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, minLevel: 1 },
      { to: '/dialer-studio',      label: 'Dialer Studio', icon: Sparkles,  minLevel: 1 },
      { to: '/dialer/campaign-auto', label: 'Auto Dialer', icon: Zap,       minLevel: 3 },
    ],
  },
]

/** Check if a route `to` string (which may contain query params) matches the current location */
function isRouteActive(to: string, location: { pathname: string; search: string }): boolean {
  const qIdx = to.indexOf('?')
  const toPath = qIdx >= 0 ? to.slice(0, qIdx) : to
  const toSearch = qIdx >= 0 ? to.slice(qIdx) : ''

  if (location.pathname !== toPath) return false
  // If the link has no query params, only match when location also has none
  if (!toSearch) return !location.search
  return location.search === toSearch
}

/** Transform API menu sections into the NavSection[] format used by rendering */
function apiToNavSections(apiSections: MenuSectionApi[], badgeSources: Record<string, number>): NavSection[] {
  return apiSections.map((section) => ({
    label: section.section_label,
    items: section.items.map((item) => ({
      to: item.route_path,
      label: item.label,
      icon: resolveIcon(item.icon_name),
      minLevel: 1, // Already filtered by backend — all returned items are accessible
      badge: item.badge_source ? (badgeSources[item.badge_source] ?? undefined) : undefined,
    })),
  }))
}

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

  const isAnyActive = visibleItems.some(item => isRouteActive(item.to, location) || location.pathname.startsWith(item.to.split('?')[0] + '/'))
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
          {visibleItems.map(({ to, label, icon: ItemIcon }) => {
            const active = isRouteActive(to, location)
            return (
            <NavLink key={to} to={to} onClick={onItemClick}
              className={() => cn(
                'group flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                active ? accent.active : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
                <>
                  <ItemIcon size={14} className={cn(active ? accent.activeIcon : 'text-slate-400 group-hover:text-slate-600')} />
                  <span className="truncate leading-none flex-1">{label}</span>
                </>
            </NavLink>
            )
          })}
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
    visibleItems.some(item => isRouteActive(item.to, location) || location.pathname.startsWith(item.to.split('?')[0] + '/')) ||
    (section.subSections ?? []).some(sub => sub.items.some(item => isRouteActive(item.to, location) || location.pathname.startsWith(item.to.split('?')[0] + '/')))
  const [expanded, setExpanded] = useState(section.defaultExpanded ?? isAnyChildActive)

  if (collapsed) {
    const collapsedItems: NavItem[] = visibleItems.length > 0
      ? visibleItems
      : (section.subSections ?? []).flatMap(sub => sub.items.filter(item => canAccess(item.minLevel)).slice(0, 1))
    return (
      <div className="mb-1">
        {collapsedItems.map(({ to, label, icon: ItemIcon }) => (
          <NavLink key={to} to={to} end onClick={onItemClick}
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
                <ItemIcon size={17} className={cn(isActive ? accent.activeIcon : 'text-slate-400 group-hover/nav:text-slate-600')} />
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
          {visibleItems.map(({ to, label, icon: ItemIcon, badge }) => {
            const active = isRouteActive(to, location)
            return (
            <NavLink key={to} to={to} onClick={onItemClick}
              className={() => cn(
                'group flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                active ? accent.active : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
                <>
                  <ItemIcon size={15} className={cn(active ? accent.activeIcon : 'text-slate-400 group-hover:text-slate-600')} />
                  <span className="truncate leading-none flex-1">{label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className="min-w-[18px] h-4.5 px-1 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </>
            </NavLink>
            )
          })}
          {(section.subSections ?? []).map(sub => (
            <NavSubGroup key={sub.label} sub={sub} canAccess={canAccess} onItemClick={onItemClick} accent={accent} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Flat item list (non-expandable sections) — uses isRouteActive for query-param-aware matching
function FlatItems({ items, collapsed, accent, unreadSms, onItemClick, showTooltip, hideTooltip }: {
  items: NavItem[]; collapsed: boolean; accent: AccentSet; unreadSms: number
  onItemClick: () => void
  showTooltip: (label: string, el: HTMLElement) => void; hideTooltip: () => void
}) {
  const location = useLocation()
  return (
    <div className={cn('space-y-0.5', collapsed && 'flex flex-col items-center')}>
      {items.map(({ to, label, icon: ItemIcon, badge }) => {
        const active = isRouteActive(to, location)
        return (
          <NavLink
            key={to}
            to={to}
            onClick={onItemClick}
            onMouseEnter={collapsed ? (e) => showTooltip(label, e.currentTarget) : undefined}
            onMouseLeave={collapsed ? hideTooltip : undefined}
            className={() => cn(
              'group/nav relative flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium outline-none',
              'transition-all duration-150',
              collapsed && 'lg:justify-center lg:px-2.5 w-full',
              active ? accent.active : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <>
              {active && <span className={cn('absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full', accent.activeBar)} />}
              <div className="relative flex-shrink-0">
                <ItemIcon size={17} className={cn('transition-colors duration-150', active ? accent.activeIcon : 'text-slate-400 group-hover/nav:text-slate-600')} />
                {label === 'SMS Center' && unreadSms > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                    {unreadSms > 9 ? '9+' : unreadSms}
                  </span>
                )}
              </div>
              {!collapsed && (
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
          </NavLink>
        )
      })}
    </div>
  )
}

// ─── Skeleton loader for menu loading state ──────────────────────────────────
function MenuSkeleton({ collapsed }: { collapsed: boolean }) {
  const bars = [1, 2, 3, 4, 5, 6, 7, 8]
  if (collapsed) {
    return (
      <div className="space-y-2 px-2 py-3">
        {bars.map(i => (
          <div key={i} className="mx-auto w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    )
  }
  return (
    <div className="space-y-3 px-3 py-2">
      {[1, 2, 3].map(section => (
        <div key={section}>
          <div className="h-2.5 w-16 bg-slate-100 rounded animate-pulse mb-2" />
          {[1, 2].map(item => (
            <div key={item} className="flex items-center gap-3 px-3 py-1.5">
              <div className="w-4 h-4 rounded bg-slate-100 animate-pulse flex-shrink-0" />
              <div className="h-3 bg-slate-100 rounded animate-pulse flex-1" style={{ maxWidth: `${60 + section * 20}px` }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, mobileSidebarOpen, toggleSidebar, closeMobileSidebar } = useUIStore()
  const { user, canAccess } = useAuth()
  const { unreadSms } = useNotificationStore()
  const { engine } = useEngineStore()
  const navigate = useNavigate()
  const { sections: apiSections, loading, loaded, error, fetchMenu } = useMenuStore()

  const accent = ACCENT[engine]

  // Fetch menu from API when engine changes or on first mount
  useEffect(() => {
    fetchMenu(engine)
  }, [engine, fetchMenu])

  // Build badge sources from notification store
  const badgeSources = useMemo<Record<string, number>>(() => ({
    unreadSms,
  }), [unreadSms])

  // Transform API data into NavSection[] — or use fallback
  const effectiveSections = useMemo<NavSection[]>(() => {
    if (loaded && apiSections.length > 0) {
      return apiToNavSections(apiSections, badgeSources)
    }
    if (error) {
      return FALLBACK_SECTIONS
    }
    return []
  }, [apiSections, loaded, error, badgeSources])

  // Fixed-position tooltip state for collapsed sidebar
  const [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(null)
  const showTooltip = useCallback((label: string, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    setTooltip({ label, top: rect.top + rect.height / 2 })
  }, [])
  const hideTooltip = useCallback(() => setTooltip(null), [])

  function handleNav(to: string) { navigate(to); closeMobileSidebar() }

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
        {loading && !loaded ? (
          <MenuSkeleton collapsed={sidebarCollapsed} />
        ) : (
          effectiveSections.map((section, idx) => {
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
                  <FlatItems
                    items={visibleItems}
                    collapsed={sidebarCollapsed}
                    accent={accent}
                    unreadSms={unreadSms}
                    onItemClick={() => { closeMobileSidebar() }}
                    showTooltip={showTooltip}
                    hideTooltip={hideTooltip}
                  />
                )}
              </div>
            )
          })
        )}
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
