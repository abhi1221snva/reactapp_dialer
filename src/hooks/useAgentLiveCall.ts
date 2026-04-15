/**
 * useAgentLiveCall
 *
 * Subscribes to the Pusher channel "dialer-agent.{extension}" and reacts to
 * call lifecycle events pushed by the CampaignDialerService backend:
 *
 *   call.bridged  → customer answered; lead_id now live; fetch lead and set in store
 *   call.ended    → call finished; clear activeLead; reset dialer state
 *
 * This hook enables REAL-TIME lead data display in the dialer UI without polling:
 *  1. Backend AMI listener fires `call.bridged` Pusher event with { lead_id }
 *  2. This hook receives it and calls /dialer/lead?lead_id=X
 *  3. Sets activeLead in dialer.store → LeadInfoPanel re-renders with customer info
 *
 * Usage: call once inside Dialer.tsx (or a parent provider).
 *   useAgentLiveCall({ extension: user.extension })
 */
import { useEffect, useRef } from 'react'
import Pusher from 'pusher-js'
import { useDialerStore } from '../stores/dialer.store'
import { useAuthStore } from '../stores/auth.store'
import { campaignDialerService } from '../services/campaignDialer.service'
import type { Lead } from '../types'

interface Options {
  /** Agent SIP extension number (e.g. "1001"). From user profile. */
  extension?: string | number | null
  /** Optional: called when call.bridged event is received */
  onBridged?: (leadId: number, campaignId: number) => void
  /** Optional: called when call.ended event is received */
  onEnded?: (leadId: number) => void
}

export function useAgentLiveCall({ extension, onBridged, onEnded }: Options = {}) {
  const pusherRef  = useRef<Pusher | null>(null)
  const { setActiveLead, setCallState, startCallTimer } = useDialerStore()
  const user = useAuthStore((s) => s.user)

  // Resolve extension from prop or auth store user
  const ext = extension ?? (user as Record<string, unknown> | null)?.extension

  useEffect(() => {
    if (!ext || !import.meta.env.VITE_PUSHER_APP_KEY) return

    const pusher = new Pusher(import.meta.env.VITE_PUSHER_APP_KEY, {
      cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
    })

    // Public channel: matches CampaignDialerService::pushToAgent() channel name
    const channel = pusher.subscribe(`dialer-agent.${ext}`)

    // ── call.bridged: customer answered, bridge is active ──────────────────────
    channel.bind('call.bridged', async (data: { lead_id: number; campaign_id: number }) => {
      if (!data?.lead_id) return

      try {
        const response = await campaignDialerService.getLeadById(data.lead_id)
        const lead = response.data

        if (lead) {
          // Map to the existing Lead type used by LeadInfoPanel / DialerInterface
          setActiveLead({
            id:           lead.id,
            lead_id:      lead.id,
            list_id:      lead.list_id ?? 0,
            first_name:   String(lead.first_name ?? ''),
            last_name:    String(lead.last_name ?? ''),
            phone_number: String(lead.phone_number ?? ''),
            number:       String(lead.phone_number ?? ''),
            email:        String(lead.email ?? ''),
            status:       String(lead.lead_status ?? ''),
            ...(lead as Record<string, unknown>),
          } as unknown as Lead)
        }

        // Transition dialer to in-call state and start the timer
        setCallState('in-call')
        startCallTimer()

        onBridged?.(data.lead_id, data.campaign_id)
      } catch (err) {
        console.error('[useAgentLiveCall] Failed to fetch lead:', err)
      }
    })

    // ── call.ended: hangup from either side ────────────────────────────────────
    channel.bind('call.ended', (data: { lead_id: number }) => {
      onEnded?.(data.lead_id)
      // Note: Dialer.tsx handles the state transition when phoneInCall → false.
      // We only clear the lead here if the dialer hasn't already transitioned.
      const { callState } = useDialerStore.getState()
      if (callState === 'in-call') {
        setCallState('wrapping')
      }
    })

    pusherRef.current = pusher

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`dialer-agent.${ext}`)
      pusher.disconnect()
      pusherRef.current = null
    }
  }, [String(ext)])
}
