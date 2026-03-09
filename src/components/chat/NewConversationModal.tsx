import { useState, useEffect, useCallback } from 'react'
import { X, Search, Users, MessageSquare, Check, Hash } from 'lucide-react'
import { chatService } from '../../services/chat.service'
import type { SearchUser } from '../../types/chat.types'
import { cn } from '../../utils/cn'
import { initials } from '../../utils/format'
import toast from 'react-hot-toast'

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-sky-500',
  'bg-emerald-500', 'bg-rose-500', 'bg-amber-500',
]
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length] }

interface Props {
  onClose: () => void
  onConversationCreated: (uuid: string) => void
}

export function NewConversationModal({ onClose, onConversationCreated }: Props) {
  const [tab, setTab] = useState<'dm' | 'group'>('dm')
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  // Group-specific state
  const [selected, setSelected] = useState<SearchUser[]>([])
  const [groupName, setGroupName] = useState('')

  const search = useCallback(async (q: string) => {
    if (q.length === 0) { setUsers([]); return }
    setLoading(true)
    try {
      const res = await chatService.searchUsers(q)
      setUsers(res.data?.data ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, search])

  // Load all users on mount
  useEffect(() => { search('') }, [search])

  const startDm = async (user: SearchUser) => {
    setCreating(true)
    try {
      const res = await chatService.getOrCreateDirect(user.id)
      onConversationCreated(res.data.data.uuid)
    } catch {
      toast.error('Failed to start conversation')
    } finally {
      setCreating(false)
    }
  }

  const createGroup = async () => {
    if (!groupName.trim()) { toast.error('Enter a group name'); return }
    if (selected.length === 0) { toast.error('Select at least one member'); return }
    setCreating(true)
    try {
      const res = await chatService.createGroup(groupName.trim(), selected.map(u => u.id))
      onConversationCreated(res.data.data.uuid)
    } catch {
      toast.error('Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  const toggleSelect = (user: SearchUser) => {
    setSelected(prev =>
      prev.some(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col overflow-hidden" style={{ maxHeight: '80vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">New Conversation</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-5 gap-4">
          {([
            { key: 'dm', label: 'Direct Message', icon: MessageSquare },
            { key: 'group', label: 'Group Chat', icon: Users },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors',
                tab === key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Group name input (group tab only) */}
          {tab === 'group' && (
            <div className="px-5 pt-4">
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Group name"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                />
              </div>
              {/* Selected chips */}
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selected.map(u => (
                    <span key={u.id} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                      {u.name}
                      <button onClick={() => toggleSelect(u)} className="ml-0.5 hover:text-indigo-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search input */}
          <div className="px-5 pt-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search people…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {loading && (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!loading && users.length === 0 && query.length > 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No users found</p>
            )}
            {!loading && users.map(user => {
              const isSelected = selected.some(u => u.id === user.id)
              return (
                <button
                  key={user.id}
                  onClick={() => tab === 'dm' ? startDm(user) : toggleSelect(user)}
                  disabled={creating}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="relative flex-shrink-0">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold', avatarColor(user.id))}>
                      {initials(user.name)}
                    </div>
                    <span className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                      user.status === 'online' ? 'bg-emerald-400'
                        : user.status === 'away' ? 'bg-amber-400'
                        : user.status === 'busy' ? 'bg-rose-400'
                        : 'bg-slate-300'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                  {tab === 'group' && isSelected && (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Group create button */}
          {tab === 'group' && (
            <div className="px-5 py-4 border-t border-slate-100">
              <button
                onClick={createGroup}
                disabled={creating || selected.length === 0 || !groupName.trim()}
                className="w-full h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
              >
                {creating ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Create Group ({selected.length} member{selected.length !== 1 ? 's' : ''})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
