import { useState } from 'react'
import {
  Phone, PhoneOff, Mic, MicOff, PauseCircle, PlayCircle,
  Grid3X3, ArrowRightLeft, Voicemail, Clock,
} from 'lucide-react'
import { useDialerStore } from '../../stores/dialer.store'
import { useFloatingStore } from '../../stores/floating.store'
import { dialerService } from '../../services/dialer.service'
import { formatDuration } from '../../utils/format'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

const DTMF_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

interface Props {
  onHangUp: () => void
  onDial: () => void
  onMute: () => void
  onHold: () => void
  onTransfer?: () => void
  onVoicemail?: () => void
}

export function CallControls({ onHangUp, onDial, onMute, onHold, onTransfer, onVoicemail }: Props) {
  const { callState, callDuration, isMuted, isOnHold, activeCampaign } = useDialerStore()
  const sipAnswerHandler  = useFloatingStore(s => s.sipAnswerHandler)
  const phoneHasIncoming  = useFloatingStore(s => s.phoneHasIncoming)
  const [showDtmf, setShowDtmf] = useState(false)
  const [dtmfSending, setDtmfSending] = useState(false)

  const isInCall  = callState === 'in-call'
  const isReady   = callState === 'ready'
  const isRinging = callState === 'ringing'

  const statusLabel =
    callState === 'idle'     ? 'Not logged in' :
    callState === 'ready'    ? 'Ready to dial' :
    isRinging                ? 'Ringing…' :
    isInCall                 ? 'Connected' :
    callState === 'wrapping' ? 'Wrapping up' : 'Paused'

  const statusClasses =
    isInCall                 ? 'bg-emerald-100 text-emerald-700' :
    isRinging                ? 'bg-amber-100 text-amber-700' :
    callState === 'wrapping' ? 'bg-violet-100 text-violet-700' :
    'bg-slate-100 text-slate-500'

  const handleDtmfKey = async (key: string) => {
    if (!activeCampaign || dtmfSending) return
    setDtmfSending(true)
    try {
      await dialerService.sendDtmf(activeCampaign.id, key)
    } catch {
      toast.error(`Failed to send DTMF ${key}`)
    } finally {
      setDtmfSending(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full px-4">
      {/* Duration */}
      {isInCall && (
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-emerald-600 animate-pulse" />
          <span className="text-3xl font-mono font-bold text-slate-900 tabular-nums tracking-tight">
            {formatDuration(callDuration)}
          </span>
        </div>
      )}

      {/* Status pill */}
      <span className={cn('px-4 py-1.5 rounded-full text-xs font-semibold', statusClasses)}>
        {statusLabel}
      </span>

      {/* Main dial / hang-up / answer buttons */}
      {isRinging ? (
        <div className="flex flex-col items-center gap-4">
          {/* Ringing indicator */}
          <div className="relative flex items-center justify-center">
            <span className="absolute w-28 h-28 rounded-full bg-emerald-400/25 animate-ping" />
            <span className="absolute w-36 h-36 rounded-full bg-emerald-400/12 animate-ping" style={{ animationDelay: '0.3s' }} />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl">
              <Phone size={32} className="text-white animate-pulse" />
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-600">
            {phoneHasIncoming ? 'Incoming call — answer now' : 'Waiting for call…'}
          </p>
          {/* Answer + Cancel row */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={onHangUp}
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95 bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-red-300/50"
              >
                <PhoneOff size={26} />
              </button>
              <span className="text-xs font-semibold text-red-500">Cancel</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => sipAnswerHandler?.()}
                disabled={!phoneHasIncoming}
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95',
                  phoneHasIncoming
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-300/50'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50',
                )}
              >
                <Phone size={26} />
              </button>
              <span className={cn('text-xs font-semibold', phoneHasIncoming ? 'text-emerald-600' : 'text-slate-400')}>Answer</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex items-center justify-center">
          {/* Pulse rings — in call */}
          {isInCall && (
            <span className="absolute w-28 h-28 rounded-full bg-red-400/20 animate-ping" />
          )}

          <button
            onClick={isInCall ? onHangUp : onDial}
            disabled={callState === 'idle' || callState === 'wrapping' || callState === 'paused'}
            className={cn(
              'relative w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-95',
              isInCall
                ? 'bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-red-300/50'
                : isReady
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-300/50'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed',
            )}
          >
            {isInCall ? <PhoneOff size={36} /> : <Phone size={36} />}
          </button>
        </div>
      )}

      {/* Secondary controls (visible only in-call) */}
      {isInCall && (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {/* Mute */}
          <ControlButton
            label={isMuted ? 'Unmute' : 'Mute'}
            active={isMuted}
            activeClasses="bg-red-100 text-red-600 ring-2 ring-red-300"
            onClick={onMute}
          >
            {isMuted ? <MicOff size={17} /> : <Mic size={17} />}
          </ControlButton>

          {/* Hold */}
          <ControlButton
            label={isOnHold ? 'Resume' : 'Hold'}
            active={isOnHold}
            activeClasses="bg-amber-100 text-amber-600 ring-2 ring-amber-300"
            onClick={onHold}
          >
            {isOnHold ? <PlayCircle size={17} /> : <PauseCircle size={17} />}
          </ControlButton>

          {/* DTMF keypad toggle */}
          <ControlButton
            label="Keypad"
            active={showDtmf}
            activeClasses="bg-indigo-100 text-indigo-600 ring-2 ring-indigo-300"
            onClick={() => setShowDtmf((v) => !v)}
          >
            <Grid3X3 size={17} />
          </ControlButton>

          {/* Transfer */}
          {onTransfer && (
            <ControlButton label="Transfer" onClick={onTransfer}>
              <ArrowRightLeft size={17} />
            </ControlButton>
          )}

          {/* Voicemail drop */}
          {onVoicemail && (
            <ControlButton label="VM Drop" onClick={onVoicemail}>
              <Voicemail size={17} />
            </ControlButton>
          )}
        </div>
      )}

      {/* DTMF Keypad */}
      {showDtmf && isInCall && (
        <div className="grid grid-cols-3 gap-2 w-full max-w-[200px]">
          {DTMF_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => handleDtmfKey(key)}
              disabled={dtmfSending}
              className="h-12 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-sm font-bold text-slate-700 transition-colors active:scale-95 disabled:opacity-50"
            >
              {key}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* Small reusable control button */
function ControlButton({
  label,
  active = false,
  activeClasses = '',
  onClick,
  children,
}: {
  label: string
  active?: boolean
  activeClasses?: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onClick}
        className={cn(
          'w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150',
          active ? activeClasses : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        )}
      >
        {children}
      </button>
      <span className="text-[10px] text-slate-400">{label}</span>
    </div>
  )
}
