import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2, Circle, AlertCircle, ArrowRight, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { registerService } from '../../services/register.service'
import { useAuthStore } from '../../stores/auth.store'
import type { User } from '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetupStep {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at?: number
  completed_at?: number
  duration?: number
}

interface SetupProgressData {
  elapsed_time: number
  current_step: string | null
  completed: boolean
  failed: boolean
  steps: SetupStep[]
  stage?: string
  ready?: boolean
  token?: string
  user?: Record<string, unknown>
  error_message?: string
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SetupProgressProps {
  progressId: string
  onLoginSuccess?: () => void
}

// ─── Step icon component ──────────────────────────────────────────────────────

function StepIcon({ status }: { status: SetupStep['status'] }) {
  switch (status) {
    case 'completed':
      return (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
          style={{
            background: 'linear-gradient(135deg, #059669, #10b981)',
            boxShadow: '0 0 12px rgba(16,185,129,0.35)',
          }}
        >
          <CheckCircle2 size={14} className="text-white" />
        </div>
      )
    case 'running':
      return (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            boxShadow: '0 0 16px rgba(99,102,241,0.45)',
          }}
        >
          <Loader2 size={14} className="text-white animate-spin" />
        </div>
      )
    case 'failed':
      return (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #dc2626, #ef4444)',
            boxShadow: '0 0 12px rgba(239,68,68,0.35)',
          }}
        >
          <AlertCircle size={14} className="text-white" />
        </div>
      )
    default:
      return (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1.5px solid rgba(255,255,255,0.08)',
          }}
        >
          <Circle size={10} style={{ color: 'rgba(255,255,255,0.15)' }} />
        </div>
      )
  }
}

// ─── Connector line between steps ─────────────────────────────────────────────

function StepConnector({ fromStatus, toStatus }: { fromStatus: string; toStatus: string }) {
  const isActive = fromStatus === 'completed'
  const isRunning = fromStatus === 'completed' && toStatus === 'running'

  return (
    <div className="flex justify-center" style={{ height: 20, marginLeft: 13, width: 1 }}>
      <div
        className="w-0.5 h-full rounded-full transition-all duration-700"
        style={{
          background: isActive
            ? isRunning
              ? 'linear-gradient(180deg, #10b981, #6366f1)'
              : '#10b981'
            : 'rgba(255,255,255,0.06)',
        }}
      />
    </div>
  )
}

// ─── Completion celebration ───────────────────────────────────────────────────

