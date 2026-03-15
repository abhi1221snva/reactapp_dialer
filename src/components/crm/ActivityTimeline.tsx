import { useState, useRef, useEffect } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LayoutList, Zap, Send, MessageSquare, AlertCircle,
  Pin, ChevronDown, Loader2, FileText,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { ActivityItem } from './ActivityItem'
import { cn } from '../../utils/cn'
import type { ActivityTimelineResponse, ActivityType } from '../../types/crm.types'

// ─── Filter pills config ───────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { value: 'all',           label: 'All' },
  { value: 'note_added',    label: 'Notes' },
  { value: 'call_made',     label: 'Calls' },
  { value: 'email_sent',    label: 'Emails' },
  { value: 'status_change', label: 'Status' },
  { value: 'document_uploaded', label: 'Docs' },
  { value: 'lender_submitted',  label: 'Lender' },
  { value: 'lender_response',   label: 'Responses' },
  { value: 'system',            label: 'System' },
] as const

type FilterValue = (typeof FILTER_OPTIONS)[number]['value']

// ─── Legacy tab keys kept for query key compat ────────────────────────────────

type TabKey =
  | 'all'
  | 'system'
  | 'lender_submitted'
  | 'note_added'
  | 'lender_response'
  | 'call_made'
  | 'email_sent'
  | 'status_change'
  | 'document_uploaded'

// ─── Dot colours per activity type ────────────────────────────────────────────


// ─── Types ────────────────────────────────────────────────────────────────────

interface NoteForm {
  subject: string
  body: string
}

interface Props {
  leadId: number
  onAddActivity?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

// ─── Date divider ─────────────────────────────────────────────────────────────

function DateDivider({ date }: { date: string }) {
  const label = (() => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  })()

