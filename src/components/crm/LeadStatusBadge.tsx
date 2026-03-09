import { cn } from '../../utils/cn'

// ── Hardcoded fallback colors (slug → palette) ────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  new_lead:     { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  contacted:    { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  qualified:    { bg: '#FEFCE8', text: '#A16207', border: '#FEF08A' },
  proposal:     { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  negotiation:  { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF' },
  funded:       { bg: '#F0FDF4', text: '#166534', border: '#86EFAC' },
  closed_won:   { bg: '#F0FDF4', text: '#166534', border: '#86EFAC' },
  closed_lost:  { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
  follow_up:    { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
  pending:      { bg: '#FEFCE8', text: '#854D0E', border: '#FDE68A' },
  callback:     { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  submitted:    { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
}

const DEFAULT_COLOR = { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' }

// ── Hex → badge palette ───────────────────────────────────────────────────────

function hexToBadge(hex: string): { bg: string; text: string; border: string } {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  if (full.length !== 6) return DEFAULT_COLOR
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return {
    bg:     `rgba(${r},${g},${b},0.10)`,
    text:   hex,
    border: `rgba(${r},${g},${b},0.28)`,
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  status: string
  statusName?: string
  /** Hex color code from the backend (color_code field on LeadStatus) */
  colorCode?: string
  size?: 'sm' | 'md'
  className?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LeadStatusBadge({ status, statusName, colorCode, size = 'md', className }: Props) {
  const colors = colorCode
    ? hexToBadge(colorCode)
    : (STATUS_COLORS[status] ?? DEFAULT_COLOR)

  const label = statusName
    ?? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        className,
      )}
      style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
    >
      {label}
    </span>
  )
}
