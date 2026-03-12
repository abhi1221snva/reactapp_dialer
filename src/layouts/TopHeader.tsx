import { Bell, Search, Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useNotificationStore } from '../stores/notification.store'
import { useUIStore } from '../stores/ui.store'
import { initials } from '../utils/format'

export function TopHeader() {
  const { user } = useAuth()
  const { unreadSms } = useNotificationStore()
  const { toggleMobileSidebar } = useUIStore()

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

      {/* Search bar */}
      <div className="relative flex-1 max-w-sm">
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
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
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
