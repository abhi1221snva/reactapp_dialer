import { PhoneForwarded, Voicemail, Grid3x3, PhoneOff, Phone, Mic, MicOff, Pause, Play, AlertTriangle, LogOut } from 'lucide-react'
import { cn } from '../../../utils/cn'
import type { CallState } from './types'

interface Props {
  callState: CallState
  duration: number
  muted: boolean
  holding: boolean
  failReason?: string | null
  onDial: () => void
  onHangup: () => void
  onEndSession?: () => void
  onTransfer: () => void
  onVoiceDrop: () => void
  onDialPad: () => void
  onToggleMute: () => void
  onToggleHold: () => void
}

/**
 * Sticky bottom call control bar.
 * Always visible during active dialer session.
 */
export function CallControlBar({
  callState, duration, muted, holding, failReason, onDial, onHangup, onEndSession, onTransfer,
  onVoiceDrop, onDialPad, onToggleMute, onToggleHold,
}: Props) {
  const isActive = callState === 'in-call' || callState === 'ringing' || callState === 'dialing'
  const isRinging = callState === 'ringing' || callState === 'dialing'
  const isInCall = callState === 'in-call'
  const isFailed = callState === 'failed'

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div className="sticky bottom-0 z-30 mt-4">
      <div className="glass rounded-2xl border border-slate-200/60 shadow-xl px-3 py-2.5">
        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">

          {/* ── Left: call status ───────────────────────────────── */}
          <div className={cn(
            'flex items-center gap-3 pr-3 mr-1 border-r border-slate-200/60',
            isFailed && 'min-w-[200px]',
          )}>
            <div className="relative">
              <div className={cn(
                'w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm transition-all',
                isInCall   && 'bg-gradient-to-br from-emerald-500 to-teal-600',
                isRinging  && 'bg-gradient-to-br from-amber-500 to-orange-600',
                isFailed   && 'bg-gradient-to-br from-red-500 to-rose-600',
                !isActive && !isFailed && 'bg-gradient-to-br from-slate-400 to-slate-500',
              )}>
                {isFailed ? <AlertTriangle size={16} className="text-white" /> : <Phone size={16} className="text-white" />}
              </div>
              {isInCall && (
                <span className="absolute inset-0 rounded-2xl animate-pulse-ring" />
              )}
              {isFailed && (
                <span className="absolute inset-0 rounded-2xl animate-ping bg-red-400/30" />
              )}
            </div>
            <div className="min-w-0">
              <p className={cn(
                'text-[10px] font-bold uppercase tracking-wider',
                isFailed ? 'text-red-500' : 'text-slate-400',
              )}>
                {isInCall ? 'On Call' : isRinging ? 'Ringing…' : isFailed ? 'Call Failed' : callState === 'wrap-up' ? 'Wrap-up' : 'Ready'}
              </p>
              {isFailed && failReason ? (
                <p className="text-xs font-semibold text-red-600 leading-tight truncate max-w-[180px]" title={failReason}>
                  {failReason}
                </p>
              ) : (
                <p className={cn(
                  'text-base font-bold tabular-nums leading-tight',
                  isInCall ? 'text-emerald-600' : 'text-slate-700',
                )}>
                  {isInCall ? fmtTime(duration) : '00:00'}
                </p>
              )}
            </div>
          </div>

          {/* ── Center: action cluster ──────────────────────────── */}
          <div className="flex items-center gap-1.5 flex-1 justify-center flex-wrap">
            <ControlBtn
              icon={PhoneForwarded}
              label="Transfer"
              shortcut="T"
              onClick={onTransfer}
              disabled={!isInCall}
              variant="neutral"
            />
            <ControlBtn
              icon={Voicemail}
              label="Voice Drop"
              shortcut="V"
              onClick={onVoiceDrop}
              disabled={!isInCall}
              variant="neutral"
            />
            <ControlBtn
              icon={Grid3x3}
              label="Dial Pad"
              shortcut="D"
              onClick={onDialPad}
              disabled={!isInCall}
              variant="neutral"
            />

            {/* Divider */}
            <div className="h-8 w-px bg-slate-200/60 mx-1" />

            <ControlBtn
              icon={muted ? MicOff : Mic}
              label={muted ? 'Unmute' : 'Mute'}
              shortcut="M"
              onClick={onToggleMute}
              disabled={!isInCall}
              variant={muted ? 'warning' : 'neutral'}
            />
            <ControlBtn
              icon={holding ? Play : Pause}
              label={holding ? 'Resume' : 'Hold'}
              shortcut="H"
              onClick={onToggleHold}
              disabled={!isInCall}
              variant={holding ? 'warning' : 'neutral'}
            />
          </div>

          {/* ── Right: primary CTA ──────────────────────────────── */}
          <div className="flex items-center gap-2 pl-3 ml-1 border-l border-slate-200/60">
            {!isActive ? (
              <button
                onClick={onDial}
                className="group flex items-center gap-2 px-5 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Phone size={15} className="group-hover:rotate-12 transition-transform" />
                Start Call
                <kbd className="ml-1 text-[9px] font-mono bg-white/20 rounded px-1 py-[1px]">⏎</kbd>
              </button>
            ) : (
              <>
                <button
                  onClick={onHangup}
                  className="group relative flex items-center gap-2 px-5 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-bold text-sm shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all overflow-hidden"
                >
                  <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                  <PhoneOff size={15} className="relative" />
                  <span className="relative">Hang Up</span>
                  <kbd className="relative ml-1 text-[9px] font-mono bg-white/20 rounded px-1 py-[1px]">␣</kbd>
                </button>
                {onEndSession && (
                  <button
                    onClick={onEndSession}
                    className="flex items-center gap-1.5 h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 font-semibold text-xs transition-all"
                    title="End session — leave conference entirely"
                  >
                    <LogOut size={14} />
                    <span className="hidden sm:inline">End Session</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Control button ──────────────────────────────────────────────────────────
interface ControlBtnProps {
  icon: React.ElementType
  label: string
  shortcut?: string
  onClick: () => void
  disabled?: boolean
  variant: 'neutral' | 'warning'
}

function ControlBtn({ icon: Icon, label, shortcut, onClick, disabled, variant }: ControlBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group flex items-center gap-1.5 h-11 px-3.5 rounded-xl font-semibold text-xs transition-all border disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'neutral' && 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700',
        variant === 'warning' && 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100',
      )}
    >
      <Icon size={14} />
      <span className="hidden sm:inline">{label}</span>
      {shortcut && (
        <kbd className="hidden md:inline text-[9px] font-mono text-slate-400 bg-slate-100 group-hover:bg-white rounded px-1 py-[1px] transition-colors">
          {shortcut}
        </kbd>
      )}
    </button>
  )
}
