import api from '../api/axios'
import type {
  PlivoAccount,
  PlivoSubaccount,
  PlivoNumber,
  AvailablePlivoNumber,
  PlivoTrunk,
  PlivoCall,
  PlivoSms,
  PlivoRecording,
  PlivoUsageSummary,
  NumberSearchFilters,
} from '../types/plivo.types'

interface PaginatedResponse<T> {
  data: T[]
  total: number
  current_page: number
  per_page: number
}

export const plivoService = {
  // ── Account management ─────────────────────────────────────────────────────

  getAccount: () =>
    api.get<{ success: boolean; data: { account: PlivoAccount | null } }>('/plivo/account'),

  connect: (payload: { auth_id: string; auth_token: string }) =>
    api.post<{ success: boolean; data: { account: PlivoAccount } }>('/plivo/connect', payload),

  disconnect: () =>
    api.delete('/plivo/account'),

  // ── Subaccounts ────────────────────────────────────────────────────────────

  createSubaccount: (name: string, enabled?: boolean) =>
    api.post('/plivo/subaccount', { name, enabled }),

  listSubaccounts: () =>
    api.get<{ success: boolean; data: { subaccounts: PlivoSubaccount[] } }>('/plivo/subaccounts'),

  suspendSubaccount: (auth_id: string) =>
    api.post('/plivo/subaccount/suspend', { auth_id }),

  // ── Usage ──────────────────────────────────────────────────────────────────

  getUsage: (params?: { date_from?: string; date_till?: string }) =>
    api.get<{
      success: boolean
      data: { summary: PlivoUsageSummary; date_from: string; date_till: string }
    }>('/plivo/usage', { params }),

  // ── Phone numbers ──────────────────────────────────────────────────────────

  searchNumbers: (filters: NumberSearchFilters) =>
    api.get<{ success: boolean; data: { numbers: AvailablePlivoNumber[]; total: number } }>(
      '/plivo/numbers/search',
      { params: filters }
    ),

  purchaseNumber: (phone_number: string, country?: string, app_id?: string) =>
    api.post<{ success: boolean; data: { number: PlivoNumber } }>(
      '/plivo/numbers/purchase',
      { phone_number, country, app_id }
    ),

  releaseNumber: (number: string) =>
    api.delete(`/plivo/numbers/${encodeURIComponent(number)}`),

  listNumbers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<{ success: boolean; data: { numbers: PlivoNumber[]; total: number; current_page: number; per_page: number } }>(
      '/plivo/numbers',
      { params }
    ),

  assignToCampaign: (campaign_id: number, number_ids: number[]) =>
    api.post('/plivo/numbers/assign', { campaign_id, number_ids }),

  getByCampaign: (campaignId: number) =>
    api.get(`/plivo/numbers/campaign/${campaignId}`),

  unassignFromCampaign: (campaign_id: number, number_ids: number[]) =>
    api.post('/plivo/numbers/unassign', { campaign_id, number_ids }),

  // ── Calls ──────────────────────────────────────────────────────────────────

  makeCall: (payload: { to: string; from?: string; campaign_id?: number }) =>
    api.post('/plivo/calls/make', payload),

  hangupCall: (uuid: string) =>
    api.post(`/plivo/calls/${uuid}/hangup`),

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
    api.get<{ success: boolean; data: { calls: PlivoCall[]; total: number; current_page: number; per_page: number } }>(
      '/plivo/calls',
      { params }
    ),

  getCall: (uuid: string) =>
    api.get(`/plivo/calls/${uuid}`),

  getRecordings: (params?: { call_uuid?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: { recordings: PlivoRecording[]; total: number } }>(
      '/plivo/recordings',
      { params }
    ),

  // ── SMS ────────────────────────────────────────────────────────────────────

  sendSms: (payload: { to: string; from: string; body: string; campaign_id?: number }) =>
    api.post('/plivo/sms/send', payload),

  bulkSms: (payload: { to: string[]; from: string; body: string; campaign_id?: number }) =>
    api.post('/plivo/sms/bulk', payload),

  listSms: (params?: {
    page?: number
    limit?: number
    direction?: string
    campaign_id?: number
    date_from?: string
    date_to?: string
    search?: string
  }) =>
    api.get<{ success: boolean; data: { sms: PlivoSms[]; total: number; current_page: number; per_page: number } }>(
      '/plivo/sms',
      { params }
    ),

  // ── SIP Trunks (Applications) ──────────────────────────────────────────────

  listTrunks: () =>
    api.get<{ success: boolean; data: { trunks: PlivoTrunk[] } }>('/plivo/trunks'),

  createTrunk: (payload: { app_name: string; answer_url?: string; hangup_url?: string; status_url?: string }) =>
    api.post<{ success: boolean; data: { trunk: PlivoTrunk } }>('/plivo/trunks', payload),

  updateTrunk: (appId: string, payload: { app_name?: string; answer_url?: string; hangup_url?: string }) =>
    api.put(`/plivo/trunks/${appId}`, payload),

  deleteTrunk: (appId: string) =>
    api.delete(`/plivo/trunks/${appId}`),
}
