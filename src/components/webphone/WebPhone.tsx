import { useRef, useState, useCallback, useEffect } from 'react'
import {
  Phone, PhoneOff, Loader2, PhoneCall,
  Power, Delete, ExternalLink, ShieldAlert, Clock, ChevronDown,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../stores/auth.store'
import { useFloatingStore, useWidgetPositions } from '../../stores/floating.store'
import { useDialerStore } from '../../stores/dialer.store'
import { authService } from '../../services/auth.service'
import { DraggableWidget } from '../floating/DraggableWidget'
import { DialPad }           from './DialPad'
import { CallControls }      from './CallControls'
import { IncomingCallPopup } from './IncomingCallPopup'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { SIPml: any } }

type PhoneState = 'idle' | 'registering' | 'ready' | 'incoming' | 'calling' | 'in_call' | 'error'

const STATUS_LABEL: Record<PhoneState, string> = {
  idle:        'Not Connected',
  registering: 'Registering…',
  ready:       'Ready',
  incoming:    'Incoming Call',
  calling:     'Calling…',
  in_call:     'In Call',
  error:       'Error',
}

const STATUS_COLOR: Record<PhoneState, string> = {
  idle:        '#94A3B8',
  registering: '#F59E0B',
  ready:       '#22C55E',
  incoming:    '#6366F1',
  calling:     '#F59E0B',
  in_call:     '#22C55E',
  error:       '#EF4444',
}

