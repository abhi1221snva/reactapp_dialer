import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { Building2, Phone, Calendar } from 'lucide-react'
import { cn } from '../../utils/cn'
import { formatPhoneNumber } from '../../utils/format'
import type { PipelineCard } from '../../types/crm.types'

const AVATAR_BG = [
  'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-purple-500', 'bg-sky-500',
]

interface Props {
  card: PipelineCard
  columnSlug: string
}

export function KanbanCard({ card, columnSlug }: Props) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${card.id}`,
    data: { card, fromColumn: columnSlug },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : undefined,
  }

  const displayName = [card.first_name, card.last_name].filter(Boolean).join(' ') || `Lead #${card.id}`
  const initials    = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const avatarBg    = AVATAR_BG[card.id % AVATAR_BG.length]

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className={cn(
        'kanban-card',
        isDragging && 'kanban-card-dragging'
      )}
      onClick={() => !isDragging && navigate(`/crm/leads/${card.id}`)}
    >
      {/* Name + avatar */}
      <div className="flex items-start gap-2.5">
        <div className={`lead-avatar ${avatarBg}`}>{initials}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate leading-snug">
            {displayName}
          </p>
          {card.company_name && (
            <div className="flex items-center gap-1 mt-0.5">
              <Building2 size={10} className="text-slate-400 flex-shrink-0" />
              <span className="text-[11px] text-slate-500 truncate">{card.company_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Phone */}
      {card.phone_number && (
        <div className="flex items-center gap-1 mt-2.5">
          <Phone size={10} className="text-slate-400 flex-shrink-0" />
          <span className="text-[11px] text-slate-500">{formatPhoneNumber(card.phone_number)}</span>
        </div>
      )}

      {/* Footer: assigned agent + date */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
        {card.assigned_name ? (
          <span className="badge badge-indigo text-[10px] px-1.5 py-0.5 truncate max-w-[110px]">
            {card.assigned_name}
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1">
          <Calendar size={9} className="text-slate-300" />
          <span className="text-[10px] text-slate-400">
            {new Date(card.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  )
}
