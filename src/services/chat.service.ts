import api from '../api/axios'
import type { ChatMessage, Conversation, SearchUser } from '../types/chat.types'

export const chatService = {
  /** Get all conversations for the current user */
  getConversations: () =>
    api.get<{ success: boolean; data: Conversation[] }>('/team-chat/conversations'),

  /** Get messages for a conversation, optional before=message_id for pagination */
  getMessages: (uuid: string, before?: number, limit = 50) =>
    api.get<{ success: boolean; data: ChatMessage[] }>(
      `/team-chat/conversations/${uuid}/messages`,
      { params: { limit, ...(before ? { before } : {}) } }
    ),

  /** Send a text message */
  sendMessage: (uuid: string, body: string) =>
    api.post<{ success: boolean; data: ChatMessage }>(
      `/team-chat/conversations/${uuid}/messages`,
      { body, message_type: 'text' }
    ),

  /** Upload a file attachment (creates message + attachment in one step) */
  uploadAttachment: (uuid: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post<{ success: boolean; data: ChatMessage }>(
      `/team-chat/conversations/${uuid}/attachments`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },

  /** Mark all messages in a conversation as read */
  markAsRead: (uuid: string) =>
    api.post(`/team-chat/conversations/${uuid}/read`),

  /** Fire a typing indicator event */
  sendTyping: (uuid: string) =>
    api.post(`/team-chat/conversations/${uuid}/typing`),

  /** Get or create a direct conversation with a user */
  getOrCreateDirect: (userId: number) =>
    api.post<{ success: boolean; data: { uuid: string; type: string; is_new: boolean } }>(
      '/team-chat/conversations/direct',
      { user_id: userId }
    ),

  /** Create a new group conversation */
  createGroup: (name: string, participantIds: number[]) =>
    api.post<{ success: boolean; data: { uuid: string; type: string; name: string } }>(
      '/team-chat/conversations',
      { name, participant_ids: participantIds }
    ),

  /** Add participants to an existing group conversation */
  addParticipants: (uuid: string, participantIds: number[]) =>
    api.post(`/team-chat/conversations/${uuid}/participants`, { participant_ids: participantIds }),

  /** Search users in the organisation */
  searchUsers: (q: string) =>
    api.get<{ success: boolean; data: SearchUser[] }>(
      '/team-chat/users/search',
      { params: { q } }
    ),

  /** Update current user's presence status */
  updatePresence: (status: 'online' | 'away' | 'busy' | 'offline') =>
    api.post('/team-chat/presence', { status }),

  /** Get a download URL for an attachment (authenticated stream) */
  getAttachmentDownloadUrl: (attachmentId: number) =>
    `${import.meta.env.VITE_API_URL}/team-chat/attachments/${attachmentId}/download`,

  // ─── Call methods ────────────────────────────────────────────────────────

  /** Initiate an audio or video call in a conversation */
  initiateCall: (uuid: string, callType: 'audio' | 'video') =>
    api.post(`/team-chat/conversations/${uuid}/call`, { call_type: callType }),

  /** Send WebRTC signaling data (offer / answer / ice-candidate) */
  callSignal: (uuid: string, payload: {
    call_id: string
    signal_type: 'offer' | 'answer' | 'ice-candidate'
    signal_data: RTCSessionDescriptionInit | RTCIceCandidateInit
    target_user_id: number
  }) => api.post(`/team-chat/conversations/${uuid}/call/signal`, payload),

  /** Accept an incoming call */
  acceptCall: (uuid: string, callId: string, callerId: number) =>
    api.post(`/team-chat/conversations/${uuid}/call/accept`, { call_id: callId, caller_id: callerId }),

  /** Decline or end a call */
  endCall: (uuid: string, callId: string, reason = 'ended') =>
    api.post(`/team-chat/conversations/${uuid}/call/end`, { call_id: callId, reason }),

  /** Get STUN/TURN ICE server config */
  getIceServers: () =>
    api.get<{ success: boolean; data: { iceServers: RTCIceServer[] } }>('/team-chat/ice-servers'),
}
