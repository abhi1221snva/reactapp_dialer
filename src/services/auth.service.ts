import api from '../api/axios'
import type { LoginRequest, LoginResponse, OtpVerifyRequest } from '../types'

export const authService = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/authentication', data),

  verifyOtp: (data: OtpVerifyRequest) =>
    api.post('/verify_google_otp', data),

  googleLogin: (credential: string) =>
    api.post('/auth/google/callback', { credential }),

  linkGoogle: (credential: string, password: string) =>
    api.post('/auth/google/link', { credential, password }),

  forgotPassword: (email: string) =>
    api.post('/forgot-password', { email }),

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

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),

  // Session management
  getSessions: () =>
    api.get('/auth/sessions'),

  revokeSession: (id: number | string) =>
    api.delete(`/auth/sessions/${id}`),

  revokeAllSessions: () =>
    api.delete('/auth/sessions'),

  logout: () =>
    api.post('/logout'),
}
