import api from '../api/axios'

// ─── Response types ────────────────────────────────────────────────────────

export interface TwoFactorSetupData {
  secret: string
  qr_code_url: string   // otpauth:// URI — use as QR code data
  site_name: string
  email: string
}

export interface TwoFactorStatusData {
  enabled: boolean
  backup_codes_remaining: number
  enabled_at: string | null
}

export interface TwoFactorEnableData {
  enabled: boolean
  backup_codes: string[]
}

// ─── Service ───────────────────────────────────────────────────────────────

export const twoFactorService = {
  /**
   * Initiate 2FA setup — generates a TOTP secret and otpauth:// URI for QR.
   * Requires: JWT auth
   * POST /2fa/setup
   */
  setup: () =>
    api.post<{ status: boolean; data: TwoFactorSetupData }>('/2fa/setup'),

  /**
   * Enable 2FA after user scans QR and enters first OTP.
   * Requires: JWT auth
   * POST /2fa/enable → { otp }
   */
  enable: (otp: string) =>
    api.post<{ status: boolean; data: TwoFactorEnableData }>('/2fa/enable', { otp }),

  /**
   * Verify TOTP during login (no JWT required — called pre-auth).
   * POST /2fa/verify → { user_id, otp }
   * Returns full login response with token on success.
   */
  verify: (user_id: number, otp: string) =>
    api.post('/2fa/verify', { user_id, otp }),

  /**
   * Disable 2FA — requires password confirmation.
   * Requires: JWT auth
   * POST /2fa/disable → { password }
   */
  disable: (password: string) =>
    api.post<{ status: boolean }>('/2fa/disable', { password }),

  /**
   * Regenerate backup codes — invalidates old codes.
   * Requires: JWT auth
   * POST /2fa/backup-codes/regenerate
   */
  regenerateBackupCodes: () =>
    api.post<{ status: boolean; data: { backup_codes: string[] } }>('/2fa/backup-codes/regenerate'),

  /**
   * Get current 2FA status for the authenticated user.
   * Requires: JWT auth
   * GET /2fa/status
   */
  getStatus: () =>
    api.get<{ status: boolean; data: TwoFactorStatusData }>('/2fa/status'),
}
