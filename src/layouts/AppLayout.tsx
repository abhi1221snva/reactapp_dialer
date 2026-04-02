import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import { IncomingCallModal } from '../components/dialer/IncomingCallModal'
import { WebPhone } from '../components/webphone/WebPhone'
import { FloatingChatOrchestrator } from '../components/chat/FloatingChatOrchestrator'
import { FloatingFab } from '../components/floating/FloatingFab'
import { FloatingSms } from '../components/sms/FloatingSms'
import { useUIStore } from '../stores/ui.store'
import { useAuthStore } from '../stores/auth.store'
import { Building2, LogOut } from 'lucide-react'

function ImpersonationBanner() {
  const { impersonating, impersonatingCompany, stopImpersonation } = useAuthStore()
  const navigate = useNavigate()

  if (!impersonating) return null

  const handleReturn = () => {
    stopImpersonation()
    navigate('/admin/clients')
    window.location.reload() // flush all cached queries
  }

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-2 bg-amber-500 text-white text-sm font-medium flex-shrink-0">
      <div className="flex items-center gap-2">
        <Building2 size={15} />
        <span>
          Viewing as client: <strong>{impersonatingCompany}</strong>
          {' '}— You are still logged in as yourself (System Admin)
        </span>
      </div>
      <button
        onClick={handleReturn}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-xs font-semibold"
      >
        <LogOut size={12} /> Return to Admin
      </button>
    </div>
  )
}

export function AppLayout() {
  const { mobileSidebarOpen, closeMobileSidebar } = useUIStore()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* Mobile backdrop — closes sidebar on outside tap */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Right column: impersonation banner + TopHeader + scrollable page content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <ImpersonationBanner />
        <TopHeader />
        <main className="flex-1 overflow-y-auto px-5 py-3">
          <Outlet />
        </main>
      </div>

      <IncomingCallModal />
      <FloatingChatOrchestrator />
      <WebPhone />
      <FloatingSms />
      <FloatingFab />
    </div>
  )
}
