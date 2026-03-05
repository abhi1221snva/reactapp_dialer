import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Send, MessagesSquare, Hash } from 'lucide-react'
import api from '../../api/axios'
import { timeAgo, initials } from '../../utils/format'
import { cn } from '../../utils/cn'
import { useAuth } from '../../hooks/useAuth'

interface Conversation { id: number; name: string; last_message?: string; unread_count?: number; updated_at: string; [key: string]: unknown }
interface Message { id: number; message: string; user_id: number; sender_name: string; created_at: string; [key: string]: unknown }

const chatService = {
  getConversations: () => api.get('/team-chat/conversations'),
  getMessages: (id: number) => api.get(`/team-chat/conversations/${id}/messages`),
  sendMessage: (id: number, message: string) => api.post(`/team-chat/conversations/${id}/messages`, { message }),
}

const AVATAR_COLORS = [
  'from-indigo-400 to-indigo-600',
  'from-violet-400 to-violet-600',
  'from-sky-400 to-sky-600',
  'from-emerald-400 to-emerald-600',
  'from-rose-400 to-rose-600',
  'from-amber-400 to-amber-600',
]

function getColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]
}

export function TeamChat() {
  const { user } = useAuth()
  const [selectedConv, setSelectedConv] = useState<number | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: convsData } = useQuery({
    queryKey: ['team-conversations'],
    queryFn: chatService.getConversations,
    refetchInterval: 10000,
  })

  const { data: messagesData, refetch } = useQuery({
    queryKey: ['team-messages', selectedConv],
    queryFn: () => chatService.getMessages(selectedConv!),
    enabled: !!selectedConv,
    refetchInterval: 3000,
  })

  const sendMutation = useMutation({
    mutationFn: () => chatService.sendMessage(selectedConv!, newMessage),
    onSuccess: () => { setNewMessage(''); refetch() },
  })

  const conversations: Conversation[] = convsData?.data?.data || []
  const messages: Message[] = messagesData?.data?.data || []
  const activeConv = conversations.find(c => c.id === selectedConv)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (newMessage.trim()) sendMutation.mutate()
    }
  }

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Team Chat</h1>
          <p className="text-sm text-slate-500">Internal team messaging</p>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="flex flex-1 min-h-0">

        {/* Conversations sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Conversations</p>
            {conversations.length > 0 && (
              <span className="text-xs text-slate-400 font-medium">{conversations.length}</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
                <MessagesSquare size={28} className="text-slate-300 mb-2" />
                <p className="text-xs text-slate-400">No conversations yet</p>
              </div>
            )}
            {conversations.map((conv) => {
              const isActive = selectedConv === conv.id
              const unread = (conv.unread_count as number) || 0
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-slate-200/60 transition-all duration-150',
                    isActive
                      ? 'bg-white border-l-2 border-l-indigo-500 shadow-sm'
                      : 'hover:bg-white/60'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm',
                      getColor(conv.id)
                    )}>
                      {initials(conv.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={cn('text-sm font-semibold truncate', isActive ? 'text-indigo-700' : 'text-slate-900')}>
                          {conv.name}
                        </p>
                        {unread > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold flex-shrink-0">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>
                      {conv.last_message && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{conv.last_message}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(conv.updated_at)}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 bg-white flex flex-col overflow-hidden">
          {!selectedConv ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Hash size={28} className="text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">Select a conversation</p>
                <p className="text-xs text-slate-400 mt-0.5">Pick a channel from the sidebar to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-3 flex-shrink-0 bg-white">
                <div className={cn(
                  'w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shadow-sm',
                  getColor(selectedConv)
                )}>
                  {initials(activeConv?.name || '')}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{activeConv?.name}</p>
                  <p className="text-[11px] text-slate-400">Team channel</p>
                </div>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
                style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)' }}
              >
                {messages.map((msg) => {
                  const isOwn = msg.user_id === user?.id
                  return (
                    <div key={msg.id} className={cn('flex gap-3', isOwn ? 'flex-row-reverse' : 'flex-row')}>
                      {!isOwn && (
                        <div className={cn(
                          'w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm mt-1',
                          getColor(msg.user_id)
                        )}>
                          {initials(msg.sender_name)}
                        </div>
                      )}
                      <div className={cn('max-w-sm flex flex-col', isOwn ? 'items-end' : 'items-start')}>
                        {!isOwn && (
                          <p className="text-xs font-semibold text-slate-600 mb-1 px-1">{msg.sender_name}</p>
                        )}
                        <div
                          className={cn('px-4 py-2.5 text-sm leading-relaxed rounded-2xl', isOwn ? 'rounded-br-md' : 'rounded-bl-md')}
                          style={isOwn ? {
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            color: 'white',
                            boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
                          } : {
                            background: 'white',
                            color: '#1e293b',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          }}
                        >
                          {msg.message}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 px-1">{timeAgo(msg.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="px-4 py-3 border-t border-slate-200 bg-white flex-shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    className="flex-1 resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-300 min-h-[40px] max-h-32"
                    rows={1}
                    placeholder={`Message ${activeConv?.name || ''}…`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    onClick={() => newMessage.trim() && sendMutation.mutate()}
                    disabled={!newMessage.trim() || sendMutation.isPending}
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 transition-all"
                    style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                  >
                    <Send size={15} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 px-1">Press Enter to send · Shift+Enter for new line</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
