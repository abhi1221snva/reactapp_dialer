export type MessageType = 'text' | 'image' | 'file' | 'system'
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'
export type ConversationType = 'direct' | 'group'

export interface ConversationParticipant {
  user_id: number
  name: string
  email: string
  role: 'admin' | 'member'
}

export interface LastMessage {
  body: string
  sender_id: number
  created_at: string
  message_type: MessageType
}

export interface Conversation {
  uuid: string
  type: ConversationType
  name: string
  avatar: string | null
  is_system?: boolean
  system_slug?: string | null
  participants: ConversationParticipant[]
  last_message: LastMessage | null
  unread_count: number
  created_at: string
}

export interface MessageAttachment {
  id: number
  original_name: string
  file_type: string
  file_size: string
  is_image: boolean
}

export interface ChatMessage {
  id: number
  uuid: string
  sender: {
    id: number
    name: string
  }
  message_type: MessageType
  body: string
  attachments: MessageAttachment[]
  is_edited: boolean
  is_mine: boolean
  is_read: boolean
  is_delivered: boolean
  read_at: string | null
  read_by: number[]
  created_at: string
}

export interface SearchUser {
  id: number
  name: string
  email: string
  extension: string
  status: PresenceStatus
}

export interface TypingInfo {
  user_id: number
  name: string
  clearAt: number
}

export interface PusherNewMessageEvent {
  conversation_uuid: string
  sender_name: string
  preview: string
}

export interface PusherMessageReadEvent {
  conversation_uuid: string
  reader_id: number
  user_id: number
  last_read_message_id: number
  read_at: string
}

export interface PusherTypingEvent {
  user_id: number
  name: string
}

export interface PusherPresenceEvent {
  user_id: number
  name: string
  status: PresenceStatus
  last_seen_at: string
}

// ─── Call events ──────────────────────────────────────────────────────────────

export interface CallData {
  call_id: string
  conversation_uuid: string
  conversation_type: 'direct' | 'group'
  conversation_name: string
  call_type: 'audio' | 'video'
  is_group_call: boolean
  caller: { id: number; name: string }
  participants: Array<{ id: number; name: string }>
  active_participants: Array<{ id: number; name: string }>
  started_at: string
}

export interface CallSignalData {
  call_id: string
  conversation_uuid: string
  signal_type: 'offer' | 'answer' | 'ice-candidate'
  signal_data: RTCSessionDescriptionInit | RTCIceCandidateInit
  from_user: { id: number; name: string }
}

export interface CallAcceptedData {
  call_id: string
  conversation_uuid: string
  accepted_by: { id: number; name: string }
}

export interface CallEndedData {
  call_id: string
  conversation_uuid: string
  ended_by: { id: number; name: string }
  reason: 'declined' | 'ended' | 'busy' | 'no_answer'
}
