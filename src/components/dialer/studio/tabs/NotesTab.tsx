import { useState, useEffect } from 'react'
import { StickyNote, Plus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { dialerService } from '../../../../services/dialer.service'
import { crmService } from '../../../../services/crm.service'
import { useAuthStore } from '../../../../stores/auth.store'
import type { StudioNote } from '../types'

interface ApiComment {
  id: number
  comment: string
  created_at: string
  first_name?: string
  last_name?: string
}

function formatTimestamp(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDays = Math.floor(diffHr / 24)
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString()
  } catch {
    return iso
  }
}

function initials(first?: string, last?: string): string {
  return `${(first || '?')[0]}${(last || '')[0] || ''}`.toUpperCase()
}

interface Props {
  leadId: number
}

export function NotesTab({ leadId }: Props) {
  const [notes, setNotes] = useState<StudioNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const authUser = useAuthStore((s) => s.user)

  // Fetch notes from API
  useEffect(() => {
    if (!leadId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    dialerService.viewNotes(leadId)
      .then((res) => {
        if (cancelled) return
        const list: ApiComment[] = res.data?.data ?? res.data ?? []
        setNotes(
          list.map((c) => ({
            id: c.id,
            author: [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Agent',
            avatar: initials(c.first_name, c.last_name),
            text: c.comment,
            timestamp: formatTimestamp(c.created_at),
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setNotes([])
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [leadId])

  const add = async () => {
    if (!newNote.trim() || !leadId) return
    setAdding(true)
    try {
      await crmService.addActivity(leadId, {
        activity_type: 'note_added',
        subject: 'Note added from Dialer Studio',
        body: newNote.trim(),
      })
      // Prepend locally
      const n: StudioNote = {
        id: Date.now(),
        author: authUser ? `${authUser.first_name} ${authUser.last_name}`.trim() : 'You',
        avatar: authUser ? initials(authUser.first_name, authUser.last_name) : 'Y',
        text: newNote.trim(),
        timestamp: 'Just now',
      }
      setNotes((prev) => [n, ...prev])
      setNewNote('')
      toast.success('Note added')
    } catch {
      toast.error('Failed to add note')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="detail-section">
        <div className="detail-section-header">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <StickyNote size={14} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
            <p className="text-[11px] text-slate-400">
              {loading ? 'Loading…' : `${notes.length} entries on this lead`}
            </p>
          </div>
        </div>

        <div className="detail-section-body space-y-4">
          {/* Add form */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a quick note…"
              rows={2}
              className="w-full resize-none bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400"
            />
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400">
                Visible to your team
              </span>
              <button
                onClick={add}
                disabled={!newNote.trim() || adding || !leadId}
                className="btn-sm btn-primary gap-1.5"
              >
                {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add Note
              </button>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-6">
              <Loader2 size={14} className="animate-spin" /> Loading notes…
            </div>
          ) : notes.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No notes yet.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                    {n.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">{n.author}</p>
                      <p className="text-[10px] text-slate-400 shrink-0">{n.timestamp}</p>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {n.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
