import api from '../api/axios'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PromptFunctionType = 'sms' | 'email' | 'call' | 'curl' | 'api'

export interface PromptFunction {
  id?: number
  prompt_id?: number
  type: PromptFunctionType
  name: string
  description?: string
  message?: string
  did_number?: string
  phone?: string
  curl_request?: string
  curl_response?: string
  api_method?: string
  api_url?: string
  api_body?: string
  api_response?: string
  [key: string]: unknown
}

export interface Prompt {
  id: number
  user_id: number
  title: string
  description?: string
  created_at?: string
  updated_at?: string
  functions?: PromptFunction[]
  [key: string]: unknown
}

export interface PromptListResponse {
  success: boolean
  message: string
  total_rows: number
  data: Prompt[]
}

export interface PromptShowResponse {
  success: boolean
  message: string
  data: {
    prompt: Prompt
    functions: PromptFunction[]
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const promptService = {
  list: (params?: { start?: number; limit?: number; search?: string }) =>
    api.get<PromptListResponse>('/prompts', { params }),

  create: (data: { title: string; description?: string }) =>
    api.post('/prompts', data),

  show: (id: number) =>
    api.get<PromptShowResponse>(`/prompts/${id}`),

  update: (id: number, data: { title: string; description?: string }) =>
    api.post(`/prompts/update/${id}`, data),

  delete: (id: number) =>
    api.post(`/prompts/delete/${id}`),

  saveFunctions: (id: number, functions: PromptFunction[]) =>
    api.post(`/prompts/${id}/functions`, { functions }),
}
