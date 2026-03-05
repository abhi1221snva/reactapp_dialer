import api from '../api/axios'
import type { LoginRequest, LoginResponse, OtpVerifyRequest } from '../types'

export const authService = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/authentication', data),

  verifyOtp: (data: OtpVerifyRequest) =>
    api.post('/verify_google_otp', data),

  forgotPassword: (email: string) =>
    api.post('/forget_password', { email }),

  resetPassword: (data: { token: string; email: string; password: string; password_confirmation: string }) =>
    api.post('/reset_password', data),

  getProfile: () =>
    api.get('/profile'),

  updateProfile: (data: FormData | Record<string, unknown>) =>
    api.post('/update_profile', data),

  changePassword: (data: { old_password: string; password: string; password_confirmation: string }) =>
    api.post('/change_password', data),

  logout: () =>
    api.post('/logout'),
}
