import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, Eye, EyeOff, Lock, RefreshCw, Copy, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { userService } from '../../services/user.service'
import { authService } from '../../services/auth.service'

function genPassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const nums = '0123456789'
  const syms = '@#!$%^&*_+-='
  const all = upper + lower + nums + syms
  const rng = (max: number) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % max }
  const pick = (s: string) => s[rng(s.length)]
  const chars = [pick(upper), pick(lower), pick(nums), pick(syms)]
  for (let i = chars.length; i < 12; i++) chars.push(pick(all))
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rng(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

interface Props {
  userId: number
  userName: string
  isSelf: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ChangePasswordModal({ userId, userName, isSelf, onClose, onSuccess }: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (isSelf && !currentPassword) e.currentPassword = 'Current password is required'
    if (!newPassword) e.newPassword = 'New password is required'
    else if (newPassword.length < 10) e.newPassword = 'Minimum 10 characters'
    else if (!/[A-Z]/.test(newPassword)) e.newPassword = 'Must include an uppercase letter'
    else if (!/[a-z]/.test(newPassword)) e.newPassword = 'Must include a lowercase letter'
    else if (!/[0-9]/.test(newPassword)) e.newPassword = 'Must include a number'
    else if (!/[^A-Za-z0-9]/.test(newPassword)) e.newPassword = 'Must include a special character'
    if (!confirmPassword) e.confirmPassword = 'Please confirm the password'
    else if (newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (isSelf) {
        return authService.changePassword({
          old_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
          id: userId,
        })
      }
      return userService.changePasswordByAdmin(userId, newPassword)
    },
    onSuccess: () => {
      toast.success('Password changed successfully')
      onSuccess?.()
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to change password')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) mutation.mutate()
  }

  const handleGenerate = () => {
    const pw = genPassword()
    setNewPassword(pw)
    setConfirmPassword(pw)
    setShowNew(true)
    setErrors({})
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(newPassword).then(() => toast.success('Copied to clipboard'))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
          <button onClick={onClose}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white">
            <X size={14} />
          </button>
          <div className="relative px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Lock size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Change Password</h2>
              <p className="text-xs text-white/80 mt-0.5">{userName}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Current password (self-service only) */}
          {isSelf && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setErrors(p => ({ ...p, currentPassword: '' })) }}
                  className="w-full h-10 pl-3 pr-10 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.currentPassword && <p className="text-xs text-red-500 mt-1">{errors.currentPassword}</p>}
            </div>
          )}

          {/* New password */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setErrors(p => ({ ...p, newPassword: '' })) }}
                className="w-full h-10 pl-3 pr-24 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                placeholder="Min 10 chars, upper+lower+digit+special"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button type="button" onClick={handleCopy} title="Copy"
                  className="p-1 rounded text-slate-400 hover:text-slate-600">
                  <Copy size={14} />
                </button>
                <button type="button" onClick={handleGenerate} title="Generate"
                  className="p-1 rounded text-slate-400 hover:text-indigo-600">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
            {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword}</p>}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '' })) }}
                className="w-full h-10 pl-3 pr-10 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                placeholder="Re-enter new password"
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 h-10 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {mutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
