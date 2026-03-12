import { useState, useEffect } from 'react'
import { Bell, ChevronDown, LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useNotificationStore } from '../stores/notification.store'
import { initials } from '../utils/format'
import { cn } from '../utils/cn'

type AgentStatus = 'available' | 'busy' | 'break' | 'offline'

const statusConfig: Record<AgentStatus, { color: string; label: string }> = {
  available: { color: 'bg-emerald-500', label: 'Available' },
  busy:      { color: 'bg-red-500',     label: 'On Call'   },
  break:     { color: 'bg-amber-500',   label: 'On Break'  },
  offline:   { color: 'bg-slate-400',   label: 'Offline'   },
}

export function Topbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { unreadSms, unreadVoicemail } = useNotificationStore()
  const [status, setStatus] = useState<AgentStatus>('available')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [clock, setClock] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const totalNotifications = unreadSms + unreadVoicemail

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header
      className="h-16 flex items-center justify-between px-6 flex-shrink-0 border-b border-slate-100"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* Left: date + live clock */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-400 tracking-wide">
          {clock.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
        <span className="text-slate-300 text-sm select-none">|</span>
        <span className="text-sm font-medium text-slate-500" style={{ marginLeft: 2, fontVariantNumeric: 'tabular-nums' }}>
          {clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">

        {/* Agent status picker */}
        <div className="relative">
          <button
            onClick={() => { setShowStatusMenu(!showStatusMenu); setShowProfileMenu(false) }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all duration-150 text-sm font-medium"
          >
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusConfig[status].color)} />
            <span className="text-slate-700">{statusConfig[status].label}</span>
            <ChevronDown size={13} className={cn('text-slate-400 transition-transform duration-150', showStatusMenu && 'rotate-180')} />
          </button>

          <div className={cn(
            'absolute right-0 top-full mt-2 w-40 bg-white rounded-2xl border border-slate-100 py-1.5 z-50',
            'shadow-[0_8px_30px_rgba(0,0,0,0.10)] transition-all duration-150 origin-top-right',
            showStatusMenu ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
          )}>
            {(Object.keys(statusConfig) as AgentStatus[]).map(s => (
              <button
                key={s}
                onClick={() => { setStatus(s); setShowStatusMenu(false) }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors duration-100',
                  s === status ? 'bg-slate-50 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusConfig[s].color)} />
                {statusConfig[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Notification bell */}
        <button className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-colors duration-150 text-slate-500 hover:text-slate-700">
          <Bell size={18} />
          {totalNotifications > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
              {totalNotifications > 9 ? '9+' : totalNotifications}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* User profile */}
        <div className="relative">
          <button
            onClick={() => { setShowProfileMenu(!showProfileMenu); setShowStatusMenu(false) }}
            className="flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-xl hover:bg-slate-50 transition-colors duration-150"
            title={user?.name}
          >
            {user?.profile_pic ? (
              <img
                src={user.profile_pic}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover shadow-sm flex-shrink-0"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shadow-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                {user ? initials(user.name) : '?'}
              </div>
            )}
            <ChevronDown size={13} className={cn('text-slate-400 transition-transform duration-150', showProfileMenu && 'rotate-180')} />
          </button>

          <div className={cn(
            'absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-slate-100 z-50 overflow-hidden',
            'shadow-[0_8px_30px_rgba(0,0,0,0.10)] transition-all duration-150 origin-top-right',
            showProfileMenu ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
          )}>
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
              <p className="text-[13px] font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email}</p>
            </div>
            <div className="py-1">
              <button onClick={() => { navigate('/profile'); setShowProfileMenu(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors duration-100">
                <User size={14} className="text-slate-400 flex-shrink-0" /> Profile
              </button>
            </div>
            <div className="border-t border-slate-100 py-1">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-100">
                <LogOut size={14} className="flex-shrink-0" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
