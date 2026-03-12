import { Bell, Search, Menu, Phone, Target } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useNotificationStore } from '../stores/notification.store'
import { useUIStore } from '../stores/ui.store'
import { useEngineStore, type Engine } from '../stores/engine.store'
import { initials } from '../utils/format'
import { cn } from '../utils/cn'

const ENGINES: { id: Engine; label: string; icon: typeof Phone; description: string }[] = [
  { id: 'dialer', label: 'Phone System', icon: Phone,  description: 'Campaigns, calls, reports & voice' },
  { id: 'crm',    label: 'CRM',          icon: Target, description: 'Leads, pipeline & communications' },
]

const ENGINE_HOME: Record<Engine, string> = {
  dialer: '/dashboard',
  crm: '/crm/dashboard',
}

export function TopHeader() {
  const { user } = useAuth()
  const { unreadSms } = useNotificationStore()
  const { toggleMobileSidebar } = useUIStore()
  const { engine, setEngine } = useEngineStore()
  const navigate = useNavigate()

  function switchEngine(e: Engine) {
    setEngine(e)
    navigate(ENGINE_HOME[e])
  }

  return (
    <header className="h-14 flex-shrink-0 bg-white border-b border-slate-200 flex items-center gap-3 px-4 lg:px-5 z-10">

      {/* Mobile hamburger */}
      <button
        onClick={toggleMobileSidebar}
        className="lg:hidden action-btn"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* ── Engine toggle pill ───────────────────────────────────────────── */}
      <div className="flex items-center bg-slate-100 rounded-xl p-0.5 gap-0.5 flex-shrink-0">
        {ENGINES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => switchEngine(id)}
            title={ENGINES.find(e => e.id === id)?.description}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200',
              engine === id
                ? id === 'dialer'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Icon
              size={13}
              className={cn(
                'flex-shrink-0 transition-colors duration-200',
                engine === id
                  ? id === 'dialer' ? 'text-indigo-500' : 'text-emerald-500'
                  : 'text-slate-400'
              )}
            />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative flex-1 max-w-sm hidden md:block">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search..."
          className="input input-sm w-full pl-8 text-sm"
        />
      </div>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1">

        {/* Notifications */}
        <Link to="/sms" className="relative action-btn" title="SMS Center">
          <Bell size={17} />
          {unreadSms > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
              {unreadSms > 9 ? '9+' : unreadSms}
            </span>
          )}
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* User avatar */}
        {user && (
          user.profile_pic ? (
            <img
              src={user.profile_pic}
              alt={user.name}
              title={user.name}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0 select-none"
              style={{ boxShadow: '0 1px 4px rgba(99,102,241,0.30)' }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 select-none"
              style={{
                background: engine === 'dialer'
                  ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
                  : 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                boxShadow: '0 1px 4px rgba(99,102,241,0.30)',
              }}
              title={user.name}
            >
              {initials(user.name)}
            </div>
          )
        )}
      </div>
    </header>
  )
}
