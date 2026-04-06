export interface User {
  id: number
  parent_id: number
  base_parent_id?: number
  name: string          // computed: first_name + last_name
  first_name: string
  last_name: string
  email: string
  mobile?: string
  phone?: string
  level: number
  role?: string
  extension: string
  alt_extension: string
  app_extension: string
  server: string
  domain: string
  secret: string
  dialer_mode: 'webphone' | 'extension' | 'mobile_app'
  status?: number
  profile_pic?: string
  companyName?: string
  companyLogo?: string
  did?: string
  otpId?: string
  two_factor_enabled?: number
  is_2fa_google_enabled?: number
  timezone?: string
}

export interface LoginRequest {
  email: string
  password: string
  device: string
}

export interface LoginResponse {
  success: boolean
  message: string
  data: User & { token: string; expires_at: string }
}

export interface OtpVerifyRequest {
  otp: string
  otpId: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  email: string
  password: string
  password_confirmation: string
}
