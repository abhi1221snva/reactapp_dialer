import { useDroppable } from '@dnd-kit/core'
import { cn } from '../../utils/cn'
import { KanbanCard } from './KanbanCard'
import type { PipelineColumn } from '../../types/crm.types'

interface Props {
  column: PipelineColumn
  onLoadMore?: (slug: string) => void
}

export function KanbanColumn({ column, onLoadMore }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${column.status_slug}` })

  return (
    <div className={cn('kanban-col', isOver && 'kanban-col-over')}>

      {/* Column header */}
      <div className="kanban-col-header">
        <div className="flex items-center gap-2 min-w-0">
          {column.color && (
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: column.color }}
            />
          )}
          <span className="text-sm font-semibold text-slate-800 truncate">
            {column.status_name}
          </span>
        </div>
        <span className="badge badge-indigo text-[10px] flex-shrink-0">
          {column.total_count}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'kanban-col-body',
          isOver && 'bg-indigo-50/30'
        )}
      >
        {column.cards.map(card => (
          <KanbanCard key={card.id} card={card} columnSlug={column.status_slug} />
        ))}

        {/* Load more */}
        {column.has_more && onLoadMore && (
          <button
            onClick={() => onLoadMore(column.status_slug)}
            className="w-full text-xs py-2 rounded-lg border border-slate-200 bg-white text-slate-500 font-medium hover:bg-slate-50 transition-colors"
          >
            Load more ({column.total_count - column.cards.length} remaining)
          </button>
        )}

        {/* Empty drop target */}
        {column.cards.length === 0 && (
          <div className={cn('empty-dashed', isOver && 'empty-dashed-over')}>
            <p className="text-xs text-slate-400">
              {isOver ? 'Drop here' : 'No leads'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
