import { useState, useRef, useEffect } from 'react'
import { Bell, Search, Menu, Phone, Target, User, LogOut, Camera, ChevronDown, Settings, Building2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../stores/auth.store'
import { useNotificationStore } from '../stores/notification.store'
import { useUIStore } from '../stores/ui.store'
import { useEngineStore, type Engine } from '../stores/engine.store'
import { initials } from '../utils/format'
import { cn } from '../utils/cn'
import api from '../api/axios'
import toast from 'react-hot-toast'

const ENGINES: { id: Engine; label: string; icon: typeof Phone; description: string }[] = [
  { id: 'dialer', label: 'Phone System', icon: Phone,  description: 'Campaigns, calls, reports & voice' },
  { id: 'crm',    label: 'CRM',          icon: Target, description: 'Leads, pipeline & communications' },
]

const ENGINE_HOME: Record<Engine, string> = {
  dialer: '/dashboard',
  crm: '/crm/dashboard',
}

function getRoleLabel(level?: number): string {
  if (level === undefined) return ''
  if (level >= 10) return 'Super Admin'
  if (level >= 9)  return 'System Admin'
  if (level >= 7)  return 'Telecom Admin'
  if (level >= 6)  return 'Admin'
  if (level >= 5)  return 'Manager'
  if (level >= 3)  return 'Agent'
  return 'User'
}

export function TopHeader() {
  const { user, logout } = useAuth()
  const { updateUser } = useAuthStore()
  const { unreadSms } = useNotificationStore()
  const { toggleMobileSidebar } = useUIStore()
  const { engine, setEngine } = useEngineStore()
  const navigate = useNavigate()

  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('avatar', file)
    setAvatarUploading(true)
    try {
      const res = await api.post('/profile/upload-avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const url = res.data?.data?.profile_pic
      if (url) { updateUser({ profile_pic: url }); toast.success('Profile picture updated!') }
    } catch { toast.error('Upload failed') }
    setAvatarUploading(false)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  function switchEngine(e: Engine) {
    setEngine(e)
    navigate(ENGINE_HOME[e])
  }

  const avatarBg = engine === 'dialer'
    ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
    : 'linear-gradient(135deg, #059669 0%, #10B981 100%)'

  return (
    <header className="h-11 flex-shrink-0 bg-white border-b border-slate-200 flex items-center gap-3 px-4 lg:px-5 z-10">

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

        {/* Profile dropdown */}
        {user && (
          <div ref={menuRef} className="relative">
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

            <button
              onClick={() => setShowProfileMenu(p => !p)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 transition-colors"
            >
              {/* Avatar */}
              <div className="relative group/av flex-shrink-0">
                {user.profile_pic ? (
                  <img
                    src={user.profile_pic}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover"
                    style={{ boxShadow: '0 1px 4px rgba(99,102,241,0.25)' }}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ background: avatarBg, boxShadow: '0 1px 4px rgba(99,102,241,0.25)' }}
                  >
                    {avatarUploading ? '…' : initials(user.name)}
                  </div>
                )}
                <div
                  onClick={e => { e.stopPropagation(); avatarInputRef.current?.click() }}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover/av:opacity-100 transition-opacity cursor-pointer"
                  title="Change profile picture"
                >
                  <Camera size={10} className="text-white" />
                </div>
              </div>

              {/* Name + role */}
              <div className="hidden sm:block text-left leading-none">
                <p className="text-[12px] font-semibold text-slate-900 truncate max-w-[120px]">{user.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{getRoleLabel(user.level)}</p>
              </div>

              <ChevronDown size={13} className={cn('hidden sm:block flex-shrink-0 text-slate-400 transition-transform duration-200', showProfileMenu && 'rotate-180')} />
            </button>

            {/* Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl py-1 bg-white border border-slate-200 shadow-xl z-50">
                <button
                  onClick={() => { navigate('/profile'); setShowProfileMenu(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <User size={14} className="flex-shrink-0 text-slate-400" /> My Profile
                </button>
                <button
                  onClick={() => { navigate('/settings'); setShowProfileMenu(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <Settings size={14} className="flex-shrink-0 text-slate-400" /> Settings
                </button>
                {user.level >= 7 && (
                  <button
                    onClick={() => { navigate('/crm/company-settings'); setShowProfileMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <Building2 size={14} className="flex-shrink-0 text-slate-400" /> Company Settings
                  </button>
                )}
                <div className="border-t border-slate-100 my-0.5" />
                <button
                  onClick={() => { logout(); navigate('/login') }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} className="flex-shrink-0 text-red-500" /> Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
