import api from '../api/axios'

// ─── Legacy prospect endpoints (old flow) ────────────────────────────────────

export interface RegisterPayload {
  name: string
  email: string
  company_name?: string
  country_code: string
  phone_number: string
  password: string
}

export const registerService = {
  /** Legacy Step 1 — Submit registration details, triggers email OTP */
  register: (payload: RegisterPayload) =>
    api.post('/prospect/register', payload),

  /** Legacy Step 2 — Verify email OTP */
  verifyEmail: (email: string, otp: string) =>
    api.post('/prospect/verify', { email, otp }),

  /** Legacy Resend email OTP */
  resendEmailOtp: (email: string) =>
    api.post('/prospect/resend', { email }),

  /** Legacy Step 3 — Send phone OTP */
  sendPhoneOtp: (country_code: string, phone: string) =>
    api.post('/prospect/sendotp/mobile', { country_code, phone }),

  /** Legacy Step 4 — Verify phone OTP (creates account) */
  verifyPhone: (data: {
    country_code: string
    phone: string
    otp: string
    email: string
    email_otp_id: string
  }) => api.post('/prospect/verify/mobile', data),

  /** Legacy Resend phone OTP */
  resendPhoneOtp: (country_code: string, phone: string) =>
    api.post('/prospect/resend/mobile', { country_code, phone }),

  // ─── V2 Registration endpoints ────────────────────────────────────────────

  /**
   * V2 Step 1 — Initialize registration
   * POST /register/init
   * Body: { name, business_name, password, password_confirmation }
   * Returns: { status, data: { registration_id } }
   */
  registerInit: (data: {
    name: string
    business_name: string
    password: string
    password_confirmation: string
  }) => api.post<{ status: boolean; data: { registration_id: string } }>('/register/init', data),

  /**
   * V2 Step 2a — Send email OTP
   * POST /register/email/send-otp
   * Body: { registration_id, email }
   * Returns: { status, message }
   */
  sendEmailOtp: (registration_id: string, email: string) =>
    api.post<{ status: boolean; message: string }>('/register/email/send-otp', { registration_id, email }),

  /**
   * V2 Step 2b — Verify email OTP
   * POST /register/email/verify-otp
   * Body: { registration_id, email, otp }
   * Returns: { status, message }
   */
  verifyEmailOtp: (registration_id: string, email: string, otp: string) =>
    api.post<{ status: boolean; message: string }>('/register/email/verify-otp', { registration_id, email, otp }),

  /**
   * V2 Step 3a — Send phone OTP
   * POST /register/phone/send-otp
   * Body: { registration_id, country_code, phone }
   * Returns: { status, message }
   */
  sendPhoneOtp2: async (registration_id: string, country_code: string, phone: string) => {
    const payload = { registration_id, country_code, phone }
    console.log('SEND OTP PAYLOAD:', payload)
    const response = await api.post<{ status: boolean; message: string }>('/register/phone/send-otp', payload)
    console.log('SEND OTP RESPONSE:', response.data)
    return response
  },

  /**
   * V2 Step 3b — Verify phone OTP (completes registration)
   * POST /register/phone/verify-otp
   * Body: { registration_id, country_code, phone, otp }
   * Returns: { status, message, data: { user_id, client_id } }
   */
  verifyPhoneOtp: async (registration_id: string, country_code: string, phone: string, otp: string) => {
    // Backend stores OTP keyed to E.164 (country_code + phone, e.g. "+919415265571").
    // verifyPhoneOtp only accepts { registration_id, phone (E.164), otp } — no country_code field.
    const e164Phone = country_code + phone
    const payload = { registration_id, phone: e164Phone, otp }
    console.log('VERIFY OTP FINAL PAYLOAD:', payload)
    return api.post<{ status: boolean; message: string; data: { user_id: number; client_id: number } }>(
      '/register/phone/verify-otp',
      payload
    )
  },

  /**
   * Google OAuth registration — verifies Google ID token, creates prospect,
   * pre-marks email as verified, skips email OTP step.
   * POST /register/google
   * Body: { credential, business_name }
   * Returns: { status, message, data: { registration_id, name, email } }
   */
  googleRegister: (credential: string, business_name: string) =>
    api.post<{ status: boolean; message: string; data: { registration_id: string; name: string; email: string } }>(
      '/register/google',
      { credential, business_name }
    ),

  /**
   * Poll registration provisioning status (slow-path only).
   * GET /register/status/{id}
   * Returns: { status, data: { stage, progress_pct, ready, failed, stage_label, client_id?, user_id?, error_message? } }
   */
  getRegistrationStatus: (progressId: number | string) =>
    api.get<{
      status: boolean
      data: {
        stage: string
        progress_pct: number
        path: 'fast' | 'slow'
        ready: boolean
        failed: boolean
        stage_label: string
        client_id?: number
        user_id?: number
        error_message?: string
        retry_count?: number
      }
    }>(`/register/status/${progressId}`),
}
