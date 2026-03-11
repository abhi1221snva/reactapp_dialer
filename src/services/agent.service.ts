import api from '../api/axios'

export interface CreateAgentPayload {
  first_name: string
  last_name?: string
  email: string
  mobile?: string
  country_code?: string
  password: string
  password_confirmation: string
  role_id: number
  send_welcome_email?: boolean
}

export interface UpdateAgentPayload {
  first_name?: string
  last_name?: string
  mobile?: string
  country_code?: string
  role_id?: number
  status?: 0 | 1
}

export const agentService = {
  list: (params?: { search?: string; status?: number; role_id?: number; start?: number; limit?: number }) =>
    api.get('/agents', { params }),

  show: (id: number) =>
    api.get(`/agents/${id}`),

  roles: () =>
    api.get('/agents/roles'),

  create: (payload: CreateAgentPayload) =>
    api.post('/agents', payload),

  update: (id: number, payload: UpdateAgentPayload) =>
    api.put(`/agents/${id}`, payload),

  deactivate: (id: number) =>
    api.delete(`/agents/${id}`),

  activate: (id: number) =>
    api.post(`/agents/${id}/activate`),

  resetPassword: (id: number, password: string, password_confirmation: string, notify_agent = true) =>
    api.post(`/agents/${id}/reset-password`, { password, password_confirmation, notify_agent }),
}

export const onboardingService = {
  getProgress: () =>
    api.get('/onboarding'),

  completeStep: (step: string) =>
    api.post('/onboarding/complete', { step }),
}
