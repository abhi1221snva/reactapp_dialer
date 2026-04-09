import api from '../api/axios'
import type {
  DripCampaign, DripStep, DripEnrollment, DripAnalytics,
  DripStepAnalytics, MergeTag, SenderOptions, BulkEnrollResult,
} from '../types/drip.types'

interface ListResponse<T> {
  total: number
  data: T[]
}

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export const dripService = {
  // ── Campaigns ──────────────────────────────────────────────────────────────

  listCampaigns(params?: { status?: string; channel?: string; search?: string; start?: number; limit?: number }) {
    return api.get<ApiResponse<ListResponse<DripCampaign>>>('/crm/drip/campaigns', { params })
  },

  getCampaign(id: number) {
    return api.get<ApiResponse<DripCampaign>>(`/crm/drip/campaigns/${id}`)
  },

  createCampaign(data: Partial<DripCampaign> & { steps?: Partial<DripStep>[] }) {
    return api.post<ApiResponse<DripCampaign>>('/crm/drip/campaigns', data)
  },

  updateCampaign(id: number, data: Partial<DripCampaign> & { steps?: Partial<DripStep>[] }) {
    return api.put<ApiResponse<DripCampaign>>(`/crm/drip/campaigns/${id}`, data)
  },

  deleteCampaign(id: number) {
    return api.delete<ApiResponse<unknown>>(`/crm/drip/campaigns/${id}`)
  },

  duplicateCampaign(id: number) {
    return api.post<ApiResponse<DripCampaign>>(`/crm/drip/campaigns/${id}/duplicate`)
  },

  activateCampaign(id: number) {
    return api.post<ApiResponse<DripCampaign>>(`/crm/drip/campaigns/${id}/activate`)
  },

  pauseCampaign(id: number) {
    return api.post<ApiResponse<DripCampaign>>(`/crm/drip/campaigns/${id}/pause`)
  },

  archiveCampaign(id: number) {
    return api.post<ApiResponse<DripCampaign>>(`/crm/drip/campaigns/${id}/archive`)
  },

  // ── Enrollments ────────────────────────────────────────────────────────────

  getEnrollments(campaignId: number, params?: { status?: string; start?: number; limit?: number }) {
    return api.get<ApiResponse<ListResponse<DripEnrollment>>>(`/crm/drip/campaigns/${campaignId}/enrollments`, { params })
  },

  enrollLeads(campaignId: number, leadIds: number[]) {
    return api.post<ApiResponse<DripEnrollment | BulkEnrollResult>>(`/crm/drip/campaigns/${campaignId}/enroll`, { lead_ids: leadIds })
  },

  unenrollLead(enrollmentId: number, reason?: string) {
    return api.post<ApiResponse<DripEnrollment>>(`/crm/drip/enrollments/${enrollmentId}/unenroll`, { reason })
  },

  getLeadEnrollments(leadId: number) {
    return api.get<ApiResponse<DripEnrollment[]>>(`/crm/drip/lead/${leadId}/enrollments`)
  },

  // ── Analytics ──────────────────────────────────────────────────────────────

  getCampaignAnalytics(campaignId: number) {
    return api.get<ApiResponse<DripAnalytics>>(`/crm/drip/campaigns/${campaignId}/analytics`)
  },

  getStepAnalytics(campaignId: number) {
    return api.get<ApiResponse<DripStepAnalytics[]>>(`/crm/drip/campaigns/${campaignId}/step-analytics`)
  },

  // ── Utility ────────────────────────────────────────────────────────────────

  previewStep(data: { body_html: string; lead_id?: number; subject?: string }) {
    return api.post<ApiResponse<{ body_html: string; subject: string }>>('/crm/drip/preview', data)
  },

  getMergeTags() {
    return api.get<ApiResponse<MergeTag[]>>('/crm/drip/merge-tags')
  },

  getSenderOptions() {
    return api.get<ApiResponse<SenderOptions>>('/crm/drip/sender-options')
  },
}
