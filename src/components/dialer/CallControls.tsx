import { useState } from 'react'
import { Phone, PhoneOff, Mic, MicOff, PauseCircle, PlayCircle, Grid3X3, ArrowRightLeft, Voicemail, Clock } from 'lucide-react'
import { useDialerStore } from '../../stores/dialer.store'
import { formatDuration } from '../../utils/format'
import { cn } from '../../utils/cn'

const DTMF_KEYS = ['1','2','3','4','5','6','7','8','9','*','0','#']

interface Props {
  onHangUp: () => void
  onDial: () => void
  onMute: () => void
  onHold: () => void
  onTransfer?: () => void
  onVoicemail?: () => void
}

export function CallControls({ onHangUp, onDial, onMute, onHold, onTransfer, onVoicemail }: Props) {
  const { callState, callDuration, isMuted, isOnHold } = useDialerStore()
  const [showDtmf, setShowDtmf] = useState(false)

  const isInCall = callState === 'in-call'
  const isReady = callState === 'ready'
  const isRinging = callState === 'ringing'

  const statusLabel =
    callState === 'idle' ? 'Not logged in' :
    callState === 'ready' ? 'Ready to dial' :
    isRinging ? 'Ringing…' :
    isInCall ? 'Connected' : 'Wrapping up'

  const statusClasses =
    isInCall ? 'bg-emerald-100 text-emerald-700' :
    isRinging ? 'bg-amber-100 text-amber-700' :
    callState === 'wrapping' ? 'bg-violet-100 text-violet-700' :
    'bg-slate-100 text-slate-500'

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

      {/* Main dial button */}
      <div className="relative flex items-center justify-center">
        {/* Pulse rings — only when ringing */}
        {isRinging && (
          <>
            <span className="absolute w-28 h-28 rounded-full bg-amber-400/30 animate-ping" />
            <span className="absolute w-36 h-36 rounded-full bg-amber-400/15 animate-ping" style={{ animationDelay: '0.3s' }} />
          </>
        )}
        {/* Pulse rings — when in call */}
        {isInCall && (
          <span className="absolute w-28 h-28 rounded-full bg-red-400/20 animate-ping" />
        )}
        <button
          onClick={isInCall || isRinging ? onHangUp : onDial}
          disabled={callState === 'idle' || callState === 'wrapping'}
          className={cn(
            'relative w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-95',
            isInCall || isRinging
              ? 'bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white'
              : isReady
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed',
            (isInCall || isRinging) && 'shadow-red-300/50',
            isReady && 'shadow-emerald-300/50'
          )}
        >
          {isInCall || isRinging
            ? <PhoneOff size={36} />
            : <Phone size={36} />}
        </button>
      </div>

      {/* Secondary controls */}
      {isInCall && (
        <div className="flex items-center gap-2">
          {/* Mute */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={onMute}
              className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150',
                isMuted
                  ? 'bg-red-100 text-red-600 ring-2 ring-red-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {isMuted ? <MicOff size={17} /> : <Mic size={17} />}
            </button>
            <span className="text-[10px] text-slate-400">{isMuted ? 'Unmute' : 'Mute'}</span>
          </div>

          {/* Hold */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={onHold}
              className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150',
                isOnHold
                  ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {isOnHold ? <PlayCircle size={17} /> : <PauseCircle size={17} />}
            </button>
            <span className="text-[10px] text-slate-400">{isOnHold ? 'Resume' : 'Hold'}</span>
          </div>

          {/* DTMF */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setShowDtmf(!showDtmf)}
              className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150',
                showDtmf
                  ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <Grid3X3 size={17} />
            </button>
            <span className="text-[10px] text-slate-400">Keypad</span>
          </div>

          {/* Transfer */}
          {onTransfer && (
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={onTransfer}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all duration-150"
              >
                <ArrowRightLeft size={17} />
              </button>
              <span className="text-[10px] text-slate-400">Transfer</span>
            </div>
          )}

          {/* Voicemail */}
          {onVoicemail && (
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={onVoicemail}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all duration-150"
              >
                <Voicemail size={17} />
              </button>
              <span className="text-[10px] text-slate-400">VM Drop</span>
            </div>
          )}
        </div>
      )}

      {/* DTMF Keypad */}
      {showDtmf && isInCall && (
        <div className="grid grid-cols-3 gap-2 w-full max-w-[200px]">
          {DTMF_KEYS.map((key) => (
            <button
              key={key}
              className="h-12 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-sm font-bold text-slate-700 transition-colors active:scale-95"
              onClick={() => {}}
            >
              {key}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
