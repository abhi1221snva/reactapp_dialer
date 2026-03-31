import { useState, useEffect, useRef, useCallback, type ReactNode, type CSSProperties } from 'react'
import { MessageSquare, Phone, PhoneCall, Loader2, MessageCircle } from 'lucide-react'
import { useFloatingStore } from '../../stores/floating.store'

// ── Drag constants ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'fab_vpos'    // localStorage key for saved vertical position
const DRAG_THRESHOLD = 4          // px of movement before a gesture counts as a drag
const EDGE_PAD = 8                // min px gap from screen top/bottom edge

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
 * Persistent three-button dock (SMS · Chat · Phone) anchored to the right edge.
 * Vertically draggable — position is persisted in localStorage.
 */
export function FloatingFab() {
  const {
    chatOpen,  setChatOpen,
    phoneOpen, setPhoneOpen,
    smsOpen,   setSmsOpen,
    phoneMinimized, setPhoneMinimized,
    phoneFabBg, phoneFabShadow, phoneFabIcon, phoneHasIncoming,
    phoneClickHandler,
    chatUnread,
    smsUnread,
  } = useFloatingStore()

  // ── Vertical position state ────────────────────────────────────────────────
  // Initialise from localStorage synchronously to avoid a position flash.
  const [topPos, _setTopPos] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved !== null) {
        const n = parseInt(saved, 10)
        if (!isNaN(n)) return n
      }
    } catch { /* ignore */ }
    // Default: near bottom (mirrors the old bottom:20 behaviour)
    return typeof window !== 'undefined' ? window.innerHeight - 180 : 600
  })

  // Mirror state in a ref so drag event handlers always see the latest value
  // without needing to be recreated on every render.
  const topRef  = useRef<number>(topPos)
  const dockRef = useRef<HTMLDivElement>(null)

  const setTop = useCallback((v: number) => {
    topRef.current = v
    _setTopPos(v)
  }, [])

  // ── Clamp after first paint (actual dock height is now known) ─────────────
  useEffect(() => {
    const h = dockRef.current?.offsetHeight ?? 160
    const max = window.innerHeight - h - EDGE_PAD
    const clamped = Math.max(EDGE_PAD, Math.min(max, topRef.current))
    if (clamped !== topRef.current) setTop(clamped)
  }, [setTop])

  // ── Re-clamp on viewport resize ───────────────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      const h = dockRef.current?.offsetHeight ?? 160
      const max = window.innerHeight - h - EDGE_PAD
      const clamped = Math.max(EDGE_PAD, Math.min(max, topRef.current))
      if (clamped !== topRef.current) setTop(clamped)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [setTop])

  // ── Drag logic ────────────────────────────────────────────────────────────
  useEffect(() => {
    const dock = dockRef.current
    if (!dock) return

    // Mutable drag state — kept outside React to avoid re-renders during drag.
    let active   = false
    let moved    = false
    let startY   = 0
    let startTop = 0

    const clamp = (t: number) => {
      const h = dock.offsetHeight
      return Math.max(EDGE_PAD, Math.min(window.innerHeight - h - EDGE_PAD, t))
    }

    // ── Pointer down ────────────────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      active   = true
      moved    = false
      startY   = e.clientY
      startTop = topRef.current
      document.body.style.userSelect = 'none'
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      active   = true
      moved    = false
      startY   = e.touches[0].clientY
      startTop = topRef.current
      document.body.style.userSelect = 'none'
    }

    // ── Pointer move ─────────────────────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      if (!active) return
      const dy = e.clientY - startY
      if (!moved && Math.abs(dy) > DRAG_THRESHOLD) moved = true
      if (moved) {
        document.documentElement.style.cursor = 'grabbing'
        setTop(clamp(startTop + dy))
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!active || e.touches.length !== 1) return
      const dy = e.touches[0].clientY - startY
      if (!moved && Math.abs(dy) > DRAG_THRESHOLD) moved = true
      if (moved) {
        // Prevent page scroll while dragging the FAB
        if (e.cancelable) e.preventDefault()
        setTop(clamp(startTop + dy))
      }
    }

    // ── Pointer up ───────────────────────────────────────────────────────────
    const onEnd = () => {
      if (!active) return
      active = false
      document.body.style.userSelect   = ''
      document.documentElement.style.cursor = ''

      if (moved) {
        // Persist the new position
        try { localStorage.setItem(STORAGE_KEY, String(topRef.current)) } catch { /* ignore */ }

        // Swallow the click that immediately follows a drag so that the
        // pointer-up doesn't accidentally fire a DockBtn's onClick handler.
        const blockClick = (ev: Event) => { ev.stopPropagation() }
        window.addEventListener('click', blockClick, { capture: true, once: true })
        // Safety: remove the blocker if no click fires within 300 ms (e.g. touch drag)
        setTimeout(() => window.removeEventListener('click', blockClick, true), 300)
      }
    }

    // ── Attach listeners ─────────────────────────────────────────────────────
    dock.addEventListener('mousedown',  onMouseDown)
    dock.addEventListener('touchstart', onTouchStart, { passive: true })

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup',   onEnd)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend',  onEnd)
    document.addEventListener('touchcancel', onEnd)

    return () => {
      dock.removeEventListener('mousedown',  onMouseDown)
      dock.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('mousemove',    onMouseMove)
      document.removeEventListener('mouseup',      onEnd)
      document.removeEventListener('touchmove',    onTouchMove)
      document.removeEventListener('touchend',     onEnd)
      document.removeEventListener('touchcancel',  onEnd)
    }
  }, [setTop]) // setTop is stable (useCallback with no deps)

  // ── Phone button logic ─────────────────────────────────────────────────────
  const handlePhoneClick = () => {
    if (phoneOpen && phoneMinimized) {
      setPhoneMinimized(false)
      return
    }
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

  // ── Badge helper ──────────────────────────────────────────────────────────
  const Badge = ({ count }: { count: number }) => (
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
      {count > 99 ? '99+' : count}
    </span>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed z-[61]"
      style={{
        // Use top instead of bottom so vertical dragging maps 1-to-1 with clientY
        top: topPos,
        right: 20,
        // The outer wrapper has no explicit size — keep pointer-events off so it
        // cannot block page content; the inner dock pill enables them selectively.
        pointerEvents: 'none',
      }}
    >
      {/* ── Glass dock pill ── */}
      <div
        ref={dockRef}
        style={{
          pointerEvents: 'auto',
          // Show grab cursor on the dock background; individual buttons override
          // with cursor:pointer so clicks still feel natural.
          cursor: 'grab',
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
          boxShadow: '0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* SMS button */}
        <DockBtn
          icon={<MessageCircle size={19} className="text-white" />}
          label={smsUnread > 0 ? `SMS · ${smsUnread} new` : 'SMS'}
          onClick={() => setSmsOpen(!smsOpen)}
          isActive={smsOpen}
          btnStyle={{ background: smsBg, boxShadow: smsShadow }}
          badge={smsUnread > 0 ? <Badge count={smsUnread} /> : undefined}
        />

        {/* Chat button */}
        <DockBtn
          icon={<MessageSquare size={19} className="text-white" />}
          label={chatUnread > 0 ? `Team Chat · ${chatUnread} new` : 'Team Chat'}
          onClick={() => setChatOpen(!chatOpen)}
          isActive={chatOpen}
          btnStyle={{ background: chatBg, boxShadow: chatShadow }}
          badge={chatUnread > 0 ? <Badge count={chatUnread} /> : undefined}
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
