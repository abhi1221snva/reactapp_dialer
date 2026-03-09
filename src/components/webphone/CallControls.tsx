import { useState } from 'react'
import { Mic, MicOff, Pause, Play, ArrowRightLeft, X } from 'lucide-react'

interface Props {
  isMuted: boolean
  isOnHold: boolean
  onToggleMute: () => void
  onToggleHold: () => void
  onTransfer: (ext: string) => void
}

export function CallControls({ isMuted, isOnHold, onToggleMute, onToggleHold, onTransfer }: Props) {
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferExt, setTransferExt]   = useState('')

  const handleTransfer = () => {
    if (!transferExt.trim()) return
    onTransfer(transferExt.trim())
    setTransferExt('')
    setShowTransfer(false)
  }

  return (
    <div className="px-4 space-y-2.5">
      {/* Row: Mute | Hold | Transfer */}
      <div className="flex gap-2">
        <button
          onClick={onToggleMute}
          className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all"
          style={{
            background: isMuted ? '#FEF3C7' : '#F1F5F9',
            border: `1.5px solid ${isMuted ? '#FDE68A' : 'transparent'}`,
          }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: isMuted ? '#F59E0B' : '#E2E8F0' }}>
            {isMuted
              ? <MicOff size={14} color="#fff" />
              : <Mic    size={14} color="#64748B" />}
          </div>
          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: isMuted ? '#D97706' : '#64748B' }}>
            {isMuted ? 'UNMUTE' : 'MUTE'}
          </span>
        </button>

        <button
          onClick={onToggleHold}
          className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all"
          style={{
            background: isOnHold ? '#EFF6FF' : '#F1F5F9',
            border: `1.5px solid ${isOnHold ? '#BFDBFE' : 'transparent'}`,
          }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: isOnHold ? '#3B82F6' : '#E2E8F0' }}>
            {isOnHold
              ? <Play  size={14} color="#fff" />
              : <Pause size={14} color="#64748B" />}
          </div>
          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: isOnHold ? '#2563EB' : '#64748B' }}>
            {isOnHold ? 'RESUME' : 'HOLD'}
          </span>
        </button>

        <button
          onClick={() => setShowTransfer(p => !p)}
          className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all"
          style={{
            background: showTransfer ? '#F0FDF4' : '#F1F5F9',
            border: `1.5px solid ${showTransfer ? '#BBF7D0' : 'transparent'}`,
          }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: showTransfer ? '#22C55E' : '#E2E8F0' }}>
            <ArrowRightLeft size={13} color={showTransfer ? '#fff' : '#64748B'} />
          </div>
          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: showTransfer ? '#16A34A' : '#64748B' }}>
            TRANSFER
          </span>
        </button>
      </div>

      {/* Transfer input — shown when Transfer clicked */}
      {showTransfer && (
        <div className="flex gap-1.5 items-center">
          <input
            className="input flex-1 text-sm font-mono"
            placeholder="Enter extension…"
            value={transferExt}
            onChange={e => setTransferExt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleTransfer()}
            autoFocus
          />
          <button
            onClick={handleTransfer}
            disabled={!transferExt.trim()}
            className="px-3 h-9 rounded-xl text-xs font-bold text-white disabled:opacity-40 flex-shrink-0"
            style={{ background: '#6366F1' }}
          >
            Go
          </button>
          <button
            onClick={() => { setShowTransfer(false); setTransferExt('') }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 flex-shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
