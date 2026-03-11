import api from '../api/axios'

export interface AdminClient extends Record<string, unknown> {
  id: number
  company_name: string
  address_1?: string
  address_2?: string
  logo?: string
  trunk?: string
  api_key?: string
  enable_2fa?: string
  sms?: string
  fax?: string
  chat?: string
  webphone?: string
  ringless?: string
  callchex?: string
  predictive_dial?: string
  is_deleted: number
  stage?: number
  created_at?: string
  admin_user?: {
    id: number
    email: string
    first_name: string
    last_name: string
  } | null
}

export interface ClientListResponse {
  clients: AdminClient[]
  total: number
  current_page: number
  per_page: number
}

export interface ClientFilters {
  page?: number
  per_page?: number
  search?: string
  status?: 'active' | 'inactive' | ''
}

export interface CreateClientPayload {
  company_name: string
  trunk: string
  api_key: string
  enable_2fa?: string
  asterisk_servers: number[]
  address_1?: string
  address_2?: string
  sms?: string
  fax?: string
  chat?: string
  webphone?: string
}

export interface UpdateClientPayload extends Partial<CreateClientPayload> {
  ringless?: string
  callchex?: string
  predictive_dial?: string
}

export const adminClientService = {
  list: (filters: ClientFilters = {}) =>
    api.get<{ data: ClientListResponse }>('/admin/clients', { params: filters }),

  get: (id: number) =>
    api.get<{ data: AdminClient }>(`/admin/clients/${id}`),

  create: (payload: CreateClientPayload) =>
    api.post<{ data: AdminClient }>('/admin/clients', payload),

  update: (id: number, payload: UpdateClientPayload) =>
    api.put<{ data: AdminClient }>(`/admin/clients/${id}`, payload),

  activate: (id: number) =>
    api.post(`/admin/clients/${id}/activate`),

  deactivate: (id: number) =>
    api.post(`/admin/clients/${id}/deactivate`),

  switchTo: (id: number) =>
    api.post<{ data: Record<string, unknown> }>(`/admin/clients/${id}/switch`),
}
