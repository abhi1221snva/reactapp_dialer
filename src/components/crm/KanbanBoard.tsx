import { useState, useCallback } from 'react'
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import type { PipelineBoardResponse, PipelineCard, PipelineColumn } from '../../types/crm.types'

interface Props {
  filterAssignedTo?: number
}

export function KanbanBoard({ filterAssignedTo }: Props) {
  const qc = useQueryClient()
  const [columns, setColumns] = useState<PipelineColumn[]>([])
  const [activeCard, setActiveCard] = useState<PipelineCard | null>(null)
  const [activeColumnSlug, setActiveColumnSlug] = useState<string>('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const { isLoading, error } = useQuery({
    queryKey: ['crm-pipeline-board', filterAssignedTo],
    queryFn: async () => {
      const res = await crmService.getPipelineBoard(
        filterAssignedTo ? { assigned_to: filterAssignedTo } : undefined
      )
      const raw = res.data?.data ?? res.data
      // Backend returns { columns: [...], total_leads, cards_limit, cards_offset }
      // Normalize to PipelineColumn[] shape
      const normalized: PipelineColumn[] = (raw?.columns ?? raw?.statuses ?? []).map((col: Record<string, unknown>) => ({
        status_slug:  String(col.status_slug ?? col.lead_title_url ?? ''),
        status_name:  String(col.status_title ?? col.status_name ?? col.title ?? ''),
        display_order: Number(col.display_order ?? 0),
        color:         String(col.color_code ?? col.color ?? ''),
        total_count:   Number(col.total_count ?? 0),
        cards:         ((col.cards as unknown[] | undefined) ?? []).map((c) => {
          const card = c as Record<string, unknown>
          return { ...card, created_at: String(card.updated_at ?? card.created_at ?? '') } as unknown as PipelineCard
        }),
        has_more:      Number(col.total_count ?? 0) > (((col.cards as unknown[]) ?? []).length),
      }))
      setColumns(normalized)
      return { statuses: normalized }
    },
    refetchInterval: 60_000,
  })

  const bulkStatusMutation = useMutation({
    mutationFn: (payload: { lead_ids: number[]; lead_status: string }) =>
      crmService.bulkStatusChange(payload),
    onError: (_, __, context) => {
      toast.error('Failed to move card — reverting')
      // Revert: re-fetch board
      qc.invalidateQueries({ queryKey: ['crm-pipeline-board'] })
    },
  })

  const handleDragStart = useCallback((event: { active: { data: { current?: { card: PipelineCard; fromColumn: string } } } }) => {
    const data = event.active.data.current
    if (data) {
      setActiveCard(data.card)
      setActiveColumnSlug(data.fromColumn)
    }
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveCard(null)
    setActiveColumnSlug('')
    const { active, over } = event
    if (!over) return

    const cardData = active.data.current as { card: PipelineCard; fromColumn: string } | undefined
    if (!cardData) return

    const toColumnSlug = (over.id as string).replace('col-', '')
    if (cardData.fromColumn === toColumnSlug) return

    // Optimistic update
    setColumns(prev => {
      const next = prev.map(col => {
        if (col.status_slug === cardData.fromColumn) {
          return { ...col, cards: col.cards.filter(c => c.id !== cardData.card.id), total_count: col.total_count - 1 }
        }
        if (col.status_slug === toColumnSlug) {
          return {
            ...col,
            cards: [{ ...cardData.card, lead_status: toColumnSlug }, ...col.cards],
            total_count: col.total_count + 1,
          }
        }
        return col
      })
      return next
    })

    bulkStatusMutation.mutate({ lead_ids: [cardData.card.id], lead_status: toColumnSlug })
  }, [bulkStatusMutation])

  const handleLoadMore = useCallback((slug: string) => {
    // For simplicity, just refetch — a full implementation would track offsets per column
    qc.invalidateQueries({ queryKey: ['crm-pipeline-board'] })
  }, [qc])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin" style={{ color: '#6366F1' }} />
        <span className="ml-3 text-sm" style={{ color: '#6B7280' }}>Loading pipeline...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 gap-2">
        <AlertCircle size={18} style={{ color: '#EF4444' }} />
        <span className="text-sm" style={{ color: '#6B7280' }}>Failed to load pipeline board</span>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart as never}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '400px' }}>
        {columns.map(column => (
          <KanbanColumn
            key={column.status_slug}
            column={column}
            onLoadMore={handleLoadMore}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCard && (
          <div style={{ opacity: 0.9 }}>
            <KanbanCard card={activeCard} columnSlug={activeColumnSlug} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
