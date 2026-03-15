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

  const btnBase: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
    padding: '10px 4px',
    borderRadius: 14,
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  }

  return (
    <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Row: Mute | Hold | Transfer */}
      <div style={{ display: 'flex', gap: 8 }}>

        <button
          onClick={onToggleMute}
          style={{
            ...btnBase,
            background: isMuted ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.07)',
            border: `1px solid ${isMuted ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          <div
            style={{
              width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isMuted ? '#F59E0B' : 'rgba(255,255,255,0.1)',
            }}
          >
            {isMuted
              ? <MicOff size={15} color="#fff" />
              : <Mic    size={15} color="rgba(148,163,184,0.8)" />}
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: isMuted ? '#FCD34D' : 'rgba(100,116,139,0.9)' }}>
            {isMuted ? 'UNMUTE' : 'MUTE'}
          </span>
        </button>

        <button
          onClick={onToggleHold}
          style={{
            ...btnBase,
            background: isOnHold ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.07)',
            border: `1px solid ${isOnHold ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          <div
            style={{
              width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isOnHold ? '#3B82F6' : 'rgba(255,255,255,0.1)',
            }}
          >
            {isOnHold
              ? <Play  size={15} color="#fff" />
              : <Pause size={15} color="rgba(148,163,184,0.8)" />}
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: isOnHold ? '#93C5FD' : 'rgba(100,116,139,0.9)' }}>
            {isOnHold ? 'RESUME' : 'HOLD'}
          </span>
        </button>

        <button
          onClick={() => setShowTransfer(p => !p)}
          style={{
            ...btnBase,
            background: showTransfer ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.07)',
            border: `1px solid ${showTransfer ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          <div
            style={{
              width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: showTransfer ? '#22C55E' : 'rgba(255,255,255,0.1)',
            }}
          >
            <ArrowRightLeft size={13} color={showTransfer ? '#fff' : 'rgba(148,163,184,0.8)'} />
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: showTransfer ? '#86EFAC' : 'rgba(100,116,139,0.9)' }}>
            TRANSFER
          </span>
        </button>
      </div>

      {/* Transfer input */}
      {showTransfer && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            className="flex-1 outline-none bg-transparent font-mono text-sm"
            style={{
              padding: '7px 10px',
              borderRadius: 10,
              border: '1px solid rgba(99,102,241,0.4)',
              background: 'rgba(99,102,241,0.1)',
              color: '#C7D2FE',
              fontSize: 13,
            }}
            placeholder="Extension…"
            value={transferExt}
            onChange={e => setTransferExt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleTransfer()}
            autoFocus
          />
          <button
            onClick={handleTransfer}
            disabled={!transferExt.trim()}
            style={{
              padding: '7px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: '#6366F1', color: '#fff', fontWeight: 700, fontSize: 12,
              opacity: transferExt.trim() ? 1 : 0.4, flexShrink: 0,
            }}
          >
            Go
          </button>
          <button
            onClick={() => { setShowTransfer(false); setTransferExt('') }}
            style={{
              padding: 7, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.07)', color: 'rgba(148,163,184,0.8)', flexShrink: 0,
            }}
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
