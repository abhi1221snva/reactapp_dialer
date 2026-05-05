import { useEffect, useRef } from 'react'
import Pusher from 'pusher-js'
import { useAuthStore } from '../stores/auth.store'
import { useDialerStore } from '../stores/dialer.store'
import { useNotificationStore } from '../stores/notification.store'

export function usePusher() {
  const pusherRef = useRef<Pusher | null>(null)
  const { user } = useAuthStore()
  const { setIncomingCall } = useDialerStore()
  const { incrementSms } = useNotificationStore()

  useEffect(() => {
    if (!user || !import.meta.env.VITE_PUSHER_APP_KEY) return

    const pusher = new Pusher(import.meta.env.VITE_PUSHER_APP_KEY, {
      cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
    })

    // Generic channel (calls, legacy events)
    const channelName = import.meta.env.VITE_PUSHER_CHANNEL || 'my-channel'
    const eventName = import.meta.env.VITE_PUSHER_EVENT || 'my-event'
    const channel = pusher.subscribe(channelName)

    channel.bind(eventName, (data: { message: Record<string, unknown> }) => {
      const msg = data?.message
      if (!msg) return

      const userIds = msg.user_ids as number[]
      if (!userIds?.includes(user.id)) return

      const platform = msg.platform as string
      const event = msg.event as string

      if (platform === 'call') {
        if (event === 'ringing') {
          setIncomingCall({
            number: msg.number as string,
            location_id: msg.location_id as number,
            parent_id: msg.parent_id as number,
            user_ids: userIds,
          })
        } else if (event === 'received' || event === 'completed') {
          setIncomingCall(null)
        }
      } else if (platform === 'sms') {
        incrementSms()
      }
    })

    // SMS-specific channel: sms-{parent_id}
    // Backend broadcasts here on every inbound SMS for this client
    const parentId = user.parent_id ?? user.id
    const smsChannelName = `sms-${parentId}`
    const smsChannel = pusher.subscribe(smsChannelName)

    smsChannel.bind('new-message', () => {
      incrementSms()
    })

    pusherRef.current = pusher

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
      smsChannel.unbind_all()
      pusher.unsubscribe(smsChannelName)
      pusher.disconnect()
    }
  }, [user?.id])
}
