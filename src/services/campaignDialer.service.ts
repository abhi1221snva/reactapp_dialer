/**
 * Campaign Dialer Service
 *
 * API calls for the click-to-call campaign dialer backend.
 * Complements the existing dialerService in dialer.service.ts.
 */
import api from '../api/axios'

export interface LeadRecord extends Record<string, unknown> {
  id: number
  first_name?: string
  last_name?: string
  phone_number?: string
  email?: string
  lead_status?: number
  assigned_to?: number
  created_at?: string
  // EAV dynamic fields are spread at top level
}

export interface CampaignQueueStats {
  total: number
  pending: number
  calling: number
  completed: number
  failed: number
}

export interface AgentLiveInfo {
  lead_id: number | null
  campaign_id: number | null
  call_status: 'ringing' | 'connected' | 'bridged' | null
}

export interface CampaignAgentInfo {
  user_id: number
  name: string
  email: string
  extension: string | null
  status: 'available' | 'on_call' | 'on_break' | 'after_call_work' | 'offline'
}

export const campaignDialerService = {
  /**
   * Start a campaign: set status=running, populate queue, dispatch first dial.
   * POST /dialer/campaign/{id}/start
   */
  startCampaign: (campaignId: number) =>
    api.post<{ message: string; campaign_id: number; queue_count: number }>(
      `/dialer/campaign/${campaignId}/start`
    ),

  /**
   * Pause / stop a running campaign.
   * POST /dialer/campaign/{id}/stop
   */
  stopCampaign: (campaignId: number) =>
    api.post<{ message: string }>(`/dialer/campaign/${campaignId}/stop`),

  /**
   * (Re)populate the queue from campaign lists.
   * POST /dialer/campaign/{id}/populate
   */
  populateQueue: (campaignId: number) =>
    api.post<{ message: string; total_leads: number }>(
      `/dialer/campaign/${campaignId}/populate`
    ),

  /**
   * Campaign queue stats + active live calls.
   * GET /dialer/campaign/{id}/status
   */
  getCampaignStatus: (campaignId: number) =>
    api.get<{ campaign_id: number; dialer_status: string | null; stats: CampaignQueueStats; live_calls: unknown[] }>(
      `/dialer/campaign/${campaignId}/status`
    ),

  /**
   * Return the lead_id currently live on an agent's extension.
   * Called by the frontend after agent answers to know which lead to display.
   * GET /dialer/agent/{ext}/current-lead
   */
  getAgentCurrentLead: (extension: string | number) =>
    api.get<AgentLiveInfo>(`/dialer/agent/${extension}/current-lead`),

  /**
   * Fetch full lead record + EAV fields for the dialer lead panel.
   * GET /dialer/lead?lead_id=X
   */
  getLeadById: (leadId: number) =>
    api.get<LeadRecord>(`/dialer/lead`, { params: { lead_id: leadId } }),

  /**
   * Save call disposition after wrap-up.
   * POST /dialer/lead/{leadId}/disposition
   */
  saveDisposition: (leadId: number, dispositionId: number, notes?: string, campaignId?: number) =>
    api.post(`/dialer/lead/${leadId}/disposition`, {
      disposition_id: dispositionId,
      notes,
      campaign_id: campaignId,
    }),

  // ── Agent assignment ────────────────────────────────────────────────────────

  /**
   * List agents assigned to a campaign with their status.
   * GET /dialer/campaign/{id}/agents
   */
  listAgents: (campaignId: number) =>
    api.get<{ agents: CampaignAgentInfo[] }>(`/dialer/campaign/${campaignId}/agents`),

  /**
   * Assign an agent (by user_id) to a campaign.
   * POST /dialer/campaign/{id}/agents
   */
  assignAgent: (campaignId: number, userId: number) =>
    api.post(`/dialer/campaign/${campaignId}/agents`, { user_id: userId }),

  /**
   * Remove an agent from a campaign.
   * DELETE /dialer/campaign/{id}/agents/{userId}
   */
  removeAgent: (campaignId: number, userId: number) =>
    api.delete(`/dialer/campaign/${campaignId}/agents/${userId}`),
}
