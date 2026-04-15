import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, FileText, LogOut, ChevronRight } from 'lucide-react'
import { useMerchantAuthStore } from '../stores/merchantAuth.store'
import merchantPortalService, { type MerchantApplication } from '../services/merchantPortal.service'

export function MerchantPortalLayout() {
  const { merchant, logout } = useMerchantAuthStore()
  const navigate = useNavigate()

  // Fetch applications once here so the sidebar count is always in sync with the list.
  const { data: applications = [] } = useQuery<MerchantApplication[]>({
    queryKey: ['merchant-applications'],
    queryFn: async () => {
      const r = await merchantPortalService.listApplications()
      return r.data?.data ?? []
    },
    staleTime: 30_000,
    enabled: !!merchant,
  })

  const handleLogout = () => {
    logout()
    navigate('/merchant/login')
  }

  const navItems = [
    { to: '/merchant/applications', label: 'Applications', icon: FileText, count: applications.length },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside style={{ width: 240, background: '#1e293b', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo / brand */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LayoutDashboard size={18} color="white" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>Merchant Portal</p>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                {merchant?.email ?? ''}
              </p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ to, label, icon: Icon, count }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
                background: isActive ? 'rgba(99,102,241,.18)' : 'transparent',
                transition: 'background .15s',
              })}
              className="merchant-nav-link"
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} color={isActive ? '#a5b4fc' : '#64748b'} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: isActive ? '#a5b4fc' : '#94a3b8' }}>
                    {label}
                  </span>
                  {count > 0 && (
                    <span style={{
                      background: '#4f46e5', color: '#fff', fontSize: 10,
                      fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                      minWidth: 20, textAlign: 'center',
                    }}>
                      {count}
                    </span>
                  )}
                  <ChevronRight size={12} color={isActive ? '#a5b4fc' : '#475569'} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, border: 'none',
              background: 'transparent', cursor: 'pointer', transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={15} color="#ef4444" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet context={{ applications }} />
      </main>
    </div>
  )
}
