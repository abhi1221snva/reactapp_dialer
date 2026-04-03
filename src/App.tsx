import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store'
import { usePusher } from './hooks/usePusher'
import { usePresence } from './hooks/usePresence'

// Layouts
import { AuthLayout } from './layouts/AuthLayout'
import { AppLayout } from './layouts/AppLayout'
import { CrmLayout } from './layouts/CrmLayout'

// Auth pages
import { Login } from './pages/auth/Login'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { Register } from './pages/auth/Register'
import { ResetPassword } from './pages/auth/ResetPassword'

// Onboarding & Agents
import { Onboarding } from './pages/onboarding/Onboarding'
import { Agents } from './pages/agents/Agents'

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
import { CrmCompanySettings } from './pages/crm/CrmCompanySettings'
import { ApplyPage } from './pages/public/ApplyPage'
import { MerchantPage } from './pages/public/MerchantPage'
import { CrmApprovals } from './pages/crm/CrmApprovals'
import { CrmLeadStatus } from './pages/crm/CrmLeadStatus'
import { CrmLeadFields } from './pages/crm/CrmLeadFields'
import { CrmEmailTemplates } from './pages/crm/CrmEmailTemplates'
import { CrmSmsTemplates } from './pages/crm/CrmSmsTemplates'
import { CrmLenders } from './pages/crm/CrmLenders'
import { CrmLenderPerformance } from './pages/crm/CrmLenderPerformance'
import { CrmLenderForm } from './pages/crm/CrmLenderForm'
import { CrmLenderApis } from './pages/crm/CrmLenderApis'
import { CrmLenderApiLogs } from './pages/crm/CrmLenderApiLogs'
import { CrmPdfTemplates } from './pages/crm/CrmPdfTemplates'
import { CrmAutomations } from './pages/crm/CrmAutomations'
import { CrmSmsInbox } from './pages/crm/CrmSmsInbox'
import { CrmDocumentTypes } from './pages/crm/CrmDocumentTypes'
import { CrmEmailSettings } from './pages/crm/CrmEmailSettings'
import { Campaigns } from './pages/campaigns/Campaigns'
import { CampaignDetail } from './pages/campaigns/CampaignDetail'
import { AgentStatus } from './pages/campaigns/AgentStatus'
import { CreateCampaign } from './modules/campaigns/CreateCampaign'
import { EditCampaign } from './modules/campaigns/EditCampaign'
import { AttachLeads } from './modules/campaigns/AttachLeads'
import { EditCampaignLists } from './modules/campaigns/EditCampaignLists'
import { EditCampaignReview } from './modules/campaigns/EditCampaignReview'
import { AddCampaignReview } from './modules/campaigns/AddCampaignReview'
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
import { AgentSummary } from './pages/reports/AgentSummary'
import { DispositionReport } from './pages/reports/DispositionReport'
import { CampaignPerformance } from './pages/reports/CampaignPerformance'
import { DailyReport } from './pages/reports/DailyReport'
import { LiveCalls } from './pages/reports/LiveCalls'
import { Profile } from './pages/profile/Profile'
import { RinglessVoicemail } from './pages/ringless/RinglessVoicemail'
import { AiSettings } from './pages/ai/AiSettings'
import { AiCoach } from './pages/ai/AiCoach'
import { SMSCenter } from './pages/sms/SMSCenter'
import { SmsAiDemo } from './pages/smsai/SmsAiDemo'
import { SmsAiCampaigns } from './pages/smsai/SmsAiCampaigns'
import { SmsAiLists } from './pages/smsai/SmsAiLists'
import { SmsAiReports } from './pages/smsai/SmsAiReports'
import { SmsAiTemplates } from './pages/smsai/SmsAiTemplates'
import { TeamChat } from './pages/chat/TeamChat'
import { AgentMonitoring } from './pages/monitoring/AgentMonitoring'
import { Attendance } from './pages/attendance/Attendance'
import { Billing } from './pages/billing/Billing'
import { TelecomPage } from './pages/telecom/TelecomPage'

