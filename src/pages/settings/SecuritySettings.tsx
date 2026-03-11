import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Shield, ShieldCheck, ShieldOff, Lock, Eye, EyeOff,
  RefreshCw, AlertTriangle, CheckCircle2, Key, Copy, Download,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { twoFactorService } from '../../services/twoFactor.service'
import { Modal } from '../../components/ui/Modal'

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 4 }: { size?: number }) {
  return (
    <svg className={`animate-spin w-${size} h-${size}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SecuritySettings() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Modal states
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [showRegenModal, setShowRegenModal] = useState(false)
  const [showNewCodes, setShowNewCodes] = useState(false)
  const [newCodes, setNewCodes] = useState<string[]>([])
  const [disablePassword, setDisablePassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  // ── 2FA Status query ──────────────────────────────────────────────────────
  const { data: statusRes, isLoading: statusLoading } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: () => twoFactorService.getStatus(),
  })
  const status = statusRes?.data?.data

  // ── Disable 2FA mutation ──────────────────────────────────────────────────
  const disableMutation = useMutation({
    mutationFn: () => twoFactorService.disable(disablePassword),
    onSuccess: () => {
      toast.success('Two-factor authentication disabled')
      setShowDisableModal(false)
      setDisablePassword('')
      qc.invalidateQueries({ queryKey: ['2fa-status'] })
    },
    onError: () => {
      // handled by interceptor
    },
  })

  // ── Regenerate backup codes mutation ──────────────────────────────────────
  const regenMutation = useMutation({
    mutationFn: () => twoFactorService.regenerateBackupCodes(),
    onSuccess: (res) => {
      const codes = res.data?.data?.backup_codes ?? []
      setNewCodes(codes)
      setShowRegenModal(false)
      setShowNewCodes(true)
      qc.invalidateQueries({ queryKey: ['2fa-status'] })
      toast.success('Backup codes regenerated!')
    },
  })

  // ── Download backup codes ─────────────────────────────────────────────────
  const downloadCodes = (codes: string[]) => {
    const text = [
      'DialerCRM — 2FA Backup Codes',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Keep these codes safe. Each code can only be used once.',
      '',
      ...codes.map((c, i) => `${i + 1}. ${c}`),
    ].join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dialercrm-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyAllCodes = (codes: string[]) => {
    navigator.clipboard.writeText(codes.join('\n')).then(() => {
      toast.success('All backup codes copied!')
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Security Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account security and authentication options</p>
      </div>

      {/* ── Two-Factor Authentication card ──────────────────────────────── */}
      <div className="card space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <Shield size={16} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900">Two-Factor Authentication (2FA)</h2>
            <p className="text-xs text-slate-500">Add an extra layer of security using Google Authenticator</p>
          </div>
          {!statusLoading && status && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              status.enabled
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
              {status.enabled
                ? <><ShieldCheck size={13} /> Active</>
                : <><ShieldOff size={13} /> Inactive</>
              }
            </div>
          )}
        </div>

        {statusLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-slate-100 rounded-xl" />
            <div className="h-10 bg-slate-100 rounded-xl w-2/3" />
          </div>
        ) : status?.enabled ? (
          /* ── 2FA is ON ─────────────────────────────────────────────────── */
          <div className="space-y-4">
            {/* Status row */}
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-800">2FA is active</p>
                {status.enabled_at && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Enabled {new Date(status.enabled_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </p>
                )}
              </div>
            </div>

            {/* Backup codes remaining */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2.5">
                <Key size={15} className="text-slate-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Backup Codes</p>
                  <p className="text-xs text-slate-500">
                    {status.backup_codes_remaining === 0
                      ? 'No codes remaining — regenerate immediately'
                      : `${status.backup_codes_remaining} code${status.backup_codes_remaining === 1 ? '' : 's'} remaining`
                    }
                  </p>
                </div>
              </div>
              {status.backup_codes_remaining === 0 && (
                <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                  Urgent
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowRegenModal(true)}
                className="btn-outline flex-1 gap-2 text-sm"
              >
                <RefreshCw size={14} /> Regenerate Backup Codes
              </button>
              <button
                type="button"
                onClick={() => setShowDisableModal(true)}
                className="btn-danger flex-1 gap-2 text-sm"
              >
                <ShieldOff size={14} /> Disable 2FA
              </button>
            </div>
          </div>
        ) : (
          /* ── 2FA is OFF ────────────────────────────────────────────────── */
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Your account is not protected with two-factor authentication. Enable 2FA to significantly increase your account security.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/settings/2fa-setup')}
              className="btn-primary gap-2"
            >
              <Shield size={15} /> Enable Two-Factor Authentication
            </button>
          </div>
        )}
      </div>

      {/* ── Disable 2FA modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={showDisableModal}
        onClose={() => { setShowDisableModal(false); setDisablePassword('') }}
        title="Disable Two-Factor Authentication"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
            <AlertTriangle size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">
              Disabling 2FA reduces your account security. You will need to enter your password to confirm.
            </p>
          </div>
          <div className="form-group">
            <label className="label">Current Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <input
                type={showPass ? 'text' : 'password'}
                className="input pl-10 pr-10"
                placeholder="Enter your password"
                value={disablePassword}
                onChange={e => setDisablePassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setShowDisableModal(false); setDisablePassword('') }}
              className="btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => disableMutation.mutate()}
              disabled={!disablePassword.trim() || disableMutation.isPending}
              className="btn-danger flex-1 gap-2"
            >
              {disableMutation.isPending ? <><Spinner /> Disabling...</> : 'Disable 2FA'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Regenerate confirmation modal ──────────────────────────────────── */}
      <Modal
        isOpen={showRegenModal}
        onClose={() => setShowRegenModal(false)}
        title="Regenerate Backup Codes"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              This will invalidate all existing backup codes. Make sure to save the new codes immediately.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowRegenModal(false)}
              className="btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => regenMutation.mutate()}
              disabled={regenMutation.isPending}
              className="btn-warning flex-1 gap-2"
            >
              {regenMutation.isPending ? <><Spinner /> Generating...</> : <><RefreshCw size={14} /> Regenerate</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── New backup codes display modal ─────────────────────────────────── */}
      <Modal
        isOpen={showNewCodes}
        onClose={() => setShowNewCodes(false)}
        title="New Backup Codes"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <strong>Save these codes now.</strong> Each backup code can only be used once and they will not be shown again.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {newCodes.map((code, i) => (
              <div key={i} className="font-mono text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-center tracking-wider select-all">
                {code}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => copyAllCodes(newCodes)}
              className="btn-outline flex-1 gap-2 text-sm"
            >
              <Copy size={13} /> Copy All
            </button>
            <button
              type="button"
              onClick={() => downloadCodes(newCodes)}
              className="btn-outline flex-1 gap-2 text-sm"
            >
              <Download size={13} /> Download
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowNewCodes(false)}
            className="btn-primary w-full gap-2"
          >
            <CheckCircle2 size={15} /> Done
          </button>
        </div>
      </Modal>
    </div>
  )
}
