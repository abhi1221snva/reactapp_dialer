import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Loader2, LayoutList, Zap, Send, MessageSquare, AlertCircle,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { ActivityItem } from './ActivityItem'
import { cn } from '../../utils/cn'
import type { ActivityTimelineResponse, ActivityType } from '../../types/crm.types'

// ── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',              label: 'All',              icon: LayoutList,    color: '#6B7280' },
  { key: 'system',           label: 'System',           icon: Zap,           color: '#9CA3AF' },
  { key: 'lender_submitted', label: 'Lender Submitted', icon: Send,          color: '#F97316' },
  { key: 'note_added',       label: 'Notes',            icon: MessageSquare, color: '#6366F1' },
  { key: 'lender_response',  label: 'Lender Responses', icon: AlertCircle,   color: '#EF4444' },
] as const

type TabKey = (typeof TABS)[number]['key']

// ── Note form ────────────────────────────────────────────────────────────────

interface NoteForm { subject: string; body: string }

// ── Props ────────────────────────────────────────────────────────────────────

interface Props { leadId: number }

// ── Component ────────────────────────────────────────────────────────────────

export function ActivityTimeline({ leadId }: Props) {
  const qc = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [showNoteForm, setShowNoteForm] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<NoteForm>()

  // ── Fetch activities (infinite scroll) ────────────────────────────────────

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

  // Derive items directly from query data — no manual state, no race conditions
  const allItems = infiniteData?.pages.flatMap(p => p.items) ?? []

  // ── Add note ───────────────────────────────────────────────────────────────

  const addNote = useMutation({
    mutationFn: (form: NoteForm) =>
      crmService.addActivity(leadId, {
        activity_type: 'note_added' as ActivityType,
        subject: form.subject || 'Note',
        body: form.body,
      }),
    onSuccess: () => {
      toast.success('Note added')
      reset()
      setShowNoteForm(false)
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
    },
    onError: () => toast.error('Failed to add note'),
  })

  // ── Pin / unpin ────────────────────────────────────────────────────────────

  const pinMutation = useMutation({
    mutationFn: (activityId: number) => crmService.pinActivity(leadId, activityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
    },
    onError: () => toast.error('Failed to update pin'),
  })

  const pinnedItems   = allItems.filter(a => a.is_pinned)
  const unpinnedItems = allItems.filter(a => !a.is_pinned)

  const isAllTab = activeTab === 'all'

  return (
    <div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-0.5 -mx-1 px-1">
        {TABS.map(tab => {
          const Icon     = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => { if (tab.key !== activeTab) setActiveTab(tab.key) }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              )}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Add Note (only on All / Notes tab) ──────────────────────────── */}
      {(isAllTab || activeTab === 'note_added') && (
        <div className="mb-4">
          {!showNoteForm ? (
            <button
              onClick={() => setShowNoteForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: '#EEF2FF', color: '#4F46E5' }}
            >
              <Plus size={15} /> Add Note
            </button>
          ) : (
            <form
              onSubmit={handleSubmit(d => addNote.mutate(d))}
              className="rounded-xl border p-4"
              style={{ borderColor: '#E0E7FF', background: '#FAFBFF' }}
            >
              <input
                {...register('subject')}
                placeholder="Note title (optional)"
                className="input w-full mb-2"
              />
              <textarea
                {...register('body', { required: 'Note content is required' })}
                placeholder="Write your note here..."
                rows={3}
                className="input w-full mb-2 resize-none"
              />
              {errors.body && (
                <p className="text-xs text-red-500 mb-2">{errors.body.message}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={addNote.isPending}
                  className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50"
                >
                  {addNote.isPending
                    ? <Loader2 size={14} className="animate-spin" />
                    : 'Save Note'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNoteForm(false); reset() }}
                  className="text-sm px-4 py-1.5 rounded-lg border"
                  style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Loading skeleton (first load) ───────────────────────────────── */}
      {isLoading && (
        <div className="space-y-3 py-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse flex-shrink-0" />
              <div className="flex-1 rounded-xl border p-3" style={{ borderColor: '#E5E7EB' }}>
                <div className="h-3 bg-slate-200 rounded animate-pulse w-1/4 mb-2" />
                <div className="h-3 bg-slate-200 rounded animate-pulse w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pinned items ─────────────────────────────────────────────────── */}
      {!isLoading && pinnedItems.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase mb-2"
            style={{ color: '#9CA3AF', letterSpacing: '0.05em' }}>
            Pinned
          </p>
          {pinnedItems.map((item, i) => (
            <ActivityItem
              key={item.id}
              activity={item}
              onPin={id => pinMutation.mutate(id)}
              isLast={i === pinnedItems.length - 1}
            />
          ))}
        </div>
      )}

      {/* ── Timeline items ───────────────────────────────────────────────── */}
      {!isLoading && unpinnedItems.length > 0 && (
        <div>
          {pinnedItems.length > 0 && (
            <p className="text-xs font-semibold uppercase mb-2"
              style={{ color: '#9CA3AF', letterSpacing: '0.05em' }}>
              Timeline
            </p>
          )}
          {unpinnedItems.map((item, i) => (
            <ActivityItem
              key={item.id}
              activity={item}
              onPin={id => pinMutation.mutate(id)}
              isLast={i === unpinnedItems.length - 1 && !hasNextPage}
            />
          ))}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!isLoading && allItems.length === 0 && (
        <div className="text-center py-12" style={{ color: '#9CA3AF' }}>
          {(() => {
            const tab  = TABS.find(t => t.key === activeTab)!
            const Icon = tab.icon
            return (
              <>
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: '#F1F5F9' }}>
                  <Icon size={20} style={{ color: '#CBD5E1' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: '#64748B' }}>
                  No {tab.label.toLowerCase()} activity
                </p>
                <p className="text-xs mt-0.5">
                  {activeTab === 'note_added' || activeTab === 'all'
                    ? 'Add a note to get started.'
                    : 'Nothing recorded yet.'}
                </p>
              </>
            )
          })()}
        </div>
      )}

      {/* ── Load more ────────────────────────────────────────────────────── */}
      {hasNextPage && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="text-sm px-4 py-2 rounded-lg border transition-colors hover:bg-slate-50"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
          >
            {isFetchingNextPage
              ? <Loader2 size={14} className="animate-spin" />
              : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
