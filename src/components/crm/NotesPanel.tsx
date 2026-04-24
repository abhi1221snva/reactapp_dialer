import { useState, useRef, useEffect } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Loader2, Pin, ChevronDown, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { cn } from '../../utils/cn'
import type { ActivityTimelineResponse, ActivityType, LeadActivity } from '../../types/crm.types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Note Item ────────────────────────────────────────────────────────────────

function NoteItem({ note, onPin }: { note: LeadActivity; onPin: (id: number) => void }) {
  const isPinned = note.is_pinned === 1
  const meta = (note.meta ?? {}) as Record<string, unknown>
  const userName = (meta.user_name as string) || (note as unknown as Record<string, unknown>).user_name as string || 'User'

  return (
    <div className={cn(
      'group rounded-lg border px-3 py-2 transition-colors',
      isPinned
        ? 'bg-amber-50/60 border-amber-200/60'
        : 'bg-white border-slate-100 hover:border-slate-200',
    )}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[11px] font-semibold text-slate-700 truncate">{userName}</span>
            {isPinned && <Pin size={9} className="text-amber-500 fill-amber-400 flex-shrink-0" />}
            <span className="text-[10px] text-slate-400 ml-auto flex-shrink-0">{formatRelativeTime(note.created_at)}</span>
          </div>
          {note.subject && note.subject !== 'Note' && (
            <p className="text-[11px] font-medium text-slate-600 mb-0.5">{note.subject}</p>
          )}
          <p className="text-[11px] text-slate-500 leading-relaxed whitespace-pre-wrap break-words line-clamp-4">
            {note.body}
          </p>
        </div>
        <button
          onClick={() => onPin(note.id)}
          title={isPinned ? 'Unpin' : 'Pin'}
          className={cn(
            'mt-0.5 p-1 rounded transition-all flex-shrink-0',
            isPinned
              ? 'text-amber-500 hover:text-amber-600'
              : 'text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100',
          )}
        >
          <Pin size={10} className={isPinned ? 'fill-current' : ''} />
        </button>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

interface NotesPanelProps {
  leadId: number
}

export function NotesPanel({ leadId }: NotesPanelProps) {
  const qc = useQueryClient()
  const [noteText, setNoteText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    data: infiniteData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['crm-activity', leadId, 'note_added'],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const res = await crmService.getActivity(leadId, pageParam, 20, 'note_added')
      return (res.data?.data ?? res.data) as ActivityTimelineResponse
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: ActivityTimelineResponse, allPages: ActivityTimelineResponse[]) =>
      lastPage.has_more ? allPages.length * 20 : undefined,
    staleTime: 30_000,
  })

  const notes = infiniteData?.pages.flatMap(p => p.items) ?? []
  const pinnedNotes = notes.filter(n => n.is_pinned === 1)
  const unpinnedNotes = notes.filter(n => n.is_pinned !== 1)

  // Add note mutation
  const addNote = useMutation({
    mutationFn: (body: string) =>
      crmService.addActivity(leadId, {
        activity_type: 'note_added' as ActivityType,
        subject: 'Note',
        body,
      }),
    onSuccess: () => {
      toast.success('Note added')
      setNoteText('')
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
    },
    onError: () => toast.error('Failed to add note'),
  })

  // Pin mutation
  const pinMutation = useMutation({
    mutationFn: (activityId: number) => crmService.pinActivity(leadId, activityId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-activity', leadId] }),
    onError: () => toast.error('Failed to update pin'),
  })

  function handleSubmit() {
    const trimmed = noteText.trim()
    if (!trimmed) return
    addNote.mutate(trimmed)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [noteText])

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-100 flex-shrink-0">
        <MessageSquare size={13} className="text-emerald-500" />
        <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex-1">Notes</h3>
        <span className="text-[10px] text-slate-400 font-medium">
          {notes.length}{hasNextPage ? '+' : ''}
        </span>
      </div>

      {/* Compose area */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-100 flex-shrink-0">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a note..."
            rows={2}
            className={cn(
              'w-full text-[12px] text-slate-700 placeholder-slate-300 resize-none',
              'rounded-lg border border-slate-200 px-3 py-2 pr-9',
              'focus:outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-100',
              'transition-colors leading-relaxed',
            )}
          />
          <button
            onClick={handleSubmit}
            disabled={!noteText.trim() || addNote.isPending}
            className={cn(
              'absolute right-2 bottom-2 p-1.5 rounded-md transition-all',
              noteText.trim()
                ? 'text-emerald-600 hover:bg-emerald-50'
                : 'text-slate-300 cursor-not-allowed',
            )}
            title="Save note (Ctrl+Enter)"
          >
            {addNote.isPending
              ? <Loader2 size={13} className="animate-spin" />
              : <Send size={13} />
            }
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-lg border border-slate-100 p-3">
                <div className="h-3 w-20 bg-slate-100 rounded mb-2" />
                <div className="h-3 w-full bg-slate-50 rounded mb-1" />
                <div className="h-3 w-3/4 bg-slate-50 rounded" />
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2">
              <MessageSquare size={16} className="text-slate-300" />
            </div>
            <p className="text-[11px] font-medium text-slate-400">No notes yet</p>
            <p className="text-[10px] text-slate-300 mt-0.5">Add a note above</p>
          </div>
        ) : (
          <>
            {/* Pinned notes first */}
            {pinnedNotes.map(note => (
              <NoteItem key={note.id} note={note} onPin={id => pinMutation.mutate(id)} />
            ))}

            {/* Unpinned notes */}
            {unpinnedNotes.map(note => (
              <NoteItem key={note.id} note={note} onPin={id => pinMutation.mutate(id)} />
            ))}

            {/* Load more */}
            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full py-2 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1"
              >
                {isFetchingNextPage
                  ? <><Loader2 size={11} className="animate-spin" /> Loading...</>
                  : <><ChevronDown size={11} /> Load more</>
                }
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
