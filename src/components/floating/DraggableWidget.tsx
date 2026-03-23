import { useState, useEffect, type ReactNode } from 'react'
import { Minus, X, ChevronUp } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DraggableWidgetProps {
  isOpen: boolean
  onClose: () => void
  /** Called when minimize state changes */
  onMinimize?: (minimized: boolean) => void
  /** Left side of header — icon + title */
  headerLeft: ReactNode
  /** Extra controls on the right of the header (before Minimize/Close) */
  headerRight?: ReactNode
  headerGradient?: string
  /** Distance from the right viewport edge */
  defaultRight?: number
  /** Distance from the bottom viewport edge */
  defaultBottom?: number
  width?: number
  zIndex?: number
  /** Max pixel height of the collapsible body */
  bodyHeight?: number
  children: ReactNode
}

// ─── DraggableWidget ──────────────────────────────────────────────────────────

export function DraggableWidget({
  isOpen,
  onClose,
  onMinimize,
  headerLeft,
  headerRight,
  headerGradient = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
  defaultRight  = 16,
  defaultBottom = 80,
  width         = 340,
  zIndex        = 62,
  bodyHeight    = 480,
  children,
}: DraggableWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMobile, setIsMobile]       = useState(() => window.innerWidth < 768)

  // Reset minimize state when widget closes
  useEffect(() => { if (!isOpen) setIsMinimized(false) }, [isOpen])

  // Track viewport for mobile/desktop switching
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // ── Mobile: full-screen overlay ────────────────────────────────────────────

  if (isMobile) {
    if (!isOpen) return null
    return (
      <div className="fixed inset-0 flex flex-col bg-white" style={{ zIndex: zIndex + 10 }}>
        <div
          className="flex items-center justify-between px-4 flex-shrink-0"
          style={{ height: '54px', background: headerGradient }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">{headerLeft}</div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {headerRight}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/15 hover:bg-rose-500/70 flex items-center justify-center transition-colors"
              title="Close"
            >
              <X size={13} className="text-white" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    )
  }

  // ── Desktop: fixed corner panel ────────────────────────────────────────────

  return (
    <div
      style={{
        position:      'fixed',
        bottom:        defaultBottom,
        right:         defaultRight,
        width,
        zIndex,
        borderRadius:  '16px',
        overflow:      'hidden',
        background:    '#ffffff',
        boxShadow:     '0 20px 60px rgba(0,0,0,0.18), 0 6px 20px rgba(0,0,0,0.08)',
        border:        '1px solid rgba(0,0,0,0.07)',
        // Open/close animation — originates from bottom-right corner
        opacity:        isOpen ? 1 : 0,
        transform:      isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.96)',
        transition:     'opacity 0.22s ease, transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
        pointerEvents:  isOpen ? 'auto' : 'none',
        transformOrigin: 'bottom right',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3.5 flex-shrink-0"
        style={{
          height:     '52px',
          background: headerGradient,
          userSelect: 'none',
          cursor:     isMinimized ? 'pointer' : 'default',
        }}
        onClick={isMinimized ? () => { setIsMinimized(false); onMinimize?.(false) } : undefined}
        title={isMinimized ? 'Click to expand' : undefined}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          {headerLeft}
          {isMinimized && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.7)',
                background: 'rgba(255,255,255,0.12)',
                borderRadius: 6,
                padding: '2px 6px',
                letterSpacing: '0.03em',
                flexShrink: 0,
              }}
            >
              <ChevronUp size={10} />
              tap to expand
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {headerRight}

          <button
            onClick={(e) => { e.stopPropagation(); setIsMinimized(v => { onMinimize?.(!v); return !v }) }}
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center transition-colors"
            title={isMinimized ? 'Restore' : 'Minimize'}
          >
            <Minus size={12} className="text-white" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-rose-500/80 flex items-center justify-center transition-colors"
            title="Close"
          >
            <X size={12} className="text-white" />
          </button>
        </div>
      </div>

      {/* ── Body (collapsible) ─────────────────────────────────────────────── */}
      <div
        style={{
          maxHeight:  isMinimized ? 0 : bodyHeight,
          overflowY:  isMinimized ? 'hidden' : 'auto',
          overflowX:  'hidden',
          transition: 'max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
