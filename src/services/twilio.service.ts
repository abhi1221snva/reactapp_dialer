import api from '../api/axios'
import type {
  TwilioAccount,
  TwilioSubaccount,
  TwilioNumber,
  AvailableNumber,
  TwilioTrunk,
  TwilioCall,
  TwilioSms,
  TwilioRecording,
  TwilioUsageSummary,
  NumberSearchFilters,
} from '../types/twilio.types'

interface PaginatedResponse<T> {
  data: T[]
  total: number
  current_page: number
  per_page: number
}

// ── Account ──────────────────────────────────────────────────────────────────

export const twilioService = {

  // Account management
  getAccount: () =>
    api.get<{ success: boolean; data: { account: TwilioAccount | null } }>('/twilio/account'),

  connect: (payload: { account_sid: string; auth_token: string }) =>
    api.post<{ success: boolean; data: { account: TwilioAccount } }>('/twilio/connect', payload),

  disconnect: () =>
    api.delete('/twilio/account'),

  // Subaccounts
  createSubaccount: (friendly_name: string) =>
    api.post('/twilio/subaccount', { friendly_name }),

  listSubaccounts: () =>
    api.get<{ success: boolean; data: { subaccounts: TwilioSubaccount[] } }>('/twilio/subaccounts'),

  suspendSubaccount: (sid: string) =>
    api.post('/twilio/subaccount/suspend', { sid }),

  // Usage
  getUsage: (params?: { start_date?: string; end_date?: string }) =>
    api.get<{
      success: boolean
      data: { records: unknown[]; summary: TwilioUsageSummary }
    }>('/twilio/usage', { params }),

  // ── Numbers ────────────────────────────────────────────────────────────

  searchNumbers: (filters: NumberSearchFilters) =>
    api.get<{ success: boolean; data: { numbers: AvailableNumber[]; total: number } }>(
      '/twilio/numbers/search',
      { params: filters }
    ),

  purchaseNumber: (phone_number: string, country?: string) =>
    api.post<{ success: boolean; data: { number: TwilioNumber } }>(
      '/twilio/numbers/purchase',
      { phone_number, country }
    ),

  releaseNumber: (sid: string) =>
    api.delete(`/twilio/numbers/${sid}`),

  listNumbers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<{ success: boolean; data: PaginatedResponse<TwilioNumber> & { numbers: TwilioNumber[] } }>(
      '/twilio/numbers',
      { params }
    ),

  assignToCampaign: (campaign_id: number, number_ids: number[]) =>
    api.post('/twilio/numbers/assign', { campaign_id, number_ids }),

  getByCampaign: (campaignId: number) =>
    api.get(`/twilio/numbers/campaign/${campaignId}`),

  unassignFromCampaign: (campaign_id: number, number_ids: number[]) =>
    api.post('/twilio/numbers/unassign', { campaign_id, number_ids }),

  // ── Calls ──────────────────────────────────────────────────────────────

  makeCall: (payload: { to: string; from?: string; campaign_id?: number }) =>
    api.post('/twilio/calls/make', payload),

  listCalls: (params?: {
    page?: number
    limit?: number
    campaign_id?: number
    agent_id?: number
    status?: string
    direction?: string
    date_from?: string
    date_to?: string
  }) =>
    api.get<{ success: boolean; data: { calls: TwilioCall[]; total: number; current_page: number; per_page: number } }>(
      '/twilio/calls',
      { params }
    ),

  getCall: (sid: string) =>
    api.get(`/twilio/calls/${sid}`),

  getRecordings: (params?: { call_sid?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: { recordings: TwilioRecording[]; total: number } }>(
      '/twilio/recordings',
      { params }
    ),

  // ── SMS ────────────────────────────────────────────────────────────────

  sendSms: (payload: { to: string; from: string; body: string; campaign_id?: number }) =>
    api.post('/twilio/sms/send', payload),

  bulkSms: (payload: { to: string[]; from: string; body: string; campaign_id?: number }) =>
    api.post('/twilio/sms/bulk', payload),

  listSms: (params?: {
    page?: number
    limit?: number
    direction?: string
    campaign_id?: number
    date_from?: string
    date_to?: string
    search?: string
  }) =>
    api.get<{ success: boolean; data: { sms: TwilioSms[]; total: number; current_page: number; per_page: number } }>(
      '/twilio/sms',
      { params }
    ),

  // ── SIP Trunks ─────────────────────────────────────────────────────────

  listTrunks: () =>
    api.get<{ success: boolean; data: { trunks: TwilioTrunk[] } }>('/twilio/trunks'),

  createTrunk: (friendly_name: string) =>
    api.post<{ success: boolean; data: { trunk: TwilioTrunk } }>('/twilio/trunks', { friendly_name }),

  deleteTrunk: (sid: string) =>
    api.delete(`/twilio/trunks/${sid}`),

  updateTrunkUrl: (sid: string, origination_url: string) =>
    api.post(`/twilio/trunks/${sid}/url`, { origination_url }),
}
