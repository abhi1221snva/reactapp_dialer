import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { ActivityItem } from './ActivityItem'
import type { ActivityTimelineResponse, ActivityType } from '../../types/crm.types'

interface NoteForm {
  subject: string
  body: string
}

interface Props {
  leadId: number
}

export function ActivityTimeline({ leadId }: Props) {
  const qc = useQueryClient()
  const [offset, setOffset] = useState(0)
  const [allItems, setAllItems] = useState<ActivityTimelineResponse['items']>([])
  const [hasMore, setHasMore] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<NoteForm>()

  const { isLoading } = useQuery({
    queryKey: ['crm-activity', leadId, offset],
    queryFn: async () => {
      const res = await crmService.getActivity(leadId, offset)
      const data: ActivityTimelineResponse = res.data?.data ?? res.data
      if (offset === 0) {
        setAllItems(data.items)
      } else {
        setAllItems(prev => [...prev, ...data.items])
      }
      setHasMore(data.has_more)
      return data
    },
  })

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
      setOffset(0)
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
    },
    onError: () => toast.error('Failed to add note'),
  })

  const pinMutation = useMutation({
    mutationFn: (activityId: number) => crmService.pinActivity(leadId, activityId),
    onSuccess: () => {
      setOffset(0)
      qc.invalidateQueries({ queryKey: ['crm-activity', leadId] })
    },
    onError: () => toast.error('Failed to update pin'),
  })

  const pinnedItems = allItems.filter(a => a.is_pinned)
  const unpinnedItems = allItems.filter(a => !a.is_pinned)

  return (
    <div>
      {/* Add Note */}
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
            {errors.body && <p className="text-xs text-red-500 mb-2">{errors.body.message}</p>}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={addNote.isPending}
                className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50"
              >
                {addNote.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Save Note'}
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

      {/* Loading */}
      {isLoading && offset === 0 && (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin" style={{ color: '#6366F1' }} />
        </div>
      )}

      {/* Pinned items */}
      {pinnedItems.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#9CA3AF', letterSpacing: '0.05em' }}>
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

      {/* All items */}
      {unpinnedItems.length > 0 && (
        <div>
          {pinnedItems.length > 0 && (
            <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#9CA3AF', letterSpacing: '0.05em' }}>
              Timeline
            </p>
          )}
          {unpinnedItems.map((item, i) => (
            <ActivityItem
              key={item.id}
              activity={item}
              onPin={id => pinMutation.mutate(id)}
              isLast={i === unpinnedItems.length - 1 && !hasMore}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && allItems.length === 0 && (
        <div className="text-center py-12" style={{ color: '#9CA3AF' }}>
          <p className="text-sm">No activity yet.</p>
          <p className="text-xs mt-1">Add a note to get started.</p>
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setOffset(prev => prev + 20)}
            disabled={isLoading}
            className="text-sm px-4 py-2 rounded-lg border transition-colors"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
