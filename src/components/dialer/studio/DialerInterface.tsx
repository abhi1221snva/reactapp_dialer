import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  ChevronDown, ArrowLeft, Radio, Zap, Users, Clock, SkipForward, ChevronLeft,
  Search, Check, AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../utils/cn'

import { StudioSidebar } from './StudioSidebar'
import { LeadDetailsForm } from './LeadDetailsForm'
import { CommentBox } from './CommentBox'
import { FloatingQuickActions } from './FloatingQuickActions'
import { CallControlBar } from './CallControlBar'
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
  StudioCampaign, StudioLead, StudioDisposition, LeadField, SidebarTab,
} from './types'

// Studio's local CallState — derived from global store, NOT stored locally
type StudioCallState = 'idle' | 'dialing' | 'ringing' | 'in-call' | 'wrap-up'

// ─── Disposition color palette ─────────────────────────────────────────────────
// Maps d_type keywords to the DispositionModal's COLOR_CLASSES keys
const GROUP_COLOR: Record<StudioDisposition['group'], string> = {
  positive: 'emerald',
  neutral:  'slate',
  negative: 'rose',
}

function mapDisposition(d: Disposition): StudioDisposition {
  const type  = (d.d_type ?? '').toLowerCase()
  const label = (d.disposition ?? '').toLowerCase()
  const group: StudioDisposition['group'] =
    type.includes('sale') || type.includes('pos') || type.includes('appoint') || label.includes('appoint')
      ? 'positive'
      : type.includes('neg') || type.includes('dnc') || type.includes('remove') || type.includes('bad')
      ? 'negative'
      : 'neutral'
  return {
    id:    String(d.id),
    label: d.disposition,
    color: d.color ?? GROUP_COLOR[group],
    group,
  }
}

