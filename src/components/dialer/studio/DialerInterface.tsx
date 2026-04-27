import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ChevronDown, ArrowLeft, Radio, Zap, Users,
  Search, Check, AlertTriangle, Phone, PhoneOff, X,
  PhoneForwarded, Voicemail, Grid3x3, Mic, MicOff, Pause, Play, LogOut, Tag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../utils/cn'

import { StudioSidebar } from './StudioSidebar'
import { LeadDetailsForm } from './LeadDetailsForm'

import { TransferCallModal } from './TransferCallModal'
import { DispositionModal } from './DispositionModal'
import { DialPadModal } from './DialPadModal'
import { SendSmsTab } from './tabs/SendSmsTab'
import { SendEmailTab } from './tabs/SendEmailTab'
import { AgentScriptTab } from './tabs/AgentScriptTab'
import { NotesTab } from './tabs/NotesTab'
import { EventsTab } from './tabs/EventsTab'

import { dialerService } from '../../../services/dialer.service'
import { campaignDialerService } from '../../../services/campaignDialer.service'
import { useDialerStore } from '../../../stores/dialer.store'
import { useFloatingStore } from '../../../stores/floating.store'
import { useAuthStore } from '../../../stores/auth.store'
import { useAgentLiveCall } from '../../../hooks/useAgentLiveCall'
import type { Lead, Disposition } from '../../../types'
import type {
  StudioCampaign, StudioLead, StudioDisposition, StudioAgent, LeadField, SidebarTab,
} from './types'

// Studio's local CallState — derived from global store, NOT stored locally
type StudioCallState = 'idle' | 'dialing' | 'ringing' | 'in-call' | 'wrap-up' | 'failed'

// ─── Disposition color palette ─────────────────────────────────────────────────
// Maps d_type keywords to the DispositionModal's COLOR_CLASSES keys
const GROUP_COLOR: Record<StudioDisposition['group'], string> = {
  positive: 'emerald',
  neutral:  'slate',
  negative: 'rose',
}

function mapDisposition(d: Disposition): StudioDisposition {
  const type  = (d.d_type ?? '').toLowerCase()
  // API returns `title`, frontend type has `disposition` — handle both
  const rawLabel = d.disposition || d.title || ''
  const labelLc = rawLabel.toLowerCase()
  const group: StudioDisposition['group'] =
    type.includes('sale') || type.includes('pos') || type.includes('appoint') || labelLc.includes('appoint')
      ? 'positive'
      : type.includes('neg') || type.includes('dnc') || type.includes('remove') || type.includes('bad')
      ? 'negative'
      : 'neutral'
  return {
    id:    String(d.id),
    label: rawLabel,
    color: d.color ?? GROUP_COLOR[group],
    group,
  }
}

// ─── Lead mapping ──────────────────────────────────────────────────────────────
function mapLeadToStudio(lead: Lead): StudioLead {
  const labels = lead.fieldLabels ?? {}
  const columns = lead.fieldColumns ?? {}
  const customFields: LeadField[] = Object.entries(lead.fields ?? {}).map(([key, value]) => ({
    key,
    label: labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value,
    column: columns[key],
    type: key.includes('email')
      ? 'email'
      : key.includes('phone') || key.includes('mobile')
      ? 'phone'
      : 'text',
  }))
  return {
    id:           lead.lead_id ?? lead.id,
    firstName:    lead.first_name  ?? '',
    lastName:     lead.last_name   ?? '',
    email:        lead.email       ?? '',
    phone:        lead.phone_number ?? '',
    state:        lead.state       ?? '',
    country:      '',
    company:      '',
    customFields,
  }
}

// ─── Lead API response parser ──────────────────────────────────────────────────
function parseApiLead(raw: Record<string, unknown>): Lead {
  // campaignDialNext returns fields in `fields`, legacy getLead returns in `data`
  const fieldArr = Array.isArray(raw.data)
    ? raw.data as Array<{ label: string; value: unknown; column_name?: string; is_dialing?: number }>
    : Array.isArray(raw.fields)
    ? raw.fields as Array<{ label: string; value: unknown; column_name?: string; is_dialing?: number }>
    : []
  const fields: Record<string, string> = {}
  const fieldLabels: Record<string, string> = {}
  const fieldColumns: Record<string, string> = {}
  let firstName = '', lastName = '', email = '', address = '', city = '', state = ''
  for (const f of fieldArr) {
    const lbl = (f.label || '').toLowerCase().trim()
    const val = String(f.value ?? '')
    if (lbl) {
      fields[lbl] = val
      fieldLabels[lbl] = (f.label || '').trim() // preserve original casing
      if (f.column_name) fieldColumns[lbl] = f.column_name
    }
    // Fuzzy matching — handles labels like "First Name1", "Email2111", "Last Name", etc.
    if (!firstName && lbl.includes('first'))                                firstName = val
    else if (!lastName  && lbl.includes('last'))                            lastName  = val
    else if (!email     && (lbl.includes('email') || lbl.includes('e-mail'))) email   = val
    else if (!address   && lbl.includes('address'))                         address   = val
    else if (!city      && lbl.includes('city'))                            city      = val
    else if (!state     && lbl.includes('state'))                           state     = val
  }
  return {
    id:           Number(raw.lead_id),
    lead_id:      Number(raw.lead_id),
    list_id:      Number(raw.list_id ?? 0),
    phone_number: String(raw.phone_number ?? raw.number ?? ''),
    first_name:   firstName,
    last_name:    lastName,
    email, address, city, state, fields, fieldLabels, fieldColumns,
  }
}

