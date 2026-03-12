import api from '../api/axios'
import type { LoginRequest, LoginResponse, OtpVerifyRequest } from '../types'

export const authService = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/authentication', data),

  verifyOtp: (data: OtpVerifyRequest) =>
    api.post('/verify_google_otp', data),

  googleLogin: (credential: string) =>
    api.post('/auth/google/callback', { credential }),

  forgotPassword: (email: string) =>
    api.post('/forget_password', { email }),

  resetPassword: (data: { token: string; email: string; password: string; password_confirmation: string }) =>
    api.post('/reset_password', data),

  getProfile: () =>
    api.get('/profile'),

  updateProfile: (data: FormData | Record<string, unknown>) =>
    api.post('/update-profile', data),

  uploadAvatar: (file: File) => {
    const fd = new FormData()
    fd.append('avatar', file)
    return api.post('/profile/upload-avatar', fd)
  },

  changePassword: (data: { old_password: string; password: string; password_confirmation: string; id?: number | string }) =>
    api.post('/update-user-password', { id: data.id, password: data.old_password, new_password: data.password }),

  logout: () =>
    api.post('/logout'),
}