import { Labels } from './pages/settings/Labels'
import { LeadSources } from './pages/settings/LeadSources'
import { RecycleRules } from './pages/settings/RecycleRules'
import { CustomFieldLabels } from './pages/settings/CustomFieldLabels'
import { LeadActivity } from './pages/settings/LeadActivity'
import { Leads } from './pages/leads/Leads'
import { TwoFactorSetup } from './pages/settings/TwoFactorSetup'
import { SecuritySettings } from './pages/settings/SecuritySettings'
import { DispositionList } from './modules/dispositions/DispositionList'
import { DncList } from './modules/dnc/DncList'
import { ExcludeList } from './modules/excludeList/ExcludeList'
import { FaxList } from './modules/fax/FaxList'
import { Ivr } from './pages/ivr/Ivr'
import { RingGroups } from './pages/ringgroups/RingGroups'
import { CallTimes }  from './pages/voice/CallTimes'
import { Holidays }   from './pages/voice/Holidays'
import { ExtensionGroups } from './pages/extensiongroups/ExtensionGroups'
import { VoicemailDrops } from './pages/voicemail/VoicemailDrops'
import { Mailbox } from './pages/voicemail/Mailbox'
import { GmailMailbox } from './pages/gmail/GmailMailbox'
import EmailParser from './pages/email-parser/EmailParser'
import { GoogleCalendar } from './pages/calendar/GoogleCalendar'
import { AdminClients } from './pages/admin/AdminClients'
import { SystemMonitor } from './pages/admin/SystemMonitor'
import { SwaggerDocs } from './pages/admin/SwaggerDocs'
import { WorkforceDashboard } from './pages/workforce/WorkforceDashboard'
import { ShiftManagement } from './pages/workforce/ShiftManagement'
import { CampaignStaffing } from './pages/workforce/CampaignStaffing'
import { WorkforceReports } from './pages/workforce/WorkforceReports'
import { WorkforceAnalytics } from './pages/workforce/WorkforceAnalytics'
import { CrmAgentPerformance } from './pages/crm/CrmAgentPerformance'
import { CrmCommissions } from './pages/crm/CrmCommissions'
import { CrmRenewals } from './pages/crm/CrmRenewals'
import { CrmIntegrations } from './pages/crm/CrmIntegrations'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <>{children}</>
  return <Navigate to={user?.level === 7 ? '/crm/dashboard' : '/dashboard'} replace />
}

function LegacyMerchantRedirect() {
  const { token } = useParams<{ token: string }>()
  return <Navigate to={`/merchant/${token}`} replace />
}

function AppWithPusher() {
  usePusher()
  usePresence()
  return <AppLayout />
}

