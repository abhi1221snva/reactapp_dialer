import { useState, useRef, useEffect } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LayoutList, Zap, Send, MessageSquare, AlertCircle,
  Pin, ChevronDown, Loader2, FileText, X,
  CheckCircle2, XCircle, Clock, Code2,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { ActivityItem } from './ActivityItem'
import { cn } from '../../utils/cn'
import type { ActivityTimelineResponse, ActivityType, LeadActivity, FixSuggestion } from '../../types/crm.types'
import { ErrorFixModal } from './LenderApiFixModal'

// ─── Filter pills config ───────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { value: 'all',           label: 'All' },
  { value: 'note_added',    label: 'Notes' },
  { value: 'call_made',     label: 'Calls' },
  { value: 'email_sent',    label: 'Emails' },
  { value: 'sms_sent',      label: 'SMS' },
  { value: 'status_change', label: 'Status' },
  { value: 'field_update',  label: 'Updates' },
  { value: 'document_uploaded', label: 'Docs' },
  { value: 'lender_submitted',  label: 'Lender' },
  { value: 'lender_api_result', label: 'API Results' },
  { value: 'lender_response',   label: 'Responses' },
  { value: 'system',            label: 'System' },
] as const

type FilterValue = (typeof FILTER_OPTIONS)[number]['value']

// ─── Legacy tab keys kept for query key compat ────────────────────────────────