interface Props {
  campaign: StudioCampaign
  allCampaigns: StudioCampaign[]
  /** True when WebPhone is configured AND SIP stack is registered with Asterisk */
  webphoneOk: boolean
  /**
   * When true, the dialer is in "click-to-call / auto-dial" mode:
   * Asterisk rings the agent first; the system handles dialing.
   * The agent should NOT click "Start Call" — they wait for an incoming ring.
   */
  isAutoDialMode?: boolean
  onBack: () => void
  onSwitchCampaign: (c: StudioCampaign) => void
}

/**
 * DialerInterface — active workspace after campaign is selected.
 * Wired to real APIs: getLead → callNumber → hangUp → saveDisposition.
 * Integrates with the shared WebPhone (SIPml5) via FloatingStore signals.
 */
export function DialerInterface({ campaign, allCampaigns, webphoneOk, isAutoDialMode = false, onBack, onSwitchCampaign }: Props) {
  // ─── Auth (for extension lookup) ─────────────────────────────────────────
  const authUser = useAuthStore(s => s.user)
  const authUserRec = authUser as Record<string, unknown> | null
  const agentExtension = (authUserRec?.alt_extension ?? authUserRec?.extension) as string | number | null | undefined

  // ─── Auto-dial: subscribe to Pusher dialer-agent.{ext} channel ───────────
  // Works in both manual and auto-dial modes — Pusher events only fire when
  // Asterisk has an active click-to-call session for this agent's extension.
  useAgentLiveCall({ extension: agentExtension })

  // ─── Global store ─────────────────────────────────────────────────────────
  const storeState      = useDialerStore(s => s.callState)
  const storeActiveLead = useDialerStore(s => s.activeLead)
  const storeDispos     = useDialerStore(s => s.dispositions)
  const callDuration    = useDialerStore(s => s.callDuration)
  const failReason      = useDialerStore(s => s.failReason)
  const {
    setCallState, setActiveLead, setMuted, setOnHold,
    setFailReason,
    isMuted, isOnHold, resetDialer,
    addCallLog, updateLastCallLog,
    pushLeadToHistory, goToPreviousLead, leadHistory,
    startCallTimer,
  } = useDialerStore()

  const phoneInCall           = useFloatingStore(s => s.phoneInCall)
  const phoneRegistered       = useFloatingStore(s => s.phoneRegistered)
  const phoneHasIncoming      = useFloatingStore(s => s.phoneHasIncoming)
  const campaignDialActive    = useFloatingStore(s => s.campaignDialActive)
  const setCampaignDialActive = useFloatingStore(s => s.setCampaignDialActive)
  const setPhoneOpen          = useFloatingStore(s => s.setPhoneOpen)
  const setPhoneMinimized     = useFloatingStore(s => s.setPhoneMinimized)
  const sipMuteHandler        = useFloatingStore(s => s.sipMuteHandler)
  const sipHoldHandler        = useFloatingStore(s => s.sipHoldHandler)
  const sipHangupHandler      = useFloatingStore(s => s.sipHangupHandler)

  // ─── Local UI state ──────────────────────────────────────────────────────
  const [isDialingLocal, setIsDialingLocal] = useState(false)
  const [sidebarTab, setSidebarTab]         = useState<SidebarTab | null>(null)

  const [showTransfer, setShowTransfer]     = useState(false)
  const [showDisposition, setShowDisposition] = useState(false)
  const [showDialPad, setShowDialPad]       = useState(false)
  const [campaignDropdown, setCampaignDropdown] = useState(false)
  const [campSearch, setCampSearch]           = useState('')
  const [leadCounter, setLeadCounter]       = useState(1)

  // ─── Lead state (local — mapped from store for UI components) ────────────
  const [lead, setLead] = useState<StudioLead | null>(null)

  useEffect(() => {
    if (!storeActiveLead) { setLead(null); return }
    setLead(mapLeadToStudio(storeActiveLead))
  }, [storeActiveLead])

  // ─── Derived studio call state ────────────────────────────────────────────
  const callState: StudioCallState =
    storeState === 'failed'   ? 'failed'  :
    storeState === 'ringing'  ? 'ringing' :
    storeState === 'in-call'  ? 'in-call' :
    storeState === 'wrapping' ? 'wrap-up' :
    isDialingLocal            ? 'dialing' : 'idle'

  // ─── Dispositions (mapped from store) ────────────────────────────────────
  const dispositions: StudioDisposition[] = storeDispos.map(mapDisposition)

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const ringbackRef  = useRef<HTMLAudioElement | null>(null)
  const handleDialRef = useRef<() => void>(() => {})
  /** True once the agent has entered a persistent ConfBridge session */
  const isInConference = useRef(false)

  // ─── Call duration timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (storeState === 'in-call') {
      startCallTimer()
      timerRef.current = setInterval(() => {
        useDialerStore.setState((s) => ({ callDuration: s.callDuration + 1 }))
      }, 1000)
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [storeState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Ringback tone ────────────────────────────────────────────────────────
  useEffect(() => {
    if (storeState === 'ringing' && !phoneHasIncoming) {
      if (!ringbackRef.current) {
        ringbackRef.current = new Audio('/asset/audio/ringbacktone.wav')
        ringbackRef.current.loop = true
      }
      ringbackRef.current.currentTime = 0
      ringbackRef.current.play().catch(() => {})
    } else {
      ringbackRef.current?.pause()
      if (ringbackRef.current) ringbackRef.current.currentTime = 0
    }
  }, [storeState, phoneHasIncoming])

  // ─── WebPhone in-call signal → advance to in-call ────────────────────────
  // Only for the FIRST call (agent answers webphone → enters ConfBridge).
  // In persistent conference mode (isInConference=true), phoneInCall is
  // already true, so we rely on Pusher call.bridged to transition instead.
  useEffect(() => {
    if (phoneInCall && storeState === 'ringing' && !isInConference.current) {
      setCallState('in-call')
      startCallTimer()
      isInConference.current = true
    }
  }, [phoneInCall, storeState, setCallState, startCallTimer])

  // ─── SIP call ended remotely → transition to wrap-up ─────────────────────
  // Only transition if a lead is assigned (prevents false trigger on network blip)
  // Also clear isInConference since the agent's SIP leg dropped
  useEffect(() => {
    if (!phoneInCall && storeState === 'in-call' && storeActiveLead) {
      isInConference.current = false
      setCallState('wrapping')
    }
  }, [phoneInCall, storeState, storeActiveLead, setCallState])

  // ─── SIP call failed during ringing (Asterisk rejected) → reset to ready ──
  // Guard with !isDialingLocal AND !campaignDialActive to avoid false trigger
  // during the brief window between API returning and WebPhone receiving the call.
  useEffect(() => {
    if (phoneRegistered && !phoneInCall && storeState === 'ringing' && !isDialingLocal && !campaignDialActive) {
      setCallState('ready')
      setCampaignDialActive(false)
    }
  }, [phoneRegistered, phoneInCall, storeState, isDialingLocal, campaignDialActive, setCallState, setCampaignDialActive])

  // ─── Open disposition modal when call ends & close sidebar tabs ──────────
  // Re-fetch dispositions for the active campaign to guarantee they're populated
  useEffect(() => {
    if (storeState === 'wrapping') {
      dialerService
        .getDispositionsByCampaign(campaign.id)
        .then((r) => {
          const fresh = r.data?.data || []
          if (fresh.length) useDialerStore.getState().setDispositions(fresh)
        })
        .catch(() => {})
      setShowDisposition(true)
      setSidebarTab(null)
    }
  }, [storeState, campaign.id])

  // ─── Auto-reset after call failure (5s) ─────────────────────────────────
  useEffect(() => {
    if (storeState !== 'failed') return
    // Stop any ringback that may still be playing
    ringbackRef.current?.pause()
    if (ringbackRef.current) ringbackRef.current.currentTime = 0
    // Only clear campaignDialActive if NOT in persistent conference
    if (!isInConference.current) {
      setCampaignDialActive(false)
    }
    // Mark the call log as failed
    updateLastCallLog({ status: 'failed' })
    const timer = setTimeout(() => {
      setCallState('ready')
      setFailReason(null)
    }, 5000)
    return () => clearTimeout(timer)
  }, [storeState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Heartbeat (keep agent alive in pacing counters) ─────────────────────
  useEffect(() => {
    // Report available on mount
    dialerService.updateAgentState(campaign.id, 'available').catch(() => {})
    heartbeatRef.current = setInterval(() => {
      dialerService.heartbeat(campaign.id).catch(() => {})
    }, 30_000)
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current) }
  }, [campaign.id])

  // ─── Agent pacing status (track state transitions) ─────────────────────
  useEffect(() => {
    if (storeState === 'wrapping') {
      dialerService.updateAgentState(campaign.id, 'wrapping').catch(() => {})
    } else if (storeState === 'ready' || storeState === 'idle') {
      dialerService.updateAgentState(campaign.id, 'available').catch(() => {})
    }
  }, [storeState, campaign.id])

  // ─── Fetch campaign agents (for transfer modal) ─────────────────────────
  const { data: agentsData } = useQuery({
    queryKey: ['campaign-agents', campaign.id],
    queryFn: () => campaignDialerService.listAgents(campaign.id),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })

  const studioAgents: StudioAgent[] = (agentsData?.data?.agents ?? []).map((a) => {
    const initials = (a.name ?? '')
      .split(' ')
      .map((w: string) => w[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2)
    const statusMap: Record<string, StudioAgent['status']> = {
      available: 'available',
      on_call: 'busy',
      on_break: 'away',
      after_call_work: 'busy',
      offline: 'offline',
    }
    return {
      id: a.user_id,
      name: a.name,
      extension: String(a.extension ?? ''),
      department: '',
      status: statusMap[a.status] ?? 'offline',
      avatar: initials || '??',
    }
  })

  // ─── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (ringbackRef.current) { ringbackRef.current.pause(); ringbackRef.current = null }
      isInConference.current = false
    }
  }, [])

  // ─── Mutations ────────────────────────────────────────────────────────────

  // Helper: terminate the SIP call on the WebPhone side
  const terminateSipCall = useCallback(() => {
    sipHangupHandler?.()
    setCampaignDialActive(false)
  }, [sipHangupHandler, setCampaignDialActive])

  // Full hang-up (end-session): tears down the entire call + writes CDR
  const hangUpMutation = useMutation({
    mutationFn: () => dialerService.hangUp({ id: campaign.id }),
    onSuccess: () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      isInConference.current = false
      terminateSipCall()
      updateLastCallLog({ status: 'connected', duration: callDuration })
      setCallState('wrapping')
    },
    onError: () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      isInConference.current = false
      terminateSipCall()
      updateLastCallLog({ status: 'connected', duration: callDuration })
      setCallState('wrapping')
    },
  })

  // Hang up call — terminates SIP session and tells backend to clean up
  const hangupCustomerMutation = useMutation({
    mutationFn: () => campaignDialerService.hangupCustomer(campaign.id),
    onSuccess: () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      // Do NOT call terminateSipCall() — agent stays in conference for next dial
      updateLastCallLog({ status: 'connected', duration: callDuration })
      useDialerStore.setState({ callDuration: 0 })
      setCallState('wrapping')
    },
    onError: () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      // Keep agent in conference even on error — use End Session to fully leave
      updateLastCallLog({ status: 'connected', duration: callDuration })
      setCallState('wrapping')
    },
  })

  const saveDispositionMutation = useMutation({
    mutationFn: ({ dispoId, pauseCalling, notes }: { dispoId: number; pauseCalling: boolean; notes: string }) => {
      const leadId = storeActiveLead?.lead_id ?? storeActiveLead?.id ?? 0
      // Always use campaign dialer endpoint for disposition — the legacy
      // dialerService.saveDisposition sets extension_live.status=0 which
      // destroys the persistent conference state.
      if (isAutoDialMode || isInConference.current) {
        return campaignDialerService.saveDisposition(leadId, dispoId, notes || undefined, campaign.id)
      }
      return dialerService.saveDisposition({
        lead_id:        leadId,
        campaign_id:    campaign.id,
        disposition_id: dispoId,
        api_call:       0,
        pause_calling:  pauseCalling ? 1 : 0,
        comment:        notes || undefined,
      })
    },
    onSuccess: (_, variables) => {
      toast.success('Disposition saved')
      setShowDisposition(false)
      setLeadCounter((n) => n + 1)

      // If pause calling was requested, reset to ready state without auto-dial
      if (variables.pauseCalling) {
        resetDialer()
        setCampaignDialActive(false)
        toast('Paused — click Start Call when ready', { icon: 'ℹ️' })
        return
      }

      // Auto-dial next lead
      resetDialer()
      setTimeout(() => {
        handleDialRef.current()
      }, 500)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save disposition'
      toast.error(msg)
    },
  })

  const voicemailMutation = useMutation({
    mutationFn: () => dialerService.voicemailDrop(campaign.id),
    onSuccess:  () => toast.success('Voicemail dropped'),
    onError:    () => toast.error('Voicemail drop failed'),
  })

  // ─── Dial handler (Agent-First: AMI rings webphone, then auto-dials lead) ─
  // Supports TWO modes:
  //  A) First call: full originate → rings agent's webphone → ConfBridge → dial customer
  //  B) Persistent conference: agent already in conf → dial next customer into same room
  const handleDial = useCallback(async () => {
    // Only dial when store is 'ready' (logged in, not active)
    if (storeState !== 'ready' && storeState !== 'idle') return
    if (isDialingLocal) return
    // Guard: WebPhone must be registered before dialing
    if (!webphoneOk) {
      toast.error('WebPhone not connected. Click the phone icon to connect before dialing.', { duration: 6000 })
      setPhoneOpen(true)
      return
    }
    setIsDialingLocal(true)
    try {
      pushLeadToHistory()

      // ── Persistent conference: agent already in ConfBridge ──────────────
      if (phoneInCall && isInConference.current) {
        const res = await campaignDialerService.nextCustomer(campaign.id)
        const raw = res.data as Record<string, unknown>

        if (raw?.status === 'no_more_leads') {
          toast('No more leads in this campaign', { icon: 'ℹ️' })
          return
        }

        if (raw?.success) {
          const storeLead = parseApiLead(raw)
          setActiveLead(storeLead)
          setCallState('ringing')
          useDialerStore.setState({ callDuration: 0 })

          addCallLog({
            id:            `${Date.now()}`,
            lead_name:     [storeLead.first_name, storeLead.last_name].filter(Boolean).join(' ') || 'Unknown',
            phone_number:  storeLead.phone_number,
            status:        'no_answer',
            duration:      0,
            campaign_name: campaign.name,
            started_at:    new Date().toISOString(),
            lead_id:       storeLead.lead_id ?? storeLead.id,
            campaign_id:   campaign.id,
          })

          toast.success('Dialing next lead...', { duration: 3000 })
        } else {
          toast.error(String(raw?.message || 'Failed to dial next lead'))
        }
        return
      }

      // ── First call: full originate → rings agent's webphone ────────────
      const res = await dialerService.campaignDialNext(campaign.id)
      const raw = res.data as Record<string, unknown>

      if (!raw?.success) {
        toast(String(raw?.message || 'No leads available in this campaign'), { icon: 'ℹ️' })
        return
      }

      // Build lead object from response
      const storeLead = parseApiLead(raw)
      setActiveLead(storeLead)

      setCampaignDialActive(true)
      setPhoneMinimized(true)
      setCallState('ringing')

      addCallLog({
        id:            `${Date.now()}`,
        lead_name:     [storeLead.first_name, storeLead.last_name].filter(Boolean).join(' ') || 'Unknown',
        phone_number:  storeLead.phone_number,
        status:        'no_answer',
        duration:      0,
        campaign_name: campaign.name,
        started_at:    new Date().toISOString(),
        lead_id:       storeLead.lead_id ?? storeLead.id,
        campaign_id:   campaign.id,
      })

      setPhoneOpen(true)

      // Agent-first mode: AMI is ringing the webphone — no sipDial needed.
      // The incoming SIP call will appear on the webphone automatically.
      // When agent answers -> ConfBridge -> AMI listener dials the lead.
      toast.success('Incoming call — answer your webphone to connect to lead', { duration: 5000 })

    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to start call'
      toast.error(msg)
      updateLastCallLog({ status: 'failed' })
    } finally {
      setIsDialingLocal(false)
    }
  }, [
    storeState, isDialingLocal, webphoneOk, phoneInCall, campaign.id, campaign.name,
    pushLeadToHistory, setActiveLead, setCallState, setCampaignDialActive,
    setPhoneOpen, setPhoneMinimized, addCallLog, updateLastCallLog,
  ])

  // Keep ref in sync so saveDispositionMutation can call handleDial without circular deps
  handleDialRef.current = handleDial

  const canLeaveOrSwitch = storeState !== 'in-call' && storeState !== 'ringing' && storeState !== 'failed'
  const leftRemaining    = campaign.totalLeads - campaign.calledLeads

  // ─── Skip to next lead (no call) ─────────────────────────────────────────
  const skipLead = useCallback(async () => {
    if (!canLeaveOrSwitch) return
    pushLeadToHistory()
    try {
      const res = await dialerService.getLead()
      const raw = res.data as Record<string, unknown>
      if (!raw?.success || !raw.lead_id) {
        toast('No more leads in queue', { icon: 'ℹ️' })
        return
      }
      setActiveLead(parseApiLead(raw))
      setLeadCounter((n) => n + 1)
      toast.success('Next lead loaded')
    } catch {
      toast.error('Failed to load next lead')
    }
  }, [pushLeadToHistory, setActiveLead]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Prev lead (from history) ─────────────────────────────────────────────
  const prevLead = useCallback(() => {
    if (!canLeaveOrSwitch || leadHistory.length === 0) return
    goToPreviousLead()
    setLeadCounter((n) => Math.max(1, n - 1))
  }, [canLeaveOrSwitch, leadHistory, goToPreviousLead])

  // ─── Mute/Hold handlers (bridge to WebPhone SIP session) ─────────────────
  const handleToggleMute = useCallback(() => {
    const next = !isMuted
    setMuted(next)
    sipMuteHandler?.(next)
  }, [isMuted, setMuted, sipMuteHandler])

  const handleToggleHold = useCallback(() => {
    const next = !isOnHold
    setOnHold(next)
    sipHoldHandler?.(next)
  }, [isOnHold, setOnHold, sipHoldHandler])

  // ─── Disposition handlers ─────────────────────────────────────────────────
  const handleDispositionSave = (dispoId: string, pauseCalling: boolean, notes: string) => {
    saveDispositionMutation.mutate({ dispoId: Number(dispoId), pauseCalling, notes })
  }

  const handleRedial = useCallback(async () => {
    setShowDisposition(false)
    const currentLead = storeActiveLead
    if (!currentLead?.lead_id) {
      // No lead to redial — fall back to next lead
      setCallState('ready')
      setTimeout(handleDial, 200)
      return
    }
    if (!webphoneOk) {
      toast.error('WebPhone not connected')
      setPhoneOpen(true)
      return
    }
    setCallState('ready')
    try {
      // Redial: call campaignDialNext with specific lead_id
      const leadId = currentLead.lead_id ?? currentLead.id
      const res = await dialerService.campaignDialNext(campaign.id, leadId)
      const raw = res.data as Record<string, unknown>
      if (raw?.success) {
        const storeLead = parseApiLead(raw)
        setActiveLead(storeLead)
        if (!isInConference.current) {
          // First call — agent needs to answer webphone
          setCampaignDialActive(true)
          setPhoneMinimized(true)
          toast.success('Redialing same lead — answer your webphone', { duration: 5000 })
        } else {
          // Persistent conference — customer dialed into existing conf
          toast.success('Redialing same lead...', { duration: 3000 })
        }
        setCallState('ringing')
      } else {
        toast.error(String(raw?.message || 'Redial failed'))
      }
    } catch {
      toast.error('Redial failed — trying next lead instead')
      setTimeout(handleDial, 200)
    }
  }, [storeActiveLead, webphoneOk, campaign.id, handleDial, setCallState, setActiveLead, setCampaignDialActive, setPhoneMinimized])

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Enter' && callState === 'idle' && !showDisposition) {
        e.preventDefault(); handleDial()
      }
      if (e.key === ' ' && callState === 'in-call') {
        e.preventDefault(); hangupCustomerMutation.mutate()
      }
      if (e.key === 't' && callState === 'in-call')  setShowTransfer(true)
      if (e.key === 'd')                              setShowDialPad(true)
      if (e.key === 'm' && callState === 'in-call')  handleToggleMute()
      if (e.key === 'h' && callState === 'in-call')  handleToggleHold()
      if (['1','2','3','4','5'].includes(e.key)) {
        const map: Record<string, SidebarTab> = {
          '1':'sms','2':'email','3':'script','4':'notes','5':'events',
        }
        const target = map[e.key]
        setSidebarTab(prev => prev === target ? null : target)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [callState, showDisposition, handleDial, handleToggleMute, handleToggleHold]) // eslint-disable-line react-hooks/exhaustive-deps

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div className="animate-fadeIn">
      {/* ─── Auto-dial mode banner ───────────────────────────────── */}
      {isAutoDialMode && callState === 'idle' && (
        <div className="flex items-center gap-3 px-4 py-2.5 mb-3 rounded-xl bg-indigo-50 border border-indigo-200">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500" />
          </span>
          <p className="text-sm font-semibold text-indigo-800 flex-1">
            Auto-Dial Active — your WebPhone will ring when the system connects a lead. Answer to begin.
          </p>
        </div>
      )}

      {/* ─── Call failed banner ──────────────────────────────────── */}
      {callState === 'failed' && failReason && (
        <div className="flex items-center gap-3 px-4 py-2.5 mb-3 rounded-xl bg-red-50 border border-red-200 animate-fadeIn">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <AlertTriangle size={16} className="text-red-600 shrink-0" />
          <p className="text-sm font-semibold text-red-800 flex-1">
            {failReason}
          </p>
          <span className="text-[10px] text-red-400 font-medium shrink-0">Auto-resetting…</span>
        </div>
      )}

      {/* ─── WebPhone not connected banner ───────────────────────── */}
      {!webphoneOk && (
        <div className="flex items-center gap-3 px-4 py-2.5 mb-3 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <p className="text-xs font-semibold text-amber-800 flex-1">
            WebPhone not connected — click the phone icon in the bottom-right to connect before dialing.
          </p>
          <button
            onClick={() => setPhoneOpen(true)}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
          >
            Connect
          </button>
        </div>
      )}
      {/* ─── Modals ───────────────────────────────────────────────── */}
      <TransferCallModal
        isOpen={showTransfer}
        onClose={() => setShowTransfer(false)}
        agents={studioAgents}
        campaignId={campaign.id}
        leadPhone={lead?.phone ?? ''}
      />
      <DispositionModal
        isOpen={showDisposition}
        onClose={() => setShowDisposition(false)}
        onSave={handleDispositionSave}
        onRedial={handleRedial}
        dispositions={dispositions}
        leadName={lead ? `${lead.firstName} ${lead.lastName}`.trim() : undefined}
        callDuration={callDuration}
      />
      <DialPadModal
        isOpen={showDialPad}
        onClose={() => setShowDialPad(false)}
        onSend={(digit) => {
          dialerService.sendDtmf(campaign.id, digit).catch(() => {})
          setShowDialPad(false)
          toast.success(`DTMF sent: ${digit}`)
        }}
      />

      {/* ─── Sticky top bar ──────────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-1 pb-3 bg-slate-50/80 backdrop-blur-md">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Back to campaigns */}
          <button
            onClick={onBack}
            disabled={!canLeaveOrSwitch}
            className="inline-flex items-center gap-1.5 h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title={canLeaveOrSwitch ? 'Back to campaigns' : 'Hang up before leaving'}
          >
            <ArrowLeft size={14} />
            <span className="hidden md:inline text-xs font-semibold">Campaigns</span>
          </button>

          {/* Campaign selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setCampaignDropdown((v) => !v)}
              className="flex items-center gap-3 pl-2.5 pr-3 h-11 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shadow-sm bg-gradient-to-br shrink-0',
                campaign.color,
              )}>
                <Radio size={13} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider leading-none">Campaign</p>
                <p className="text-[13px] font-bold text-slate-900 leading-tight max-w-[220px] truncate mt-0.5">
                  {campaign.name}
                </p>
              </div>
              <ChevronDown
                size={13}
                className={cn('text-slate-400 transition-transform ml-1', campaignDropdown && 'rotate-180')}
              />
            </button>

            {campaignDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => { setCampaignDropdown(false); setCampSearch('') }} />
                <div className="absolute left-0 top-full mt-2 w-[320px] rounded-2xl border border-slate-200 bg-white shadow-xl z-20 animate-slideUp overflow-hidden">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Switch campaign…"
                        value={campSearch}
                        onChange={(e) => setCampSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                      />
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1">
                    {allCampaigns.filter((c) => {
                      if (!campSearch.trim()) return true
                      const q = campSearch.toLowerCase()
                      return c.name.toLowerCase().includes(q) || c.dialMethod.toLowerCase().includes(q)
                    }).map((c) => {
                      const isCurrent = c.id === campaign.id
                      const progress  = Math.round((c.calledLeads / (c.totalLeads || 1)) * 100)
                      return (
                        <button
                          key={c.id}
                          disabled={!canLeaveOrSwitch}
                          onClick={() => {
                            onSwitchCampaign(c)
                            setCampaignDropdown(false)
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 transition-colors text-left disabled:opacity-40',
                            isCurrent && 'bg-indigo-50/50',
                          )}
                        >
                          <div className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br',
                            c.color,
                          )}>
                            <Radio size={13} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{c.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {c.dialMethod} · {progress}% complete
                            </p>
                          </div>
                          {isCurrent && <Check size={14} className="text-indigo-600 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Stat pills */}
          <div className="hidden md:flex items-center gap-2">
            <StatPill icon={Users} label="Total"       value={campaign.totalLeads.toLocaleString()} tone="slate"   />
            <StatPill icon={Zap}   label="Remaining"   value={leftRemaining.toLocaleString()}        tone="indigo"  />
          </div>

          <div className="flex-1" />
        </div>
      </div>

      {/* ─── Action toolbar ──────────────────────────────────────── */}
      <div className="sticky top-[52px] z-20 -mx-4 px-4 py-2 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center gap-2">
          {/* Tab buttons + call controls — only visible when in-call */}
          {callState === 'in-call' && (
            <>
              <StudioSidebar
                active={sidebarTab}
                onChange={(tab) => setSidebarTab(prev => prev === tab ? null : tab)}
              />

              <div className="h-7 w-px bg-slate-200 mx-1" />

              <div className="flex items-center gap-1">
                <ToolbarBtn icon={PhoneForwarded} label="Transfer" onClick={() => setShowTransfer(true)} />
                <ToolbarBtn icon={Voicemail} label="Voice Drop" onClick={() => voicemailMutation.mutate()} />
                <ToolbarBtn icon={Grid3x3} label="Dial Pad" onClick={() => setShowDialPad(true)} />
              </div>

              <div className="h-7 w-px bg-slate-200 mx-1" />

              <div className="flex items-center gap-1">
                <ToolbarBtn
                  icon={isMuted ? MicOff : Mic}
                  label={isMuted ? 'Unmute' : 'Mute'}
                  onClick={handleToggleMute}
                  active={isMuted}
                />
                <ToolbarBtn
                  icon={isOnHold ? Play : Pause}
                  label={isOnHold ? 'Resume' : 'Hold'}
                  onClick={handleToggleHold}
                  active={isOnHold}
                />
              </div>
            </>
          )}

          <div className="flex-1" />

          {/* Call status + duration */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className={cn(
              'w-2 h-2 rounded-full',
              callState === 'in-call' ? 'bg-emerald-500 animate-pulse' :
              callState === 'ringing' || callState === 'dialing' ? 'bg-amber-500 animate-pulse' :
              callState === 'failed' ? 'bg-red-500' : 'bg-slate-300'
            )} />
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
              {callState === 'in-call' ? 'On Call' : callState === 'ringing' || callState === 'dialing' ? 'Ringing' : callState === 'wrap-up' ? 'Wrap-up' : callState === 'failed' ? 'Failed' : 'Ready'}
            </span>
            <span className="text-sm font-bold tabular-nums text-slate-800">
              {fmtTime(callDuration)}
            </span>
          </div>

          {/* Primary CTA */}
          {callState === 'wrap-up' ? (
            <button
              onClick={() => setShowDisposition(true)}
              className="group flex items-center gap-2 px-5 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-xs shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Tag size={14} />
              Save Disposition
            </button>
          ) : callState !== 'in-call' && callState !== 'ringing' && callState !== 'dialing' ? (
            <button
              onClick={handleDial}
              className="group flex items-center gap-2 px-5 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-xs shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Phone size={14} className="group-hover:rotate-12 transition-transform" />
              Start Call
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => hangupCustomerMutation.mutate()}
                disabled={hangupCustomerMutation.isPending}
                className="group flex items-center gap-2 px-4 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-bold text-xs shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60"
              >
                <PhoneOff size={13} />
                {hangupCustomerMutation.isPending ? 'Ending…' : 'Hang Up'}
              </button>
              <button
                onClick={() => hangUpMutation.mutate()}
                className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 text-xs font-semibold transition-all"
                title="End session — leave conference entirely"
              >
                <LogOut size={13} />
                End Session
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Content panels ──────────────────────────────────────── */}
      <div className="relative mt-3 min-h-[calc(100vh-240px)]">
        {/* Lead Details — always full width */}
        <div className={sidebarTab ? 'mr-[420px]' : ''}>
          {lead ? (
            <div className="space-y-3">
              <LeadDetailsForm lead={lead} onUpdate={setLead} />
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center min-h-[200px] gap-3">
              <Radio size={24} className="text-slate-300" />
              <p className="text-sm text-slate-400">
                {callState === 'idle' ? 'Click "Start Call" to fetch the first lead' : 'Loading lead\u2026'}
              </p>
            </div>
          )}
        </div>

        {/* Tab content panel — fixed-width right panel */}
        {sidebarTab && (
          <div className="absolute top-0 right-0 w-[400px] overflow-y-auto max-h-[calc(100vh-240px)] rounded-2xl border border-slate-200 bg-white shadow-sm p-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">
                {sidebarTab === 'sms' && 'Send SMS'}
                {sidebarTab === 'email' && 'Send Email'}
                {sidebarTab === 'script' && 'Agent Script'}
                {sidebarTab === 'notes' && 'Notes'}
                {sidebarTab === 'events' && 'Events'}
              </h3>
              <button onClick={() => setSidebarTab(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            {sidebarTab === 'sms'    && <SendSmsTab    lead={lead ?? { id:0, firstName:'', lastName:'', email:'', phone:'', state:'', country:'', company:'', customFields:[] }} />}
            {sidebarTab === 'email'  && <SendEmailTab  lead={lead ?? { id:0, firstName:'', lastName:'', email:'', phone:'', state:'', country:'', company:'', customFields:[] }} />}
            {sidebarTab === 'script' && <AgentScriptTab lead={lead ?? { id:0, firstName:'', lastName:'', email:'', phone:'', state:'', country:'', company:'', customFields:[] }} />}
            {sidebarTab === 'notes'  && <NotesTab leadId={storeActiveLead?.lead_id ?? storeActiveLead?.id ?? 0} />}
            {sidebarTab === 'events' && <EventsTab leadId={storeActiveLead?.lead_id ?? storeActiveLead?.id ?? 0} />}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Stat Pill ──────────────────────────────────────────────────────────────
interface StatPillProps {
  icon: React.ElementType
  label: string
  value: string
  tone: 'slate' | 'indigo' | 'emerald'
}
function StatPill({ icon: Icon, label, value, tone }: StatPillProps) {
  const tones: Record<StatPillProps['tone'], string> = {
    slate:   'text-slate-600 bg-slate-100',
    indigo:  'text-indigo-700 bg-indigo-100',
    emerald: 'text-emerald-700 bg-emerald-100',
  }
  return (
    <div className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white">
      <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', tones[tone])}>
        <Icon size={11} />
      </div>
      <div className="leading-tight">
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-[11px] font-bold text-slate-800 tabular-nums">{value}</p>
      </div>
    </div>
  )
}

// ─── Toolbar Button ──────────────────────────────────────────────────────────
interface ToolbarBtnProps {
  icon: React.ElementType
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}
function ToolbarBtn({ icon: Icon, label, onClick, disabled, active }: ToolbarBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-35 disabled:cursor-not-allowed',
        active
          ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
      )}
      title={label}
    >
      <Icon size={14} />
      <span className="hidden lg:inline">{label}</span>
    </button>
  )
}
