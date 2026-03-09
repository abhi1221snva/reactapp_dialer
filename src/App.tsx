import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store'
import { usePusher } from './hooks/usePusher'

// Layouts
import { AuthLayout } from './layouts/AuthLayout'
import { AppLayout } from './layouts/AppLayout'
import { CrmLayout } from './layouts/CrmLayout'

// Auth pages
import { Login } from './pages/auth/Login'
import { ForgotPassword } from './pages/auth/ForgotPassword'

// App pages
import { Dashboard } from './pages/dashboard/Dashboard'
import { Dialer } from './pages/dialer/Dialer'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { CrmLeads } from './pages/crm/CrmLeads'
import { LeadForm } from './pages/crm/LeadForm'
import { LeadDetail } from './pages/crm/LeadDetail'
import { CrmDashboard } from './pages/crm/CrmDashboard'
import { CrmPipeline } from './pages/crm/CrmPipeline'
import { CrmLeadsList } from './pages/crm/CrmLeadsList'
import { CrmLeadDetail } from './pages/crm/CrmLeadDetail'
import { CrmLeadCreate } from './pages/crm/CrmLeadCreate'
import { CrmAffiliateLinks } from './pages/crm/CrmAffiliateLinks'
import { CrmApprovals } from './pages/crm/CrmApprovals'
import { CrmLeadStatus } from './pages/crm/CrmLeadStatus'
import { CrmCustomFields } from './pages/crm/CrmCustomFields'
import { CrmEmailTemplates } from './pages/crm/CrmEmailTemplates'
import { CrmSmsTemplates } from './pages/crm/CrmSmsTemplates'
import { CrmLenders } from './pages/crm/CrmLenders'
import { Campaigns } from './pages/campaigns/Campaigns'
import { CreateCampaign } from './modules/campaigns/CreateCampaign'
import { EditCampaign } from './modules/campaigns/EditCampaign'
import { AttachLeads } from './modules/campaigns/AttachLeads'
import { Users } from './pages/users/Users'
import { UserForm } from './pages/users/UserForm'
import { Dids } from './pages/dids/Dids'
import { DidForm } from './pages/dids/DidForm'
import { Lists } from './pages/lists/Lists'
import { ListForm } from './pages/lists/ListForm'
import { ListDetail } from './pages/lists/ListDetail'
import { ListLeads } from './pages/lists/ListLeads'
import { ListEditForm } from './pages/lists/ListEditForm'
import { EditMapping } from './modules/lists/EditMapping'
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
import { Ivr } from './pages/ivr/Ivr'
import { RingGroups } from './pages/ringgroups/RingGroups'
import { ExtensionGroups } from './pages/extensiongroups/ExtensionGroups'
import { VoicemailDrops } from './pages/voicemail/VoicemailDrops'
import { Mailbox } from './pages/voicemail/Mailbox'

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
        <Route path="/dialer" element={<ErrorBoundary fallbackTitle="Dialer Error"><Dialer /></ErrorBoundary>} />

        {/* CRM (legacy routes kept for backward compat) */}
        <Route path="/crm" element={<CrmLeads />} />
        <Route path="/crm/create" element={<LeadForm />} />
        <Route path="/crm/:id/edit" element={<LeadForm />} />
        <Route path="/crm/:id" element={<LeadDetail />} />

        {/* CRM HubSpot-Style — all wrapped in CrmLayout for shared white card header */}
        <Route element={<CrmLayout />}>
          <Route path="/crm/dashboard" element={<CrmDashboard />} />
          <Route path="/crm/pipeline" element={<CrmPipeline />} />
          <Route path="/crm/leads" element={<CrmLeadsList />} />
          <Route path="/crm/leads/create" element={<CrmLeadCreate />} />
          <Route path="/crm/leads/:id/edit" element={<CrmLeadCreate />} />
          <Route path="/crm/leads/:id" element={<CrmLeadDetail />} />
          <Route path="/crm/affiliate-links" element={<CrmAffiliateLinks />} />
          <Route path="/crm/approvals" element={<CrmApprovals />} />
          <Route path="/crm/lead-status" element={<CrmLeadStatus />} />
          <Route path="/crm/custom-fields" element={<CrmCustomFields />} />
          <Route path="/crm/email-templates" element={<CrmEmailTemplates />} />
          <Route path="/crm/sms-templates" element={<CrmSmsTemplates />} />
          <Route path="/crm/lenders" element={<CrmLenders />} />
        </Route>

        {/* Campaigns */}
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/create" element={<CreateCampaign />} />
        <Route path="/campaigns/:id/edit" element={<EditCampaign />} />
        <Route path="/campaigns/:id/attach-leads" element={<AttachLeads />} />

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
        <Route path="/lists/:id/mapping" element={<EditMapping />} />
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

        {/* IVR */}
        <Route path="/ivr" element={<Ivr />} />

        {/* Voicemail */}
        <Route path="/voicemail" element={<VoicemailDrops />} />
        <Route path="/voicemail/mailbox" element={<Mailbox />} />

        {/* Ring Groups */}
        <Route path="/ring-groups" element={<RingGroups />} />

        {/* Extension Groups */}
        <Route path="/extension-groups" element={<ExtensionGroups />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
