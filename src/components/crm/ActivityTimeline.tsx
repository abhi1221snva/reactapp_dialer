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

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',              label: 'All',              icon: LayoutList,    activeBg: 'bg-slate-800',     activeText: 'text-white',       inactiveBg: 'bg-white',       inactiveText: 'text-slate-600' },
  { key: 'system',           label: 'System',           icon: Zap,           activeBg: 'bg-slate-100',     activeText: 'text-slate-700',   inactiveBg: 'bg-white',       inactiveText: 'text-slate-500' },
  { key: 'lender_submitted', label: 'Lender',           icon: Send,          activeBg: 'bg-orange-500',    activeText: 'text-white',       inactiveBg: 'bg-white',       inactiveText: 'text-slate-500' },
  { key: 'note_added',       label: 'Notes',            icon: MessageSquare, activeBg: 'bg-emerald-600',   activeText: 'text-white',       inactiveBg: 'bg-white',       inactiveText: 'text-slate-500' },
  { key: 'lender_response',  label: 'Responses',        icon: AlertCircle,   activeBg: 'bg-red-500',       activeText: 'text-white',       inactiveBg: 'bg-white',       inactiveText: 'text-slate-500' },
] as const

type TabKey = (typeof TABS)[number]['key']

// ─── Types ────────────────────────────────────────────────────────────────────

interface NoteForm {
  subject: string
  body: string
}

interface Props {
  leadId: number
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ActivitySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-slate-200" />
            {i < 3 && <div className="w-px flex-1 mt-1.5 min-h-[40px] bg-slate-100" />}
          </div>
          <div className="flex-1 mb-3">
            <div
              className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
              style={{ borderLeft: '3px solid #E2E8F0' }}
            >
              <div className="flex items-center gap-2">
                <div className="h-4 w-16 rounded-full bg-slate-200" />
              </div>
              <div className={cn('h-4 rounded bg-slate-200', i === 2 ? 'w-4/5' : 'w-3/5')} />
              <div className="h-3 w-2/5 rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: TabKey }) {
  const messages: Record<TabKey, { icon: React.ReactNode; title: string; sub: string }> = {
    all:              { icon: <FileText size={32} className="text-slate-300" />,    title: 'No activity yet',          sub: 'Actions on this lead will appear here.' },
    system:           { icon: <Zap size={32} className="text-slate-300" />,         title: 'No system events',         sub: 'Automated events will show up here.' },
    lender_submitted: { icon: <Send size={32} className="text-orange-200" />,       title: 'No lender submissions',    sub: 'Submit to a lender from the Lenders panel.' },
    note_added:       { icon: <MessageSquare size={32} className="text-emerald-200" />, title: 'No notes yet',         sub: 'Write a note above to get started.' },
    lender_response:  { icon: <AlertCircle size={32} className="text-red-200" />,   title: 'No lender responses',      sub: 'Lender responses will appear here.' },
  }
  const { icon, title, sub } = messages[tab]

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
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NoteForm>({ defaultValues: { subject: '', body: '' } })

  // Auto-focus textarea when expanded
  useEffect(() => {
    if (expanded) {
      setTimeout(() => bodyRef.current?.focus(), 60)
    }
  }, [expanded])

  function handleCancel() {
    reset()
    setExpanded(false)
  }

  function onSubmit(data: NoteForm) {
    onSave(data)
    // Collapse is handled by parent on success via reset + setExpanded(false)
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
          'w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 bg-white',
          'text-sm text-slate-400 hover:text-slate-500 hover:border-emerald-300 hover:shadow-sm',
          'transition-all duration-150 cursor-text',
          'focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50',
        )}
        style={{ borderLeft: '3px solid #059669' }}
      >
        <span className="flex items-center gap-2">
          <MessageSquare size={14} className="text-emerald-400 flex-shrink-0" />
          Write a note…
        </span>
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn(
        'rounded-xl border border-emerald-300 bg-white shadow-sm overflow-hidden',
        'transition-all duration-200',
      )}
      style={{ borderLeft: '3px solid #059669' }}
    >
      {/* Subject */}
      <div className="border-b border-slate-100">
        <input
          {...register('subject')}
          placeholder="Subject (optional)"
          className={cn(
            'w-full px-3 py-2 text-sm font-medium text-slate-700 placeholder-slate-300',
            'bg-transparent outline-none',
          )}
        />
      </div>

      {/* Body */}
      <div>
        <textarea
          {...bodyRegRest}
          ref={el => {
            bodyRegRef(el)
            bodyRef.current = el
          }}
          placeholder="Add your note here…"
          rows={4}
          className={cn(
            'w-full px-3 py-2 text-sm text-slate-700 placeholder-slate-300',
            'bg-transparent outline-none resize-none leading-relaxed',
          )}
        />
        {errors.body && (
          <p className="px-3 pb-1 text-[11px] text-red-500">{errors.body.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-t border-slate-100">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <MessageSquare size={10} className="text-emerald-500" />
          Note
        </span>
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

export function ActivityTimeline({ leadId }: Props) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  const typeParam = activeTab === 'all' ? undefined : activeTab

  const {
    data: infiniteData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['crm-activity', leadId, activeTab],
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
  const [composeKey, setComposeKey] = useState(0) // used to remount compose area on success
  const addNote = useMutation({
    mutationFn: (form: NoteForm) =>
      crmService.addActivity(leadId, {
        activity_type: 'note_added' as ActivityType,
        subject: form.subject?.trim() || 'Note',
        body: form.body,
      }),
    onSuccess: () => {
      toast.success('Note added')
      setComposeKey(k => k + 1) // remount ComposeArea → resets form + collapses
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
    },
    onError: () => toast.error('Failed to add note'),
  })

  // ── Pin mutation ──
  const pinMutation = useMutation({
    mutationFn: (activityId: number) => crmService.pinActivity(leadId, activityId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-activity', leadId] }),
    onError: () => toast.error('Failed to update pin'),
  })

  const isAllTab = activeTab === 'all'

  return (
    <div className="flex flex-col gap-4">

      {/* ── Compose area ── */}
      <ComposeArea
        key={composeKey}
        onSave={data => addNote.mutate(data)}
        isSaving={addNote.isPending}
      />

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          const showBadge = tab.key === 'all' && totalCount > 0 && !!infiniteData

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
                'border transition-all duration-150',
                isActive
                  ? cn(tab.activeBg, tab.activeText, 'border-transparent shadow-sm')
                  : cn(tab.inactiveBg, tab.inactiveText, 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'),
              )}
            >
              <Icon size={11} />
              {tab.label}
              {showBadge && (
                <span
                  className={cn(
                    'ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1',
                    'rounded-full text-[10px] font-bold',
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
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
          <EmptyState tab={activeTab} />
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
                {pinnedItems.map((activity, idx) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    onPin={id => pinMutation.mutate(id)}
                    isLast={idx === pinnedItems.length - 1 && unpinnedItems.length === 0}
                  />
                ))}
                {unpinnedItems.length > 0 && (
                  <div className="flex items-center gap-2 my-3 px-1">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[11px] text-slate-400 font-medium">Activity</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                )}
              </div>
            )}

            {/* Unpinned items */}
            {unpinnedItems.map((activity, idx) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                onPin={id => pinMutation.mutate(id)}
                isLast={idx === unpinnedItems.length - 1 && !hasNextPage}
              />
            ))}

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