const COUNTRY_CODES = [
  { code: '+1',   flag: '🇺🇸', name: 'US / CA' },
  { code: '+44',  flag: '🇬🇧', name: 'UK' },
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+39',  flag: '🇮🇹', name: 'Italy' },
  { code: '+34',  flag: '🇪🇸', name: 'Spain' },
  { code: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { code: '+52',  flag: '🇲🇽', name: 'Mexico' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+65',  flag: '🇸🇬', name: 'Singapore' },
  { code: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: '+82',  flag: '🇰🇷', name: 'South Korea' },
  { code: '+86',  flag: '🇨🇳', name: 'China' },
  { code: '+7',   flag: '🇷🇺', name: 'Russia' },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: '+92',  flag: '🇵🇰', name: 'Pakistan' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+20',  flag: '🇪🇬', name: 'Egypt' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+60',  flag: '🇲🇾', name: 'Malaysia' },
  { code: '+62',  flag: '🇮🇩', name: 'Indonesia' },
  { code: '+63',  flag: '🇵🇭', name: 'Philippines' },
  { code: '+66',  flag: '🇹🇭', name: 'Thailand' },
  { code: '+84',  flag: '🇻🇳', name: 'Vietnam' },
  { code: '+90',  flag: '🇹🇷', name: 'Turkey' },
  { code: '+380', flag: '🇺🇦', name: 'Ukraine' },
  { code: '+48',  flag: '🇵🇱', name: 'Poland' },
  { code: '+31',  flag: '🇳🇱', name: 'Netherlands' },
  { code: '+46',  flag: '🇸🇪', name: 'Sweden' },
  { code: '+47',  flag: '🇳🇴', name: 'Norway' },
  { code: '+41',  flag: '🇨🇭', name: 'Switzerland' },
  { code: '+32',  flag: '🇧🇪', name: 'Belgium' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+30',  flag: '🇬🇷', name: 'Greece' },
  { code: '+64',  flag: '🇳🇿', name: 'New Zealand' },
  { code: '+972', flag: '🇮🇱', name: 'Israel' },
]

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function WebPhone() {
  const { sipConfig, user } = useAuth()
  const updateUser = useAuthStore(s => s.updateUser)

  const isOpen              = useFloatingStore(s => s.phoneOpen)
  const setPhoneOpen        = useFloatingStore(s => s.setPhoneOpen)
  const setPhoneMinimized   = useFloatingStore(s => s.setPhoneMinimized)
  const registerPhoneClick  = useFloatingStore(s => s.registerPhoneClick)
  const setPhoneRegistered  = useFloatingStore(s => s.setPhoneRegistered)
  const registerSipAnswer   = useFloatingStore(s => s.registerSipAnswer)
  const registerSipDecline  = useFloatingStore(s => s.registerSipDecline)
  const registerSipDial     = useFloatingStore(s => s.registerSipDial)
  const campaignDialActive  = useFloatingStore(s => s.campaignDialActive)
  const setIsOpen = setPhoneOpen
  const { phoneRight } = useWidgetPositions()

  // Keep a ref so the memoised SIP event handler can read the latest value
  const campaignDialActiveRef = useRef(false)
  campaignDialActiveRef.current = campaignDialActive

  // Auto-refresh SIP config from /profile on mount so server/domain/secret
  // stay current even if the admin changed asterisk_server_id after login.
  const sipRefreshed = useRef(false)
  useEffect(() => {
    if (!user || sipRefreshed.current) return
    sipRefreshed.current = true
    authService.getProfile().then((res) => {
      const d = res.data?.data ?? res.data
      if (d?.server || d?.domain || d?.secret) {
        updateUser({ server: d.server, domain: d.domain, secret: d.secret })
      }
    }).catch(() => {})
  }, [user, updateUser])

  const [phoneState, setPhoneState]     = useState<PhoneState>('idle')
  const [number, setNumber]             = useState('')
  const [countryCode, setCountryCode]   = useState('+1')
  const [isMuted, setIsMuted]           = useState(false)
  const [isOnHold, setIsOnHold]         = useState(false)
  const [statusMsg, setStatusMsg]       = useState('Not connected')
  const [incomingFrom, setIncomingFrom] = useState<string | null>(null)
  const [callDuration, setCallDuration] = useState(0)

  const sipStack    = useRef<any>(null)
  const sipRegSess  = useRef<any>(null)
  const sipCallSess = useRef<any>(null)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  const audioRemote   = useRef<HTMLAudioElement>(null)
  const ringtone      = useRef<HTMLAudioElement>(null)
  const ringback      = useRef<HTMLAudioElement>(null)
  const dtmfTone      = useRef<HTMLAudioElement>(null)
  const numberInputRef = useRef<HTMLInputElement>(null)

  // ── Auto-scroll number input to end whenever a digit is appended ──────────
  useEffect(() => {
    const el = numberInputRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [number])

  // ── Call duration timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (phoneState === 'in_call') {
      setCallDuration(0)
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phoneState])

  // ── Publish SIP registration state to global store ────────────────────────
  // Dialer.tsx reads phoneRegistered to decide if "Join Campaign" is allowed.
  const setPhoneInCall      = useFloatingStore(s => s.setPhoneInCall)
  const setPhoneHasIncoming = useFloatingStore(s => s.setPhoneHasIncoming)
  useEffect(() => {
    setPhoneRegistered(phoneState === 'ready' || phoneState === 'in_call')
    setPhoneInCall(phoneState === 'in_call')
    setPhoneHasIncoming(phoneState === 'incoming')
    return () => { setPhoneRegistered(false); setPhoneInCall(false); setPhoneHasIncoming(false) }
  }, [phoneState, setPhoneRegistered, setPhoneInCall, setPhoneHasIncoming])

  // ── Session events ────────────────────────────────────────────────────────
  // Mirrors the reference implementation: discriminate events by comparing
  // e.session against the known register / call session refs, just like
  // the blade file does with (e.session == oSipSessionRegister).
  const onSipEventSession = useCallback((e: any) => {
    console.log('[WebPhone] SESSION event:', e.type, 'isReg:', e.session === sipRegSess.current, 'isCall:', e.session === sipCallSess.current, e)
    const isRegSess  = e.session != null && e.session === sipRegSess.current
    const isCallSess = e.session != null && e.session === sipCallSess.current

    switch (e.type) {
      case 'connecting':
        if (isCallSess) {
          setStatusMsg('Connecting…'); setPhoneState('calling')
        }
        // Ignore 'connecting' on register session — we already show 'Registering…'
        break

      case 'connected':
        if (isRegSess) {
          // Registration succeeded → enable dialpad
          setPhoneState('ready'); setStatusMsg('Ready')
        } else if (isCallSess) {
          ringtone.current?.pause(); ringback.current?.pause()
          setIncomingFrom(null); setStatusMsg('In Call'); setPhoneState('in_call')
        }
        break

      case 'terminating':
      case 'terminated':
        ringtone.current?.pause(); ringback.current?.pause()
        if (ringtone.current) ringtone.current.currentTime = 0
        if (isCallSess) {
          sipCallSess.current = null
          setPhoneState('ready'); setStatusMsg('Ready')
          setIsMuted(false); setIsOnHold(false); setIncomingFrom(null)
        } else if (isRegSess) {
          // Registration session dropped — go fully idle
          sipRegSess.current = null; sipCallSess.current = null
          setPhoneState('idle'); setStatusMsg('Not connected')
          setIsMuted(false); setIsOnHold(false); setIncomingFrom(null)
        }
        break

      case 'i_ao_request': {
        const code: number = e.getSipResponseCode?.() ?? 0
        if (isCallSess && (code === 180 || code === 183)) {
          ringback.current?.play().catch(() => {})
          setStatusMsg('Ringing…')
        }
        break
      }
      case 'm_early_media': ringback.current?.pause(); break
      case 'm_local_hold_ok':   setIsOnHold(true);  setStatusMsg('On Hold'); break
      case 'm_local_hold_nok':  setIsOnHold(false); break
      case 'm_local_resume_ok': setIsOnHold(false); setStatusMsg('In Call'); break
    }
  }, [])

  // ── Stack events ──────────────────────────────────────────────────────────
  const onSipEventStack = useCallback((e: any) => {
    console.log('[WebPhone] STACK event:', e.type, e)
    switch (e.type) {
      case 'started':
        setStatusMsg('Registering…')
        try {
          sipRegSess.current = sipStack.current.newSession('register', {
            expires: 200,
            events_listener: { events: '*', listener: onSipEventSession },
            sip_caps: [{ name: '+g.oma.sip-im' }, { name: 'language', value: '"en,fr"' }],
          })
          sipRegSess.current.register()
        } catch { setPhoneState('error'); setStatusMsg('Registration failed') }
        break

      case 'i_new_call': {
        if (sipCallSess.current) { e.newSession?.hangup(); break }
        sipCallSess.current = e.newSession
        sipCallSess.current.setConfiguration({
          audio_remote: audioRemote.current,
          events_listener: { events: '*', listener: onSipEventSession },
        })
        // getRemoteFriendlyName() is a method on the session object, not the event.
        // Falls back to SIP URI parsing: strips "sip:" prefix and "@domain" suffix.
        const rawFrom: string =
          sipCallSess.current.getRemoteFriendlyName?.() ??
          sipCallSess.current.o_session?.o_uri_from?.s_user_name ??
          ''
        const from = rawFrom
          ? rawFrom.replace(/^sip:/i, '').replace(/@.*$/, '')
          : 'Unknown Caller'

        // Always show incoming call UI with Answer/Decline buttons
        setIncomingFrom(from); setStatusMsg(`Incoming: ${from}`)
        setPhoneState('incoming')
        ringtone.current?.play().catch(() => {})
        setIsOpen(true)

        // Sync to dialer store so IncomingCallModal also shows
        if (!campaignDialActiveRef.current) {
          useDialerStore.getState().setIncomingCall({
            number: from,
            location_id: 0,
            parent_id: 0,
            user_ids: [],
          })
        }
        break
      }

      case 'stopping': setPhoneState('registering'); break
      case 'stopped':  sipStack.current = null; setPhoneState('idle'); setStatusMsg('Not connected'); break
      case 'failed_to_start':
        sipStack.current = null; sipRegSess.current = null; sipCallSess.current = null
        setPhoneState('error'); setStatusMsg('Connection failed'); break
      case 'failed_to_stop': setPhoneState('error'); setStatusMsg('Connection failed'); break

      case 'm_permission_refused':
        // getUserMedia failed (no mic, or permission denied) — the call session
        // will self-terminate; just surface a clear message here
        setStatusMsg('Microphone access denied — check browser permissions')
        break

      case 'i_registration_event': {
        const code: number = e.getSipResponseCode?.() ?? 0
        if (code === 200) { setPhoneState('ready'); setStatusMsg('Ready') }
        else if (code === 401 || code === 403 || code === 407)
          { setPhoneState('error'); setStatusMsg('Auth failed — check credentials') }
        break
      }
    }
  }, [onSipEventSession])

  // ── SIP actions ───────────────────────────────────────────────────────────
  const sipEnable = useCallback(() => {
    if (!sipConfig || !window.SIPml) { setStatusMsg('SIPml not loaded'); setPhoneState('error'); return }
    // If a previous stack exists but we're in error/idle, tear it down so we can reconnect
    if (sipStack.current) {
      if (phoneStateRef.current === 'error' || phoneStateRef.current === 'idle') {
        try { sipStack.current.stop() } catch { /* ignore */ }
        sipStack.current = null; sipRegSess.current = null; sipCallSess.current = null
      } else {
        return // genuinely active stack — don't recreate
      }
    }
    const ext = sipConfig.extension; const domain = sipConfig.domain
    setPhoneState('registering'); setStatusMsg('Connecting…')
    try {
      window.SIPml.setDebugLevel('error')
      sipStack.current = new window.SIPml.Stack({
        realm: domain, impi: ext, impu: `sip:${ext}@${domain}`,
        password: sipConfig.password, display_name: user?.name ?? ext,
        websocket_proxy_url: sipConfig.wsUri, ice_servers: null,
        enable_rtcweb_breaker: false,
        events_listener: { events: '*', listener: onSipEventStack },
        sip_headers: [{ name: 'User-Agent', value: 'DialerCRM/1.0' }],
        bandwidth: null, video_size: null,
        enable_early_ims: false, enable_media_stream_cache: true,
      })
      sipStack.current.start()
    } catch { setPhoneState('error'); setStatusMsg('Failed to initialize') }
  }, [sipConfig, user, onSipEventStack])

  const sipDisable = useCallback(() => {
    try { sipStack.current?.stop() } catch { /* ignore */ }
    sipStack.current = null; sipRegSess.current = null; sipCallSess.current = null
    ringtone.current?.pause(); ringback.current?.pause()
    setPhoneState('idle'); setStatusMsg('Not connected')
    setIsMuted(false); setIsOnHold(false); setIncomingFrom(null); setNumber('')
  }, [])

  const sipCall = useCallback(() => {
    const raw = number.trim().replace(/\s/g, '')
    const dialNumber = countryCode + raw
    // Validation: local number must be at least 3 digits
    if (!raw || raw.length < 3) return
    if (!sipStack.current) return
    try {
      sipCallSess.current = sipStack.current.newSession('call-audio', {
        audio_remote: audioRemote.current,
        events_listener: { events: '*', listener: onSipEventSession },
        sip_caps: [{ name: '+g.oma.sip-im' }, { name: 'language', value: '"en,fr"' }],
      })
      sipCallSess.current.call(dialNumber)
      setPhoneState('calling'); setStatusMsg(`Calling ${dialNumber}…`)
    } catch { setStatusMsg('Call failed to initiate') }
  }, [number, countryCode, onSipEventSession])

  // ── Outbound campaign dial (called by Dialer for WebRTC mode) ────────────
  const sipDialOutbound = useCallback(async (phoneNumber: string) => {
    if (!sipStack.current) throw new Error('WebPhone not connected — please reconnect and try again')
    const digits = phoneNumber.replace(/[^0-9+]/g, '')
    if (digits.length < 3) throw new Error('Invalid phone number')

    // Pre-check: verify at least one audio input device exists before SIPml5
    // tries getUserMedia internally (avoids silent ringback loop on headset-less machines)
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      if (!devices.some(d => d.kind === 'audioinput')) {
        throw new Error('No microphone found — please connect a headset and try again')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone check failed — connect a headset and try again'
      setPhoneState('error'); setStatusMsg(msg)
      throw new Error(msg)
    }

    try {
      sipCallSess.current = sipStack.current.newSession('call-audio', {
        audio_remote: audioRemote.current,
        events_listener: { events: '*', listener: onSipEventSession },
        sip_caps: [{ name: '+g.oma.sip-im' }, { name: 'language', value: '"en,fr"' }],
      })
      sipCallSess.current.call(digits)
      setPhoneState('calling'); setStatusMsg(`Calling ${digits}…`)
    } catch (err) { setStatusMsg('Call failed to initiate'); throw err }
  }, [onSipEventSession])

  const sipAnswerIncoming = useCallback(() => {
    if (!sipCallSess.current) return
    try {
      sipCallSess.current.accept({
        audio_remote: audioRemote.current,
        events_listener: { events: '*', listener: onSipEventSession },
      })
      ringtone.current?.pause(); setIncomingFrom(null)
      setPhoneState('in_call'); setStatusMsg('In Call')
    } catch { setStatusMsg('Failed to answer') }
  }, [onSipEventSession])

  // ── Decline incoming call ─────────────────────────────────────────────────
  // Uses SIPml5 reject() which fires the REJECT action → sends 486 Busy Here
  // to the INVITE. This is different from hangup() (which fires HANGUP/CANCEL).
  // sipCallSess.current is intentionally NOT nulled here — it stays non-null
  // until the 'terminated' event fires, which blocks any retried INVITE:
  //   i_new_call guard: if (sipCallSess.current) { e.newSession.hangup(); break }
  const sipDecline = useCallback(() => {
    const sess = sipCallSess.current
    if (!sess) return
    try {
      sess.reject({ events_listener: { events: '*', listener: onSipEventSession } })
    } catch {
      // Fallback to hangup if reject() throws (e.g. session already gone)
      try { sess.hangup({ events_listener: { events: '*', listener: onSipEventSession } }) } catch { /* ignore */ }
    }
    // Stop ringtone immediately — session ref + state cleaned up by 'terminated' event
    ringtone.current?.pause()
    if (ringtone.current) ringtone.current.currentTime = 0
    // Hide the incoming popup immediately for instant feedback
    setIncomingFrom(null)
  }, [onSipEventSession])

  // ── Hang up active call ───────────────────────────────────────────────────
  // Uses hangup() which sends BYE on established calls.
  // Same session-ref preservation: terminated event handles final cleanup.
  const sipHangUp = useCallback(() => {
    try { sipCallSess.current?.hangup({ events_listener: { events: '*', listener: onSipEventSession } }) }
    catch { /* ignore */ }
    ringtone.current?.pause(); ringback.current?.pause()
    setIncomingFrom(null)
  }, [onSipEventSession])

  const sipDtmf = useCallback((char: string) => {
    if (sipCallSess.current) {
      try { sipCallSess.current.dtmf(char) } catch { /* ignore */ }
      dtmfTone.current?.play().catch(() => {})
    } else {
      setNumber(n => n + char)
    }
  }, [])

  const sipToggleMute = useCallback(() => {
    if (!sipCallSess.current) return
    const next = !isMuted; sipCallSess.current.mute('audio', next); setIsMuted(next)
  }, [isMuted])

  const sipToggleHold = useCallback(() => {
    if (!sipCallSess.current) return
    if (isOnHold) sipCallSess.current.resume(); else sipCallSess.current.hold()
  }, [isOnHold])

  const sipTransfer = useCallback((ext: string) => {
    if (!sipCallSess.current || !ext.trim()) return
    try { sipCallSess.current.transfer(ext.trim()); setStatusMsg(`Transferring to ${ext}…`) }
    catch { /* ignore */ }
  }, [])

  useEffect(() => () => {
    try { sipStack.current?.stop() } catch { /* ignore */ }
    ringtone.current?.pause()
    ringback.current?.pause()
  }, [])

  // Keep refs to latest values so the registered handler is stable (registered once)
  // This avoids an infinite loop caused by sipConfig being recreated every render in useAuth()
  const phoneStateRef = useRef(phoneState)
  const phoneOpenRef  = useRef(isOpen)
  const sipEnableRef  = useRef(sipEnable)
  phoneStateRef.current = phoneState
  phoneOpenRef.current  = isOpen
  sipEnableRef.current  = sipEnable

  // Register FAB click handler once on mount — reads latest values via refs
  useEffect(() => {
    registerPhoneClick(() => {
      if (phoneStateRef.current === 'idle' || phoneStateRef.current === 'error') {
        sipEnableRef.current()
        setPhoneOpen(true)
      } else {
        setPhoneOpen(!phoneOpenRef.current)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Register SIP answer/decline so IncomingCallModal can trigger them
  const sipAnswerRef  = useRef(sipAnswerIncoming)
  const sipDeclineRef = useRef(sipDecline)
  sipAnswerRef.current  = sipAnswerIncoming
  sipDeclineRef.current = sipDecline
  useEffect(() => {
    registerSipAnswer(() => {
      sipAnswerRef.current()
      useDialerStore.getState().setIncomingCall(null)
    })
    registerSipDecline(() => {
      sipDeclineRef.current()
      useDialerStore.getState().setIncomingCall(null)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Register SIP outbound dial so Dialer can trigger WebRTC campaign calls
  const sipDialOutboundRef = useRef(sipDialOutbound)
  sipDialOutboundRef.current = sipDialOutbound
  useEffect(() => {
    registerSipDial((phoneNumber: string) => {
      sipDialOutboundRef.current(phoneNumber)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-connect when SIP credentials are ready — so the user doesn't have to manually click
  useEffect(() => {
    if (sipConfig?.isConfigured && phoneStateRef.current === 'idle') {
      sipEnableRef.current()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sipConfig?.isConfigured])

  if (!user || !sipConfig) return null

  // Server address missing in user profile — show a clear card instead of
  // attempting to connect (which would produce "wss://undefined:8089/ws").
  if (!sipConfig.isConfigured) {
    return (
      <DraggableWidget
        isOpen={isOpen}
        onClose={() => setPhoneOpen(false)}
        onMinimize={setPhoneMinimized}
        headerGradient="linear-gradient(160deg, #0a0f1e 0%, #111827 50%, #1c1854 100%)"
        defaultRight={phoneRight}
        defaultBottom={20}
        width={320}
        zIndex={62}
        bodyHeight={200}
        headerLeft={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.2)' }} />
            <p style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 700 }}>WebPhone</p>
          </div>
        }
      >
        <div style={{ background: '#080d1a', minHeight: '100%', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
          <ShieldAlert size={28} style={{ color: '#F87171' }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: '#F87171' }}>SIP Not Configured</p>
          <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.7)', lineHeight: 1.55 }}>
            Your account is missing the Asterisk server address or SIP extension.
            Contact your administrator to configure your user profile.
          </p>
        </div>
      </DraggableWidget>
    )
  }

  if (!sipConfig.extension) return null

  // ── Derived state ─────────────────────────────────────────────────────────
  const isInCall    = phoneState === 'in_call'
  const isCalling   = phoneState === 'calling'
  const isConnected = phoneState === 'ready'
  const isBusy      = phoneState === 'registering'
  const hasIncoming = phoneState === 'incoming'
  const dialReady   = isConnected && number.trim().length >= 3
  const stateLabel  = isOnHold ? 'On Hold' : STATUS_LABEL[phoneState]
  const dotColor    = isOnHold ? '#3B82F6' : STATUS_COLOR[phoneState]

  // FAB gradient: red=idle/error, amber=busy/calling, indigo=incoming, green=ready/in_call
  const fabBg = (isConnected || isInCall)
    ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)'
    : hasIncoming
      ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
      : isBusy || isCalling
        ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
        : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
  const fabShadow = (isConnected || isInCall)
    ? '0 6px 24px rgba(34,197,94,0.5)'
    : hasIncoming
      ? '0 6px 24px rgba(99,102,241,0.6)'
      : isBusy || isCalling
        ? '0 6px 24px rgba(245,158,11,0.5)'
        : '0 6px 24px rgba(239,68,68,0.5)'

  const isActive   = isConnected || isInCall || isCalling || isBusy || hasIncoming
  const powerBg    = isActive ? '#EF4444' : '#22C55E'
  const powerTitle = isActive ? 'Disable WebPhone' : 'Enable WebPhone'
  const canToggle  = !isBusy

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) ?? COUNTRY_CODES[0]

  return (
    <>
      <audio ref={audioRemote} autoPlay />
      <audio ref={ringtone}  loop src="/asset/audio/ringtone.wav" />
      <audio ref={ringback}  loop src="/asset/audio/ringbacktone.wav" />
      <audio ref={dtmfTone}       src="/asset/audio/dtmf.wav" />

      {hasIncoming && (
        <IncomingCallPopup
          from={incomingFrom!}
          onAnswer={sipAnswerIncoming}
          onReject={sipDecline}
        />
      )}

      <DraggableWidget
        isOpen={isOpen}
        onClose={() => setPhoneOpen(false)}
        onMinimize={setPhoneMinimized}
        headerGradient="linear-gradient(160deg, #0a0f1e 0%, #111827 50%, #1c1854 100%)"
        defaultRight={phoneRight}
        defaultBottom={20}
        width={320}
        zIndex={62}
        bodyHeight={470}
        headerLeft={
          <>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: dotColor,
              boxShadow: `0 0 0 3px ${dotColor}28, 0 0 10px ${dotColor}80`,
              animation: (isInCall || isCalling) ? 'pulse 1.5s infinite' : undefined,
            }} />
            <div>
              <p style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>WebPhone</p>
              <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: 10, fontFamily: 'monospace', marginTop: 3 }}>
                {sipConfig.extension}
              </p>
            </div>
          </>
        }
        headerRight={
          <button
            onClick={canToggle ? (isActive ? sipDisable : sipEnable) : undefined}
            disabled={!canToggle}
            title={powerTitle}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isBusy ? '#F59E0B' : powerBg,
              opacity: !canToggle ? 0.5 : 1,
              flexShrink: 0,
              transition: 'opacity 0.15s',
            }}
          >
            {isBusy
              ? <Loader2 size={13} className="text-white animate-spin" />
              : <Power size={13} className="text-white" />}
          </button>
        }
      >

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* Dark phone body                                                    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div style={{ background: '#080d1a', minHeight: '100%' }}>

          {/* ── Status strip ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 16px',
            background: isOnHold
              ? 'rgba(59,130,246,0.14)'
              : isInCall
                ? 'rgba(34,197,94,0.12)'
                : (isCalling || isBusy)
                  ? 'rgba(245,158,11,0.12)'
                  : phoneState === 'error'
                    ? 'rgba(239,68,68,0.12)'
                    : 'rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: dotColor,
                boxShadow: `0 0 6px ${dotColor}cc`,
              }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: dotColor, letterSpacing: '0.06em' }}>
                {stateLabel.toUpperCase()}
              </span>
            </div>
            {isInCall && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={10} style={{ color: '#22C55E' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#22C55E', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                  {fmt(callDuration)}
                </span>
              </div>
            )}
          </div>

          {/* ── Error ── */}
          {phoneState === 'error' && (
            <div style={{ margin: '12px 14px', borderRadius: 12, padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <ShieldAlert size={13} style={{ color: '#F87171', flexShrink: 0 }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: '#F87171' }}>{statusMsg}</p>
              </div>
              <p style={{ fontSize: 11, color: '#FCA5A5', lineHeight: 1.55, marginBottom: 8 }}>
                Check your SIP credentials and server connectivity, then retry.
              </p>
              <button
                onClick={() => { setPhoneState('idle'); setTimeout(sipEnable, 100) }}
                style={{
                  width: '100%', height: 38, borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg,#F59E0B,#D97706)',
                  color: '#fff', fontWeight: 700, fontSize: 12, letterSpacing: '0.04em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Loader2 size={12} /> Retry Connection
              </button>
            </div>
          )}

          {/* ── CALLING ── */}
          {isCalling && (
            <div style={{ padding: '28px 16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              {/* Animated rings */}
              <div style={{ position: 'relative', width: 88, height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="animate-ping" style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'rgba(245,158,11,0.18)',
                }} />
                <div className="animate-ping" style={{
                  position: 'absolute', inset: 12, borderRadius: '50%',
                  background: 'rgba(245,158,11,0.14)',
                  animationDelay: '0.3s',
                }} />
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(245,158,11,0.12)',
                  border: '2px solid rgba(245,158,11,0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <PhoneCall size={28} style={{ color: '#F59E0B' }} className="animate-pulse" />
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.18em', marginBottom: 6 }}>CALLING</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#F8FAFC', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                  {countryCode}{number}
                </p>
                {selectedCountry && (
                  <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', marginTop: 4 }}>
                    {selectedCountry.flag} {selectedCountry.name}
                  </p>
                )}
              </div>
              <button
                onClick={sipHangUp}
                style={{
                  width: '100%', height: 52, borderRadius: 26, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg,#EF4444,#DC2626)',
                  boxShadow: '0 6px 28px rgba(239,68,68,0.45)',
                  color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <PhoneOff size={17} /> Cancel Call
              </button>
            </div>
          )}

          {/* ── IN CALL ── */}
          {isInCall && (
            <div>
              {/* Caller display */}
              <div style={{ padding: '14px 16px 10px', textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  border: '2.5px solid rgba(34,197,94,0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 8px',
                  boxShadow: '0 0 20px rgba(34,197,94,0.2)',
                }}>
                  <Phone size={24} style={{ color: '#22C55E' }} />
                </div>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#F8FAFC', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                  {number || incomingFrom || '—'}
                </p>
              </div>

              {/* DTMF */}
              <div style={{ padding: '0 14px 6px' }}>
                <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)', padding: '6px 12px' }}>
                  <input
                    ref={numberInputRef}
                    readOnly
                    className="w-full bg-transparent outline-none font-mono"
                    style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', border: 'none' }}
                    placeholder="DTMF…"
                    value={number}
                  />
                </div>
              </div>

              <DialPad onPress={sipDtmf} compact />

              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '6px 0' }} />

              <CallControls
                isMuted={isMuted}
                isOnHold={isOnHold}
                onToggleMute={sipToggleMute}
                onToggleHold={sipToggleHold}
                onTransfer={sipTransfer}
              />

              {/* Hang up */}
              <div style={{ padding: '8px 14px 16px' }}>
                <button
                  onClick={sipHangUp}
                  style={{
                    width: '100%', height: 52, borderRadius: 26, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg,#EF4444,#DC2626)',
                    boxShadow: '0 6px 28px rgba(239,68,68,0.45)',
                    color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '0.05em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <PhoneOff size={18} /> HANG UP
                </button>
              </div>
            </div>
          )}

          {/* ── IDLE / READY: dialpad ── */}
          {!isInCall && !isCalling && (
            <div>
              {/* Country selector */}
              <div style={{ padding: '12px 14px 4px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.05)', borderRadius: 11,
                  padding: '7px 12px', border: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <select
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      disabled={!isConnected}
                      style={{
                        appearance: 'none', WebkitAppearance: 'none',
                        background: 'transparent', border: 'none', outline: 'none',
                        color: isConnected ? '#CBD5E1' : 'rgba(148,163,184,0.35)',
                        fontFamily: 'monospace', fontSize: 12, fontWeight: 600,
                        cursor: isConnected ? 'pointer' : 'default',
                        paddingRight: 16, minWidth: 66,
                      }}
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code} style={{ background: '#1e293b', color: '#e2e8f0' }}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={10} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
                  </div>
                  <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(100,116,139,0.8)', fontFamily: 'monospace', flex: 1 }}>
                    {selectedCountry?.name ?? ''}
                  </span>
                </div>
              </div>

              {/* Number display */}
              <div style={{ padding: '8px 14px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 68 }}>
                <input
                  ref={numberInputRef}
                  className="bg-transparent outline-none text-center font-mono placeholder:text-slate-700"
                  style={{
                    flex: 1,
                    border: 'none',
                    fontSize: number.length > 10 ? 20 : number.length > 6 ? 26 : 32,
                    fontWeight: 700,
                    color: number ? '#F8FAFC' : 'rgba(71,85,105,0.6)',
                    letterSpacing: '0.06em',
                    transition: 'font-size 0.15s ease',
                    cursor: isConnected ? 'text' : 'default',
                  }}
                  placeholder="· · · · · · · ·"
                  value={number}
                  disabled={!isConnected}
                  inputMode="numeric"
                  onChange={e => setNumber(e.target.value.replace(/[^0-9+*#]/g, ''))}
                  onKeyDown={e => { if (e.key === 'Enter' && dialReady) sipCall() }}
                />
                {number && isConnected && (
                  <button
                    onClick={() => setNumber(n => n.slice(0, -1))}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569', padding: 4, borderRadius: 8, flexShrink: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                  >
                    <Delete size={17} />
                  </button>
                )}
              </div>

              {/* Dial preview */}
              {isConnected && number.trim() && (
                <p style={{ textAlign: 'center', fontSize: 10, color: '#334155', fontFamily: 'monospace', marginBottom: 4 }}>
                  <span style={{ color: '#818cf8', fontWeight: 700 }}>{countryCode}{number}</span>
                  {selectedCountry && <span style={{ marginLeft: 4 }}>{selectedCountry.flag}</span>}
                </p>
              )}

              {/* Dialpad */}
              <div style={{ opacity: isConnected ? 1 : 0.3, pointerEvents: isConnected ? 'auto' : 'none' }}>
                <DialPad onPress={sipDtmf} />
              </div>

              {/* Action button */}
              <div style={{ padding: '8px 14px 16px' }}>
                {(phoneState === 'idle' || phoneState === 'registering' || phoneState === 'error') ? (
                  <button
                    onClick={sipEnable}
                    disabled={isBusy}
                    style={{
                      width: '100%', height: 52, borderRadius: 26, border: 'none',
                      cursor: isBusy ? 'not-allowed' : 'pointer',
                      background: isBusy
                        ? 'linear-gradient(135deg,#F59E0B,#D97706)'
                        : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                      boxShadow: isBusy
                        ? '0 4px 20px rgba(245,158,11,0.35)'
                        : '0 4px 20px rgba(99,102,241,0.4)',
                      color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      opacity: isBusy ? 0.9 : 1,
                    }}
                  >
                    {isBusy
                      ? <><Loader2 size={16} className="animate-spin" /> Connecting…</>
                      : <><Power size={16} /> Enable WebPhone</>
                    }
                  </button>
                ) : (
                  <button
                    onClick={sipCall}
                    disabled={!dialReady}
                    style={{
                      width: '100%', height: 52, borderRadius: 26, border: 'none',
                      cursor: dialReady ? 'pointer' : 'not-allowed',
                      background: 'linear-gradient(135deg,#22C55E,#16A34A)',
                      boxShadow: dialReady ? '0 6px 28px rgba(34,197,94,0.5)' : 'none',
                      color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '0.05em',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      opacity: dialReady ? 1 : 0.3,
                      transition: 'opacity 0.15s, box-shadow 0.15s',
                    }}
                  >
                    <Phone size={18} /> CALL
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </DraggableWidget>
    </>
  )
}
