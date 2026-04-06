import { useEffect } from 'react'
import { Phone, PhoneOff } from 'lucide-react'
import { useDialerStore } from '../../stores/dialer.store'
import { useFloatingStore } from '../../stores/floating.store'
import { formatPhoneNumber } from '../../utils/format'

export function IncomingCallModal() {
  const { incomingCall, setIncomingCall } = useDialerStore()
  const sipAnswerHandler  = useFloatingStore(s => s.sipAnswerHandler)
  const sipDeclineHandler = useFloatingStore(s => s.sipDeclineHandler)

  useEffect(() => {
    if (!incomingCall) return
    const audio = new Audio('/asset/audio/ringtone.wav')
    audio.loop = true
    audio.play().catch(() => {})
    return () => { audio.pause(); audio.currentTime = 0 }
  }, [incomingCall])

  if (!incomingCall) return null

  const handleAnswer = () => {
    if (sipAnswerHandler) sipAnswerHandler()
    else setIncomingCall(null)
  }

  const handleDecline = () => {
    if (sipDeclineHandler) sipDeclineHandler()
    else setIncomingCall(null)
  }

  return (
    /* Blur backdrop */
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-8 sm:items-center"
      style={{ backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }}>
      {/* Slide-up panel */}
      <div
        className="w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* Gradient top */}
        <div
          className="px-8 pt-10 pb-8 flex flex-col items-center gap-4"
          style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%)' }}
        >
          {/* Pulsing rings */}
          <div className="relative flex items-center justify-center">
            <span className="absolute w-24 h-24 rounded-full bg-white/10 animate-ping" />
            <span className="absolute w-32 h-32 rounded-full bg-white/5 animate-ping" style={{ animationDelay: '0.4s' }} />
            <div className="relative w-20 h-20 rounded-full bg-white/15 border-2 border-white/25 flex items-center justify-center">
              <Phone size={32} className="text-white animate-pulse" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Incoming Call</p>
            <p className="text-white text-2xl font-bold tracking-wide">
              {formatPhoneNumber(incomingCall.number)}
            </p>
          </div>
        </div>

        {/* Button row */}
        <div className="grid grid-cols-2 bg-slate-900">
          <button
            onClick={handleDecline}
            className="flex items-center justify-center gap-2.5 py-5 font-semibold text-sm transition-all hover:bg-slate-800 border-r border-slate-700/60"
            style={{ color: '#f87171' }}
          >
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <PhoneOff size={16} className="text-red-400" />
            </div>
            Decline
          </button>
          <button
            onClick={handleAnswer}
            className="flex items-center justify-center gap-2.5 py-5 font-semibold text-sm transition-all hover:bg-slate-800"
            style={{ color: '#34d399' }}
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Phone size={16} className="text-emerald-400" />
            </div>
            Answer
          </button>
        </div>
      </div>
    </div>
  )
}
