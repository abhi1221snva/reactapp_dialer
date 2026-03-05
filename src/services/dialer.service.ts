import api from '../api/axios'
import type { SaveDispositionRequest } from '../types'

export const dialerService = {
  // B1 fixed: was GET /agent/campaigns → backend is POST /agent-campaign
  getAgentCampaigns: () =>
    api.post('/agent-campaign'),

  extensionLogin: (campaign_id: number) =>
    api.post('/extension-login', { campaign_id }),

  // B2 fixed: was POST /extension-logout (missing) → added alias route in backend
  extensionLogout: () =>
    api.post('/extension-logout'),

  getLead: (campaign_id: number) =>
    api.post('/get-lead', { campaign_id }),

  callNumber: (data: { phone_number: string; campaign_id: number; lead_id: number }) =>
    api.post('/call-number', data),

  hangUp: (data: { campaign_id: number; lead_id: number }) =>
    api.post('/hang-up', data),

  saveDisposition: (data: SaveDispositionRequest) =>
    api.post('/save-disposition', data),

  // B3 fixed: was POST /disposition-by-campaign-id (missing) → added alias route in backend
  getDispositionsByCampaign: (campaign_id: number) =>
    api.post('/disposition-by-campaign-id', { campaign_id }),

  // B4 fixed: was POST /send-dtmf (missing) → added alias route in backend
  sendDtmf: (digit: string) =>
    api.post('/send-dtmf', { digit }),

  voicemailDrop: (campaign_id: number) =>
    api.post('/voicemail-drop', { campaign_id }),

  listenCall: (data: { extension: string; campaign_id: number }) =>
    api.post('/listen-call', data),

  bargeCall: (data: { extension: string; campaign_id: number }) =>
    api.post('/barge-call', data),

  directTransfer: (data: { extension: string; campaign_id: number }) =>
    api.post('/direct-call-transfer', data),

  // B7 fixed: was POST /warm-call-transfer (commented out in backend) → alias added
  warmTransfer: (data: { extension: string; campaign_id: number }) =>
    api.post('/warm-call-transfer', data),

  // B6 fixed: was POST /merge-call-transfer → backend is POST /merge-call-with-transfer → alias added
  mergeTransfer: (campaign_id: number) =>
    api.post('/merge-call-transfer', { campaign_id }),

  // B8 fixed: was POST /leave-call-transfer (missing) → added alias route in backend
  leaveTransfer: (campaign_id: number) =>
    api.post('/leave-call-transfer', { campaign_id }),

  // B5 fixed: was GET /live-calls → backend is POST /live-call → alias added for GET
  getLiveCalls: () =>
    api.get('/live-calls'),
}
