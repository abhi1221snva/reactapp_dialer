import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare, X, Plus, Search, Hash, Building2, Store,
} from 'lucide-react'
import { chatService } from '../../services/chat.service'
import { useAuthStore } from '../../stores/auth.store'
import { useFloatingStore, useWidgetPositions } from '../../stores/floating.store'
import { useChatPusher } from './ChatPusherProvider'
import { DraggableWidget } from '../floating/DraggableWidget'
import { cn } from '../../utils/cn'
import { initials } from '../../utils/format'
import toast from 'react-hot-toast'
import type { Conversation, SearchUser } from '../../types/chat.types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-sky-500',
  'bg-emerald-500', 'bg-rose-500', 'bg-amber-500',
  'bg-teal-500', 'bg-orange-500',
]
function avatarBg(seed: number) { return AVATAR_COLORS[Math.abs(seed) % AVATAR_COLORS.length] }

function msgTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  if (diff < 604800000) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── CreateGroupModal ────────────────────────────────────────────────────────

function CreateGroupModal({ members, onClose, onCreated }: {
  members: SearchUser[]
  onClose: () => void
  onCreated: (uuid: string) => void
}) {
  const [groupName, setGroupName] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [creating, setCreating] = useState(false)

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase())
  )
  const toggle = (id: number) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const handleCreate = async () => {
    if (!groupName.trim() || selected.size < 1) return
    setCreating(true)
    try {
      const res = await chatService.createGroup(groupName.trim(), Array.from(selected))
      onCreated(res.data.data.uuid)
    } catch { toast.error('Failed to create group') }
    finally { setCreating(false) }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Create Group</h2>
            <p className="text-xs text-slate-400 mt-0.5">Name your group and add members</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4 overflow-hidden">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Group Name</label>
            <input
              autoFocus type="text" placeholder="e.g. Sales Team, Support Squad…"
              value={groupName} onChange={e => setGroupName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-800 placeholder-slate-400"
            />
          </div>
          <div className="flex flex-col gap-2 min-h-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">Members</label>
              {selected.size > 0 && (
                <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{selected.size} selected</span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text" placeholder="Search members…" value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-indigo-300 text-slate-700 placeholder-slate-400"
              />
            </div>
            <div className="overflow-y-auto max-h-52 flex flex-col gap-0.5">
              {filtered.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No members found</p>}
              {filtered.map(m => {
                const isChecked = selected.has(m.id)
                return (
                  <button key={m.id} onClick={() => toggle(m.id)}
                    className={cn('flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left w-full', isChecked ? 'bg-indigo-50' : 'hover:bg-slate-50')}
                  >
                    <div className={cn('w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors', isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300')}>
                      {isChecked && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0', avatarBg(m.id))}>
                      {initials(m.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate', isChecked ? 'text-indigo-700' : 'text-slate-700')}>{m.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!groupName.trim() || selected.size < 1 || creating}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
          >
            {creating && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {creating ? 'Creating…' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ConversationList (exported for mobile fallback) ─────────────────────────

export interface ConvListProps {
  conversations: Conversation[]
  teamMembers: SearchUser[]
  onlineStatus: Map<number, string>
  onSelect: (c: Conversation) => void
  onNewGroup: () => void
  onOpenDm: (memberId: number) => void
}

export function ConversationList({ conversations, teamMembers, onlineStatus, onSelect, onNewGroup, onOpenDm }: ConvListProps) {
  const systemConvs = conversations.filter(c => c.is_system)
  const groupConvs = conversations.filter(c => c.type === 'group' && !c.is_system)
  const directConvs = conversations.filter(c => c.type === 'direct')

  const systemIcon = (slug: string | null | undefined) =>
    slug === 'lender' ? <Building2 className="w-4 h-4" /> :
    slug === 'merchant' ? <Store className="w-4 h-4" /> :
    <Hash className="w-4 h-4" />

  return (
    <div className="flex-1 overflow-y-auto">

      {/* ── Channels (system) ── */}
      {systemConvs.length > 0 && (
        <div>
          <div className="flex items-center px-3.5 pt-3 pb-1">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Channels</p>
          </div>
          {systemConvs.map(conv => {
            const unread = conv.unread_count ?? 0
            const lm = conv.last_message
            return (
              <button
                key={conv.uuid}
                onClick={() => onSelect(conv)}
                className="w-full flex items-start gap-3 px-3.5 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100/70 last:border-0 text-left"
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5', conv.system_slug === 'lender' ? 'bg-violet-500' : 'bg-emerald-500')}>
                  {systemIcon(conv.system_slug)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={cn('text-sm truncate', unread > 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-800')}>{conv.name}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {lm && <span className="text-[10px] text-slate-400">{msgTime(lm.created_at)}</span>}
                      {unread > 0 && <span className="min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{unread > 9 ? '9+' : unread}</span>}
                    </div>
                  </div>
                  {lm && <p className="text-xs text-slate-400 truncate mt-0.5">{lm.body}</p>}
                  {!lm && <p className="text-xs text-slate-400 mt-0.5">Broadcast channel</p>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Groups ── */}
      <div>
        <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Groups</p>
          <button
            onClick={onNewGroup}
            title="Create group"
            className="w-5 h-5 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-500" />
          </button>
        </div>
        {groupConvs.length === 0 && (
          <button
            onClick={onNewGroup}
            className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-slate-400 hover:text-indigo-500 hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Create your first group
          </button>
        )}
        {groupConvs.map(conv => {
          const unread = conv.unread_count ?? 0
          const lm = conv.last_message
          return (
            <button
              key={conv.uuid}
              onClick={() => onSelect(conv)}
              className="w-full flex items-start gap-3 px-3.5 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100/70 last:border-0 text-left"
            >
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5', avatarBg(conv.uuid.charCodeAt(0)))}>
                <Hash className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className={cn('text-sm truncate', unread > 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-800')}>{conv.name}</p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {lm && <span className="text-[10px] text-slate-400">{msgTime(lm.created_at)}</span>}
                    {unread > 0 && <span className="min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{unread > 9 ? '9+' : unread}</span>}
                  </div>
                </div>
                {lm && <p className="text-xs text-slate-400 truncate mt-0.5">{lm.message_type === 'image' ? '📷 Image' : lm.message_type === 'file' ? '📎 File' : lm.body}</p>}
                {!lm && <p className="text-xs text-slate-400 mt-0.5">{conv.participants.length} members</p>}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── People ── */}
      {teamMembers.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">People</p>
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {teamMembers.filter(m => (onlineStatus.get(m.id) ?? m.status) === 'online').length} online
            </span>
          </div>
          {teamMembers.map(member => {
            const effectiveStatus = (onlineStatus.get(member.id) ?? member.status) as string
            const dotColor =
              effectiveStatus === 'online' ? 'bg-emerald-400' :
              effectiveStatus === 'away'   ? 'bg-amber-400'   :
              effectiveStatus === 'busy'   ? 'bg-rose-400'    : 'bg-slate-300'
            const existingDm = directConvs.find(c => c.participants.some(p => p.user_id === member.id))
            const unread = existingDm?.unread_count ?? 0
            return (
              <button
                key={member.id}
                onClick={() => onOpenDm(member.id)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100/70 last:border-0 text-left"
              >
                <div className="relative flex-shrink-0">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold', avatarBg(member.id))}>
                    {initials(member.name)}
                  </div>
                  <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white', dotColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{member.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{effectiveStatus}</p>
                </div>
                {unread > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── ChatListWidget ──────────────────────────────────────────────────────────

export function ChatListWidget() {
  const { user } = useAuthStore()
  const isOpen      = useFloatingStore(s => s.chatOpen)
  const setChatOpen = useFloatingStore(s => s.setChatOpen)
  const openWindow  = useFloatingStore(s => s.openChatWindow)
  const { chatRight } = useWidgetPositions()
  const navigate = useNavigate()

  const { conversations, setConversations, totalUnread, teamMembers, onlineStatus, loadConversations } = useChatPusher()
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  // ── Open DM with a team member ──────────────────────────────────────────

  const openDmWith = useCallback(async (memberId: number) => {
    try {
      const res = await chatService.getOrCreateDirect(memberId)
      const { uuid } = res.data.data
      const convRes = await chatService.getConversations()
      const list: Conversation[] = Array.isArray(convRes.data?.data) ? convRes.data.data : []
      setConversations(list)
      const conv = list.find(c => c.uuid === uuid)
      if (conv) openWindow(conv)
    } catch { toast.error('Could not open conversation') }
  }, [openWindow, setConversations])

  // ── Group created ──────────────────────────────────────────────────────

  const handleGroupCreated = useCallback(async (uuid: string) => {
    setShowCreateGroup(false)
    await loadConversations()
    const { conversations: fresh } = useChatPusher as never // we can't access this synchronously
    // Reload and open
    const res = await chatService.getConversations()
    const list: Conversation[] = Array.isArray(res.data?.data) ? res.data.data : []
    setConversations(list)
    const conv = list.find(c => c.uuid === uuid)
    if (conv) openWindow(conv)
  }, [loadConversations, openWindow, setConversations])

  // ── Select conversation → open mini window ────────────────────────────

  const handleSelect = useCallback((conv: Conversation) => {
    openWindow(conv)
  }, [openWindow])

  // ── Header ─────────────────────────────────────────────────────────────

  const headerLeft = (
    <>
      <MessageSquare className="w-4 h-4 text-white/80 flex-shrink-0" />
      <span className="text-sm font-semibold text-white">Team Chat</span>
      {totalUnread > 0 && (
        <span className="min-w-[18px] h-[18px] px-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white/30">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}
    </>
  )

  const headerRight = (
    <button
      onClick={() => setShowCreateGroup(true)}
      className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
      title="Create group"
    >
      <Plus className="w-3.5 h-3.5 text-white" />
    </button>
  )

  return (
    <>
      <DraggableWidget
        isOpen={isOpen}
        onClose={() => setChatOpen(false)}
        headerLeft={headerLeft}
        headerRight={headerRight}
        onMaximize={() => { setChatOpen(false); navigate('/chat') }}
        headerGradient="linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
        defaultRight={chatRight}
        defaultBottom={20}
        width={300}
        zIndex={62}
        bodyHeight={480}
      >
        <div style={{ height: 480, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ConversationList
            conversations={conversations}
            teamMembers={teamMembers}
            onlineStatus={onlineStatus}
            onSelect={handleSelect}
            onNewGroup={() => setShowCreateGroup(true)}
            onOpenDm={openDmWith}
          />
        </div>
      </DraggableWidget>

      {showCreateGroup && (
        <CreateGroupModal
          members={teamMembers}
          onClose={() => setShowCreateGroup(false)}
          onCreated={handleGroupCreated}
        />
      )}
    </>
  )
}
