import api from '../api/axios'
import type { SaveDispositionRequest, TransferRequest } from '../types'

export const dialerService = {
  // ── Campaign / Session ──────────────────────────────────────────────────────
  // POST /agent-campaign — returns campaigns assigned to the authed agent
  getAgentCampaigns: () =>
    api.post('/agent-campaign'),

  // GET /my-extension-status — returns whether the agent's SIP extension is in extension_live
  checkExtensionStatus: () =>
    api.get('/my-extension-status'),

  // POST /extension-login { campaign_id } — joins campaign; 200 = success, 402 = error
  // dialer_mode=2 tells backend to use the WebPhone (alt_extension)
  extensionLogin: (campaign_id: number) =>
    api.post('/extension-login', { campaign_id, dialer_mode: 2 }),

  // POST /extension-logout
  extensionLogout: () =>
    api.post('/extension-logout'),

  // ── Lead Fetch ──────────────────────────────────────────────────────────────
  // GET /get-lead — backend resolves extension from JWT; no body required.
  // Response: { data: Lead } — `id` = queue row ID, `lead_id` = CRM ID (may differ).
  getLead: () =>
    api.get('/get-lead', { params: { dialer_mode: 2 } }),

  // ── Call Lifecycle ──────────────────────────────────────────────────────────
  /**
   * POST /call-number
   * Backend validation: campaign_id*, lead_id*, number* (phone), id* (queue row ID).
   * `id` = lead.id (queue/temp row); `lead_id` = lead.lead_id ?? lead.id (CRM record).
   */
  // dialer_mode=2 tells backend to use the WebPhone (alt_extension)
  callNumber: (data: { campaign_id: number; lead_id: number; number: string; id: number }) =>
    api.post('/call-number', { ...data, dialer_mode: 2 }),

  /**
   * POST /hang-up
   * Backend validation: id* — pass campaign_id as id (identifies agent's active call).
   */
  hangUp: (data: { id: number }) =>
    api.post('/hang-up', { ...data, dialer_mode: 2 }),

  /**
   * POST /asterisk-hang-up (CRM webphone hangup)
   * Required: extension, number, lead_id
   */
  hangUpCRM: (data: { extension: string; number: string; lead_id: number }) =>
    api.post('/asterisk-hang-up', data),

  // ── Disposition ─────────────────────────────────────────────────────────────
  saveDisposition: (data: SaveDispositionRequest) =>
    api.post('/save-disposition', { ...data, dialer_mode: 2 }),

  // POST /disposition-by-campaign-id { campaign_id }
  getDispositionsByCampaign: (campaign_id: number) =>
    api.post('/disposition-by-campaign-id', { campaign_id }),

  // ── In-Call Controls ────────────────────────────────────────────────────────
  /**
   * POST /send-dtmf
   * Backend validation: id* (campaign_id), number* (digit(s) to send).
   */
  sendDtmf: (campaign_id: number, digit: string) =>
    api.post('/send-dtmf', { id: campaign_id, number: digit }),

  /**
   * POST /voicemail-drop
   * Backend validation: id* — pass campaign_id.
   */
  voicemailDrop: (campaign_id: number) =>
    api.post('/voicemail-drop', { id: campaign_id }),

  // ── Call Transfer ───────────────────────────────────────────────────────────
  /**
   * POST /call-transfer/initiate-updated  (DialerController@initiateTransferUpdated)
   * Atomic 3-step pipeline: validateCall → validateTarget → initiateTransfer.
   * Returns: { status: 'success', message, transfer_session_id } or 422 with error.
   */
  initiateTransfer: (data: TransferRequest) =>
    api.post('/call-transfer/initiate-updated', data),

  /**
   * POST /merge-call-transfer
   * Merges agent into conference with transferred party.
   */
  mergeTransfer: (data: { lead_id: number; customer_phone_number: string; warm_call_transfer_type: string; domain: string }) =>
    api.post('/merge-call-transfer', data),

  /**
   * POST /leave-call-transfer
   * Agent leaves the conference (transfer complete).
   */
  leaveTransfer: (data: { lead_id: number; customer_phone_number: string; domain: string }) =>
    api.post('/leave-call-transfer', data),

  // ── Supervision ─────────────────────────────────────────────────────────────
  listenCall: (data: { extension: string; campaign_id: number }) =>
    api.post('/listen-call', data),

  bargeCall: (data: { extension: string; campaign_id: number }) =>
    api.post('/barge-call', data),

  getLiveCalls: () =>
    api.get('/live-calls'),

  // ── Pacing / Heartbeat ──────────────────────────────────────────────────────
  /**
   * POST /dialer/pacing/{campaignId}/heartbeat
   * Call every 30s to keep agent alive in Redis pacing counters.
   */
  heartbeat: (campaignId: number) =>
    api.post(`/dialer/pacing/${campaignId}/heartbeat`),

  /**
   * POST /dialer/pacing/{campaignId}/agent-state { state }
   * State: 'available' | 'wrapping' | 'paused'
   */
  updateAgentState: (campaignId: number, state: 'available' | 'wrapping' | 'paused') =>
    api.post(`/dialer/pacing/${campaignId}/agent-state`, { state }),

  /**
   * POST /dialer/pacing/{campaignId}/record-outcome { outcome, handle_time }
   * outcome: 'answered' | 'abandoned' | 'no_answer' | 'busy' | 'failed'
   */
  recordOutcome: (campaignId: number, outcome: string, handleTime?: number) =>
    api.post(`/dialer/pacing/${campaignId}/record-outcome`, {
      outcome,
      ...(handleTime !== undefined ? { handle_time: handleTime } : {}),
    }),

  /**
   * GET /dialer/pacing/{campaignId}
   * Returns snapshot: calls_placed, calls_answered, abandon_rate_pct, current_ratio, ftc_compliant, etc.
   */
  getPacingSnapshot: (campaignId: number) =>
    api.get(`/dialer/pacing/${campaignId}`),
}