export default function App() {
  return (
    <Routes>
      {/* Fully public routes — no auth, no layout wrapper */}
      <Route path="/apply/:affiliateCode" element={<ApplyPage />} />
      <Route path="/merchant/:leadToken"  element={<MerchantPage />} />
      {/* Legacy merchant URL — redirect to canonical form */}
      <Route path="/merchant/customer/app/index/:clientId/:leadId/:token" element={<LegacyMerchantRedirect />} />

      {/* Auth routes (redirect to dashboard if already logged in) */}
      <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route path="/crm/leads/:id" element={<ErrorBoundary fallbackTitle="Lead Detail Error"><CrmLeadDetail /></ErrorBoundary>} />
          <Route path="/crm/affiliate-links"   element={<CrmAffiliateLinks />} />
          <Route path="/crm/company-settings"  element={<CrmCompanySettings />} />
          <Route path="/crm/approvals" element={<CrmApprovals />} />
          <Route path="/crm/lead-status" element={<CrmLeadStatus />} />
          <Route path="/crm/lead-fields" element={<CrmLeadFields />} />
          <Route path="/crm/email-templates" element={<CrmEmailTemplates />} />
          <Route path="/crm/sms-templates" element={<CrmSmsTemplates />} />
          <Route path="/crm/pdf-templates" element={<CrmPdfTemplates />} />
          <Route path="/crm/lenders" element={<CrmLenders />} />
          <Route path="/crm/lender-performance" element={<CrmLenderPerformance />} />
          <Route path="/crm/lenders/create" element={<CrmLenderForm />} />
          <Route path="/crm/lenders/:id/edit" element={<CrmLenderForm />} />
          <Route path="/crm/lender-api-configs" element={<CrmLenderApis />} />
          <Route path="/crm/lender-api-logs" element={<CrmLenderApiLogs />} />
          <Route path="/crm/automations" element={<CrmAutomations />} />
          <Route path="/crm/sms-inbox" element={<CrmSmsInbox />} />
          <Route path="/crm/document-types"  element={<CrmDocumentTypes />} />
          <Route path="/crm/email-settings" element={<CrmEmailSettings />} />
          <Route path="/crm/agent-performance" element={<CrmAgentPerformance />} />
          <Route path="/crm/commissions" element={<CrmCommissions />} />
          <Route path="/crm/renewals" element={<CrmRenewals />} />
          <Route path="/crm/integrations" element={<CrmIntegrations />} />
        </Route>

        {/* Campaigns */}
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/create" element={<ErrorBoundary fallbackTitle="Campaign Error"><CreateCampaign /></ErrorBoundary>} />
        <Route path="/campaigns/:id/edit" element={<ErrorBoundary fallbackTitle="Campaign Error"><EditCampaign /></ErrorBoundary>} />
        <Route path="/campaigns/:id/attach-leads" element={<AttachLeads />} />
        <Route path="/campaigns/:id/add-review" element={<ErrorBoundary fallbackTitle="Campaign Error"><AddCampaignReview /></ErrorBoundary>} />
        <Route path="/campaigns/:id/manage-lists" element={<ErrorBoundary fallbackTitle="Campaign Error"><EditCampaignLists /></ErrorBoundary>} />
        <Route path="/campaigns/:id/review" element={<ErrorBoundary fallbackTitle="Campaign Error"><EditCampaignReview /></ErrorBoundary>} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/agent-status" element={<AgentStatus />} />

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
        <Route path="/reports/daily" element={<DailyReport />} />
        <Route path="/reports/agent-summary" element={<AgentSummary />} />
        <Route path="/reports/disposition" element={<DispositionReport />} />
        <Route path="/reports/campaign-performance" element={<CampaignPerformance />} />
        <Route path="/reports/live" element={<LiveCalls />} />
        <Route path="/sms" element={<SMSCenter />} />
        <Route path="/chat" element={<TeamChat />} />
        <Route path="/monitoring" element={<AgentMonitoring />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/billing" element={<Billing />} />

        <Route path="/settings/labels" element={<Labels />} />
        <Route path="/settings/dispositions" element={<DispositionList />} />
        <Route path="/settings/dnc" element={<DncList />} />
        <Route path="/settings/exclude" element={<ExcludeList />} />
        <Route path="/settings/fax" element={<FaxList />} />
        <Route path="/settings/security" element={<SecuritySettings />} />
        <Route path="/settings/2fa-setup" element={<TwoFactorSetup />} />

        {/* Lead Management */}
        <Route path="/leads" element={<Leads />} />
        <Route path="/settings/lead-sources" element={<LeadSources />} />
        <Route path="/settings/recycle-rules" element={<RecycleRules />} />
        <Route path="/settings/custom-field-labels" element={<CustomFieldLabels />} />
        <Route path="/settings/lead-activity" element={<LeadActivity />} />

        {/* Profile */}
        <Route path="/profile" element={<Profile />} />

        {/* Ringless Voicemail */}
        <Route path="/ringless" element={<RinglessVoicemail />} />

        {/* AI Tools */}
        <Route path="/ai/settings" element={<AiSettings />} />
        <Route path="/ai/coach" element={<AiCoach />} />

        {/* SMS AI */}
        <Route path="/smsai/demo" element={<SmsAiDemo />} />
        <Route path="/smsai/campaigns" element={<SmsAiCampaigns />} />
        <Route path="/smsai/lists" element={<SmsAiLists />} />
        <Route path="/smsai/reports" element={<SmsAiReports />} />
        <Route path="/smsai/templates" element={<SmsAiTemplates />} />

        {/* IVR */}
        <Route path="/ivr" element={<Ivr />} />

        {/* Gmail Mailbox */}
        <Route path="/gmail-mailbox" element={<GmailMailbox />} />
        <Route path="/email-parser" element={<EmailParser />} />
        <Route path="/google-calendar" element={<GoogleCalendar />} />

        {/* Voicemail */}
        <Route path="/voicemail" element={<VoicemailDrops />} />
        <Route path="/voicemail/mailbox" element={<Mailbox />} />

        {/* Ring Groups */}
        <Route path="/ring-groups" element={<RingGroups />} />

        {/* Call Times & Holidays */}
        <Route path="/call-times" element={<CallTimes />} />
        <Route path="/holidays"   element={<Holidays />} />

        {/* Extension Groups */}
        <Route path="/extension-groups" element={<ExtensionGroups />} />

        {/* Agents */}
        <Route path="/agents" element={<Agents />} />

        {/* Onboarding */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Unified Telecom Hub */}
        <Route path="/telecom"        element={<TelecomPage />} />

        {/* Legacy Twilio routes → redirect to unified hub */}
        <Route path="/twilio"         element={<Navigate to="/telecom?p=twilio&t=dashboard" replace />} />
        <Route path="/twilio/numbers" element={<Navigate to="/telecom?p=twilio&t=numbers"   replace />} />
        <Route path="/twilio/trunks"  element={<Navigate to="/telecom?p=twilio&t=trunks"    replace />} />
        <Route path="/twilio/calls"   element={<Navigate to="/telecom?p=twilio&t=calls"     replace />} />
        <Route path="/twilio/sms"     element={<Navigate to="/telecom?p=twilio&t=sms"       replace />} />
        <Route path="/twilio/usage"   element={<Navigate to="/telecom?p=twilio&t=usage"     replace />} />

        {/* Legacy Plivo routes → redirect to unified hub */}
        <Route path="/plivo"          element={<Navigate to="/telecom?p=plivo&t=dashboard" replace />} />
        <Route path="/plivo/numbers"  element={<Navigate to="/telecom?p=plivo&t=numbers"   replace />} />
        <Route path="/plivo/trunks"   element={<Navigate to="/telecom?p=plivo&t=trunks"    replace />} />
        <Route path="/plivo/calls"    element={<Navigate to="/telecom?p=plivo&t=calls"     replace />} />
        <Route path="/plivo/sms"      element={<Navigate to="/telecom?p=plivo&t=sms"       replace />} />
        <Route path="/plivo/usage"    element={<Navigate to="/telecom?p=plivo&t=usage"     replace />} />

        {/* Workforce Management */}
        <Route path="/workforce"          element={<WorkforceDashboard />} />
        <Route path="/workforce/shifts"   element={<ShiftManagement />} />
        <Route path="/workforce/staffing" element={<CampaignStaffing />} />
        <Route path="/workforce/reports"  element={<WorkforceReports />} />
        <Route path="/workforce/analytics" element={<WorkforceAnalytics />} />

        {/* System Admin */}
        <Route path="/admin/clients" element={<AdminClients />} />
        <Route path="/admin/system-monitor" element={<SystemMonitor />} />
        <Route path="/system/swagger" element={<SwaggerDocs />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