  return (
    <div className="flex items-center gap-3 my-2 px-1">
      <div className="flex-1 h-px bg-slate-100" />
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1 whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ActivitySkeleton() {
  return (
    <div className="space-y-0 animate-pulse pl-9">
      {[1, 2, 3].map(i => (
        <div key={i} className="py-3 px-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-16 rounded-full bg-slate-200" />
            <div className="h-3 w-12 rounded-full bg-slate-100" />
          </div>
          <div className={cn('h-4 rounded bg-slate-200 mb-1', i === 2 ? 'w-4/5' : 'w-3/5')} />
          <div className="h-3 w-2/5 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterValue }) {
  const messages: Partial<Record<FilterValue, { icon: React.ReactNode; title: string; sub: string }>> = {
    all:              { icon: <FileText size={32} className="text-slate-300" />,               title: 'No activity yet',          sub: 'Actions on this lead will appear here.' },
    system:           { icon: <Zap size={32} className="text-slate-300" />,                    title: 'No system events',         sub: 'Automated events will show up here.' },
    lender_submitted: { icon: <Send size={32} className="text-orange-200" />,                  title: 'No lender submissions',    sub: 'Submit to a lender from the Lenders panel.' },
    note_added:       { icon: <MessageSquare size={32} className="text-emerald-200" />,        title: 'No notes yet',             sub: 'Write a note above to get started.' },
    lender_response:  { icon: <AlertCircle size={32} className="text-red-200" />,              title: 'No lender responses',      sub: 'Lender responses will appear here.' },
    call_made:        { icon: <LayoutList size={32} className="text-blue-200" />,              title: 'No calls logged',          sub: 'Call activity will appear here.' },
    email_sent:       { icon: <LayoutList size={32} className="text-sky-200" />,               title: 'No emails logged',         sub: 'Email activity will appear here.' },
    status_change:    { icon: <LayoutList size={32} className="text-violet-200" />,            title: 'No status changes',        sub: 'Status changes will appear here.' },
    document_uploaded:{ icon: <FileText size={32} className="text-amber-200" />,              title: 'No documents',             sub: 'Document uploads will appear here.' },
  }

  const fallback = { icon: <FileText size={32} className="text-slate-300" />, title: 'No activity', sub: 'Nothing to show for this filter.' }
  const { icon, title, sub } = messages[filter] ?? fallback

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
        {icon}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-600">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

// ─── Compose note area ────────────────────────────────────────────────────────

interface ComposeAreaProps {
  onSave: (data: NoteForm) => void
  isSaving: boolean
}

function ComposeArea({ onSave, isSaving }: ComposeAreaProps) {
  const [expanded, setExpanded] = useState(false)
  const [noteText, setNoteText] = useState('')
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<NoteForm>({ defaultValues: { subject: '', body: '' } })

  // Keep noteText in sync with the form body for char count
  const watchedBody = watch('body')
  useEffect(() => {
    setNoteText(watchedBody ?? '')
  }, [watchedBody])

  // Auto-focus textarea when expanded
  useEffect(() => {
    if (expanded) {
      setTimeout(() => bodyRef.current?.focus(), 60)
    }
  }, [expanded])

  function handleCancel() {
    reset()
    setNoteText('')
    setExpanded(false)
  }

  function onSubmit(data: NoteForm) {
    onSave(data)
  }

  const { ref: bodyRegRef, ...bodyRegRest } = register('body', {
    required: 'Note body is required',
    minLength: { value: 2, message: 'Note is too short' },
  })

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={cn(
          'w-full text-left px-4 py-3 rounded-2xl',
          'bg-gradient-to-b from-slate-50 to-white border border-slate-200 shadow-sm',
          'text-sm text-slate-400 hover:text-slate-500 hover:border-emerald-300 hover:shadow-md',
          'transition-all duration-150 cursor-text',
          'focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50',
        )}
      >
        <span className="flex items-center gap-2">
          <MessageSquare size={14} className="text-emerald-400 flex-shrink-0" />
          Add a note, log a call, or record an update...
        </span>
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn(
        'rounded-2xl border border-slate-200 overflow-hidden shadow-sm',
        'bg-gradient-to-b from-slate-50 to-white',
        'transition-all duration-200',
      )}
    >
      {/* Subject */}
      <div className="border-b border-slate-100 px-4 pt-3">
        <input
          {...register('subject')}
          placeholder="Subject (optional)"
          className={cn(
            'w-full pb-2 text-sm font-medium text-slate-700 placeholder-slate-300',
            'bg-transparent outline-none',
          )}
        />
      </div>

      {/* Body */}
      <div className="px-4 pt-2">
        <textarea
          {...bodyRegRest}
          ref={el => {
            bodyRegRef(el)
            bodyRef.current = el
          }}
          placeholder="Add a note, log a call, or record an update..."
          rows={4}
          className={cn(
            'w-full text-sm text-slate-700 placeholder-slate-300 min-h-[80px]',
            'bg-transparent outline-none resize-none leading-relaxed',
          )}
        />
        {errors.body && (
          <p className="pb-1 text-[11px] text-red-500">{errors.body.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50/80 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <MessageSquare size={10} className="text-emerald-500" />
            Note
          </span>
          <span className="text-[10px] text-slate-400 ml-auto">{noteText.length}/2000</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className={cn(
              'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
              'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              'flex items-center gap-1.5',
            )}
          >
            {isSaving ? (
              <>
                <Loader2 size={11} className="animate-spin" />
                Saving…
              </>
            ) : (
              'Save Note'
            )}
          </button>
        </div>
      </div>
    </form>
  )
}


// ─── Main component ───────────────────────────────────────────────────────────

export function ActivityTimeline({ leadId, onAddActivity }: Props) {
  const qc = useQueryClient()
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all')

  const typeParam = activeFilter === 'all' ? undefined : (activeFilter as TabKey)

  const {
    data: infiniteData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['crm-activity', leadId, activeFilter],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const res = await crmService.getActivity(leadId, pageParam, 20, typeParam)
      return (res.data?.data ?? res.data) as ActivityTimelineResponse
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: ActivityTimelineResponse, allPages: ActivityTimelineResponse[]) =>
      lastPage.has_more ? allPages.length * 20 : undefined,
    staleTime: 30_000,
  })

  const allItems    = infiniteData?.pages.flatMap(p => p.items) ?? []
  const totalCount  = infiniteData?.pages[0]?.total ?? 0
  const loadedCount = allItems.length

  const pinnedItems   = allItems.filter(a => a.is_pinned === 1)
  const unpinnedItems = allItems.filter(a => a.is_pinned !== 1)

  // ── Add note mutation ──
  const [composeKey, setComposeKey] = useState(0)
  const addNote = useMutation({
    mutationFn: (form: NoteForm) =>
      crmService.addActivity(leadId, {
        activity_type: 'note_added' as ActivityType,
        subject: form.subject?.trim() || 'Note',
        body: form.body,
      }),
    onSuccess: () => {
      toast.success('Note added')
      setComposeKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
      onAddActivity?.()
    },
    onError: () => toast.error('Failed to add note'),
  })

  // ── Pin mutation ──
  const pinMutation = useMutation({
    mutationFn: (activityId: number) => crmService.pinActivity(leadId, activityId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-activity', leadId] }),
    onError: () => toast.error('Failed to update pin'),
  })

  const isAllTab = activeFilter === 'all'

  // ── Build unpinned items with date dividers ──
  function buildUnpinnedWithDividers() {
    return unpinnedItems.map((activity, idx) => {
      const prevActivity = unpinnedItems[idx - 1]
      const showDivider = idx === 0 || (prevActivity && !isSameDay(activity.created_at, prevActivity.created_at))

      return (
        <div key={activity.id}>
          {showDivider && <DateDivider date={activity.created_at} />}
          <ActivityItem
            activity={activity}
            onPin={id => pinMutation.mutate(id)}
            isLast={idx === unpinnedItems.length - 1 && !hasNextPage}
          />
        </div>
      )
    })
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Compose area ── */}
      <ComposeArea
        key={composeKey}
        onSave={data => addNote.mutate(data)}
        isSaving={addNote.isPending}
      />

      {/* ── Filter pills ── */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {FILTER_OPTIONS.map(opt => {
          const isActive = activeFilter === opt.value
          const showBadge = opt.value === 'all' && totalCount > 0 && !!infiniteData

          return (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {opt.label}
              {showBadge && (
                <span
                  className={cn(
                    'ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1',
                    'rounded-full text-[10px] font-bold',
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-300 text-slate-600',
                  )}
                >
                  {totalCount > 999 ? '999+' : totalCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Timeline body ── */}
      <div>
        {isLoading ? (
          <ActivitySkeleton />
        ) : allItems.length === 0 ? (
          <EmptyState filter={activeFilter} />
        ) : (
          <>
            {/* Pinned section — only on All tab */}
            {isAllTab && pinnedItems.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2.5 px-1">
                  <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                    <Pin size={11} className="text-amber-500 fill-amber-400" />
                    <span className="text-[11px] font-semibold text-amber-700">
                      {pinnedItems.length} Pinned
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-amber-100" />
                </div>

                {/* Pinned items */}
                <div>
                  {pinnedItems.map((activity, idx) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      onPin={id => pinMutation.mutate(id)}
                      isLast={idx === pinnedItems.length - 1 && unpinnedItems.length === 0}
                    />
                  ))}
                </div>

                {unpinnedItems.length > 0 && (
                  <div className="flex items-center gap-2 my-3 px-1">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[11px] text-slate-400 font-medium">Activity</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                )}
              </div>
            )}

            {/* Unpinned items with date dividers */}
            {unpinnedItems.length > 0 && (
              <div>{buildUnpinnedWithDividers()}</div>
            )}

            {/* Load more */}
            {hasNextPage && (
              <div className="flex flex-col items-center gap-1.5 pt-2 pb-1">
                <p className="text-[11px] text-slate-400">
                  Showing {loadedCount} of {totalCount} items
                </p>
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200',
                    'text-xs font-medium text-slate-600 bg-white hover:bg-slate-50',
                    'hover:border-slate-300 hover:shadow-sm transition-all duration-150',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                  )}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-slate-400" />
                      Loading…
                    </>
                  ) : (
                    <>
                      <ChevronDown size={13} className="text-slate-400" />
                      Load more
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )
}