function CompletionOverlay({ elapsed }: { elapsed: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      <div
        className="animate-fadeIn text-center pointer-events-auto"
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(52,211,153,0.1))',
            border: '2px solid rgba(16,185,129,0.3)',
            boxShadow: '0 0 40px rgba(16,185,129,0.15), 0 0 80px rgba(16,185,129,0.05)',
          }}
        >
          <Sparkles size={32} className="text-emerald-400" />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SetupProgress({ progressId, onLoginSuccess }: SetupProgressProps) {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [data, setData] = useState<SetupProgressData | null>(null)
  const [elapsedDisplay, setElapsedDisplay] = useState(0)
  const [showCompletion, setShowCompletion] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null)
  const startTimeRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const loginDoneRef = useRef(false)

  // ── Live elapsed timer (client-side for smoothness) ───────────────────────
  useEffect(() => {
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsedDisplay(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 100)
    return () => clearInterval(timerRef.current)
  }, [])

  // ── Auto-login handler ────────────────────────────────────────────────────
  const handleAutoLogin = useCallback((d: SetupProgressData) => {
    if (loginDoneRef.current) return
    if (!d.token) return
    loginDoneRef.current = true

    const userData = d.user
    const user: User = {
      ...(userData ?? {}),
      name: (userData?.first_name || '') + ' ' + (userData?.last_name || ''),
      level: Number(userData?.level ?? 6),
    } as User

    localStorage.setItem('auth_token', d.token)
    setAuth(d.token, user)

    // Show completion for 2.5 seconds then redirect
    setShowCompletion(true)
    clearInterval(timerRef.current)
    setRedirectCountdown(3)
  }, [setAuth])

  // ── Redirect countdown ────────────────────────────────────────────────────
  useEffect(() => {
    if (redirectCountdown === null) return
    if (redirectCountdown <= 0) {
      toast.success('Welcome! Your account is ready.')
      if (onLoginSuccess) onLoginSuccess()
      navigate('/dashboard')
      return
    }
    const t = setTimeout(() => setRedirectCountdown(c => (c ?? 1) - 1), 1000)
    return () => clearTimeout(t)
  }, [redirectCountdown, navigate, onLoginSuccess])

  // ── Polling loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!progressId) return
    let cancelled = false

    const poll = async () => {
      try {
        const res = await registerService.signupGetSetupSteps(progressId)
        const d = res.data?.data as SetupProgressData
        if (cancelled) return

        setData(d)

        if (d.completed && d.ready) {
          handleAutoLogin(d)
          return
        }
        if (d.failed) {
          clearInterval(timerRef.current)
          return
        }
      } catch {
        // Silently retry on network errors
      }
      if (!cancelled) {
        setTimeout(poll, 1000)
      }
    }

    poll()
    return () => { cancelled = true }
  }, [progressId, handleAutoLogin])

  // ── Format elapsed time ───────────────────────────────────────────────────
  const formatElapsed = (s: number) => {
    if (s < 60) return `${s}s`
    return `${Math.floor(s / 60)}m ${s % 60}s`
  }

  // ── Fallback steps for initial render ─────────────────────────────────────
  const steps: SetupStep[] = data?.steps ?? [
    { name: 'Profile Setup', status: 'pending' },
    { name: 'Campaign Menu Setup', status: 'pending' },
    { name: 'Lead Menu Setup', status: 'pending' },
    { name: 'DID Setup', status: 'pending' },
    { name: 'Email Template Setup', status: 'pending' },
    { name: 'SMS Template Setup', status: 'pending' },
    { name: 'Final Initialization', status: 'pending' },
  ]

  const completedCount = steps.filter(s => s.status === 'completed').length
  const progressPct = Math.round((completedCount / steps.length) * 100)
  const isFailed = data?.failed ?? false
  const isCompleted = showCompletion

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div className="relative w-full animate-fadeIn" style={{ minHeight: 460 }}>
      {/* ── Completion overlay ─────────────────────────────────────────────── */}
      {isCompleted && <CompletionOverlay elapsed={elapsedDisplay} />}

      <div className={`transition-all duration-700 ${isCompleted ? 'opacity-0 scale-95' : 'opacity-100'}`}>
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-white leading-tight">
            {isFailed ? 'Setup encountered an issue' : 'Setting up your workspace'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isFailed
              ? 'Please try again or contact support.'
              : 'Configuring everything for you. This will only take a moment.'}
          </p>
        </div>

        {/* ── Timer + Progress bar ──────────────────────────────────────────── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: isFailed ? '#ef4444' : '#6366f1',
                  boxShadow: isFailed
                    ? '0 0 8px rgba(239,68,68,0.6)'
                    : '0 0 8px rgba(99,102,241,0.6)',
                  animation: isFailed ? 'none' : 'pulse 2s ease-in-out infinite',
                }}
              />
              <span className="text-xs font-medium text-slate-400">
                Setup Time: <span className="text-white font-semibold">{formatElapsed(elapsedDisplay)}</span>
              </span>
            </div>
            <span className="text-xs font-semibold" style={{ color: isFailed ? '#ef4444' : '#818cf8' }}>
              {progressPct}%
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progressPct}%`,
                background: isFailed
                  ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                  : 'linear-gradient(90deg, #4f46e5, #6366f1, #818cf8)',
                boxShadow: isFailed
                  ? '0 0 12px rgba(239,68,68,0.3)'
                  : '0 0 12px rgba(99,102,241,0.3)',
              }}
            />
          </div>
        </div>

        {/* ── Step list ─────────────────────────────────────────────────────── */}
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={step.name}>
              <div
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all duration-300"
                style={{
                  background: step.status === 'running'
                    ? 'rgba(99,102,241,0.06)'
                    : step.status === 'failed'
                      ? 'rgba(239,68,68,0.06)'
                      : 'transparent',
                }}
              >
                <StepIcon status={step.status} />

                <div className="flex-1 min-w-0">
                  <span
                    className="text-sm font-medium transition-colors duration-300"
                    style={{
                      color: step.status === 'completed'
                        ? '#a7f3d0'
                        : step.status === 'running'
                          ? '#c7d2fe'
                          : step.status === 'failed'
                            ? '#fca5a5'
                            : '#475569',
                    }}
                  >
                    {step.name}
                  </span>
                </div>

                {/* Duration badge */}
                {step.status === 'completed' && step.duration !== undefined && (
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      color: '#6ee7b7',
                      background: 'rgba(16,185,129,0.08)',
                    }}
                  >
                    {step.duration < 1 ? '<1s' : `${Math.round(step.duration)}s`}
                  </span>
                )}

                {step.status === 'running' && (
                  <span className="text-[10px] font-medium text-indigo-300 animate-pulse">
                    In progress...
                  </span>
                )}
              </div>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <StepConnector fromStatus={step.status} toStatus={steps[i + 1].status} />
              )}
            </div>
          ))}
        </div>

        {/* ── Failed state CTA ────────────────────────────────────────────── */}
        {isFailed && (
          <div className="mt-5">
            <button
              onClick={() => navigate('/login')}
              className="w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
              }}
            >
              Go to Login <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── Completion state ────────────────────────────────────────────── */}
        {data?.completed && !isFailed && (
          <div className="mt-5 text-center">
            <div
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl"
              style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.15)',
              }}
            >
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-300">
                Setup Completed Successfully ({formatElapsed(elapsedDisplay)})
              </span>
            </div>
            {redirectCountdown !== null && (
              <p className="text-xs text-slate-500 mt-2">
                Redirecting to dashboard in {redirectCountdown}s...
              </p>
            )}
          </div>
        )}

        {/* ── Subtle helper text ──────────────────────────────────────────── */}
        {!isFailed && !data?.completed && (
          <p className="text-[11px] text-slate-600 text-center mt-5 leading-relaxed">
            Please don't close this page. This usually takes about 30 seconds.
          </p>
        )}
      </div>
    </div>
  )
}
