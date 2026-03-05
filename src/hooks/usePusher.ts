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

    const channel = pusher.subscribe('my-channel')

    channel.bind('my-event', (data: { message: Record<string, unknown> }) => {
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

    pusherRef.current = pusher

    return () => {
      channel.unbind_all()
      pusher.unsubscribe('my-channel')
      pusher.disconnect()
    }
  }, [user?.id])
}