// ─── Lead mapping ──────────────────────────────────────────────────────────────
function mapLeadToStudio(lead: Lead): StudioLead {
  const customFields: LeadField[] = Object.entries(lead.fields ?? {}).map(([key, value]) => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value,
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
  const fieldArr = Array.isArray(raw.data)
    ? raw.data as Array<{ label: string; value: unknown; is_dialing?: number }>
    : []
  const fields: Record<string, string> = {}
  let firstName = '', lastName = '', email = '', address = '', city = '', state = ''
  for (const f of fieldArr) {
    const lbl = (f.label || '').toLowerCase().trim()
    const val = String(f.value ?? '')
    if (lbl) fields[lbl] = val
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
    phone_number: String(raw.number ?? ''),
    first_name:   firstName,
    last_name:    lastName,
    email, address, city, state, fields,
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
  const {
    setCallState, setActiveLead, setMuted, setOnHold,
    isMuted, isOnHold, resetDialer,
    addCallLog, updateLastCallLog,
    pushLeadToHistory, goToPreviousLead, leadHistory,
    startCallTimer,
  } = useDialerStore()

  const phoneInCall           = useFloatingStore(s => s.phoneInCall)
  const phoneRegistered       = useFloatingStore(s => s.phoneRegistered)
  const phoneHasIncoming      = useFloatingStore(s => s.phoneHasIncoming)
  const setCampaignDialActive = useFloatingStore(s => s.setCampaignDialActive)
  const setPhoneOpen          = useFloatingStore(s => s.setPhoneOpen)

  // ─── Local UI state ──────────────────────────────────────────────────────
  const [isDialingLocal, setIsDialingLocal] = useState(false)
  const [sidebarTab, setSidebarTab]         = useState<SidebarTab>('lead')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [comment, setComment]               = useState('')
  const [showTransfer, setShowTransfer]     = useState(false)
  const [showDisposition, setShowDisposition] = useState(false)
  const [showDialPad, setShowDialPad]       = useState(false)
  const [campaignDropdown, setCampaignDropdown] = useState(false)
  const [leadCounter, setLeadCounter]       = useState(1)

  // ─── Lead state (local — mapped from store for UI components) ────────────
  const [lead, setLead] = useState<StudioLead | null>(null)

  useEffect(() => {
    if (!storeActiveLead) { setLead(null); return }
    setLead(mapLeadToStudio(storeActiveLead))
  }, [storeActiveLead])

  // ─── Derived studio call state ────────────────────────────────────────────
  const callState: StudioCallState =
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
    if (storeState !== 'ringing') setCampaignDialActive(false)
  }, [storeState, phoneHasIncoming, setCampaignDialActive])

  // ─── WebPhone in-call signal → advance to in-call ────────────────────────
  useEffect(() => {
    if (phoneInCall && storeState === 'ringing') {
      setCallState('in-call')
      startCallTimer()
    }
  }, [phoneInCall, storeState, setCallState, startCallTimer])

  // ─── SIP call ended remotely → transition to wrap-up ─────────────────────
  useEffect(() => {
    if (!phoneInCall && storeState === 'in-call') {
      setCallState('wrapping')
    }
  }, [phoneInCall, storeState, setCallState])

  // ─── SIP call failed during ringing (Asterisk rejected) → reset to ready ──
  // Guard with !isDialingLocal to avoid false trigger during the brief window
  // between setCallState('ringing') and sipDialOutbound's setPhoneState('calling').
  useEffect(() => {
    if (phoneRegistered && !phoneInCall && storeState === 'ringing' && !isDialingLocal) {
      setCallState('ready')
      setCampaignDialActive(false)
    }
  }, [phoneRegistered, phoneInCall, storeState, isDialingLocal, setCallState, setCampaignDialActive])

  // ─── Open disposition modal when call ends ────────────────────────────────
  useEffect(() => {
    if (storeState === 'wrapping') setShowDisposition(true)
  }, [storeState])

  // ─── Heartbeat (keep agent alive in pacing counters) ─────────────────────
  useEffect(() => {
    heartbeatRef.current = setInterval(() => {
      dialerService.heartbeat(campaign.id).catch(() => {})
    }, 30_000)
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current) }
  }, [campaign.id])

  // ─── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (ringbackRef.current) { ringbackRef.current.pause(); ringbackRef.current = null }
    }
  }, [])

  // ─── Mutations ────────────────────────────────────────────────────────────
  const hangUpMutation = useMutation({
    mutationFn: () => dialerService.hangUp({ id: campaign.id }),
    onSuccess: () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      updateLastCallLog({ status: 'connected', duration: callDuration })
      setCallState('wrapping')
    },
    onError: () => {
      // Move to wrapping even on error so agent can disposition
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      updateLastCallLog({ status: 'connected', duration: callDuration })
      setCallState('wrapping')
    },
  })

  const saveDispositionMutation = useMutation({
    mutationFn: ({ dispoId, pauseCalling }: { dispoId: number; pauseCalling: boolean }) => {
      const leadId = storeActiveLead?.lead_id ?? storeActiveLead?.id ?? 0
      // Auto-dial mode: use campaign dialer endpoint (leads are in list_data)
      if (isAutoDialMode) {
        return campaignDialerService.saveDisposition(leadId, dispoId, undefined, campaign.id)
      }
      return dialerService.saveDisposition({
        lead_id:        leadId,
        campaign_id:    campaign.id,
        disposition_id: dispoId,
        api_call:       0,
        pause_calling:  pauseCalling ? 1 : 0,
      })
    },
    onSuccess: () => {
      toast.success('Disposition saved')
      setShowDisposition(false)
      resetDialer()
      setLeadCounter((n) => n + 1)
      // Backend addLeadToExtensionLive already queued next lead — fetch it now
      dialerService
        .getLead()
        .then((r) => {
          const raw = r.data as Record<string, unknown>
          if (raw?.success && raw.lead_id) setActiveLead(parseApiLead(raw))
        })
        .catch(() => {})
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

      // Single API call: picks next lead + AMI originates to agent's webphone
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
    storeState, isDialingLocal, webphoneOk, campaign.id, campaign.name,
    pushLeadToHistory, setActiveLead, setCallState, setCampaignDialActive,
    setPhoneOpen, addCallLog, updateLastCallLog,
  ])

  const canLeaveOrSwitch = storeState !== 'in-call' && storeState !== 'ringing'
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
    setComment('')
  }, [canLeaveOrSwitch, leadHistory, goToPreviousLead])

  // ─── Disposition handlers ─────────────────────────────────────────────────
  const handleDispositionSave = (dispoId: string, pauseCalling: boolean) => {
    saveDispositionMutation.mutate({ dispoId: Number(dispoId), pauseCalling })
  }

  const handleRedial = () => {
    setShowDisposition(false)
    setCallState('ready')
    setTimeout(handleDial, 200)
  }

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Enter' && callState === 'idle' && !showDisposition) {
        e.preventDefault(); handleDial()
      }
      if (e.key === ' ' && callState === 'in-call') {
        e.preventDefault(); hangUpMutation.mutate()
      }
      if (e.key === 't' && callState === 'in-call')  setShowTransfer(true)
      if (e.key === 'd')                              setShowDialPad(true)
      if (e.key === 'm' && callState === 'in-call')  setMuted(!isMuted)
      if (e.key === 'h' && callState === 'in-call')  setOnHold(!isOnHold)
      if (['1','2','3','4','5','6'].includes(e.key)) {
        const map: Record<string, SidebarTab> = {
          '1':'lead','2':'sms','3':'email','4':'script','5':'notes','6':'events',
        }
        setSidebarTab(map[e.key])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [callState, showDisposition, handleDial, isMuted, isOnHold]) // eslint-disable-line react-hooks/exhaustive-deps

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
        agents={[]}
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
                <div className="fixed inset-0 z-10" onClick={() => setCampaignDropdown(false)} />
                <div className="absolute left-0 top-full mt-2 w-[320px] rounded-2xl border border-slate-200 bg-white shadow-xl z-20 animate-slideUp overflow-hidden">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Switch campaign…"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                      />
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1">
                    {allCampaigns.map((c) => {
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
            <StatPill icon={Clock} label="Lead #"      value={String(leadCounter)}                   tone="emerald" />
          </div>

          <div className="flex-1" />

          {/* Lead nav */}
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline text-[11px] text-slate-500 font-medium px-2">
              Lead <span className="font-bold text-slate-700">#{leadCounter}</span>
            </span>
            <button
              onClick={prevLead}
              disabled={!canLeaveOrSwitch || leadHistory.length === 0}
              className="btn-sm btn-outline gap-1 disabled:opacity-40"
              title="Previous lead"
            >
              <ChevronLeft size={12} /> Prev
            </button>
            <button
              onClick={skipLead}
              disabled={!canLeaveOrSwitch}
              className="btn-sm btn-outline gap-1 disabled:opacity-40"
              title="Skip to next lead"
            >
              Skip <SkipForward size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── 3-column layout ─────────────────────────────────────── */}
      <div className="flex gap-4 mt-3 min-h-[calc(100vh-180px)]">
        <StudioSidebar
          active={sidebarTab}
          onChange={setSidebarTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />

        {/* CENTER */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="flex-1">
            {sidebarTab === 'lead' && (
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-3 max-w-[1180px]">
                {lead ? (
                  <LeadDetailsForm lead={lead} onUpdate={setLead} />
                ) : (
                  <div className="card flex flex-col items-center justify-center min-h-[200px] gap-3">
                    <Radio size={24} className="text-slate-300" />
                    <p className="text-sm text-slate-400">
                      {callState === 'idle'
                        ? 'Click "Start Call" to fetch the first lead'
                        : 'Loading lead…'}
                    </p>
                  </div>
                )}
                <div className="xl:sticky xl:top-24 xl:self-start">
                  <CommentBox value={comment} onChange={setComment} />
                </div>
              </div>
            )}
            {sidebarTab !== 'lead' && (
              <div className="max-w-[880px]">
                {sidebarTab === 'sms'    && <SendSmsTab    lead={lead ?? { id:0, firstName:'', lastName:'', email:'', phone:'', state:'', country:'', company:'', customFields:[] }} />}
                {sidebarTab === 'email'  && <SendEmailTab  lead={lead ?? { id:0, firstName:'', lastName:'', email:'', phone:'', state:'', country:'', company:'', customFields:[] }} />}
                {sidebarTab === 'script' && <AgentScriptTab lead={lead ?? { id:0, firstName:'', lastName:'', email:'', phone:'', state:'', country:'', company:'', customFields:[] }} />}
                {sidebarTab === 'notes'  && <NotesTab />}
                {sidebarTab === 'events' && <EventsTab />}
              </div>
            )}
          </div>

          <CallControlBar
            callState={callState}
            duration={callDuration}
            muted={isMuted}
            holding={isOnHold}
            onDial={handleDial}
            onHangup={() => hangUpMutation.mutate()}
            onTransfer={() => setShowTransfer(true)}
            onVoiceDrop={() => voicemailMutation.mutate()}
            onDialPad={() => setShowDialPad(true)}
            onToggleMute={() => setMuted(!isMuted)}
            onToggleHold={() => setOnHold(!isOnHold)}
          />
        </div>

        {/* RIGHT floating actions */}
        <div className="hidden lg:block shrink-0">
          <FloatingQuickActions
            onSms={() => setSidebarTab('sms')}
            onEmail={() => setSidebarTab('email')}
            onCall={handleDial}
            disabled={callState === 'in-call' || callState === 'ringing' || callState === 'dialing'}
          />
        </div>
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
