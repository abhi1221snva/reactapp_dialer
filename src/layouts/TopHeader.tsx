import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell, Menu, Phone, Target, User, LogOut, Camera, ChevronDown, Building2, Clock, Trash2 } from 'lucide-react'
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
  if (level >= 11) return 'System Administrator'
  if (level >= 9)  return 'Super Admin'
  if (level >= 7)  return 'Admin'
  if (level >= 5)  return 'Manager'
  if (level >= 3)  return 'Associate'
  if (level >= 1)  return 'Agent'
  return 'User'
}

// ─── Live Clock (timezone-aware, updates every second) ──────────────────────
function LiveClock({ timezone }: { timezone?: string }) {
  const [time, setTime] = useState('')
  const [abbr, setAbbr] = useState('')
  const [fullName, setFullName] = useState('')
  const [dateStr, setDateStr] = useState('')

  const resolvedTz = useCallback(() => {
    const tz = timezone?.trim()
    if (!tz) return Intl.DateTimeFormat().resolvedOptions().timeZone
    // Validate timezone by trying to format with it
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz }).format()
      return tz
    } catch {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  }, [timezone])

  const tick = useCallback(() => {
    const tz = resolvedTz()
    const now = new Date()

    // HH:mm:ss
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(now)
    setTime(parts.map(p => p.value).join(''))

    // Timezone abbreviation (e.g. EST, IST)
    const tzName = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, timeZoneName: 'short',
    }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value ?? ''
    setAbbr(tzName)

    // Full timezone name for tooltip
    const tzLong = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, timeZoneName: 'long',
    }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value ?? tz
    setFullName(tzLong)

    // Date for tooltip
    setDateStr(new Intl.DateTimeFormat('en-US', {
      timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    }).format(now))
  }, [resolvedTz])

  useEffect(() => {
    tick() // immediate first render
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [tick])

  if (!time) return null

  return (
    <div
      title={`${fullName}\n${dateStr}`}
      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-default select-none transition-colors duration-200 hover:bg-slate-200/60"
      style={{ background: '#f1f5f9' }}
    >
      <Clock size={13} className="text-slate-400 flex-shrink-0" />
      <span className="text-[12px] font-mono font-medium tracking-wide tabular-nums" style={{ color: '#334155' }}>
        {time}
      </span>
      {abbr && (
        <span className="text-[10px] font-semibold uppercase" style={{ color: '#64748b' }}>
          {abbr}
        </span>
      )}
    </div>
  )
}

