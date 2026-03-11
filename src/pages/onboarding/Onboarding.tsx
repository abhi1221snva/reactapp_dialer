import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Circle, Mail, Phone, Users, LayoutList,
  PhoneCall, ArrowRight, Rocket, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { onboardingService } from '../../services/agent.service'

// ─── Types ────────────────────────────────────────────────────────────────────
interface OnboardingStep {
  step: number
  key: string
  label: string
  completed: boolean
  completed_at: string | null
}

interface OnboardingData {
  progress_pct: number
  is_complete: boolean
  completed_at: string | null
  steps: OnboardingStep[]
}

// ─── Step meta (icon + description + action) ──────────────────────────────────
const STEP_META: Record<string, {
  icon: React.ReactNode
  description: string
  action?: { label: string; path: string }
}> = {
  email_verified: {
    icon: <Mail size={20} />,
    description: 'Confirm your email address to secure your account.',
  },
  phone_verified: {
    icon: <Phone size={20} />,
    description: 'Verify your phone number for SMS notifications and 2FA.',
  },
  first_agent_created: {
    icon: <Users size={20} />,
    description: 'Add your first team member so they can handle calls and leads.',
    action: { label: 'Create Agent', path: '/agents' },
  },
  lead_fields_set: {
    icon: <LayoutList size={20} />,
    description: 'Configure custom fields to capture the right data for your leads.',
    action: { label: 'Configure Fields', path: '/crm/custom-fields' },
  },
  dialer_configured: {
    icon: <PhoneCall size={20} />,
    description: 'Set up your dialer settings, caller IDs, and SIP configurations.',
    action: { label: 'Go to Dialer', path: '/dialer' },
  },
}

// ─── Progress ring ────────────────────────────────────────────────────────────
function ProgressRing({ pct }: { pct: number }) {
  const r = 46
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#e0e7ff" strokeWidth="10" />
        <circle cx="56" cy="56" r={r} fill="none" stroke="#6366f1" strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-indigo-700">{pct}%</span>
        <span className="text-[10px] text-slate-500 font-medium">complete</span>
      </div>
    </div>
  )
}

// ─── Single step card ─────────────────────────────────────────────────────────
function StepCard({
  step,
  onMark,
  marking,
}: {
  step: OnboardingStep
  onMark: (key: string) => void
  marking: boolean
}) {
  const navigate = useNavigate()
  const meta = STEP_META[step.key]

  return (
    <div className={`rounded-2xl border p-5 flex items-start gap-4 transition-all
      ${step.completed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'}`}>
      {/* Step icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
        ${step.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
        {meta?.icon ?? <Circle size={20} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-semibold uppercase tracking-wide
            ${step.completed ? 'text-emerald-500' : 'text-slate-400'}`}>
            Step {step.step}
          </span>
          {step.completed && <CheckCircle2 size={14} className="text-emerald-500" />}
        </div>
        <p className={`font-semibold text-sm mb-1 ${step.completed ? 'text-emerald-800' : 'text-slate-800'}`}>
          {step.label}
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">{meta?.description}</p>

        {!step.completed && (
          <div className="flex items-center gap-2 mt-3">
            {meta?.action && (
              <button
                onClick={() => navigate(meta.action!.path)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {meta.action.label} <ChevronRight size={13} />
              </button>
            )}
            <button
              onClick={() => onMark(step.key)}
              disabled={marking}
              className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
            >
              Mark complete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function Onboarding() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [marking, setMarking] = useState<string | null>(null)

  const { data, isLoading } = useQuery<OnboardingData>({
    queryKey: ['onboarding'],
    queryFn: async () => {
      const res = await onboardingService.getProgress()
      return res.data?.data ?? res.data
    },
  })

  const completeMutation = useMutation({
    mutationFn: (step: string) => onboardingService.completeStep(step),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding'] })
      toast.success('Step completed!')
    },
    onSettled: () => setMarking(null),
  })

  const handleMark = (key: string) => {
    setMarking(key)
    completeMutation.mutate(key)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Loading onboarding...</p>
        </div>
      </div>
    )
  }

  const progress = data?.progress_pct ?? 0
  const steps = data?.steps ?? []
  const isComplete = data?.is_complete ?? false

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8 animate-fadeIn">

      {/* Header card */}
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-6">
        <ProgressRing pct={progress} />
        <div className="flex-1 text-center sm:text-left">
          {isComplete ? (
            <>
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                <Rocket size={20} className="text-indigo-600" />
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">All done!</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">You're all set 🎉</h1>
              <p className="text-sm text-slate-500">Your account is fully configured. Start making calls!</p>
              <button onClick={() => navigate('/dialer')}
                className="btn-primary mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl">
                Launch Dialer <ArrowRight size={15} />
              </button>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Getting Started</p>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to DialerCRM</h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Complete these {steps.length} quick steps to unlock the full platform. It only takes a few minutes.
              </p>
              <div className="mt-3">
                <div className="progress-track h-2">
                  <div className="progress-fill h-2 rounded-full transition-all duration-700"
                    style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {steps.filter(s => s.completed).length} of {steps.length} steps completed
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Steps list */}
      <div className="space-y-3">
        {steps.map(step => (
          <StepCard
            key={step.key}
            step={step}
            onMark={handleMark}
            marking={marking === step.key}
          />
        ))}
      </div>

      {/* Skip link */}
      {!isComplete && (
        <p className="text-center">
          <button onClick={() => navigate('/dashboard')}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            Skip for now — I'll finish later
          </button>
        </p>
      )}
    </div>
  )
}

// Needed for useNavigate inside StepCard
import { useState } from 'react'
