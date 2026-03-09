import { useState, useRef, useEffect, type ReactNode, type CSSProperties } from 'react'
import { Plus } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FloatingMenuItemConfig {
  id: string
  icon: ReactNode
  label: string
  onClick: () => void
  /** Optional badge rendered inside the button (e.g. unread count, ping ring) */
  badge?: ReactNode
  /** Custom background / boxShadow for the item button */
  style?: CSSProperties
}

// ─── FloatingMenuItem ─────────────────────────────────────────────────────────

interface FloatingItemProps {
  item: FloatingMenuItemConfig
  index: number
  visible: boolean
  total: number
  onCollapse: () => void
}

function FloatingItem({ item, index, visible, total, onCollapse }: FloatingItemProps) {
  const delay = visible
    ? `${(total - 1 - index) * 55}ms`
    : `${index * 40}ms`

  return (
    <div
      className="flex items-center gap-2.5 justify-end"
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.88)',
        transition: `opacity 0.22s ease ${delay}, transform 0.22s ease ${delay}`,
      }}
    >
      {/* Tooltip label */}
      <span
        className="bg-slate-800/90 text-white font-medium rounded-lg shadow-md whitespace-nowrap backdrop-blur-sm px-2.5 py-1"
        style={{ fontSize: '11px', lineHeight: '1.5' }}
      >
        {item.label}
      </span>

      {/* Item button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          item.onClick()
          onCollapse()
        }}
        className="relative w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer"
        style={item.style}
        title={item.label}
        aria-label={item.label}
      >
        {item.icon}
        {item.badge}
      </button>
    </div>
  )
}

// ─── FloatingMenu ─────────────────────────────────────────────────────────────

interface FloatingMenuProps {
  items: FloatingMenuItemConfig[]
  mainBg?: string
  mainShadow?: string
  /** When false the FAB fades out and collapses its sub-menu. */
  visible?: boolean
}

export function FloatingMenu({ items, mainBg, mainShadow, visible = true }: FloatingMenuProps) {
  const [expanded, setExpanded] = useState(false)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-collapse sub-menu when FAB is hidden (a popup just opened)
  useEffect(() => {
    if (!visible) setExpanded(false)
  }, [visible])

  const expand = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setExpanded(true)
  }

  const collapse = () => {
    leaveTimer.current = setTimeout(() => setExpanded(false), 200)
  }

  const toggle = () => setExpanded(v => !v)

  return (
    /*
     * Container anchored to the absolute bottom-right corner of the viewport.
     * Padding creates the inset — the FAB button sits 16 px from each edge.
     * pointer-events:none on the wrapper keeps it non-blocking; only interactive
     * children set pointer-events:auto.
     */
    <div
      className="fixed z-[61]"
      style={{
        bottom:        0,
        right:         0,
        padding:       '16px',
        pointerEvents: 'none',
        opacity:       visible ? 1 : 0,
        transform:     visible ? 'translateY(0)' : 'translateY(10px)',
        transition:    'opacity 0.2s ease, transform 0.2s ease',
      }}
    >
      {/* ── Sub-items — stack upward above the FAB ── */}
      <div
        className="absolute flex flex-col gap-2.5 items-end"
        style={{
          // Position items above the FAB button (button 56 px + 16 px padding + 8 px gap)
          bottom:        '80px',
          right:         '16px',
          pointerEvents: expanded ? 'auto' : 'none',
        }}
        onMouseEnter={expand}
        onMouseLeave={collapse}
      >
        {items.map((item, i) => (
          <FloatingItem
            key={item.id}
            item={item}
            index={i}
            visible={expanded}
            total={items.length}
            onCollapse={collapse}
          />
        ))}
      </div>

      {/* ── Main FAB button ── */}
      <button
        onClick={toggle}
        onMouseEnter={expand}
        onMouseLeave={collapse}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        style={{
          pointerEvents: visible ? 'auto' : 'none',
          background:    mainBg     ?? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          boxShadow:     mainShadow ?? '0 6px 24px rgba(79,70,229,0.45)',
        }}
        aria-label={expanded ? 'Close menu' : 'Open menu'}
        aria-expanded={expanded}
      >
        <Plus
          size={24}
          className="text-white"
          style={{
            transition: 'transform 0.25s ease',
            transform:  expanded ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        />
      </button>
    </div>
  )
}
