import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Loader2, ArrowRight, AlertCircle, Sparkles,
  UserCheck, LayoutGrid, FileText, Phone, Mail, MessageSquare, Rocket,
} from 'lucide-react'
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

interface SetupProgressProps {
  progressId: string
}

// ─── Step metadata (icon + description for each step) ─────────────────────────

const STEP_META: Record<string, { icon: typeof UserCheck; desc: string }> = {
  'Profile Setup':         { icon: UserCheck,    desc: 'Creating your account profile...' },
  'Campaign Menu Setup':   { icon: LayoutGrid,   desc: 'Building your campaign workspace...' },
  'Lead Menu Setup':       { icon: FileText,     desc: 'Setting up lead management...' },
  'DID Setup':             { icon: Phone,        desc: 'Configuring phone extensions...' },
  'Email Template Setup':  { icon: Mail,         desc: 'Preparing email templates...' },
  'SMS Template Setup':    { icon: MessageSquare, desc: 'Configuring SMS templates...' },
  'Final Initialization':  { icon: Rocket,       desc: 'Finishing up — almost there!' },
}

const TOTAL_STEPS = 7
const REVEAL_DELAY = 1200 // ms between revealing each completed step

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SetupProgress({ progressId }: SetupProgressProps) {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [data, setData] = useState<SetupProgressData | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null)
  const [justCompleted, setJustCompleted] = useState<string | null>(null)
  const startRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const loginDoneRef = useRef(false)

  // ── Staggered reveal state ──────────────────────────────────────────────
  // Tracks how many steps the UI has "revealed" as completed.
  // When backend reports N completed steps but we've only revealed M < N,
  // we increment by 1 every REVEAL_DELAY ms so the user sees them one-by-one.
  const [revealedCount, setRevealedCount] = useState(0)
  const revealTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const targetCountRef = useRef(0)

  // ── Client-side timer ─────────────────────────────────────────────────────
  useEffect(() => {
    startRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 200)
    return () => clearInterval(timerRef.current)
  }, [])

  // ── Auto-login ────────────────────────────────────────────────────────────
  const handleAutoLogin = useCallback((d: SetupProgressData) => {
    if (loginDoneRef.current) return
    if (!d.token) return
    loginDoneRef.current = true

    const ud = d.user
    const user: User = {
      ...(ud ?? {}),
      name: (ud?.first_name || '') + ' ' + (ud?.last_name || ''),
      level: Number(ud?.level ?? 6),
    } as User

    localStorage.setItem('auth_token', d.token)
    setAuth(d.token, user)
    clearInterval(timerRef.current)
    setRedirectCountdown(3)
  }, [setAuth])

  // ── Redirect countdown ────────────────────────────────────────────────────
  useEffect(() => {
    if (redirectCountdown === null) return
    if (redirectCountdown <= 0) {
      toast.success('Welcome! Your account is ready.')
      navigate('/dashboard')
      return
    }
    const t = setTimeout(() => setRedirectCountdown(c => (c ?? 1) - 1), 1000)
    return () => clearTimeout(t)
  }, [redirectCountdown, navigate])

  // ── Staggered reveal logic ──────────────────────────────────────────────
  useEffect(() => {
    if (!data?.steps) return

    const actualCompleted = data.steps.filter(s => s.status === 'completed').length
    targetCountRef.current = actualCompleted

    // If we need to reveal more steps, start the reveal timer
    if (actualCompleted > revealedCount && !revealTimerRef.current) {
      const revealNext = () => {
        setRevealedCount(prev => {
          const next = prev + 1
          // Flash animation for the just-revealed step
          if (data?.steps) {
            const revealedStep = data.steps[next - 1]
            if (revealedStep) {
              setJustCompleted(revealedStep.name)
              setTimeout(() => setJustCompleted(null), 800)
            }
          }
          // Schedule next reveal if needed
          if (next < targetCountRef.current) {
            revealTimerRef.current = setTimeout(revealNext, REVEAL_DELAY)
          } else {
            revealTimerRef.current = undefined
          }
          return next
        })
      }

      revealTimerRef.current = setTimeout(revealNext, REVEAL_DELAY)
    }

    return () => {
      // Don't clear the timer on data changes — let it run
    }
  }, [data?.steps, revealedCount])

  // Cleanup reveal timer on unmount
  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
    }
  }, [])

  // ── Handle auto-login after all steps are revealed ──────────────────────
  useEffect(() => {
    if (data?.completed && data?.ready && revealedCount >= TOTAL_STEPS) {
      handleAutoLogin(data)
    }
  }, [revealedCount, data, handleAutoLogin])

  // ── Polling (2s, exponential backoff on 429) ──────────────────────────────
  useEffect(() => {
    if (!progressId) return
    let cancelled = false
    let delay = 2000

    const poll = async () => {
      try {
        const res = await registerService.signupGetSetupSteps(progressId)
        const d = res.data?.data as SetupProgressData
        if (cancelled) return
        delay = 2000 // reset on success

        setData(d)

        if (d.completed && d.ready) {
          // Don't auto-login here — wait for staggered reveal to finish
          return
        }
        if (d.failed) {
          clearInterval(timerRef.current)
          return
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 429) delay = Math.min(delay * 2, 15000)
      }
      if (!cancelled) setTimeout(poll, delay)
    }

    poll()
    return () => { cancelled = true }
  }, [progressId])

  // ── Derive display steps (cap completions at revealedCount) ─────────────
  const rawSteps: SetupStep[] = data?.steps ?? [
    { name: 'Profile Setup', status: 'running' },
    { name: 'Campaign Menu Setup', status: 'pending' },
    { name: 'Lead Menu Setup', status: 'pending' },
    { name: 'DID Setup', status: 'pending' },
    { name: 'Email Template Setup', status: 'pending' },
    { name: 'SMS Template Setup', status: 'pending' },
    { name: 'Final Initialization', status: 'pending' },
  ]

  // Override steps for staggered reveal:
  // - Steps up to revealedCount: show actual status (completed)
  // - Step at revealedCount index: show as "running" (currently being revealed)
  // - Steps beyond: show as "pending"
  const displaySteps: SetupStep[] = rawSteps.map((s, i) => {
    if (s.status === 'completed' || s.status === 'running') {
      if (i < revealedCount) {
        return { ...s, status: 'completed' as const }
      }
      if (i === revealedCount) {
        return { ...s, status: 'running' as const }
      }
      return { ...s, status: 'pending' as const }
    }
    return s
  })

  const completedSteps = displaySteps.filter(s => s.status === 'completed')
  const activeStep = displaySteps.find(s => s.status === 'running')
  const failedStep = displaySteps.find(s => s.status === 'failed')
  const doneCount = completedSteps.length
  const progressPct = Math.round((doneCount / TOTAL_STEPS) * 100)
  const isFailed = data?.failed ?? false
  const allRevealed = revealedCount >= TOTAL_STEPS && (data?.completed ?? false)

  const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  // ── All done — celebration ────────────────────────────────────────────────
  if (allRevealed && !isFailed) {
    return (
      <div className="w-full animate-fadeIn text-center" style={{ minHeight: 360 }}>
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(52,211,153,0.08))',
            border: '2px solid rgba(16,185,129,0.25)',
            boxShadow: '0 0 50px rgba(16,185,129,0.12)',
          }}
        >
          <Sparkles size={34} className="text-emerald-400" />
        </div>

        <h2 className="text-xl font-bold text-white mb-1">Setup Complete!</h2>
        <p className="text-sm text-emerald-300 font-medium mb-4">
          All done in {fmt(elapsed)}
        </p>

        {/* Completed chips */}
        <div className="flex flex-wrap justify-center gap-1.5 mb-5">
          {displaySteps.map(s => (
            <span
              key={s.name}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium"
              style={{ background: 'rgba(16,185,129,0.08)', color: '#6ee7b7' }}
            >
              <CheckCircle2 size={10} /> {s.name}
            </span>
          ))}
        </div>

        {redirectCountdown !== null && (
          <p className="text-xs text-slate-400 animate-pulse">
            Redirecting to dashboard in {redirectCountdown}s...
          </p>
        )}
      </div>
    )
  }

  // ── Failed ────────────────────────────────────────────────────────────────
  if (isFailed) {
    return (
      <div className="w-full animate-fadeIn text-center" style={{ minHeight: 360 }}>
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1.5px solid rgba(239,68,68,0.2)',
          }}
        >
          <AlertCircle size={28} className="text-red-400" />
        </div>

        <h2 className="text-xl font-bold text-white mb-1">Setup encountered an issue</h2>
        <p className="text-sm text-slate-400 mb-5">
          Our team has been notified. Please try logging in or contact support.
        </p>

        {completedSteps.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-5">
            {completedSteps.map(s => (
              <span
                key={s.name}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium"
                style={{ background: 'rgba(16,185,129,0.08)', color: '#6ee7b7' }}
              >
                <CheckCircle2 size={10} /> {s.name}
              </span>
            ))}
            {failedStep && (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5' }}
              >
                <AlertCircle size={10} /> {failedStep.name}
              </span>
            )}
          </div>
        )}

        <button
          onClick={() => navigate('/login')}
          className="w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110"
          style={{
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
          }}
        >
          Go to Login <ArrowRight size={16} />
        </button>
      </div>
    )
  }

  // ── In progress — sequential step view ────────────────────────────────────
  const currentMeta = activeStep ? STEP_META[activeStep.name] : null
  const CurrentIcon = currentMeta?.icon ?? Loader2

  return (
    <div className="w-full animate-fadeIn" style={{ minHeight: 360 }}>
      {/* ── Header row: title + timer ──────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white leading-tight">Setting up your workspace</h2>
          <p className="text-xs text-slate-500 mt-0.5">This will only take a moment</p>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.12)' }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: '#6366f1',
              boxShadow: '0 0 6px rgba(99,102,241,0.8)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          <span className="text-[11px] font-mono font-semibold text-indigo-300">{fmt(elapsed)}</span>
        </div>
      </div>

      {/* ── Progress bar ───────────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-slate-500">
            Step {doneCount + (activeStep ? 1 : 0)} of {TOTAL_STEPS}
          </span>
          <span className="text-[11px] font-semibold text-indigo-300">{progressPct}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #4f46e5, #818cf8)',
              boxShadow: '0 0 10px rgba(99,102,241,0.3)',
            }}
          />
        </div>
      </div>

      {/* ── Completed steps (compact chips) ────────────────────────────────── */}
      {completedSteps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {completedSteps.map(s => (
            <span
              key={s.name}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-500"
              style={{
                background: s.name === justCompleted
                  ? 'rgba(16,185,129,0.15)'
                  : 'rgba(16,185,129,0.06)',
                color: '#6ee7b7',
                border: s.name === justCompleted
                  ? '1px solid rgba(16,185,129,0.3)'
                  : '1px solid transparent',
              }}
            >
              <CheckCircle2 size={10} /> {s.name}
            </span>
          ))}
        </div>
      )}

      {/* ── Active step card ───────────────────────────────────────────────── */}
      {activeStep && (
        <div
          key={activeStep.name}
          className="rounded-xl p-5 mb-4 animate-fadeIn"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.04))',
            border: '1px solid rgba(99,102,241,0.12)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15), 0 0 0 1px rgba(99,102,241,0.05)',
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                boxShadow: '0 0 20px rgba(99,102,241,0.3)',
              }}
            >
              <CurrentIcon size={20} className="text-white" style={{
                animation: CurrentIcon === Loader2 ? 'spin 1s linear infinite' : 'none',
              }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{activeStep.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentMeta?.desc ?? 'Processing...'}
              </p>
            </div>
          </div>

          {/* Animated dots loader */}
          <div className="flex items-center gap-1 ml-[52px]">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: '#6366f1',
                  opacity: 0.4,
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
            <span className="text-[10px] text-indigo-400/60 font-medium ml-1.5">In progress</span>
          </div>
        </div>
      )}

      {/* ── Upcoming steps (dots only) ─────────────────────────────────────── */}
      {(() => {
        const pending = displaySteps.filter(s => s.status === 'pending')
        if (pending.length === 0) return null
        return (
          <div className="flex items-center gap-2 ml-1">
            <div className="flex items-center gap-1">
              {pending.map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-600">
              {pending.length} step{pending.length > 1 ? 's' : ''} remaining
            </span>
          </div>
        )
      })()}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <p className="text-[10px] text-slate-600 text-center mt-5">
        Please don't close this page.
      </p>
    </div>
  )
}
