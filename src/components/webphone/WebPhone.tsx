import { useRef, useState, useCallback, useEffect } from 'react'
import {
  Phone, PhoneOff, Loader2, PhoneCall,
  Power, Delete, ExternalLink, ShieldAlert, Clock, ChevronDown,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useFloatingStore } from '../../stores/floating.store'
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

  const isOpen            = useFloatingStore(s => s.phoneOpen)
  const setPhoneOpen      = useFloatingStore(s => s.setPhoneOpen)
  const registerPhoneClick = useFloatingStore(s => s.registerPhoneClick)
  const setIsOpen = setPhoneOpen

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

  // ── Session events ────────────────────────────────────────────────────────
  // Mirrors the reference implementation: discriminate events by comparing
  // e.session against the known register / call session refs, just like
  // the blade file does with (e.session == oSipSessionRegister).
  const onSipEventSession = useCallback((e: any) => {
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
        setIncomingFrom(from); setStatusMsg(`Incoming: ${from}`)
        setPhoneState('incoming')
        ringtone.current?.play().catch(() => {})
        setIsOpen(true); break
      }

      case 'stopping': setPhoneState('registering'); break
      case 'stopped':  sipStack.current = null; setPhoneState('idle'); setStatusMsg('Not connected'); break
      case 'failed_to_start':
      case 'failed_to_stop': setPhoneState('error'); setStatusMsg('Connection failed'); break

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
    if (sipStack.current) return
    const ext = sipConfig.extension; const domain = sipConfig.domain
    setPhoneState('registering'); setStatusMsg('Connecting…')
    try {
      window.SIPml.setDebugLevel('error')
      sipStack.current = new window.SIPml.Stack({
        realm: domain, impi: ext, impu: `sip:${ext}@${domain}`,
        password: sipConfig.password, display_name: user?.name ?? ext,
        websocket_proxy_url: sipConfig.wsUri, ice_servers: null,
        enable_rtcweb_breaker: true,
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

  if (!user || !sipConfig || !sipConfig.extension) return null

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

      {/* Incoming call popup */}
      {hasIncoming && (
        <IncomingCallPopup
          from={incomingFrom!}
          onAnswer={sipAnswerIncoming}
          onReject={sipDecline}
        />
      )}

      {/* ── Main panel ─────────────────────────────────────────────────────── */}
      <DraggableWidget
        isOpen={isOpen}
        onClose={() => setPhoneOpen(false)}
        headerGradient="linear-gradient(145deg, #1e1b4b 0%, #312e81 55%, #4338ca 100%)"
        defaultRight={16}
        defaultBottom={80}
        width={300}
        zIndex={62}
        bodyHeight={440}
        headerLeft={
          <>
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: dotColor, boxShadow: `0 0 0 3px ${dotColor}33, 0 0 8px ${dotColor}66` }}
            />
            <div>
              <p className="text-white text-sm font-bold leading-none">Softphone</p>
              <p className="leading-none mt-0.5" style={{ fontSize: '10px', color: 'rgba(165,180,252,0.8)', fontFamily: 'monospace' }}>
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
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: isBusy ? '#F59E0B' : powerBg }}
          >
            {isBusy ? <Loader2 size={13} className="text-white animate-spin" /> : <Power size={13} className="text-white" />}
          </button>
        }
      >
        <div>

          {/* ── Status bar ─────────────────────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-4 py-1.5"
            style={{
              background: isOnHold
                ? 'linear-gradient(90deg,#EFF6FF,#DBEAFE)'
                : isInCall
                  ? 'linear-gradient(90deg,#F0FDF4,#DCFCE7)'
                  : isCalling || isBusy
                    ? 'linear-gradient(90deg,#FFFBEB,#FEF3C7)'
                    : phoneState === 'error'
                      ? 'linear-gradient(90deg,#FEF2F2,#FEE2E2)'
                      : '#F8FAFC',
            }}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: dotColor, letterSpacing: '0.04em' }}>
                {stateLabel}
              </span>
            </div>
            {/* Timer — only during active call */}
            {isInCall && (
              <div className="flex items-center gap-1">
                <Clock size={11} style={{ color: '#22C55E' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                  {fmt(callDuration)}
                </span>
              </div>
            )}
          </div>

          {/* ── Error state ─────────────────────────────────────────────────── */}
          {phoneState === 'error' && (
            <div className="mx-4 mt-3 rounded-xl p-3 space-y-2" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <div className="flex items-center gap-1.5">
                <ShieldAlert size={12} className="text-orange-500 flex-shrink-0" />
                <p className="text-xs font-semibold text-orange-700">{statusMsg}</p>
              </div>
              {sipConfig.certUrl && (
                <>
                  <p className="text-xs text-orange-600 leading-relaxed">
                    If this is a certificate error, accept the SIP server cert first, then retry.
                  </p>
                  <a href={sipConfig.certUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 underline">
                    <ExternalLink size={10} /> {sipConfig.certUrl}
                  </a>
                </>
              )}
              <button
                onClick={() => { setPhoneState('idle'); setTimeout(sipEnable, 100) }}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white py-2"
                style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 2px 8px rgba(245,158,11,0.35)' }}
              >
                <Loader2 size={12} /> Retry Connection
              </button>
            </div>
          )}

          {/* ── CALLING state: show who we're calling + cancel ─────────────── */}
          {isCalling && (
            <div className="px-4 py-2.5 flex flex-col items-center gap-2.5">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', border: '2px solid #F59E0B' }}>
                  <PhoneCall size={24} style={{ color: '#D97706' }} className="animate-pulse" />
                </div>
                <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#F59E0B' }}>Calling</p>
                <p className="text-lg font-bold font-mono text-slate-800 tracking-wider">
                  {countryCode}{number}
                </p>
              </div>
              <button
                onClick={sipHangUp}
                className="w-full flex items-center justify-center gap-2 rounded-2xl font-bold text-white"
                style={{
                  height: '40px', fontSize: '14px', letterSpacing: '0.04em',
                  background: 'linear-gradient(135deg,#EF4444 0%,#DC2626 100%)',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
                }}
              >
                <PhoneOff size={16} /> Cancel Call
              </button>
            </div>
          )}

          {/* ── IN CALL state: timer + DTMF + controls + hangup ───────────── */}
          {isInCall && (
            <>
              {/* DTMF dialpad */}
              <div className="pt-3 pb-1">
                <div className="px-4 pb-2">
                  <div
                    className="relative flex items-center"
                    style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '12px' }}
                  >
                    <input
                      ref={numberInputRef}
                      className="flex-1 bg-transparent outline-none font-mono py-2.5 px-3"
                      style={{ fontSize: '14px', fontWeight: 600, color: '#475569', letterSpacing: '0.04em',
                               minWidth: 0, width: 0, overflow: 'hidden' }}
                      placeholder="DTMF / digits"
                      value={number}
                      readOnly
                    />
                  </div>
                </div>
                <DialPad onPress={sipDtmf} />
              </div>

              {/* Mute / Hold / Transfer */}
              <div style={{ height: '1px', background: '#F1F5F9', margin: '4px 16px' }} />
              <div className="py-2">
                <CallControls
                  isMuted={isMuted}
                  isOnHold={isOnHold}
                  onToggleMute={sipToggleMute}
                  onToggleHold={sipToggleHold}
                  onTransfer={sipTransfer}
                />
              </div>

              {/* Hang Up */}
              <div className="px-4 pb-2.5 pt-1">
                <button
                  onClick={sipHangUp}
                  className="w-full flex items-center justify-center gap-2.5 rounded-2xl font-bold text-white"
                  style={{
                    height: '40px', fontSize: '14px', letterSpacing: '0.04em',
                    background: 'linear-gradient(135deg,#EF4444 0%,#DC2626 100%)',
                    boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
                  }}
                >
                  <PhoneOff size={16} /> HANG UP
                </button>
              </div>
            </>
          )}

          {/* ── IDLE / REGISTERED: country code + number + dialpad + call ──── */}
          {!isInCall && !isCalling && (
            <>
              {/* Number input row */}
              <div className="px-4 pt-2 pb-1">
                <div
                  className="flex items-center gap-0 overflow-hidden"
                  style={{ border: '1.5px solid #E2E8F0', borderRadius: '14px', background: '#F8FAFC' }}
                >
                  {/* Country code selector */}
                  <div className="relative flex-shrink-0" style={{ borderRight: '1.5px solid #E2E8F0' }}>
                    <select
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      disabled={!isConnected}
                      className="appearance-none outline-none bg-transparent cursor-pointer font-mono font-semibold pr-5 pl-3 py-2.5"
                      style={{
                        fontSize: '13px',
                        color: isConnected ? '#1E293B' : '#94A3B8',
                        minWidth: '72px',
                      }}
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={11}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: '#94A3B8' }}
                    />
                  </div>

                  {/* Number input */}
                  <input
                    ref={numberInputRef}
                    className="flex-1 bg-transparent outline-none font-mono py-2.5 px-2"
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#1E293B',
                      letterSpacing: '0.04em',
                      opacity: isConnected ? 1 : 0.4,
                      minWidth: 0,
                      width: 0,           /* force flex to control width, never auto-expand */
                      overflow: 'hidden', /* clip — scrollLeft handles visibility */
                    }}
                    placeholder={isConnected ? 'Number' : '–'}
                    value={number}
                    disabled={!isConnected}
                    inputMode="numeric"
                    onChange={e => setNumber(e.target.value.replace(/[^0-9+*#]/g, ''))}
                    onKeyDown={e => { if (e.key === 'Enter' && dialReady) sipCall() }}
                  />

                  {/* Backspace */}
                  {number && isConnected && (
                    <button
                      onClick={() => setNumber(n => n.slice(0, -1))}
                      className="p-2.5 flex-shrink-0 transition-colors"
                      style={{ color: '#94A3B8' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#475569')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
                    >
                      <Delete size={15} />
                    </button>
                  )}
                </div>

                {/* Preview: full dial number */}
                {isConnected && number.trim() && (
                  <p className="text-center mt-1.5" style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace' }}>
                    Will dial: <span style={{ color: '#6366F1', fontWeight: 700 }}>{countryCode}{number.trim()}</span>
                    {selectedCountry && (
                      <span style={{ marginLeft: '4px' }}>{selectedCountry.flag} {selectedCountry.name}</span>
                    )}
                  </p>
                )}
              </div>

              {/* Dialpad */}
              <div
                className="py-1"
                style={{ opacity: isConnected ? 1 : 0.3, pointerEvents: isConnected ? 'auto' : 'none' }}
              >
                <DialPad onPress={sipDtmf} />
              </div>

              {/* Call button */}
              <div className="px-4 pb-2.5">
                {(phoneState === 'idle' || phoneState === 'registering' || phoneState === 'error') ? (
                  <button
                    onClick={sipEnable}
                    disabled={isBusy}
                    className="w-full flex items-center justify-center gap-2.5 rounded-2xl font-bold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      height: '40px', fontSize: '13px', letterSpacing: '0.04em',
                      background: isBusy
                        ? 'linear-gradient(135deg,#F59E0B 0%,#D97706 100%)'
                        : 'linear-gradient(135deg,#6366F1 0%,#8B5CF6 100%)',
                      boxShadow: isBusy ? '0 4px 16px rgba(245,158,11,0.35)' : '0 4px 16px rgba(99,102,241,0.35)',
                    }}
                  >
                    {isBusy
                      ? <><Loader2 size={15} className="animate-spin" /> Connecting…</>
                      : <><Power size={15} /> Enable WebPhone</>
                    }
                  </button>
                ) : (
                  <button
                    onClick={sipCall}
                    disabled={!dialReady}
                    className="w-full flex items-center justify-center gap-2.5 rounded-2xl font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed"
                    style={{
                      height: '40px', fontSize: '14px', letterSpacing: '0.04em',
                      background: 'linear-gradient(135deg,#22C55E 0%,#16A34A 100%)',
                      boxShadow: dialReady ? '0 4px 16px rgba(34,197,94,0.4)' : 'none',
                    }}
                  >
                    <Phone size={16} /> CALL
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </DraggableWidget>

      {/* FAB is now handled by FloatingFab in AppLayout */}
    </>
  )
}
