import api from '../api/axios'
import type {
  CrmSearchParams,
  BulkAssignPayload,
  BulkStatusChangePayload,
  BulkDeletePayload,
  BulkExportPayload,
  AnalyticsPeriod,
} from '../types/crm.types'

export const crmService = {
  // ── Activity Timeline ───────────────────────────────────────────────────────
  getActivity: (leadId: number, offset = 0, limit = 20) =>
    api.get(`/crm/lead/${leadId}/activity`, { params: { offset, limit } }),

  addActivity: (leadId: number, data: { activity_type: string; subject: string; body?: string }) =>
    api.put(`/crm/lead/${leadId}/activity`, data),

  pinActivity: (leadId: number, activityId: number) =>
    api.post(`/crm/lead/${leadId}/activity/${activityId}/pin`, {}),

  // ── Status History ──────────────────────────────────────────────────────────
  getStatusHistory: (leadId: number) =>
    api.get(`/crm/lead/${leadId}/status-history`),

  // ── Pipeline Board ──────────────────────────────────────────────────────────
  getPipelineBoard: (params?: { assigned_to?: number; status_filter?: string[] }) =>
    api.get('/crm/pipeline/board', { params }),

  getPipelineViews: () =>
    api.get('/crm/pipeline/views'),

  createPipelineView: (data: { name: string; view_type: string; filters?: unknown; status_columns?: string[]; is_shared?: boolean }) =>
    api.put('/crm/pipeline/views', data),

  updatePipelineView: (id: number, data: Record<string, unknown>) =>
    api.post(`/crm/pipeline/views/${id}`, data),

  deletePipelineView: (id: number) =>
    api.delete(`/crm/pipeline/views/${id}`),

  // ── Approvals ───────────────────────────────────────────────────────────────
  getApprovals: (leadId: number) =>
    api.get(`/crm/lead/${leadId}/approvals`),

  getAllApprovals: (params?: { page?: number; per_page?: number; status?: string }) =>
    api.get('/crm/approvals', { params }),

  requestApproval: (leadId: number, data: { approval_type: string; request_note?: string; requested_amount?: number; approval_stage?: string }) =>
    api.put(`/crm/lead/${leadId}/approval/request`, data),

  reviewApproval: (leadId: number, approvalId: number, data: { status: 'approved' | 'declined'; review_note?: string; approved_amount?: number }) =>
    api.post(`/crm/lead/${leadId}/approval/${approvalId}/review`, data),

  withdrawApproval: (leadId: number, approvalId: number) =>
    api.post(`/crm/lead/${leadId}/approval/${approvalId}/withdraw`, {}),

  // ── Affiliate Links ─────────────────────────────────────────────────────────
  getAffiliateLinks: (params?: { page?: number; per_page?: number; limit?: number; status?: number }) =>
    api.get('/crm/affiliate-links', { params }),

  createAffiliateLink: (data: { label?: string; extension_id: string; list_id?: number; utm_source?: string; utm_medium?: string; utm_campaign?: string; expires_at?: string }) =>
    api.put('/crm/affiliate-links', data),

  updateAffiliateLink: (id: number, data: Record<string, unknown>) =>
    api.post(`/crm/affiliate-links/${id}`, data),

  deactivateAffiliateLink: (id: number) =>
    api.delete(`/crm/affiliate-links/${id}`),

  getAffiliateLinkStats: (id: number, period?: AnalyticsPeriod) =>
    api.get(`/crm/affiliate-links/${id}/stats`, { params: { period } }),

  // ── Merchant Portal ─────────────────────────────────────────────────────────
  getMerchantPortal: (leadId: number) =>
    api.get(`/crm/lead/${leadId}/merchant-portal`),

  generateMerchantPortal: (leadId: number) =>
    api.post(`/crm/lead/${leadId}/merchant-portal/generate`, {}),

  revokeMerchantPortal: (leadId: number, portalId: number) =>
    api.post(`/crm/lead/${leadId}/merchant-portal/${portalId}/revoke`, {}),

  // ── Bulk Operations ─────────────────────────────────────────────────────────
  bulkAssign: (payload: BulkAssignPayload) =>
    api.post('/crm/leads/bulk/assign', payload),

  bulkStatusChange: (payload: BulkStatusChangePayload) =>
    api.post('/crm/leads/bulk/status-change', payload),

  bulkDelete: (payload: BulkDeletePayload) =>
    api.post('/crm/leads/bulk/delete', payload),

  bulkExport: (payload: BulkExportPayload) =>
    api.post('/crm/leads/bulk/export', payload, { responseType: 'blob' }),

  // ── Advanced Search ─────────────────────────────────────────────────────────
  searchLeads: (params: CrmSearchParams) => {
    const { search, lead_status, assigned_to, date_from, date_to, lead_type, company_name, phone_number, email, industry_type, lower_limit = 0, upper_limit = 25, sort_by, sort_dir } = params
    const per_page = upper_limit
    const page = Math.floor(lower_limit / per_page) + 1
    return api.post('/crm/leads/search', {
      filters: {
        ...(search              ? { search }                     : {}),
        ...(lead_status?.length ? { lead_status }               : {}),
        ...(assigned_to?.length ? { assigned_to }               : {}),
        ...(lead_type           ? { lead_type }                 : {}),
        ...(date_from           ? { created_from: date_from }   : {}),
        ...(date_to             ? { created_to:   date_to }     : {}),
        ...(company_name        ? { company_name }              : {}),
        ...(phone_number        ? { phone_number }              : {}),
        ...(email               ? { email }                     : {}),
        ...(industry_type       ? { industry_type }             : {}),
      },
      page,
      per_page,
      ...(sort_by  ? { sort_by }  : {}),
      ...(sort_dir ? { sort_dir } : {}),
    })
  },

  // ── Analytics ───────────────────────────────────────────────────────────────
  getStatusDistribution: (period: AnalyticsPeriod = 'month') =>
    api.get('/crm/analytics/status-distribution', { params: { period } }),

  getLeadVelocity: (period: AnalyticsPeriod = 'month') =>
    api.get('/crm/analytics/lead-velocity', { params: { period } }),

  getAgentPerformance: (period: AnalyticsPeriod = 'month') =>
    api.get('/crm/analytics/agent-performance', { params: { period } }),

  getConversionFunnel: (period: AnalyticsPeriod = 'month') =>
    api.get('/crm/analytics/conversion-funnel', { params: { period } }),

  getLenderPerformance: (period: AnalyticsPeriod = 'month') =>
    api.get('/crm/analytics/lender-performance', { params: { period } }),

  // ── Lead Status Management ──────────────────────────────────────────────────
  getLeadStatusesPaginated: (params?: { page?: number; per_page?: number; search?: string }) =>
    api.get('/crm/lead-status', { params }),

  getLeadStatuses: async (): Promise<import('../types/crm.types').LeadStatus[]> => {
    const res = await api.get('/leadStatus')
    const raw: Record<string, unknown>[] = res.data?.data ?? res.data ?? []
    return raw.map(s => ({
      // Preserve ALL raw fields so extended fields (show_on_dashboard, vector_image,
      // webhook_status, webhook_method, webhook_url, webhook_token) are available
      // in the component without being silently dropped by the mapping.
      ...s,
      // Normalised fields override any same-named raw field
      id:             Number(s.id),
      lead_title:     String(s.title ?? s.lead_title ?? s.name ?? ''),
      lead_title_url: String(s.lead_title_url ?? s.slug ?? ''),
      color:          String(s.color_code ?? s.color ?? ''),
      color_code:     String(s.color_code ?? s.color ?? ''),
      display_order:  Number(s.display_order ?? 0),
      status:         s.status as number | string | undefined,
    })) as unknown as import('../types/crm.types').LeadStatus[]
  },

  createLeadStatus: (data: { title: string; lead_title_url: string; color_code?: string; display_order?: number }) =>
    api.put('/add-lead-status', data),

  updateLeadStatus: (id: number, data: Record<string, unknown>) =>
    api.post(`/update-lead-status/${id}`, data),

  deleteLeadStatus: (id: number) =>
    api.get(`/delete-lead-status/${id}`),

  toggleLeadStatus: (id: number, status: number) =>
    api.post('/change-lead-status', { lead_status_id: id, status }),

  // Matches the same payload key used by labelService.updateDisplayOrder
  updateLeadStatusOrder: (ids: number[]) =>
    api.post('/lead-status/updateDisplayOrder', { display_order: ids }),

  // ── CRM Labels (Custom Field Builder) ──────────────────────────────────────
  getCrmLabels: () =>
    api.get('/crm-labels'),

  createCrmLabel: (data: {
    title: string
    data_type: string
    heading_type?: string
    required?: number
    values?: string
    display_order?: number
    edit_mode?: number
  }) => api.put('/crm-add-label', data),

  updateCrmLabel: (id: number, data: Record<string, unknown>) =>
    api.post(`/crm-update-label/${id}`, data),

  deleteCrmLabel: (id: number) =>
    api.get(`/crm-delete-label/${id}`),

  toggleCrmLabel: (data: { crm_label_id: number; status: number }) =>
    api.post('/crm-change-label-status', data),

  updateCrmLabelOrder: (ids: number[]) =>
    api.post('/crm-label/updateDisplayOrder', { ids }),

  // ── Email Templates ─────────────────────────────────────────────────────────
  getEmailTemplates: () =>
    api.get('/crm-email-templates'),

  getEmailTemplate: (id: number) =>
    api.get(`/crm-email-template/${id}`),

  createEmailTemplate: (data: { template_name: string; subject: string; template_html: string; lead_status?: string; send_bcc?: string }) =>
    api.put('/crm-add-email-template', data),

  updateEmailTemplate: (id: number, data: Record<string, unknown>) =>
    api.post(`/crm-email-template/${id}`, data),

  deleteEmailTemplate: (id: number) =>
    api.get(`/crm-delete-email-template/${id}`),

  toggleEmailTemplate: (id: number, status: number) =>
    api.post('/crm-change-email-template-status', { email_template_id: id, status }),

  previewEmailTemplate: (templateId: number, listId: number, leadId: number) =>
    api.get(`/crm-email-template/${templateId}/${listId}/${leadId}`),

  // ── SMS Templates ───────────────────────────────────────────────────────────
  getSmsTemplates: () =>
    api.get('/crm-sms-template'),

  getSmsTemplate: (id: number) =>
    api.get(`/crm-sms-template/${id}`),

  createSmsTemplate: (data: { sms_template_name: string; sms_template: string }) =>
    api.put('/crm-add-sms-template', data),

  updateSmsTemplate: (id: number, data: Record<string, unknown>) =>
    api.post(`/crm-sms-template/${id}`, data),

  deleteSmsTemplate: (id: number) =>
    api.get(`/crm-delete-sms-template/${id}`),

  toggleSmsTemplate: (id: number, status: number) =>
    api.post('/crm-change-sms-template-status', { sms_template_id: id, status }),

  // ── Document Types ──────────────────────────────────────────────────────────
  getDocumentTypes: () =>
    api.get('/document-types'),

  createDocumentType: (data: { title: string; values?: string }) =>
    api.put('/document-type', data),

  updateDocumentType: (id: number, data: { title: string; values?: string }) =>
    api.post(`/update-document-type/${id}`, data),

  deleteDocumentType: (id: number) =>
    api.get(`/delete-document-type/${id}`),

  toggleDocumentTypeStatus: (id: number, status: 0 | 1) =>
    api.post('/change-document-type-status', { documenttype_id: id, status }),

  // ── Lead Documents ──────────────────────────────────────────────────────────
  getLeadDocuments: (leadId: number) =>
    api.get(`/crm/lead/${leadId}/documents`),

  uploadLeadDocuments: (leadId: number, formData: FormData) =>
    api.post(`/crm/lead/${leadId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteLeadDocument: (leadId: number, docId: number) =>
    api.delete(`/crm/lead/${leadId}/documents/${docId}`),

  // ── Lenders ─────────────────────────────────────────────────────────────────
  getLenders: (params?: { page?: number; per_page?: number; limit?: number; status?: number }) =>
    api.get('/lenders', { params }),

  getLender: (id: number) =>
    api.get(`/lender/${id}`),

  createLender: (data: Record<string, unknown>) =>
    api.put('/lender', data),

  updateLender: (id: number, data: Record<string, unknown>) =>
    api.post(`/lender/${id}`, data),

  deleteLender: (id: number) =>
    api.delete(`/delete-lender/${id}`),

  toggleLender: (id: number, status: number) =>
    api.post('/change-lender-status', { lender_id: id, status }),

  getLenderApiCredentials: (id: number) =>
    api.get(`/crm-lender-apis/${id}`),

  // ── Send Lead to Lender ─────────────────────────────────────────────────────
  getLeadLenderHistory: (leadId: number) =>
    api.get(`/crm/lead/${leadId}/lender-submissions`),

  sendLeadToLender: (leadId: number, data: { lender_id: number; notes?: string }) =>
    api.post(`/crm/lead/${leadId}/send-to-lender`, data),

  // ── Helpers ─────────────────────────────────────────────────────────────────
  getUsers: async (): Promise<{ id: number; name: string }[]> => {
    const res = await api.get('/users', { params: { limit: 500, start: 0 } })
    const raw: { id: number; first_name?: string; last_name?: string; name?: string }[] =
      res.data?.data ?? res.data ?? []
    return raw.map(u => ({
      id:   u.id,
      name: u.name ?? ([u.first_name, u.last_name].filter(Boolean).join(' ') || `User #${u.id}`),
    }))
  },
}
