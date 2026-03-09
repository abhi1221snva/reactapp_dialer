import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import { IncomingCallModal } from '../components/dialer/IncomingCallModal'
import { WebPhone } from '../components/webphone/WebPhone'
import { FloatingChat } from '../components/chat/FloatingChat'
import { FloatingFab } from '../components/floating/FloatingFab'
import { useUIStore } from '../stores/ui.store'

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

      {/* Right column: TopHeader + scrollable page content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopHeader />
        <main className="flex-1 overflow-y-auto px-6 py-4">
          <Outlet />
        </main>
      </div>

      <IncomingCallModal />
      <FloatingChat />
      <WebPhone />
      <FloatingFab />
    </div>
  )
}