type TabKey =
  | 'all'
  | 'system'
  | 'lender_submitted'
  | 'lender_api_result'
  | 'note_added'
  | 'lender_response'
  | 'call_made'
  | 'email_sent'
  | 'sms_sent'
  | 'status_change'
  | 'field_update'
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
    <div className="flex items-center gap-2 my-1.5">
      <div className="flex-1 h-px bg-slate-100" />
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ActivitySkeleton() {
  return (
    <div className="space-y-1.5 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-lg border border-slate-100 px-2.5 py-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="h-5 w-5 rounded-md bg-slate-100" />
            <div className="h-3 w-12 rounded bg-slate-100" />
            <div className={cn('h-3 rounded bg-slate-200 flex-1', i % 2 === 0 ? 'max-w-[60%]' : 'max-w-[45%]')} />
            <div className="h-2.5 w-6 rounded bg-slate-100" />
          </div>
          {i <= 2 && <div className="h-3 w-3/4 rounded bg-slate-50 ml-6.5" style={{ marginLeft: 26 }} />}
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
    lender_submitted:  { icon: <Send size={32} className="text-orange-200" />,                  title: 'No lender submissions',    sub: 'Submit to a lender from the Lenders panel.' },
    lender_api_result: { icon: <Send size={32} className="text-emerald-200" />,                 title: 'No API results yet',        sub: 'API submission results will appear here.' },
    note_added:       { icon: <MessageSquare size={32} className="text-emerald-200" />,        title: 'No notes yet',             sub: 'Write a note above to get started.' },
    lender_response:  { icon: <AlertCircle size={32} className="text-red-200" />,              title: 'No lender responses',      sub: 'Lender responses will appear here.' },
    call_made:        { icon: <LayoutList size={32} className="text-blue-200" />,              title: 'No calls logged',          sub: 'Call activity will appear here.' },
    email_sent:       { icon: <LayoutList size={32} className="text-sky-200" />,               title: 'No emails logged',         sub: 'Email activity will appear here.' },
    sms_sent:         { icon: <MessageSquare size={32} className="text-violet-200" />,         title: 'No SMS logged',            sub: 'SMS activity will appear here.' },
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


// ─── API Detail Modal ──────────────────────────────────────────────────────────

function ApiDetailModal({ activity, onClose }: { activity: LeadActivity; onClose: () => void }) {
  const meta = (activity.meta ?? {}) as Record<string, unknown>

  const lenderName   = (meta.lender_name  as string  | undefined) ?? 'Lender'
  const isSuccess    = meta.success as boolean | undefined
  const responseCode = meta.response_code as number | undefined
  const durationMs   = meta.duration_ms   as number | undefined
  const attempts     = meta.attempts      as number | undefined
  const responseBody = meta.response_body as string | undefined
  const validErrors  = meta.validation_errors as string[] | undefined
  const docUpload    = meta.doc_upload    as { uploaded: number; failed: number; total: number } | undefined

  // Pretty-print response body if it's JSON
  let formattedResponse: string | null = null
  if (responseBody) {
    try {
      formattedResponse = JSON.stringify(JSON.parse(responseBody), null, 2)
    } catch {
      formattedResponse = responseBody
    }
  }

  const [tab, setTab] = useState<'response' | 'summary'>(formattedResponse ? 'response' : 'summary')

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
              isSuccess === true  ? 'bg-emerald-50' :
              isSuccess === false ? 'bg-red-50'     : 'bg-amber-50'
            )}>
              {isSuccess === true  ? <CheckCircle2 size={16} className="text-emerald-600" /> :
               isSuccess === false ? <XCircle      size={16} className="text-red-600"     /> :
                                     <AlertCircle  size={16} className="text-amber-600"   />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{lenderName}</h3>
              <p className="text-[11px] text-slate-400">
                {isSuccess === true  ? 'Application submitted successfully' :
                 isSuccess === false ? 'API submission failed'              : 'Validation error — not submitted'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab toggle */}
            {formattedResponse && (
              <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                {(['response', 'summary'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all capitalize',
                      tab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {t === 'response' ? 'API Response' : 'Summary'}
                  </button>
                ))}
              </div>
            )}
            <button onClick={onClose} className="action-btn"><X size={14} /></button>
          </div>
        </div>

        {/* Info strip */}
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-100 bg-slate-50/80 flex-shrink-0 flex-wrap">
          {responseCode != null && (
            <span className={cn(
              'text-[11px] font-bold px-2 py-1 rounded-lg',
              isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            )}>
              HTTP {responseCode}
            </span>
          )}
          {durationMs != null && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Clock size={10} /> {durationMs}ms
            </span>
          )}
          {attempts != null && attempts > 1 && (
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">
              {attempts} attempt{attempts > 1 ? 's' : ''}
            </span>
          )}
          {docUpload && (docUpload.uploaded > 0 || docUpload.failed > 0) && (
            <span className="text-[11px] text-slate-500">
              Docs: {docUpload.uploaded} sent{docUpload.failed > 0 ? `, ${docUpload.failed} failed` : ''}
            </span>
          )}
          <span className="text-[11px] text-slate-400 ml-auto tabular-nums">
            {new Date(activity.created_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* Summary tab */}
          {tab === 'summary' && (
            <div className="space-y-4">
              {validErrors && validErrors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                    Validation Errors
                  </p>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
                    {validErrors.map((e, i) => (
                      <p key={i} className="text-sm text-amber-800 flex items-start gap-2">
                        <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        {e}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Activity Details</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-[11px] text-slate-400 w-28 flex-shrink-0">Lender</span>
                    <span className="text-[12px] text-slate-800 font-medium">{lenderName}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-[11px] text-slate-400 w-28 flex-shrink-0">Result</span>
                    <span className={cn('text-[12px] font-semibold',
                      isSuccess ? 'text-emerald-700' : 'text-red-700'
                    )}>
                      {isSuccess ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  {responseCode != null && (
                    <div className="flex items-start gap-3">
                      <span className="text-[11px] text-slate-400 w-28 flex-shrink-0">HTTP Status</span>
                      <span className="text-[12px] text-slate-800">{responseCode}</span>
                    </div>
                  )}
                  {durationMs != null && (
                    <div className="flex items-start gap-3">
                      <span className="text-[11px] text-slate-400 w-28 flex-shrink-0">Duration</span>
                      <span className="text-[12px] text-slate-800">{durationMs}ms</span>
                    </div>
                  )}
                  {attempts != null && (
                    <div className="flex items-start gap-3">
                      <span className="text-[11px] text-slate-400 w-28 flex-shrink-0">Attempts</span>
                      <span className="text-[12px] text-slate-800">{attempts}</span>
                    </div>
                  )}
                </div>
              </div>

              {!formattedResponse && !validErrors?.length && (
                <p className="text-sm text-slate-400 text-center py-6">No additional details available.</p>
              )}
            </div>
          )}

          {/* Response tab */}
          {tab === 'response' && formattedResponse && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">API Response Body</p>
                <button
                  onClick={() => { navigator.clipboard?.writeText(formattedResponse!) }}
                  className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <Code2 size={10} /> Copy
                </button>
              </div>
              <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                <pre className="text-[11px] text-emerald-300 font-mono whitespace-pre leading-relaxed">
                  {formattedResponse}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ActivityTimeline({ leadId, onAddActivity }: Props) {
  const qc = useQueryClient()
  const [activeFilter, setActiveFilter]       = useState<FilterValue>('all')
  const [detailActivity, setDetailActivity]   = useState<LeadActivity | null>(null)
  const [fixModal, setFixModal]               = useState<{ activity: LeadActivity; error: FixSuggestion } | null>(null)

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
            onViewDetails={setDetailActivity}
            onFix={(act, err) => setFixModal({ activity: act, error: err })}
            isLast={idx === unpinnedItems.length - 1 && !hasNextPage}
          />
        </div>
      )
    })
  }

  return (
    <>
    <div className="flex flex-col gap-2.5">

      {/* ── Compose area ── */}
      <ComposeArea
        key={composeKey}
        onSave={data => addNote.mutate(data)}
        isSaving={addNote.isPending}
      />

      {/* ── Filter pills ── */}
      <div className="flex items-center gap-1 overflow-x-auto py-0.5" style={{ scrollbarWidth: 'none' }}>
        {FILTER_OPTIONS.map(opt => {
          const isActive = activeFilter === opt.value
          const showBadge = opt.value === 'all' && totalCount > 0 && !!infiniteData

          return (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap transition-all border',
                isActive
                  ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700',
              )}
            >
              {opt.label}
              {showBadge && (
                <span className={cn(
                  'ml-1 text-[9px] font-bold',
                  isActive ? 'text-white/60' : 'text-slate-400',
                )}>
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
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Pin size={10} className="text-amber-500 fill-amber-400" />
                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">
                    Pinned ({pinnedItems.length})
                  </span>
                  <div className="flex-1 h-px bg-amber-100" />
                </div>

                <div>
                  {pinnedItems.map((activity, idx) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      onPin={id => pinMutation.mutate(id)}
                      onViewDetails={setDetailActivity}
                      onFix={(act, err) => setFixModal({ activity: act, error: err })}
                      isLast={idx === pinnedItems.length - 1 && unpinnedItems.length === 0}
                    />
                  ))}
                </div>

                {unpinnedItems.length > 0 && (
                  <div className="h-px bg-slate-100 my-2" />
                )}
              </div>
            )}

            {/* Unpinned items with date dividers */}
            {unpinnedItems.length > 0 && (
              <div>{buildUnpinnedWithDividers()}</div>
            )}

            {/* Load more */}
            {hasNextPage && (
              <div className="flex items-center justify-between pt-2 pb-1">
                <span className="text-[10px] text-slate-400">
                  {loadedCount} of {totalCount}
                </span>
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200',
                    'text-[10px] font-semibold text-slate-600 bg-white hover:bg-slate-50',
                    'hover:border-slate-300 transition-all',
                    'disabled:opacity-60',
                  )}
                >
                  {isFetchingNextPage ? (
                    <><Loader2 size={10} className="animate-spin text-slate-400" /> Loading…</>
                  ) : (
                    <><ChevronDown size={10} className="text-slate-400" /> Load more</>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </div>

    {/* ── API detail modal ── */}
    {detailActivity && (
      <ApiDetailModal
        activity={detailActivity}
        onClose={() => setDetailActivity(null)}
      />
    )}

    {/* ── Fix modal ── */}
    {fixModal && (
      <ErrorFixModal
        leadId={leadId}
        lenderId={(fixModal.activity.meta as Record<string, unknown>)?.lender_id as number ?? 0}
        error={fixModal.error}
        onClose={() => setFixModal(null)}
        onFixed={() => {
          setFixModal(null)
          qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
        }}
      />
    )}
  </>
  )
}
