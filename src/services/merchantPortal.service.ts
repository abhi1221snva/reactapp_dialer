import axios from 'axios'
import type { MerchantUser } from '../stores/merchantAuth.store'

const API = import.meta.env.VITE_API_URL ?? ''

const http = axios.create({ baseURL: API })

// Attach the merchant JWT to every request automatically.
http.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('merchant-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      const token: string | undefined = parsed?.state?.merchant?.token
      if (token) config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // ignore
  }
  return config
})

export interface MerchantApplication {
  id: number
  lead_token: string
  lead_status: string
  lead_type: string | null
  business_name: string | null
  applicant: string
  created_at: string
  updated_at: string
}

const merchantPortalService = {
  login(email: string, password: string) {
    return axios.post<{ success: boolean; data: MerchantUser & { role: string } }>(
      `${API}/merchant-auth`,
      { email, password },
    )
  },

  listApplications() {
    return http.get<{ success: boolean; data: MerchantApplication[] }>(
      '/merchant/my-applications',
    )
  },
}

export default merchantPortalService
