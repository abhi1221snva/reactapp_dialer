import { useState } from 'react'
import { StickyNote, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { MOCK_NOTES } from '../mockData'
import type { StudioNote } from '../types'

export function NotesTab() {
  const [notes, setNotes] = useState<StudioNote[]>(MOCK_NOTES)
  const [newNote, setNewNote] = useState('')

  const add = () => {
    if (!newNote.trim()) return
    const n: StudioNote = {
      id: Date.now(),
      author: 'Priya Sharma',
      avatar: 'PS',
      text: newNote.trim(),
      timestamp: 'Just now',
    }
    setNotes([n, ...notes])
    setNewNote('')
    toast.success('Note added')
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
            <p className="text-[11px] text-slate-400">{notes.length} entries on this lead</p>
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
                disabled={!newNote.trim()}
                className="btn-sm btn-primary gap-1.5"
              >
                <Plus size={11} /> Add Note
              </button>
            </div>
          </div>

          {/* List */}
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
        </div>
      </div>
    </div>
  )
}
