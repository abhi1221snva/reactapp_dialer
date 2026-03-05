import api from '../api/axios'
import type { SaveDispositionRequest } from '../types'

export const dialerService = {
  getAgentCampaigns: () =>
    api.get('/agent/campaigns'),

  extensionLogin: (campaign_id: number) =>
    api.post('/extension-login', { campaign_id }),

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

  getDispositionsByCampaign: (campaign_id: number) =>
    api.post('/disposition-by-campaign-id', { campaign_id }),

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

  warmTransfer: (data: { extension: string; campaign_id: number }) =>
    api.post('/warm-call-transfer', data),

  mergeTransfer: (campaign_id: number) =>
    api.post('/merge-call-transfer', { campaign_id }),

  leaveTransfer: (campaign_id: number) =>
    api.post('/leave-call-transfer', { campaign_id }),

  getLiveCalls: () =>
    api.get('/live-calls'),
}
