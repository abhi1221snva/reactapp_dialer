import { useState, type ReactNode, type CSSProperties } from 'react'
import { MessageSquare, Phone, PhoneCall, Loader2, MessageCircle } from 'lucide-react'
import { useFloatingStore } from '../../stores/floating.store'

// ─── Dock button ──────────────────────────────────────────────────────────────

interface DockBtnProps {
  icon: ReactNode
  label: string
  onClick: () => void
  isActive: boolean
  badge?: ReactNode
  btnStyle: CSSProperties
  pulse?: boolean
}

function DockBtn({ icon, label, onClick, isActive, badge, btnStyle, pulse }: DockBtnProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>

      {/* ── Tooltip (floats left) ── */}
      <div
        style={{
          position: 'absolute',
          right: '100%',
          marginRight: 10,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateX(0) scale(1)' : 'translateX(5px) scale(0.96)',
          transition: 'opacity 0.14s ease, transform 0.14s ease',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '5px 10px',
            borderRadius: 9,
            fontSize: 11,
            fontWeight: 600,
            color: '#fff',
            lineHeight: 1.5,
            background: 'rgba(10,16,40,0.96)',
            border: '1px solid rgba(255,255,255,0.13)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)',
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </span>
      </div>

      {/* ── Button ── */}
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={label}
        title={label}
        style={{
          position: 'relative',
          width: 44,
          height: 44,
          borderRadius: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: 'none',
          transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease, outline-color 0.15s ease',
          transform: hovered
            ? 'scale(1.14) translateY(-1px)'
            : isActive
              ? 'scale(1.06)'
              : 'scale(1)',
          outline: isActive ? '2.5px solid rgba(255,255,255,0.88)' : '2.5px solid transparent',
          outlineOffset: 2,
          ...btnStyle,
        }}
      >
        {/* Ping ring for incoming / alert */}
        {pulse && (
          <span
            className="animate-ping"
            style={{
              position: 'absolute',
              inset: -3,
              borderRadius: 16,
              opacity: 0.45,
              background: typeof btnStyle.background === 'string' ? btnStyle.background : '#6366f1',
            }}
          />
        )}

        {icon}
        {badge}
      </button>
    </div>
  )
}

// ─── FloatingFab ──────────────────────────────────────────────────────────────

/**
 * Persistent two-button dock anchored to bottom-right.
 * Chat and Web Phone are always visible as separate icons —
 * no expanding Plus FAB required.
 */
export function FloatingFab() {
  const {
    chatOpen,  setChatOpen,
    phoneOpen, setPhoneOpen,
    smsOpen,   setSmsOpen,
    phoneMinimized,
    phoneFabBg, phoneFabShadow, phoneFabIcon, phoneHasIncoming,
    phoneClickHandler,
    chatUnread,
    smsUnread,
  } = useFloatingStore()

  const handlePhoneClick = () => {
    if (phoneClickHandler) {
      phoneClickHandler()
    } else {
      setPhoneOpen(!phoneOpen)
    }
  }

  const phoneIcon =
    phoneFabIcon === 'loading'
      ? <Loader2 size={19} className="text-white animate-spin" />
      : phoneFabIcon === 'calling'
        ? <PhoneCall size={19} className="text-white animate-pulse" />
        : <Phone size={19} className="text-white" />

  const chatBg     = chatOpen
    ? 'linear-gradient(145deg, #818cf8 0%, #a78bfa 100%)'
    : 'linear-gradient(145deg, #4f46e5 0%, #7c3aed 100%)'
  const chatShadow = chatOpen
    ? '0 4px 18px rgba(129,140,248,0.65)'
    : '0 4px 14px rgba(79,70,229,0.5)'

  const smsBg     = smsOpen
    ? 'linear-gradient(145deg, #34d399 0%, #10b981 100%)'
    : 'linear-gradient(145deg, #059669 0%, #047857 100%)'
  const smsShadow = smsOpen
    ? '0 4px 18px rgba(52,211,153,0.65)'
    : '0 4px 14px rgba(5,150,105,0.5)'

  const anyOpen = chatOpen || (phoneOpen && !phoneMinimized) || smsOpen

  return (
    <div
      className="fixed z-[61]"
      style={{
        bottom: 20,
        right: 20,
        pointerEvents: anyOpen ? 'none' : 'auto',
        opacity: anyOpen ? 0 : 1,
        transform: anyOpen ? 'scale(0.85) translateY(8px)' : 'scale(1) translateY(0)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
    >
      {/* ── Glass dock pill ── */}
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          padding: '6px 6px',
          borderRadius: 18,
          background: 'rgba(15,23,42,0.28)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow:
            '0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >

        {/* SMS button */}
        <DockBtn
          icon={<MessageCircle size={19} className="text-white" />}
          label={smsUnread > 0 ? `SMS · ${smsUnread} new` : 'SMS'}
          onClick={() => setSmsOpen(!smsOpen)}
          isActive={smsOpen}
          btnStyle={{ background: smsBg, boxShadow: smsShadow }}
          badge={
            smsUnread > 0 ? (
              <span
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  minWidth: 17,
                  height: 17,
                  paddingLeft: 3,
                  paddingRight: 3,
                  background: '#EF4444',
                  color: '#fff',
                  fontWeight: 800,
                  borderRadius: 999,
                  fontSize: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2.5px solid rgba(10,16,40,0.92)',
                  letterSpacing: '-0.01em',
                }}
              >
                {smsUnread > 99 ? '99+' : smsUnread}
              </span>
            ) : undefined
          }
        />

        {/* Chat button */}
        <DockBtn
          icon={<MessageSquare size={19} className="text-white" />}
          label={chatUnread > 0 ? `Team Chat · ${chatUnread} new` : 'Team Chat'}
          onClick={() => setChatOpen(!chatOpen)}
          isActive={chatOpen}
          btnStyle={{ background: chatBg, boxShadow: chatShadow }}
          badge={
            chatUnread > 0 ? (
              <span
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  minWidth: 17,
                  height: 17,
                  paddingLeft: 3,
                  paddingRight: 3,
                  background: '#EF4444',
                  color: '#fff',
                  fontWeight: 800,
                  borderRadius: 999,
                  fontSize: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2.5px solid rgba(10,16,40,0.92)',
                  letterSpacing: '-0.01em',
                }}
              >
                {chatUnread > 99 ? '99+' : chatUnread}
              </span>
            ) : undefined
          }
        />


        {/* Phone button */}
        <DockBtn
          icon={phoneIcon}
          label="Web Phone"
          onClick={handlePhoneClick}
          isActive={phoneOpen}
          btnStyle={{ background: phoneFabBg, boxShadow: phoneFabShadow }}
          pulse={phoneHasIncoming}
        />

      </div>
    </div>
  )
}