export function TopHeader() {
  const { user, logout } = useAuth()
  const { updateUser } = useAuthStore()
  const { unreadSms } = useNotificationStore()
  const { toggleMobileSidebar } = useUIStore()
  const { engine, setEngine } = useEngineStore()
  const navigate = useNavigate()

  // Bootstrap timezone + companyName from profile API if missing in auth store (existing sessions)
  const profileFetched = useRef(false)
  useEffect(() => {
    if (user && (!user.timezone || !user.companyName) && !profileFetched.current) {
      profileFetched.current = true
      api.get('/profile').then(res => {
        const d = res.data?.data ?? res.data
        const updates: Partial<typeof user> = {}
        if (!user.timezone && d?.timezone) updates.timezone = d.timezone
        if (!user.companyName && d?.companyName) updates.companyName = d.companyName
        if (Object.keys(updates).length) updateUser(updates)
      }).catch(() => {})
    }
  }, [user, updateUser])

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

  const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='40' fill='%23e2e8f0'/%3E%3Ccircle cx='40' cy='30' r='12' fill='%2394a3b8'/%3E%3Cellipse cx='40' cy='62' rx='20' ry='14' fill='%2394a3b8'/%3E%3C/svg%3E"

  return (
    <header
      className="h-[52px] flex-shrink-0 flex items-center gap-4 px-4 lg:px-6 z-10"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
      }}
    >

      {/* Mobile hamburger */}
      <button
        onClick={toggleMobileSidebar}
        className="lg:hidden p-2 rounded-full text-slate-500 hover:bg-white/70 hover:text-slate-700 transition-all duration-200"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* ── Engine segmented toggle ──────────────────────────────────────── */}
      <div
        className="flex items-center p-[3px] rounded-full gap-[2px] flex-shrink-0"
        style={{ background: '#e9ecf1' }}
      >
        {ENGINES.map(({ id, label, icon: Icon }) => {
          const isActive = engine === id
          const activeStyles: React.CSSProperties = isActive
            ? {
                background: id === 'dialer' ? '#2563eb' : '#16a34a',
                color: '#ffffff',
                fontWeight: 600,
                boxShadow: id === 'dialer'
                  ? '0 2px 6px rgba(37,99,235,0.35)'
                  : '0 2px 6px rgba(22,163,74,0.35)',
              }
            : {
                background: 'transparent',
                color: '#64748b',
                fontWeight: 500,
                boxShadow: 'none',
              }
          return (
            <button
              key={id}
              onClick={() => switchEngine(id)}
              title={ENGINES.find(e => e.id === id)?.description}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] cursor-pointer select-none"
              style={{
                ...activeStyles,
                transition: 'all 0.2s ease',
              }}
            >
              <Icon size={13} className="flex-shrink-0" style={{
                color: isActive ? '#ffffff' : '#94a3b8',
                transition: 'color 0.2s ease',
              }} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* ── Right actions ────────────────────────────────────────────────── */}
      <div className="ml-auto flex items-center gap-2.5">

        {/* Client / Company name */}
        {user?.companyName && (
          <>
            <div className="hidden md:flex items-center gap-1.5">
              <Building2 size={13} className="text-slate-400 flex-shrink-0" />
              <span className="text-[12px] font-medium text-slate-500 truncate max-w-[160px]">{user.companyName}</span>
            </div>
            <div className="hidden md:block w-px h-5 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.08)' }} />
          </>
        )}

        {/* Live Clock */}
        <LiveClock timezone={user?.timezone} />

        {/* Notifications */}
        <Link
          to="/sms"
          className="relative p-2 rounded-full text-slate-500 hover:bg-white/70 hover:text-slate-700 transition-all duration-200"
          title="SMS Center"
        >
          <Bell size={17} />
          {unreadSms > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none ring-2 ring-white/80">
              {unreadSms > 9 ? '9+' : unreadSms}
            </span>
          )}
        </Link>

        {/* Clear Cache — system_administrator only */}
        {user && user.level >= 11 && (
          <button
            onClick={async () => {
              try {
                localStorage.clear()
                sessionStorage.clear()
                if ('caches' in window) {
                  const keys = await caches.keys()
                  await Promise.all(keys.map(k => caches.delete(k)))
                }
                toast.success('Cache cleared — reloading…')
                setTimeout(() => window.location.reload(), 500)
              } catch {
                toast.error('Failed to clear cache')
              }
            }}
            className="p-2 rounded-full text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all duration-200"
            title="Clear Cache"
          >
            <Trash2 size={17} />
          </button>
        )}

        {/* Divider */}
        <div className="w-px h-6 mx-0.5 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.08)' }} />

        {/* Profile dropdown */}
        {user && (
          <div ref={menuRef} className="relative">
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

            <button
              onClick={() => setShowProfileMenu(p => !p)}
              className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-full hover:bg-white/70 transition-all duration-200"
            >
              {/* Avatar */}
              <div className="relative group/av flex-shrink-0">
                <img
                  src={user.profile_pic || DEFAULT_AVATAR}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-white/80"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}
                  onError={e => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR }}
                />
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
                <p className="text-[12px] font-semibold text-slate-800 truncate max-w-[120px]">{user.name}</p>
                <p className="text-[10px] font-medium text-slate-400 truncate">{getRoleLabel(user.level)}</p>
              </div>

              <ChevronDown size={13} className={cn('hidden sm:block flex-shrink-0 text-slate-400 transition-transform duration-200', showProfileMenu && 'rotate-180')} />
            </button>

            {/* Dropdown */}
            {showProfileMenu && (
              <div
                className="absolute right-0 top-full mt-1.5 w-48 rounded-xl py-1 bg-white border border-slate-200/80 z-50 animate-fadeIn overflow-hidden"
                style={{ boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12), 0 2px 8px -2px rgba(0,0,0,0.06)' }}
              >
                <button
                  onClick={() => { navigate('/profile'); setShowProfileMenu(false) }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors duration-200 cursor-pointer"
                >
                  <User size={14} className="flex-shrink-0 text-slate-400" /> My Profile
                </button>
{user.level >= 7 && (
                  <button
                    onClick={() => { navigate('/crm/company-settings'); setShowProfileMenu(false) }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors duration-200 cursor-pointer"
                  >
                    <Building2 size={14} className="flex-shrink-0 text-slate-400" /> Company Settings
                  </button>
                )}
                <div className="border-t border-slate-100 my-0.5" />
                <button
                  onClick={() => { logout(); navigate('/login') }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-200 cursor-pointer"
                >
                  <LogOut size={14} className="flex-shrink-0 text-red-400" /> Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
