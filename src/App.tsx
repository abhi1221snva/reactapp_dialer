import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store'
import { usePusher } from './hooks/usePusher'

// Layouts
import { AuthLayout } from './layouts/AuthLayout'
import { AppLayout } from './layouts/AppLayout'

// Auth pages
import { Login } from './pages/auth/Login'
import { ForgotPassword } from './pages/auth/ForgotPassword'

// App pages
import { Dashboard } from './pages/dashboard/Dashboard'
import { Dialer } from './pages/dialer/Dialer'
import { CrmLeads } from './pages/crm/CrmLeads'
import { LeadForm } from './pages/crm/LeadForm'
import { LeadDetail } from './pages/crm/LeadDetail'
import { Campaigns } from './pages/campaigns/Campaigns'
import { CreateCampaign } from './modules/campaigns/CreateCampaign'
import { EditCampaign } from './modules/campaigns/EditCampaign'
import { Users } from './pages/users/Users'
import { UserForm } from './pages/users/UserForm'
import { Dids } from './pages/dids/Dids'
import { DidForm } from './pages/dids/DidForm'
import { Lists } from './pages/lists/Lists'
import { ListForm } from './pages/lists/ListForm'
import { ListDetail } from './pages/lists/ListDetail'
import { ListLeads } from './pages/lists/ListLeads'
import { ListEditForm } from './pages/lists/ListEditForm'
import { Reports } from './pages/reports/Reports'
import { SMSCenter } from './pages/sms/SMSCenter'
import { TeamChat } from './pages/chat/TeamChat'
import { AgentMonitoring } from './pages/monitoring/AgentMonitoring'
import { Attendance } from './pages/attendance/Attendance'
import { Billing } from './pages/billing/Billing'
import { Settings } from './pages/settings/Settings'
import { Labels } from './pages/settings/Labels'
import { DispositionList } from './modules/dispositions/DispositionList'
import { DncList } from './modules/dnc/DncList'
import { FaxList } from './modules/fax/FaxList'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

function AppWithPusher() {
  usePusher()
  return <AppLayout />
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute><AppWithPusher /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dialer" element={<Dialer />} />

        {/* CRM */}
        <Route path="/crm" element={<CrmLeads />} />
        <Route path="/crm/create" element={<LeadForm />} />
        <Route path="/crm/:id/edit" element={<LeadForm />} />
        <Route path="/crm/:id" element={<LeadDetail />} />

        {/* Campaigns */}
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/create" element={<CreateCampaign />} />
        <Route path="/campaigns/:id/edit" element={<EditCampaign />} />

        {/* Users */}
        <Route path="/users" element={<Users />} />
        <Route path="/users/create" element={<UserForm />} />
        <Route path="/users/:id/edit" element={<UserForm />} />

        {/* DIDs */}
        <Route path="/dids" element={<Dids />} />
        <Route path="/dids/create" element={<DidForm />} />
        <Route path="/dids/:id/edit" element={<DidForm />} />

        {/* Lists */}
        <Route path="/lists" element={<Lists />} />
        <Route path="/lists/create" element={<ListForm />} />
        <Route path="/lists/:id/edit" element={<ListEditForm />} />
        <Route path="/lists/:id" element={<ListDetail />} />
        <Route path="/lists/:id/leads" element={<ListLeads />} />

        <Route path="/reports" element={<Reports />} />
        <Route path="/sms" element={<SMSCenter />} />
        <Route path="/chat" element={<TeamChat />} />
        <Route path="/monitoring" element={<AgentMonitoring />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/labels" element={<Labels />} />
        <Route path="/settings/dispositions" element={<DispositionList />} />
        <Route path="/settings/dnc" element={<DncList />} />
        <Route path="/settings/fax" element={<FaxList />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
