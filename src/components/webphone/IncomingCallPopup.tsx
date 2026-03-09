import { Phone, PhoneOff } from 'lucide-react'

interface Props {
  from: string
  onAnswer: () => void
  onReject: () => void
}

export function IncomingCallPopup({ from, onAnswer, onReject }: Props) {
  return (
    <div
      className="fixed z-[70]"
      style={{
        bottom: '88px',
        right: '24px',
        width: '300px',
        borderRadius: '20px',
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex flex-col items-center px-6 pt-7 pb-6">
        {/* Animated ring + icon */}
        <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ background: '#818CF8' }} />
          <div className="absolute inset-3 rounded-full animate-ping opacity-20"
            style={{ background: '#818CF8', animationDelay: '0.2s' }} />
          <div
            className="relative w-16 h-16 rounded-full flex items-center justify-center z-10"
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              boxShadow: '0 0 0 4px rgba(99,102,241,0.25)',
            }}
          >
            <Phone size={26} className="text-white" />
          </div>
        </div>

        <p className="text-xs font-semibold tracking-widest uppercase mb-1"
          style={{ color: 'rgba(165,180,252,0.8)' }}>
          Incoming Call
        </p>
        <p className="text-xl font-bold text-white text-center leading-tight truncate max-w-full mb-0.5">
          {from}
        </p>
        <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>via WebPhone</p>

        {/* Reject | Accept */}
        <div className="flex gap-10 justify-center">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onReject}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                boxShadow: '0 6px 20px rgba(239,68,68,0.45)',
              }}
            >
              <PhoneOff size={22} className="text-white" />
            </button>
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Decline</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onAnswer}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                boxShadow: '0 6px 20px rgba(34,197,94,0.45)',
              }}
            >
              <Phone size={22} className="text-white" />
            </button>
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Answer</span>
          </div>
        </div>
      </div>
    </div>
  )
}
