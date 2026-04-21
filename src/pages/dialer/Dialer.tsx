import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { LogIn, LogOut, Radio, Zap, TrendingUp, Users, BarChart2, History, ClipboardList, PhoneCall, AlertTriangle, CheckCircle2, Clock, ChevronLeft, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { dialerService } from '../../services/dialer.service'
import { useDialerStore } from '../../stores/dialer.store'
import { useAuthStore } from '../../stores/auth.store'
import { useFloatingStore } from '../../stores/floating.store'
import { useAuth } from '../../hooks/useAuth'
import { useAgentLiveCall } from '../../hooks/useAgentLiveCall'
import { CallControls } from '../../components/dialer/CallControls'
import { LeadInfoPanel } from '../../components/dialer/LeadInfoPanel'
import { DispositionForm } from '../../components/dialer/DispositionForm'
import { TransferModal } from '../../components/dialer/TransferModal'
import { CallLogsPanel } from '../../components/dialer/CallLogsPanel'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { cn } from '../../utils/cn'
import { isCampaignInCallingHours } from '../../utils/timezone'
import type { Campaign, Lead } from '../../types'

// ─── Dial-mode display labels ─────────────────────────────────────────────────
const DIAL_MODE_LABEL: Record<string, string> = {
  predictive_dial:   'Predictive',
  preview_and_dial:  'Preview',
  power_dial:        'Power',
  super_power_dial:  'Super Dial',
  outbound_ai:       'Outbound AI',
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  idle:     { label: 'Not Ready',   classes: 'bg-slate-100 text-slate-500' },
  ready:    { label: 'Ready',       classes: 'bg-emerald-100 text-emerald-700' },
  ringing:  { label: 'Answer WebPhone…', classes: 'bg-amber-100 text-amber-700' },
  'in-call':{ label: 'In Call',    classes: 'bg-blue-100 text-blue-700' },
  wrapping: { label: 'Wrap-up',    classes: 'bg-violet-100 text-violet-700' },
  paused:   { label: 'Paused',     classes: 'bg-orange-100 text-orange-700' },
}

type RightTab = 'disposition' | 'logs' | 'stats'

// ─── Component ────────────────────────────────────────────────────────────────
export function Dialer() {
  const user = useAuthStore((s) => s.user)
  const { sipConfig } = useAuth()
  const phoneRegistered      = useFloatingStore(s => s.phoneRegistered)
  const phoneInCall          = useFloatingStore(s => s.phoneInCall)
  const phoneHasIncoming     = useFloatingStore(s => s.phoneHasIncoming)
  const setPhoneOpen         = useFloatingStore(s => s.setPhoneOpen)
  const phoneClickHandler    = useFloatingStore(s => s.phoneClickHandler)
  const setCampaignDialActive = useFloatingStore(s => s.setCampaignDialActive)

  // webphoneOk = SIP is fully configured AND browser stack is registered (ready / in_call)
  const webphoneConfigured = sipConfig?.isConfigured ?? false
  const webphoneOk = webphoneConfigured && phoneRegistered

  const {
    callState, activeCampaign, activeLead, callDuration,
    isExtensionLoggedIn, isMuted, isOnHold,
    setActiveCampaign, setExtensionLoggedIn, setCallState,
    setActiveLead, setDispositions, setMuted, setOnHold,
    startCallTimer, resetDialer,
    addCallLog, updateLastCallLog,
    leadHistory, pushLeadToHistory, goToPreviousLead,
  } = useDialerStore()

  const [showTransfer, setShowTransfer] = useState(false)
  const [rightTab, setRightTab] = useState<RightTab>('disposition')
  const [isDialing, setIsDialing] = useState(false)

  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const heartbeatRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const callStartRef  = useRef<number>(0)
  const ringbackRef   = useRef<HTMLAudioElement | null>(null)

  // ── Play ringback tone while in ringing state ──────────────────────────────
  // Stop the local ringback once WebPhone shows incoming (it plays its own ringtone)
  useEffect(() => {
    if (callState === 'ringing' && !phoneHasIncoming) {
      if (!ringbackRef.current) {
        ringbackRef.current = new Audio('/asset/audio/ringbacktone.wav')
        ringbackRef.current.loop = true
      }
      ringbackRef.current.currentTime = 0
      ringbackRef.current.play().catch(() => {})
    } else {
      if (ringbackRef.current) {
        ringbackRef.current.pause()
        ringbackRef.current.currentTime = 0
      }
    }
    if (callState !== 'ringing') {
      setCampaignDialActive(false)
    }
  }, [callState, phoneHasIncoming, setCampaignDialActive])

  // ── Auto-transition: when agent answers WebPhone, move Dialer to "in-call" ─
  // Asterisk rings agent's extension first. When agent answers (phoneInCall=true)
  // Asterisk then dials the customer. Transition Dialer from ringing → in-call.
  // Also handles campaign auto-dial mode where the call arrives while in 'ready' state
  // (backend AMI originate rings agent directly without frontend initiating the dial).
  useEffect(() => {
    if (phoneInCall && (callState === 'ringing' || callState === 'ready')) {
      setCallState('in-call')
      startCallTimer()
    }
  }, [phoneInCall, callState, setCallState, startCallTimer])

  // ── Campaign auto-dialer: real-time lead data via Pusher ──────────────────
  // When the backend campaign worker bridges a call, it pushes a Pusher event
  // on channel "dialer-agent.{ext}" with the lead_id. This hook fetches the
  // lead and populates activeLead so LeadInfoPanel shows data immediately.
  useAgentLiveCall({ extension: user?.alt_extension || user?.extension })

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['agent-campaigns'],
    queryFn: () => dialerService.getAgentCampaigns(),
  })
  const campaigns: Campaign[] = (campaignsData?.data?.data || []).map((c: Record<string, unknown>) => ({
    ...c,
    campaign_name: (c.campaign_name ?? c.title ?? '') as string,
    status:        (c.campaign_status ?? (Number(c.status) === 1 ? 'active' : 'inactive')) as 'active' | 'inactive',
    dial_mode:     (c.dial_mode ?? 'predictive_dial') as Campaign['dial_mode'],
    dial_ratio:    Number(c.dial_ratio ?? c.call_ratio ?? 1),
    total_leads:   c.total_leads !== undefined ? Number(c.total_leads) : undefined,
    called_leads:  c.called_leads !== undefined ? Number(c.called_leads) : undefined,
    time_based_calling: c.time_based_calling as number | undefined,
    call_time_start:    (c.call_time_start ?? null) as string | null,
    call_time_end:      (c.call_time_end ?? null) as string | null,
    timezone:           (c.timezone ?? null) as string | null,
    call_transfer:      c.call_transfer as Campaign['call_transfer'],
  }))

  // ── Timer helpers ────────────────────────────────────────────────────────────
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const startTimer = () => {
    stopTimer()
    callStartRef.current = Date.now()
    startCallTimer()
    timerRef.current = setInterval(() => {
      useDialerStore.setState((s) => ({ callDuration: s.callDuration + 1 }))
    }, 1000)
  }

  // ── Heartbeat (pacing) ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isExtensionLoggedIn || !activeCampaign) return
    heartbeatRef.current = setInterval(() => {
      dialerService.heartbeat(activeCampaign.id).catch(() => {})
    }, 30_000)
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current) }
  }, [isExtensionLoggedIn, activeCampaign])

  // ── Call state side-effects ──────────────────────────────────────────────────
  useEffect(() => {
    if (callState === 'in-call') {
      startTimer()
    }
    if (callState === 'wrapping') {
      stopTimer()
      // Record outcome to pacing after call ends
      if (activeCampaign) {
        const handleTime = Math.floor((Date.now() - callStartRef.current) / 1000)
        dialerService
          .recordOutcome(activeCampaign.id, 'answered', handleTime)
          .catch(() => {})
        dialerService.updateAgentState(activeCampaign.id, 'wrapping').catch(() => {})
      }
      setRightTab('disposition')
    }
    if (callState === 'ready' && activeCampaign) {
      dialerService.updateAgentState(activeCampaign.id, 'available').catch(() => {})
    }
    return () => { if (callState !== 'in-call') stopTimer() }
  }, [callState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer()
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (ringbackRef.current) { ringbackRef.current.pause(); ringbackRef.current = null }
    }
  }, [])

  // ── Mutations ────────────────────────────────────────────────────────────────

  // Join campaign
  const loginMutation = useMutation({
    mutationFn: (id: number) => {
      // Guard: require WebPhone to be connected before hitting the backend
      if (!webphoneOk) {
        return Promise.reject(new Error(
          !webphoneConfigured
            ? 'WebPhone is not configured. Please contact your administrator.'
            : 'WebPhone is not connected. Click the phone icon in the corner and press "Enable WebPhone" until it shows Ready.'
        ))
      }
      return dialerService.extensionLogin(id)
    },
    onSuccess: (_, id) => {
      const camp = campaigns.find((c) => c.id === id)!
      setActiveCampaign(camp)
      setExtensionLoggedIn(true)
      setCallState('ready')
      toast.success(`Joined "${camp.campaign_name}"`)
      dialerService
        .getDispositionsByCampaign(id)
        .then((r) => setDispositions(r.data?.data || []))
        .catch(() => {})
    },
    onError: (err: unknown) => {
      // Show backend message when available, else the guard message, else generic
      const backendMsg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      const localMsg  = (err as Error)?.message
      toast.error(backendMsg ?? localMsg ?? 'Failed to join campaign', { duration: 6000 })
    },
  })

  // Leave campaign
  const logoutMutation = useMutation({
    mutationFn: () => dialerService.extensionLogout(),
    onSuccess: () => {
      setExtensionLoggedIn(false)
      setCallState('idle')
      setActiveCampaign(null)
      setActiveLead(null)
      toast.success('Logged out of campaign')
    },
  })

  // Hang up
  const hangUpMutation = useMutation({
    mutationFn: () => dialerService.hangUp({ id: activeCampaign!.id }),
    onSuccess: () => {
      stopTimer()
      // Update call log with final duration + status
      updateLastCallLog({
        status: 'connected',
        duration: callDuration,
      })
      setCallState('wrapping')
    },
    onError: () => {
      // Even if backend returns error, move to wrapping so agent can disposition
      stopTimer()
      updateLastCallLog({ status: 'connected', duration: callDuration })
      setCallState('wrapping')
    },
  })

  // Save disposition → fetch next lead
  const saveDispositionMutation = useMutation({
    mutationFn: (data: Parameters<typeof dialerService.saveDisposition>[0]) =>
      dialerService.saveDisposition(data),
    onSuccess: () => {
      toast.success('Disposition saved')
      resetDialer()
      // Pre-load next lead so it's ready
      dialerService
        .getLead()
        .then((r) => setActiveLead(r.data?.data || null))
        .catch(() => {})
    },
    onError: () => toast.error('Failed to save disposition'),
  })

  // Voicemail drop
  const voicemailMutation = useMutation({
    mutationFn: () => dialerService.voicemailDrop(activeCampaign!.id),
    onSuccess: () => toast.success('Voicemail dropped'),
    onError: () => toast.error('Voicemail drop failed'),
  })

  // ── Dial handler ─────────────────────────────────────────────────────────────
  /**
   * Full dial sequence:
   *  1. GET /get-lead  → get next lead
   *  2. POST /call-number → Asterisk originates the call
   *  3. State: ready → ringing
   *
   * NOTE: Transition ringing → in-call happens automatically after 5s (no
   *  real-time push from Asterisk in the current backend). Replace this with
   *  WebSocket/SSE events when available.
   */
  const handleDial = async () => {
    if (!activeCampaign || isDialing) return
    if (callState !== 'ready') return

    setIsDialing(true)
    try {
      // Push current lead to history before fetching next
      pushLeadToHistory()

      // Step 1: fetch next lead
      // Backend returns { success, number, lead_id, list_id, data: [{label,value,is_dialing,...}] }
      const leadRes = await dialerService.getLead()
      const raw = leadRes.data
      if (!raw?.success || !raw.lead_id) {
        toast('No leads available in this campaign', { icon: 'ℹ️' })
        setIsDialing(false)
        return
      }

      // Transform backend field-array into a flat Lead object
      const fields: Record<string, string> = {}
      const fieldArr = Array.isArray(raw.data) ? raw.data : []
      let firstName = ''; let lastName = ''
      let email = ''; let address = ''; let city = ''; let state = ''
      for (const f of fieldArr) {
        const lbl = (f.label || '').toLowerCase()
        const val = f.value ?? ''
        if (lbl) fields[lbl] = val
        if (lbl === 'first name' || lbl === 'first_name' || lbl === 'firstname') firstName = val
        else if (lbl === 'last name' || lbl === 'last_name' || lbl === 'lastname') lastName = val
        else if (lbl === 'email' || lbl === 'e-mail') email = val
        else if (lbl === 'address') address = val
        else if (lbl === 'city') city = val
        else if (lbl === 'state') state = val
      }

      const lead: Lead = {
        id: raw.lead_id,
        lead_id: raw.lead_id,
        list_id: raw.list_id ?? 0,
        phone_number: raw.number ?? '',
        first_name: firstName,
        last_name: lastName,
        email, address, city, state,
        fields,
      }
      setActiveLead(lead)

      // Step 2: initiate call
      const leadId   = lead.lead_id ?? lead.id
      const queueId  = lead.id
      const phoneNum = lead.phone_number

      if (!phoneNum) {
        toast.error('Lead has no phone number')
        setIsDialing(false)
        return
      }

      const callRes = await dialerService.callNumber({
        campaign_id: activeCampaign.id,
        lead_id: leadId,
        number: phoneNum,
        id: queueId,
      })

      // Step 3: ringing state — ringback tone plays via callState effect
      setCampaignDialActive(true)
      setCallState('ringing')

      // Add session log entry (status updated on hangup/disposition)
      addCallLog({
        id: `${Date.now()}`,
        lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown',
        phone_number: phoneNum,
        status: 'no_answer',       // updated when call connects or disposition is saved
        duration: 0,
        campaign_name: activeCampaign.campaign_name,
        started_at: new Date().toISOString(),
        lead_id: leadId,
        campaign_id: activeCampaign.id,
      })

      setPhoneOpen(true)

      // WebRTC mode: backend skips AMI — we must initiate the SIP call from the browser
      const dialMode = callRes.data?.dial_mode
      if (dialMode === 'webrtc') {
        const sipDial = useFloatingStore.getState().sipDialHandler
        if (!sipDial) {
          toast.error('WebPhone not initialized — please reload the page', { duration: 6000 })
          setCallState('ready')
          setCampaignDialActive(false)
          dialerService.hangUp({ id: activeCampaign.id }).catch(() => {})
          updateLastCallLog({ status: 'failed' })
          return
        }
        try {
          await sipDial(callRes.data?.number || phoneNum)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'SIP call failed — reconnect WebPhone and try again'
          toast.error(msg, { duration: 6000 })
          setCallState('ready')
          setCampaignDialActive(false)
          dialerService.hangUp({ id: activeCampaign.id }).catch(() => {})
          updateLastCallLog({ status: 'failed' })
        }
      }
      // Hardware mode: WebPhone auto-answers the SIP INVITE from Asterisk.
      // Transition to in-call happens when phoneInCall becomes true.
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to start call'
      toast.error(msg)
      // Mark log as failed
      updateLastCallLog({ status: 'failed' })
    } finally {
      setIsDialing(false)
    }
  }

  // ── Redial handler ─────────────────────────────────────────────────────────
  const handleRedial = async (phoneNumber: string, leadName: string, leadId?: number, campaignId?: number) => {
    if (!activeCampaign || callState !== 'ready') return
    const campId = campaignId ?? activeCampaign.id

    setIsDialing(true)
    try {
      const callRes = await dialerService.callNumber({
        campaign_id: campId,
        lead_id: leadId ?? 0,
        number: phoneNumber,
        id: leadId ?? 0,
      })

      setCampaignDialActive(true)
      setCallState('ringing')
      addCallLog({
        id: `${Date.now()}`,
        lead_name: leadName,
        phone_number: phoneNumber,
        status: 'no_answer',
        duration: 0,
        campaign_name: activeCampaign.campaign_name,
        started_at: new Date().toISOString(),
        lead_id: leadId,
        campaign_id: campId,
      })

      setPhoneOpen(true)

      // WebRTC mode: initiate SIP call from browser
      if (callRes.data?.dial_mode === 'webrtc') {
        const sipDial = useFloatingStore.getState().sipDialHandler
        if (!sipDial) {
          toast.error('WebPhone not initialized — please reload the page', { duration: 6000 })
          setCallState('ready')
          setCampaignDialActive(false)
          return
        }
        try {
          await sipDial(callRes.data?.number || phoneNumber)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'SIP call failed — reconnect WebPhone and try again'
          toast.error(msg, { duration: 6000 })
          setCallState('ready')
          setCampaignDialActive(false)
        }
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Redial failed'
      toast.error(msg)
    } finally {
      setIsDialing(false)
    }
  }

  // ── Toggle helpers ─────────────────────────────────────────────────────────
  const handleMute = () => setMuted(!isMuted)
  const handleHold = () => setOnHold(!isOnHold)

  // ── Loading guard ────────────────────────────────────────────────────────────
  if (isLoading) return <PageLoader />

  // ─────────────────────────────────────────────────────────────────────────────
  // PRE-LOGIN: Campaign selection
  // ─────────────────────────────────────────────────────────────────────────────
  if (!isExtensionLoggedIn) {
    return (
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dialer</h1>
            <p className="page-subtitle">Select a campaign to begin dialing</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full">
            <Zap size={13} className="text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-600">{campaigns.length} Available</span>
          </div>
        </div>

        {/* ── WebPhone status banner ──────────────────────────────────────── */}
        {webphoneOk ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">WebPhone Connected</p>
              <p className="text-xs text-emerald-600">Your SIP extension is registered. You can join a campaign.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">WebPhone Not Connected</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {!webphoneConfigured
                  ? 'Your account is missing a SIP extension or Asterisk server. Contact your administrator.'
                  : 'Click "Enable WebPhone" and wait for the Ready status before joining a campaign.'}
              </p>
            </div>
            {webphoneConfigured && (
              <button
                onClick={() => {
                  if (phoneClickHandler) phoneClickHandler()
                  else setPhoneOpen(true)
                }}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
              >
                <PhoneCall size={13} />
                Connect
              </button>
            )}
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Radio size={32} className="text-slate-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-700">No campaigns assigned</p>
              <p className="text-sm text-slate-400 mt-1">Contact your administrator to get started</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c) => {
              const progress = c.total_leads ? Math.round(((c.called_leads ?? 0) / c.total_leads) * 100) : 0
              const callingHours = isCampaignInCallingHours(c, user?.timezone)
              const isOutOfHours = !callingHours.inHours
              return (
                <div
                  key={c.id}
                  className={cn(
                    'card transition-all duration-200 flex flex-col',
                    isOutOfHours ? 'opacity-60 border-dashed' : 'hover:shadow-lg',
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center shadow-sm',
                      isOutOfHours
                        ? 'bg-slate-300'
                        : 'bg-gradient-to-br from-indigo-500 to-violet-600'
                    )}>
                      <Radio size={20} className="text-white" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-semibold',
                        c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      )}>
                        {c.status}
                      </span>
                      {isOutOfHours && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Clock size={9} /> Outside Hours
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug">{c.campaign_name}</h3>
                  <p className="text-xs text-slate-500 mt-1 capitalize">
                    {DIAL_MODE_LABEL[c.dial_mode] ?? c.dial_mode} &nbsp;·&nbsp; Ratio {c.dial_ratio}:1
                  </p>

                  {/* Calling hours info */}
                  {isOutOfHours && callingHours.nextWindow && (
                    <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                      <Clock size={10} />
                      {callingHours.nextWindow}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users size={11} />
                      <span>{c.total_leads ?? 0} leads</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <TrendingUp size={11} />
                      <span>{c.called_leads ?? 0} called</span>
                    </div>
                  </div>

                  {c.total_leads !== undefined && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                        <span>Progress</span>
                        <span className="font-medium text-slate-600">{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => loginMutation.mutate(c.id)}
                    disabled={loginMutation.isPending || !webphoneOk || isOutOfHours}
                    title={
                      isOutOfHours ? `Campaign is outside calling hours (${callingHours.nextWindow})` :
                      !webphoneOk ? 'Connect your WebPhone first' : undefined
                    }
                    className={cn(
                      'btn-primary w-full mt-5 gap-2',
                      (isOutOfHours || !webphoneOk) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <LogIn size={15} />
                    {isOutOfHours ? 'Outside Calling Hours' : loginMutation.isPending ? 'Joining…' : 'Join Campaign'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIVE DIALER
  // ─────────────────────────────────────────────────────────────────────────────
  const status = STATUS_CONFIG[callState] ?? STATUS_CONFIG.idle

  return (
    <>
      {/* Transfer modal */}
      <TransferModal isOpen={showTransfer} onClose={() => setShowTransfer(false)} />

      <div className="space-y-4">
        {/* ── Status banner ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
              <Radio size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">
                {activeCampaign?.campaign_name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 capitalize">
                {DIAL_MODE_LABEL[activeCampaign?.dial_mode ?? ''] ?? activeCampaign?.dial_mode} &nbsp;·&nbsp; Ratio {activeCampaign?.dial_ratio}:1
                {user && (
                  <> &nbsp;·&nbsp; Ext. <span className="font-mono">{user.alt_extension || user.extension}</span></>
                )}
              </p>
            </div>
            <span className={cn('ml-1 px-3 py-1 rounded-full text-xs font-semibold', status.classes)}>
              {status.label}
            </span>
          </div>

          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending || callState === 'in-call' || callState === 'ringing'}
            className="btn-outline gap-2 text-sm"
            title={callState === 'in-call' ? 'Hang up before logging out' : undefined}
          >
            <LogOut size={15} />
            {logoutMutation.isPending ? 'Logging out…' : 'Leave Campaign'}
          </button>
        </div>

        {/* ── 3-panel grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* ── LEFT: Lead panel ──────────────────────────────────────────── */}
          <div className="card">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Lead Information
            </h3>
            <LeadInfoPanel />

            {/* Lead action buttons */}
            {activeLead && callState === 'ready' && (
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                <button
                  onClick={handleDial}
                  disabled={isDialing}
                  className="btn-primary w-full gap-2"
                >
                  {isDialing ? 'Fetching lead…' : 'Start Dialing'}
                </button>
                <div className="flex gap-2">
                  {leadHistory.length > 0 && (
                    <button
                      onClick={goToPreviousLead}
                      className="btn-outline flex-1 gap-1.5 text-sm"
                      title="Go back to previous lead"
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>
                  )}
                  <button
                    onClick={() => {
                      pushLeadToHistory()
                      updateLastCallLog({ status: 'missed' })
                      setActiveLead(null)
                      dialerService.getLead().then((r) => setActiveLead(r.data?.data || null)).catch(() => {})
                    }}
                    className={cn('btn-outline gap-2 text-sm', leadHistory.length > 0 ? 'flex-1' : 'w-full')}
                  >
                    Skip Lead
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── CENTER: Dialer controls ────────────────────────────────────── */}
          <div className="card flex flex-col items-center justify-center min-h-[420px] bg-gradient-to-b from-slate-50 to-white">
            <CallControls
              onDial={handleDial}
              onHangUp={() => hangUpMutation.mutate()}
              onMute={handleMute}
              onHold={handleHold}
              onTransfer={String(activeCampaign?.call_transfer) === '1' ? () => setShowTransfer(true) : undefined}
              onVoicemail={() => voicemailMutation.mutate()}
            />

            {/* "No lead loaded" hint when ready but no lead */}
            {callState === 'ready' && !activeLead && !isDialing && (
              <p className="mt-4 text-xs text-slate-400 text-center px-4">
                Click <strong>Start Dialing</strong> to fetch the next lead and begin.
              </p>
            )}
          </div>

          {/* ── RIGHT: Tabbed panel ────────────────────────────────────────── */}
          <div className="card flex flex-col">
            {/* Tab bar */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 mb-4">
              <TabButton
                active={rightTab === 'disposition'}
                onClick={() => setRightTab('disposition')}
                icon={ClipboardList}
                label="Disposition"
              />
              <TabButton
                active={rightTab === 'logs'}
                onClick={() => setRightTab('logs')}
                icon={History}
                label="Call Logs"
              />
              <TabButton
                active={rightTab === 'stats'}
                onClick={() => setRightTab('stats')}
                icon={BarChart2}
                label="Stats"
              />
            </div>

            {/* Disposition tab */}
            {rightTab === 'disposition' && (
              <>
                {callState === 'wrapping' ? (
                  <DispositionForm
                    loading={saveDispositionMutation.isPending}
                    onSave={(d) =>
                      saveDispositionMutation.mutate({
                        lead_id: activeLead?.lead_id ?? activeLead?.id ?? 0,
                        campaign_id: activeCampaign!.id,
                        api_call: 0,
                        pause_calling: 0,
                        ...d,
                      })
                    }
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 py-10 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <ClipboardList size={20} className="text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-400 text-center">
                      Complete the call to<br />save a disposition
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Call logs tab */}
            {rightTab === 'logs' && (
              <CallLogsPanel
                onRedial={callState === 'ready' ? handleRedial : undefined}
              />
            )}

            {/* Stats tab */}
            {rightTab === 'stats' && (
              <PacingStats campaignId={activeCampaign?.id} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Tab button helper ─────────────────────────────────────────────────────────
function TabButton({
  active, onClick, icon: Icon, label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
        active ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      )}
    >
      <Icon size={11} /> {label}
    </button>
  )
}

// ─── Pacing stats panel ────────────────────────────────────────────────────────
function PacingStats({ campaignId }: { campaignId?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['pacing-snapshot', campaignId],
    queryFn: () => dialerService.getPacingSnapshot(campaignId!),
    enabled: !!campaignId,
    refetchInterval: 15_000,   // refresh every 15s
  })

  const snap = data?.data?.data

  if (isLoading || !snap) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <BarChart2 size={24} className="text-slate-300" />
        <p className="text-xs text-slate-400">Loading stats…</p>
      </div>
    )
  }

  const rows: { label: string; value: string | number; sub?: string }[] = [
    { label: 'Dial Ratio',    value: `${snap.current_ratio ?? '—'}:1` },
    { label: 'Calls Placed',  value: snap.calls_placed ?? '—' },
    { label: 'Calls Answered',value: snap.calls_answered ?? '—' },
    { label: 'Abandon Rate',  value: snap.abandon_rate_pct != null ? `${snap.abandon_rate_pct}%` : '—',
      sub: snap.ftc_compliant ? '✓ FTC compliant' : '⚠ Over FTC limit' },
    { label: 'Agents Online', value: snap.agents_available ?? '—' },
  ]

  return (
    <div className="space-y-3">
      {rows.map(({ label, value, sub }) => (
        <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
          <span className="text-xs text-slate-500">{label}</span>
          <div className="text-right">
            <span className="text-sm font-bold text-slate-800">{String(value)}</span>
            {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
