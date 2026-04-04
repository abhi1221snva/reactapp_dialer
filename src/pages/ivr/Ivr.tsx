import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, PhoneCall, Music, X,
  Mic, Upload, Volume2, AlertCircle,
  CheckCircle2, Loader2, Play, Square,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ivrService } from '../../services/ivr.service'
import { confirmDelete } from '../../utils/confirmDelete'
import { useAuthStore } from '../../stores/auth.store'
import { cn } from '../../utils/cn'
import { ServerDataTable } from '../../components/ui/ServerDataTable'
import type { Column } from '../../components/ui/ServerDataTable'
import { useServerTable } from '../../hooks/useServerTable'
import { useDialerHeader } from '../../layouts/DialerLayout'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Ivr {
  id?: number
  auto_id?: number
  ivr_id: string
  ann_id?: string
  ivr_desc: string
  language?: string
  voice_name?: string
  speech_text?: string
  prompt_option?: string | number
  speed?: string
  pitch?: string
  [key: string]: unknown
}

interface IvrMenuItem {
  id?: number
  ivr_m_id?: number
  ivr_id: string
  dtmf: string
  dtmf_title?: string
  dest_type: string
  dest: string
  [key: string]: unknown
}

interface AudioMessage {
  id?: number
  auto_id?: number
  ann_id?: string
  ivr_id?: string
  ivr_desc: string
  language?: string
  voice_name?: string
  speech_text?: string
  prompt_option?: string
  speed?: string
  pitch?: string
  [key: string]: unknown
}

// ── Constants ─────────────────────────────────────────────────────────────────

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

const DEST_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  '0': { label: 'Extension', color: 'text-indigo-700',  bg: 'bg-indigo-50'  },
  '1': { label: 'Queue',     color: 'text-emerald-700', bg: 'bg-emerald-50' },
  '2': { label: 'Voicemail', color: 'text-amber-700',   bg: 'bg-amber-50'   },
  '3': { label: 'IVR',       color: 'text-blue-700',    bg: 'bg-blue-50'    },
  '4': { label: 'Hangup',    color: 'text-red-700',     bg: 'bg-red-50'     },
  '5': { label: 'External',  color: 'text-purple-700',  bg: 'bg-purple-50'  },
}

const LANGUAGES = [
  { value: 'ar-XA', label: 'Arabic' },
  { value: 'zh-CN', label: 'Chinese (Mandarin, China)' },
  { value: 'zh-TW', label: 'Chinese (Traditional, Taiwan)' },
  { value: 'da-DK', label: 'Danish (Denmark)' },
  { value: 'nl-NL', label: 'Dutch (Netherlands)' },
  { value: 'en-AU', label: 'English (Australia)' },
  { value: 'en-IN', label: 'English (India)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'en-US', label: 'English (United States)' },
  { value: 'fi-FI', label: 'Finnish (Finland)' },
  { value: 'fr-CA', label: 'French (Canada)' },
  { value: 'fr-FR', label: 'French (France)' },
  { value: 'de-DE', label: 'German (Germany)' },
  { value: 'el-GR', label: 'Greek (Greece)' },
  { value: 'hi-IN', label: 'Hindi (India)' },
  { value: 'id-ID', label: 'Indonesian (Indonesia)' },
  { value: 'it-IT', label: 'Italian (Italy)' },
  { value: 'ja-JP', label: 'Japanese (Japan)' },
  { value: 'ko-KR', label: 'Korean (South Korea)' },
  { value: 'ms-MY', label: 'Malay (Malaysia)' },
  { value: 'nb-NO', label: 'Norwegian (Norway)' },
  { value: 'pl-PL', label: 'Polish (Poland)' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'pt-PT', label: 'Portuguese (Portugal)' },
  { value: 'ro-RO', label: 'Romanian (Romania)' },
  { value: 'ru-RU', label: 'Russian (Russia)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'es-MX', label: 'Spanish (Mexico)' },
  { value: 'es-US', label: 'Spanish (United States)' },
  { value: 'sv-SE', label: 'Swedish (Sweden)' },
  { value: 'tr-TR', label: 'Turkish (Turkey)' },
  { value: 'uk-UA', label: 'Ukrainian (Ukraine)' },
  { value: 'cy-GB', label: 'Welsh (United Kingdom)' },
]

// Migrate old short language codes (stored in DB) to full BCP-47 codes
const LANG_MIGRATE: Record<string, string> = {
  'ar': 'ar-XA', 'zh': 'zh-CN', 'da': 'da-DK', 'nl': 'nl-NL', 'en': 'en-US',
  'fi': 'fi-FI', 'fr': 'fr-FR', 'de': 'de-DE', 'el': 'el-GR', 'hi': 'hi-IN',
  'id': 'id-ID', 'it': 'it-IT', 'ja': 'ja-JP', 'ko': 'ko-KR', 'ms': 'ms-MY',
  'nb': 'nb-NO', 'pl': 'pl-PL', 'pt': 'pt-BR', 'ro': 'ro-RO', 'ru': 'ru-RU',
  'es': 'es-ES', 'sv': 'sv-SE', 'tr': 'tr-TR', 'uk': 'uk-UA', 'cy': 'cy-GB',
}
const normalizeLang = (l: string) => LANG_MIGRATE[l] ?? l

type VoiceEntry = { value: string; label: string; gender: 'FEMALE' | 'MALE' }

// Language → voice list (Google TTS naming; maps to OpenAI nova/onyx by gender)
const VOICES_BY_LANG: Record<string, VoiceEntry[]> = {
  'ar-XA': [
    { value: 'ar-XA-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
    { value: 'ar-XA-Wavenet-C', label: 'Wavenet-C · Female', gender: 'FEMALE' },
    { value: 'ar-XA-Wavenet-B', label: 'Wavenet-B · Male',   gender: 'MALE'   },
    { value: 'ar-XA-Wavenet-D', label: 'Wavenet-D · Male',   gender: 'MALE'   },
  ],
  'zh-CN': [
    { value: 'cmn-CN-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
    { value: 'cmn-CN-Wavenet-C', label: 'Wavenet-C · Female', gender: 'FEMALE' },
    { value: 'cmn-CN-Wavenet-B', label: 'Wavenet-B · Male',   gender: 'MALE'   },
    { value: 'cmn-CN-Wavenet-D', label: 'Wavenet-D · Male',   gender: 'MALE'   },
  ],
  'zh-TW': [
    { value: 'cmn-TW-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
    { value: 'cmn-TW-Wavenet-C', label: 'Wavenet-C · Female', gender: 'FEMALE' },
    { value: 'cmn-TW-Wavenet-B', label: 'Wavenet-B · Male',   gender: 'MALE'   },
  ],
  'da-DK': [
    { value: 'da-DK-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
    { value: 'da-DK-Wavenet-C', label: 'Wavenet-C · Female', gender: 'FEMALE' },
    { value: 'da-DK-Wavenet-D', label: 'Wavenet-D · Male',   gender: 'MALE'   },
    { value: 'da-DK-Wavenet-E', label: 'Wavenet-E · Male',   gender: 'MALE'   },
  ],
  'nl-NL': [
    { value: 'nl-NL-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
    { value: 'nl-NL-Wavenet-D', label: 'Wavenet-D · Female', gender: 'FEMALE' },
    { value: 'nl-NL-Wavenet-B', label: 'Wavenet-B · Male',   gender: 'MALE'   },
    { value: 'nl-NL-Wavenet-C', label: 'Wavenet-C · Male',   gender: 'MALE'   },
  ],
  'en-AU': [
    { value: 'en-AU-Neural2-A', label: 'Neural2-A · Female', gender: 'FEMALE' },
    { value: 'en-AU-Neural2-C', label: 'Neural2-C · Female', gender: 'FEMALE' },
    { value: 'en-AU-Neural2-B', label: 'Neural2-B · Male',   gender: 'MALE'   },
    { value: 'en-AU-Neural2-D', label: 'Neural2-D · Male',   gender: 'MALE'   },
  ],
  'en-IN': [
    { value: 'en-IN-Neural2-A', label: 'Neural2-A · Female', gender: 'FEMALE' },
    { value: 'en-IN-Neural2-D', label: 'Neural2-D · Female', gender: 'FEMALE' },
    { value: 'en-IN-Neural2-B', label: 'Neural2-B · Male',   gender: 'MALE'   },
    { value: 'en-IN-Neural2-C', label: 'Neural2-C · Male',   gender: 'MALE'   },
  ],
  'en-GB': [
    { value: 'en-GB-Neural2-A', label: 'Neural2-A · Female', gender: 'FEMALE' },
    { value: 'en-GB-Neural2-C', label: 'Neural2-C · Female', gender: 'FEMALE' },
    { value: 'en-GB-Neural2-B', label: 'Neural2-B · Male',   gender: 'MALE'   },
    { value: 'en-GB-Neural2-D', label: 'Neural2-D · Male',   gender: 'MALE'   },
  ],
  'en-US': [
    { value: 'en-US-Neural2-F', label: 'Neural2-F · Female', gender: 'FEMALE' },
    { value: 'en-US-Neural2-H', label: 'Neural2-H · Female', gender: 'FEMALE' },
    { value: 'en-US-Neural2-C', label: 'Neural2-C · Male',   gender: 'MALE'   },
    { value: 'en-US-Neural2-D', label: 'Neural2-D · Male',   gender: 'MALE'   },
  ],
  'fi-FI': [
    { value: 'fi-FI-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
  ],
  'fr-CA': [
    { value: 'fr-CA-Neural2-A', label: 'Neural2-A · Female', gender: 'FEMALE' },
    { value: 'fr-CA-Neural2-C', label: 'Neural2-C · Female', gender: 'FEMALE' },
    { value: 'fr-CA-Neural2-B', label: 'Neural2-B · Male',   gender: 'MALE'   },
    { value: 'fr-CA-Neural2-D', label: 'Neural2-D · Male',   gender: 'MALE'   },
  ],
  'fr-FR': [
    { value: 'fr-FR-Neural2-A', label: 'Neural2-A · Female', gender: 'FEMALE' },
    { value: 'fr-FR-Neural2-C', label: 'Neural2-C · Female', gender: 'FEMALE' },
    { value: 'fr-FR-Neural2-B', label: 'Neural2-B · Male',   gender: 'MALE'   },
    { value: 'fr-FR-Neural2-D', label: 'Neural2-D · Male',   gender: 'MALE'   },
  ],
  'de-DE': [
    { value: 'de-DE-Neural2-A', label: 'Neural2-A · Female', gender: 'FEMALE' },
    { value: 'de-DE-Neural2-C', label: 'Neural2-C · Female', gender: 'FEMALE' },
    { value: 'de-DE-Neural2-B', label: 'Neural2-B · Male',   gender: 'MALE'   },
    { value: 'de-DE-Neural2-D', label: 'Neural2-D · Male',   gender: 'MALE'   },
  ],
  'el-GR': [
    { value: 'el-GR-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
  ],
  'hi-IN': [
    { value: 'hi-IN-Neural2-A', label: 'Neural2-A · Female', gender: 'FEMALE' },
    { value: 'hi-IN-Neural2-D', label: 'Neural2-D · Female', gender: 'FEMALE' },
    { value: 'hi-IN-Neural2-B', label: 'Neural2-B · Male',   gender: 'MALE'   },
    { value: 'hi-IN-Neural2-C', label: 'Neural2-C · Male',   gender: 'MALE'   },
  ],
  'id-ID': [
    { value: 'id-ID-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
    { value: 'id-ID-Wavenet-C', label: 'Wavenet-C · Female', gender: 'FEMALE' },
    { value: 'id-ID-Wavenet-B', label: 'Wavenet-B · Male',   gender: 'MALE'   },
    { value: 'id-ID-Wavenet-D', label: 'Wavenet-D · Male',   gender: 'MALE'   },
  ],
  'it-IT': [
    { value: 'it-IT-Neural2-A', label: 'Neural2-A · Female', gender: 'FEMALE' },
    { value: 'it-IT-Neural2-C', label: 'Neural2-C · Female', gender: 'FEMALE' },
    { value: 'it-IT-Neural2-B', label: 'Neural2-B · Male',   gender: 'MALE'   },
    { value: 'it-IT-Neural2-D', label: 'Neural2-D · Male',   gender: 'MALE'   },
  ],
  'ja-JP': [
    { value: 'ja-JP-Neural2-B', label: 'Neural2-B · Female', gender: 'FEMALE' },
    { value: 'ja-JP-Neural2-C', label: 'Neural2-C · Female', gender: 'FEMALE' },
    { value: 'ja-JP-Neural2-D', label: 'Neural2-D · Male',   gender: 'MALE'   },
  ],
  'ko-KR': [
    { value: 'ko-KR-Neural2-A', label: 'Neural2-A · Female', gender: 'FEMALE' },
    { value: 'ko-KR-Neural2-C', label: 'Neural2-C · Female', gender: 'FEMALE' },
    { value: 'ko-KR-Neural2-B', label: 'Neural2-B · Male',   gender: 'MALE'   },
    { value: 'ko-KR-Neural2-D', label: 'Neural2-D · Male',   gender: 'MALE'   },
  ],
  'ms-MY': [
    { value: 'ms-MY-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
    { value: 'ms-MY-Wavenet-C', label: 'Wavenet-C · Female', gender: 'FEMALE' },
    { value: 'ms-MY-Wavenet-B', label: 'Wavenet-B · Male',   gender: 'MALE'   },
    { value: 'ms-MY-Wavenet-D', label: 'Wavenet-D · Male',   gender: 'MALE'   },
  ],
  'nb-NO': [
    { value: 'nb-NO-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
    { value: 'nb-NO-Wavenet-C', label: 'Wavenet-C · Female', gender: 'FEMALE' },
    { value: 'nb-NO-Wavenet-B', label: 'Wavenet-B · Male',   gender: 'MALE'   },
    { value: 'nb-NO-Wavenet-D', label: 'Wavenet-D · Male',   gender: 'MALE'   },
  ],
  'pl-PL': [
    { value: 'pl-PL-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
    { value: 'pl-PL-Wavenet-D', label: 'Wavenet-D · Female', gender: 'FEMALE' },
    { value: 'pl-PL-Wavenet-B', label: 'Wavenet-B · Male',   gender: 'MALE'   },
    { value: 'pl-PL-Wavenet-C', label: 'Wavenet-C · Male',   gender: 'MALE'   },
  ],
  'pt-BR': [
    { value: 'pt-BR-Neural2-A', label: 'Neural2-A · Female', gender: 'FEMALE' },
    { value: 'pt-BR-Neural2-C', label: 'Neural2-C · Female', gender: 'FEMALE' },
    { value: 'pt-BR-Neural2-B', label: 'Neural2-B · Male',   gender: 'MALE'   },
  ],
  'pt-PT': [
    { value: 'pt-PT-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
    { value: 'pt-PT-Wavenet-D', label: 'Wavenet-D · Female', gender: 'FEMALE' },
    { value: 'pt-PT-Wavenet-B', label: 'Wavenet-B · Male',   gender: 'MALE'   },
    { value: 'pt-PT-Wavenet-C', label: 'Wavenet-C · Male',   gender: 'MALE'   },
  ],
  'ro-RO': [
    { value: 'ro-RO-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
  ],
  'ru-RU': [
    { value: 'ru-RU-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
    { value: 'ru-RU-Wavenet-C', label: 'Wavenet-C · Female', gender: 'FEMALE' },
    { value: 'ru-RU-Wavenet-B', label: 'Wavenet-B · Male',   gender: 'MALE'   },
    { value: 'ru-RU-Wavenet-D', label: 'Wavenet-D · Male',   gender: 'MALE'   },
  ],
  'es-ES': [
    { value: 'es-ES-Neural2-A', label: 'Neural2-A · Female', gender: 'FEMALE' },
    { value: 'es-ES-Neural2-C', label: 'Neural2-C · Female', gender: 'FEMALE' },
    { value: 'es-ES-Neural2-B', label: 'Neural2-B · Male',   gender: 'MALE'   },
    { value: 'es-ES-Neural2-F', label: 'Neural2-F · Male',   gender: 'MALE'   },
  ],
  'es-MX': [
    { value: 'es-US-Neural2-A', label: 'Neural2-A · Female', gender: 'FEMALE' },
    { value: 'es-US-Neural2-C', label: 'Neural2-C · Female', gender: 'FEMALE' },
    { value: 'es-US-Neural2-B', label: 'Neural2-B · Male',   gender: 'MALE'   },
  ],
  'es-US': [
    { value: 'es-US-Neural2-A', label: 'Neural2-A · Female', gender: 'FEMALE' },
    { value: 'es-US-Neural2-C', label: 'Neural2-C · Female', gender: 'FEMALE' },
    { value: 'es-US-Neural2-B', label: 'Neural2-B · Male',   gender: 'MALE'   },
  ],
  'sv-SE': [
    { value: 'sv-SE-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
    { value: 'sv-SE-Wavenet-D', label: 'Wavenet-D · Female', gender: 'FEMALE' },
    { value: 'sv-SE-Wavenet-B', label: 'Wavenet-B · Male',   gender: 'MALE'   },
    { value: 'sv-SE-Wavenet-E', label: 'Wavenet-E · Male',   gender: 'MALE'   },
  ],
  'tr-TR': [
    { value: 'tr-TR-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
    { value: 'tr-TR-Wavenet-C', label: 'Wavenet-C · Female', gender: 'FEMALE' },
    { value: 'tr-TR-Wavenet-B', label: 'Wavenet-B · Male',   gender: 'MALE'   },
    { value: 'tr-TR-Wavenet-D', label: 'Wavenet-D · Male',   gender: 'MALE'   },
  ],
  'uk-UA': [
    { value: 'uk-UA-Wavenet-A', label: 'Wavenet-A · Female', gender: 'FEMALE' },
  ],
  'cy-GB': [
    { value: 'cy-GB-Standard-A', label: 'Standard-A · Female', gender: 'FEMALE' },
  ],
}

function getVoicesForLang(lang: string): VoiceEntry[] {
  const voices = VOICES_BY_LANG[lang]
  if (voices?.length) return voices
  // Generic fallback for any unlisted language
  return [
    { value: `${lang}-Wavenet-A`, label: 'Wavenet-A · Female', gender: 'FEMALE' },
    { value: `${lang}-Wavenet-C`, label: 'Wavenet-C · Female', gender: 'FEMALE' },
    { value: `${lang}-Wavenet-B`, label: 'Wavenet-B · Male',   gender: 'MALE'   },
    { value: `${lang}-Wavenet-D`, label: 'Wavenet-D · Male',   gender: 'MALE'   },
  ]
}

function resolveVoice(voiceName: string, lang: string): string {
  const voices = getVoicesForLang(lang)
  if (voices.find(v => v.value === voiceName)) return voiceName
  const upper = voiceName.toUpperCase()
  if (upper === 'MALE')   return voices.find(v => v.gender === 'MALE')?.value   ?? voices[0]?.value ?? ''
  if (upper === 'FEMALE') return voices.find(v => v.gender === 'FEMALE')?.value ?? voices[0]?.value ?? ''
  return voices[0]?.value ?? ''
}

const PROMPT_LABEL: Record<string, string> = { '0': 'Upload', '1': 'TTS', '2': 'Record' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractList<T>(res: unknown): T[] {
  const body = (res as { data?: unknown })?.data
  const payload = (body as { data?: unknown })?.data
  if (Array.isArray(payload)) return payload as T[]
  const nested = (payload as { data?: unknown })?.data
  if (Array.isArray(nested)) return nested as T[]
  return []
}

// ── Audio Player (fetches with auth, creates blob URL) ────────────────────────

function AudioPlayer({ annId }: { annId: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const parts = annId.split('/')
    ivrService.fetchAudioBlob(parts[0], parts.slice(1).join('/'))
      .then(res => {
        if (cancelled) return
        const blob = new Blob([res.data as BlobPart], {
          type: (res.headers as Record<string, string>)['content-type'] || 'audio/mpeg',
        })
        const url = URL.createObjectURL(blob)
        blobUrlRef.current = url
        setBlobUrl(url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [annId])

  if (!blobUrl) {
    return <Loader2 size={14} className="animate-spin text-slate-300" />
  }

  return (
    <audio
      controls
      src={blobUrl}
      className="h-9 rounded-lg"
      style={{ minWidth: 220 }}
    />
  )
}

// ── Audio Recorder ─────────────────────────────────────────────────────────────

function AudioRecorder({ onRecorded }: { onRecorded: (blob: Blob, url: string) => void }) {
  const [recording, setRecording] = useState(false)
  const [time, setTime] = useState(0)
  const [micDenied, setMicDenied] = useState(false)
  const [micPending, setMicPending] = useState(false)
  const mrRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Shared: acquire mic stream and immediately begin recording
  const startWithStream = (stream: MediaStream) => {
    setMicDenied(false)
    setMicPending(false)
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
    const mr = new MediaRecorder(stream, { mimeType })
    chunksRef.current = []
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(chunksRef.current, { type: mimeType })
      onRecorded(blob, URL.createObjectURL(blob))
    }
    mr.start(100)
    mrRef.current = mr
    setRecording(true)
    setTime(0)
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000)
  }

  // Single getUserMedia entry point — always fires on button click, never pre-blocked
  const requestMicAndRecord = async () => {
    setMicPending(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      startWithStream(stream)
    } catch (err: unknown) {
      setMicPending(false)
      const name = err instanceof Error ? err.name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        // Show inline denied UI — no toast, keep button for retry after settings change
        setMicDenied(true)
      } else {
        toast.error('Could not access microphone.')
      }
    }
  }

  // Big mic button
  const start = () => requestMicAndRecord()

  // "Enable Microphone" retry button — same path, always re-attempts getUserMedia
  const enableMic = () => requestMicAndRecord()

  const stop = () => {
    mrRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="flex flex-col items-center gap-2 py-3">
      {micPending && !micDenied && (
        <div className="w-full px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-center">
          <p className="text-xs text-blue-700 font-medium">
            Click the microphone icon near the browser URL bar and allow access.
          </p>
        </div>
      )}
      {micDenied && (
        <div className="w-full flex flex-col items-center gap-2 mb-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-700 font-medium text-center">Microphone access is blocked.</p>
          <p className="text-[11px] text-amber-600 text-center leading-relaxed">
            Click the <strong>🔒 lock icon</strong> in your address bar → <strong>Site settings</strong> → set <strong>Microphone</strong> to <strong>Allow</strong>, then click retry.
          </p>
          <button
            type="button"
            onClick={enableMic}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
          >
            <Mic size={13} /> Retry
          </button>
        </div>
      )}
      <button type="button" onClick={recording ? stop : start}
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg',
          recording
            ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-200 animate-pulse'
            : 'bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 ring-4 ring-indigo-100'
        )}>
        {recording ? <Square size={18} className="text-white" /> : <Mic size={18} className="text-white" />}
      </button>
      <div className="text-center">
        <p className={cn('text-base font-mono font-bold', recording ? 'text-red-600' : 'text-slate-400')}>
          {fmt(time)}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {recording ? 'Recording… click to stop' : 'Click to start recording'}
        </p>
      </div>
    </div>
  )
}

// ── Audio Form (shared modal body for Audio Messages) ──────────────────────────

const DEFAULT_LANG = 'en-US'
const DEFAULT_VOICE = getVoicesForLang(DEFAULT_LANG)[0]?.value ?? ''

function AudioForm({ editing, onClose, formId = 'audio-form', onSavingChange }: {
  editing: AudioMessage | null; onClose: () => void
  formId?: string; onSavingChange?: (s: boolean) => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    ivr_desc: '', language: DEFAULT_LANG, voice_name: DEFAULT_VOICE, speech_text: '',
    prompt_option: '1', speed: 'medium', pitch: 'medium', ann_id: '',
  })
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [ttsPreviewUrl, setTtsPreviewUrl] = useState<string | null>(null)
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null)
  const [recordPreviewUrl, setRecordPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [ttsPreviewLoading, setTtsPreviewLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const ttsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ttsUrlRef = useRef<string | null>(null)
  const uploadUrlRef = useRef<string | null>(null)
  const recordUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (editing) {
      const lang = normalizeLang(String(editing.language ?? DEFAULT_LANG))
      setForm({
        ivr_desc:      editing.ivr_desc ?? '',
        language:      lang,
        voice_name:    resolveVoice(String(editing.voice_name ?? ''), lang),
        speech_text:   String(editing.speech_text ?? ''),
        prompt_option: String(editing.prompt_option ?? '1'),
        speed:         String(editing.speed ?? 'medium'),
        pitch:         String(editing.pitch ?? 'medium'),
        ann_id:        String(editing.ann_id ?? ''),
      })
    } else {
      setForm({ ivr_desc: '', language: DEFAULT_LANG, voice_name: DEFAULT_VOICE, speech_text: '', prompt_option: '1', speed: 'medium', pitch: 'medium', ann_id: '' })
    }
    setAudioFile(null); setRecordedBlob(null)
    setTtsPreviewUrl(null); setUploadPreviewUrl(null); setRecordPreviewUrl(null)
    ttsUrlRef.current = null; uploadUrlRef.current = null; recordUrlRef.current = null
  }, [editing])

  useEffect(() => () => {
    if (ttsUrlRef.current) URL.revokeObjectURL(ttsUrlRef.current)
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current)
    if (recordUrlRef.current) URL.revokeObjectURL(recordUrlRef.current)
    if (ttsDebounceRef.current) clearTimeout(ttsDebounceRef.current)
  }, [])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleLangChange = (lang: string) => {
    const voices = getVoicesForLang(lang)
    setForm(p => ({ ...p, language: lang, voice_name: voices[0]?.value ?? p.voice_name }))
  }

  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(mp3|wav|ogg|webm|m4a|mp4)$/i)) {
      toast.error('Please upload a valid audio file'); return
    }
    setAudioFile(file)
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current)
    const uploadUrl = URL.createObjectURL(file)
    uploadUrlRef.current = uploadUrl
    setUploadPreviewUrl(uploadUrl)
    setRecordedBlob(null)
  }

  const handleRecorded = (blob: Blob, url: string) => {
    setRecordedBlob(blob)
    if (recordUrlRef.current) URL.revokeObjectURL(recordUrlRef.current)
    recordUrlRef.current = url
    setRecordPreviewUrl(url)
    setAudioFile(null)
  }

  // Auto-generate TTS preview (1.2s debounce after any TTS param change)
  useEffect(() => {
    if (form.prompt_option !== '1' || !form.speech_text.trim()) return
    if (ttsDebounceRef.current) clearTimeout(ttsDebounceRef.current)
    ttsDebounceRef.current = setTimeout(async () => {
      setTtsPreviewLoading(true)
      try {
        const voices = getVoicesForLang(form.language)
        const voiceGender = voices.find(v => v.value === form.voice_name)?.gender ?? 'FEMALE'
        const res = await ivrService.generateTts({
          speech_text: form.speech_text,
          language: form.language,
          voice_name: form.voice_name,
          voice_gender: voiceGender,
          speed: form.speed,
          pitch: form.pitch,
        })
        const relPath = (res.data as { data?: { relative_path?: string } })?.data?.relative_path ?? ''
        if (relPath) {
          const parts = relPath.split('/')
          const blobRes = await ivrService.fetchAudioBlob(parts[0], parts.slice(1).join('/'))
          const blob = new Blob([blobRes.data as BlobPart], {
            type: (blobRes.headers as Record<string, string>)['content-type'] || 'audio/mpeg',
          })
          if (ttsUrlRef.current) URL.revokeObjectURL(ttsUrlRef.current)
          const ttsUrl = URL.createObjectURL(blob)
          ttsUrlRef.current = ttsUrl
          setTtsPreviewUrl(ttsUrl)
        }
      } catch { /* silent — preview failure shouldn't block the user */ }
      finally { setTtsPreviewLoading(false) }
    }, 1200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.speech_text, form.language, form.voice_name, form.speed, form.pitch, form.prompt_option])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.ivr_desc.trim()) { toast.error('Name is required'); return }
    setSaving(true); onSavingChange?.(true)
    try {
      let annId = form.ann_id
      if (form.prompt_option === '1' && form.speech_text.trim()) {
        try {
          const voices = getVoicesForLang(form.language)
          const voiceGender = voices.find(v => v.value === form.voice_name)?.gender ?? 'FEMALE'
          const res = await ivrService.generateTts({
            speech_text: form.speech_text,
            language: form.language,
            voice_name: form.voice_name,
            voice_gender: voiceGender,
            speed: form.speed,
            pitch: form.pitch,
          })
          annId = (res.data as { data?: { relative_path?: string } })?.data?.relative_path ?? annId
        } catch { /* TTS generation failed — save metadata only */ }
      } else if (form.prompt_option !== '1' && (audioFile || recordedBlob)) {
        const fd = new FormData()
        if (audioFile) fd.append('audio', audioFile)
        else if (recordedBlob) fd.append('audio', recordedBlob, 'recording.webm')
        const res = await ivrService.uploadAudio(fd)
        annId = (res.data as { data?: { relative_path?: string } })?.data?.relative_path ?? annId
      }
      const payload: Record<string, unknown> = { ...form, ann_id: annId }
      if (editing) payload.auto_id = editing.auto_id ?? editing.id
      await (editing ? ivrService.updateAudio : ivrService.createAudio)(payload)
      toast.success(editing ? 'Audio message updated' : 'Audio message created')
      qc.invalidateQueries({ queryKey: ['audio-messages'] })
      onClose()
    } catch {
      toast.error('Failed to save audio message')
    } finally { setSaving(false); onSavingChange?.(false) }
  }

  const voiceOptions = getVoicesForLang(form.language)

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label">Name <span className="text-red-500">*</span></label>
        <input className="input" value={form.ivr_desc}
          onChange={e => set('ivr_desc', e.target.value)} placeholder="e.g. Main Greeting" />
      </div>

      <div>
        <label className="label">Audio Type</label>
        <div className="grid grid-cols-3 gap-2">
          {([['1', 'Text to Speech', <Volume2 key="v" size={14} />], ['0', 'Upload File', <Upload key="u" size={14} />], ['2', 'Record from Mic', <Mic key="m" size={14} />]] as [string, string, React.ReactNode][]).map(([v, l, icon]) => (
            <button key={v} type="button" onClick={() => set('prompt_option', v)}
              className={cn('flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all',
                form.prompt_option === v
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50')}>
              {icon}{l}
            </button>
          ))}
        </div>
      </div>

      {form.prompt_option === '1' && (
        <>
          <div>
            <label className="label">Greeting Message</label>
            <textarea className="input min-h-[60px] resize-none" value={form.speech_text}
              onChange={e => set('speech_text', e.target.value)}
              placeholder="Welcome to our company! Press 1 for Sales…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Language</label>
              <select className="input" value={form.language} onChange={e => handleLangChange(e.target.value)}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Voice</label>
              <select className="input" value={form.voice_name} onChange={e => set('voice_name', e.target.value)}>
                {voiceOptions.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Speed</label>
              <select className="input" value={form.speed} onChange={e => set('speed', e.target.value)}>
                {['slow', 'medium', 'fast'].map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Pitch</label>
              <select className="input" value={form.pitch} onChange={e => set('pitch', e.target.value)}>
                {['low', 'medium', 'high'].map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="h-8 flex items-center">
            {ttsPreviewLoading && (
              <span className="flex items-center gap-1.5 text-xs text-indigo-600">
                <Loader2 size={12} className="animate-spin" /> Generating preview…
              </span>
            )}
            {ttsPreviewUrl && !ttsPreviewLoading && (
              <audio controls src={ttsPreviewUrl} className="w-full h-8" />
            )}
            {!ttsPreviewUrl && !ttsPreviewLoading && form.speech_text.trim() && (
              <span className="text-xs text-slate-400">Preview generates automatically…</span>
            )}
          </div>
        </>
      )}

      {form.prompt_option === '0' && (
        <div>
          <label className="label">Audio File</label>
          <div
            className={cn('border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
              dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300')}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f) }}>
            <input ref={fileRef} type="file" accept=".mp3,.wav,.ogg,.webm,.m4a,.mp4" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />
            {audioFile ? (
              <div className="space-y-1">
                <Music size={20} className="text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">{audioFile.name}</p>
                <p className="text-xs text-slate-400">{(audioFile.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload size={20} className="text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">Drop file or click to browse</p>
                <p className="text-xs text-slate-400">MP3, WAV, OGG, WebM · Max 20 MB</p>
              </div>
            )}
          </div>
          {uploadPreviewUrl && <audio controls src={uploadPreviewUrl} className="w-full mt-2" />}
        </div>
      )}

      {form.prompt_option === '2' && (
        <div>
          <label className="label">Record from Microphone</label>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <AudioRecorder onRecorded={handleRecorded} />
          </div>
          {recordPreviewUrl && (
            <audio controls src={recordPreviewUrl} className="w-full mt-2" />
          )}
        </div>
      )}

    </form>
  )
}

// ── Audio Messages Tab ─────────────────────────────────────────────────────────

function AudioMessagesTab() {
  const qc = useQueryClient()
  const table = useServerTable()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<AudioMessage | null>(null)
  const [audioSaving, setAudioSaving] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ivrService.deleteAudio(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['audio-messages'] }) },
    onError: () => toast.error('Failed to delete'),
  })

  const typeColors: Record<string, string> = {
    '0': 'bg-blue-50 text-blue-700',
    '1': 'bg-purple-50 text-purple-700',
    '2': 'bg-rose-50 text-rose-700',
  }

  const columns: Column<AudioMessage>[] = [
    {
      key: 'ivr_desc',
      header: 'Name',
      render: (msg) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Music size={13} className="text-purple-600" />
          </div>
          <span className="text-sm font-semibold text-slate-800">{msg.ivr_desc}</span>
        </div>
      ),
    },
    {
      key: 'prompt_option',
      header: 'Type',
      render: (msg) => {
        const pOpt = String(msg.prompt_option ?? '1')
        return (
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', typeColors[pOpt] ?? typeColors['1'])}>
            {PROMPT_LABEL[pOpt] ?? 'TTS'}
          </span>
        )
      },
    },
    {
      key: 'language',
      header: 'Language',
      render: (msg) => <span className="text-xs text-slate-500">{String(msg.language || '—')}</span>,
    },
    {
      key: 'ann_id',
      header: 'Preview',
      render: (msg) => {
        const annId = String(msg.ann_id ?? '')
        return annId.includes('/')
          ? <AudioPlayer annId={annId} />
          : <span className="text-xs text-slate-300">—</span>
      },
    },
    {
      key: '_actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (msg) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => { setEditing(msg); setShowModal(true) }}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
            <Pencil size={13} />
          </button>
          <button
            onClick={async () => {
              if (await confirmDelete(msg.ivr_desc))
                deleteMutation.mutate(msg.auto_id ?? msg.id ?? 0)
            }}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="py-4">
      <ServerDataTable<AudioMessage>
        queryKey={['audio-messages']}
        queryFn={(params) => ivrService.listAudio(params)}
        dataExtractor={(res: unknown) => {
          const r = res as { data?: { data?: { data?: AudioMessage[] } } }
          return r?.data?.data?.data ?? []
        }}
        totalExtractor={(res: unknown) => {
          const r = res as { data?: { data?: { total?: number } } }
          return r?.data?.data?.total ?? 0
        }}
        columns={columns}
        keyField="id"
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search audio messages…"
        page={table.page}
        limit={table.limit}
        onPageChange={table.setPage}
        headerActions={
          <button onClick={() => { setEditing(null); setShowModal(true) }}
            className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus size={14} /> Add Audio Message
          </button>
        }
        emptyText="No audio messages yet"
        emptyIcon={<Music size={28} />}
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Music size={14} className="text-purple-600" />
                </div>
                <p className="text-sm font-bold text-slate-900">{editing ? 'Edit Audio Message' : 'New Audio Message'}</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <X size={15} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <AudioForm editing={editing} onClose={() => setShowModal(false)} formId="audio-form" onSavingChange={setAudioSaving} />
            </div>
            <div className="flex justify-end gap-3 px-6 pt-4 pb-4 border-t border-slate-100 flex-shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="btn-outline">Cancel</button>
              <button type="submit" form="audio-form" disabled={audioSaving} className="btn-primary flex items-center gap-1.5">
                {audioSaving ? <><Loader2 size={13} className="animate-spin" />Saving…</> : editing ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── IVR Menu – Destination helpers ────────────────────────────────────────────

interface ExtensionItem { extension: string; name?: string; first_name?: string; last_name?: string; [key: string]: unknown }
interface RingGroupItem { id: number; title: string; [key: string]: unknown }

function DestinationSelect({
  destType, value, onChange, allIvrs, ivrId,
}: {
  destType: string; value: string; onChange: (v: string) => void
  allIvrs: Ivr[]; ivrId: string
}) {
  const clientId = useAuthStore(s => s.user?.parent_id)
  const { data: extRaw } = useQuery({
    queryKey: ['client-extensions', clientId],
    queryFn: () => ivrService.getClientExtensions(),
    enabled: destType === '0' || destType === '2',
  })
  const { data: rgRaw } = useQuery({
    queryKey: ['ring-groups', clientId],
    queryFn: () => ivrService.getRingGroups(),
    enabled: destType === '1',
  })

  const extensions: ExtensionItem[] = (() => {
    const body = (extRaw as { data?: unknown })?.data
    const payload = (body as { data?: unknown })?.data
    if (Array.isArray(payload)) return payload as ExtensionItem[]
    if (Array.isArray(body)) return body as ExtensionItem[]
    return []
  })()
  const ringGroups: RingGroupItem[] = extractList<RingGroupItem>(rgRaw)

  if (destType === '4') {
    return <p className="text-xs text-slate-400 italic mt-1">No destination required for Hangup</p>
  }
  if (destType === '5') {
    const formatUS = (raw: string) => {
      const d = raw.replace(/\D/g, '').slice(0, 10)
      if (d.length <= 3) return d
      if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
    }
    const digits = value.replace(/\D/g, '').slice(0, 10)
    return (
      <div className="space-y-1">
        <input
          className="input"
          value={value}
          onChange={e => onChange(formatUS(e.target.value))}
          placeholder="(555) 555-5555"
          maxLength={14}
        />
        <p className={cn(
          'text-xs',
          digits.length === 10 ? 'text-emerald-600' : 'text-slate-400'
        )}>
          {digits.length}/10 digits{digits.length === 10 ? ' ✓' : ''}
        </p>
      </div>
    )
  }
  if (destType === '0' || destType === '2') {
    return (
      <select className="input" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">— Select Extension —</option>
        {extensions.map(ext => (
          <option key={ext.extension} value={ext.extension}>
            {ext.name?.trim()
              ? `${ext.name.trim()} — ${ext.extension}`
              : ext.extension}
          </option>
        ))}
      </select>
    )
  }
  if (destType === '1') {
    return (
      <select className="input" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">— Select Queue —</option>
        {ringGroups.map(rg => (
          <option key={rg.id} value={String(rg.id)}>{rg.title}</option>
        ))}
      </select>
    )
  }
  if (destType === '3') {
    return (
      <select className="input" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">— Select IVR —</option>
        {allIvrs.filter(iv => iv.ivr_id !== ivrId).map(iv => (
          <option key={iv.ivr_id} value={iv.ivr_id}>{iv.ivr_desc} ({iv.ivr_id})</option>
        ))}
      </select>
    )
  }
  return null
}

// ── IVR Menu Modal (Add / Edit) ───────────────────────────────────────────────

function IvrMenuModal({
  ivrId, ivrNumId, item, usedDtmf, allIvrs, onClose,
}: {
  ivrId: string
  ivrNumId: number                  // integer PK of the ivr row (needed by edit-ivr-menu)
  item: IvrMenuItem | null          // null = add mode
  usedDtmf: string[]                // DTMF keys already configured
  allIvrs: Ivr[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    dtmf: item?.dtmf ?? '',
    dtmf_title: item?.dtmf_title ?? '',
    dest_type: item ? String(item.dest_type) : '0',
    dest: item?.dest ?? '',
  })

  const isEditing = !!item
  const availableKeys = KEYPAD_KEYS.filter(k => !usedDtmf.includes(k) || k === item?.dtmf)

  const saveMutation = useMutation({
    mutationFn: () => isEditing
      ? ivrService.editMenu({
          parameter: {
            ivr: ivrNumId,
            dtmf:       [form.dtmf],
            dtmf_title: [form.dtmf_title],
            dest_type:  [form.dest_type],
            dest:       [form.dest],
            ivr_menu_id: [item!.ivr_m_id ?? item!.id ?? 0],
          },
        })
      : ivrService.addMenu({ parameter: [{ ...form, ivr_id: ivrId }] }),
    onSuccess: () => {
      toast.success(isEditing ? 'Route updated' : 'Route added')
      qc.invalidateQueries({ queryKey: ['ivr-menu', ivrId] })
      onClose()
    },
    onError: () => toast.error('Failed to save route'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.dtmf) { toast.error('Please select a DTMF key'); return }
    if (form.dest_type !== '4' && !form.dest) { toast.error('Destination is required'); return }
    if (form.dest_type === '5' && form.dest.replace(/\D/g, '').length !== 10) {
      toast.error('External number must be exactly 10 digits'); return
    }
    saveMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <p className="text-sm font-bold text-slate-900">
            {isEditing ? `Edit Route — Key ${form.dtmf}` : 'Add IVR Menu Route'}
          </p>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* DTMF Key */}
          <div>
            <label className="label">DTMF Key <span className="text-red-500">*</span></label>
            {isEditing ? (
              <div className="input bg-slate-50 text-slate-600 font-mono">{form.dtmf}</div>
            ) : (
              <select className="input" value={form.dtmf}
                onChange={e => setForm(p => ({ ...p, dtmf: e.target.value }))}>
                <option value="">— Select key —</option>
                {availableKeys.map(k => (
                  <option key={k} value={k}>
                    {k === '*' ? '* (Star)' : k === '#' ? '# (Hash)' : `${k}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* DTMF Title / Label */}
          <div>
            <label className="label">DTMF Title</label>
            <input className="input" value={form.dtmf_title}
              onChange={e => setForm(p => ({ ...p, dtmf_title: e.target.value }))}
              placeholder="e.g. Sales, Support, Operator" />
          </div>

          {/* Destination Type */}
          <div>
            <label className="label">Destination Type <span className="text-red-500">*</span></label>
            <select className="input" value={form.dest_type}
              onChange={e => setForm(p => ({ ...p, dest_type: e.target.value, dest: '' }))}>
              {Object.entries(DEST_TYPE_META).map(([v, m]) => (
                <option key={v} value={v}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Destination (dynamic) */}
          {form.dest_type !== '4' && (
            <div>
              <label className="label">Destination <span className="text-red-500">*</span></label>
              <DestinationSelect
                destType={form.dest_type}
                value={form.dest}
                onChange={v => setForm(p => ({ ...p, dest: v }))}
                allIvrs={allIvrs}
                ivrId={ivrId}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex items-center gap-1.5">
              {saveMutation.isPending ? <><Loader2 size={13} className="animate-spin" />Saving…</> : isEditing ? 'Save Changes' : 'Add Route'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── IVR Menu Tab ───────────────────────────────────────────────────────────────

function IvrMenuTab() {
  const qc = useQueryClient()
  const clientId = useAuthStore(s => s.user?.parent_id)
  // Use numeric id as select value to avoid string/type-mismatch with ivr_id
  const [selectedNumId, setSelectedNumId] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<IvrMenuItem | null>(null)

  const { data: ivrRaw, isLoading: ivrLoading } = useQuery({
    queryKey: ['ivr-list', 'all', clientId],
    queryFn: () => ivrService.list({ page: 1, limit: 200, search: '', filters: {} }),
  })

  const allIvrs = extractList<Ivr>(ivrRaw)
  const selectedIvr = allIvrs.find(iv => String(iv.id ?? iv.auto_id) === selectedNumId)
  const menuQueryKey = selectedIvr?.ivr_id ?? ''

  const { data: menuRaw, isLoading: menuLoading } = useQuery({
    queryKey: ['ivr-menu', menuQueryKey],
    queryFn: () => ivrService.getMenu(selectedIvr!.ivr_id),
    enabled: !!selectedIvr,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ivrService.deleteMenu(id),
    onSuccess: () => {
      toast.success('Route removed')
      qc.invalidateQueries({ queryKey: ['ivr-menu', menuQueryKey] })
    },
    onError: () => toast.error('Failed to remove route'),
  })

  const menuItems = extractList<IvrMenuItem>(menuRaw).filter(m => m.dtmf != null)
  const usedDtmf = menuItems.map(m => m.dtmf)

  const dtmfLabel = (key: string | null) => !key ? '' : key === '*' ? '★ Star' : key === '#' ? '# Hash' : key

  return (
    <div className="py-4">
      {/* IVR Selector */}
      <div className="mb-5 flex items-end gap-3 flex-wrap">
        <div className="flex-1 max-w-sm">
          <label className="label">Select IVR</label>
          {ivrLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 h-9">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : (
            <select className="input" value={selectedNumId}
              onChange={e => { setSelectedNumId(e.target.value); setEditingItem(null) }}>
              <option value="">— Choose an IVR —</option>
              {allIvrs.map(ivr => {
                const numId = String(ivr.id ?? ivr.auto_id ?? ivr.ivr_id)
                return (
                  <option key={numId} value={numId}>
                    {ivr.ivr_desc} ({ivr.ivr_id})
                  </option>
                )
              })}
            </select>
          )}
        </div>
        {selectedIvr && (
          <button onClick={() => { setEditingItem(null); setShowModal(true) }}
            disabled={usedDtmf.length >= KEYPAD_KEYS.length}
            className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50">
            <Plus size={14} /> Add IVR Menu
          </button>
        )}
      </div>

      {!selectedIvr ? (
        allIvrs.length === 0 && !ivrLoading ? (
          <div className="flex items-center gap-2.5 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            No IVRs found. Go to the <strong className="mx-1">IVR</strong> tab to create one first.
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <PhoneCall size={32} className="opacity-30" />
            <p className="text-sm font-medium">Select an IVR above to manage its menu routes</p>
          </div>
        )
      ) : menuLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table header bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
            <span className="text-xs font-medium text-slate-500">
              {menuItems.length} route{menuItems.length !== 1 ? 's' : ''} configured
              {' '}· {KEYPAD_KEYS.length - usedDtmf.length} key{KEYPAD_KEYS.length - usedDtmf.length !== 1 ? 's' : ''} available
            </span>
          </div>

          {menuItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <PhoneCall size={28} className="opacity-30" />
              <p className="text-sm font-medium text-slate-500">No routes configured yet</p>
              <p className="text-xs text-slate-400">Click "Add IVR Menu" to configure your first key route</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['DTMF', 'DTMF Title', 'Destination Type', 'Destination', 'Actions'].map((h, i) => (
                    <th key={h} className={cn(
                      'px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider',
                      i === 4 ? 'text-right' : 'text-left'
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {menuItems
                  .slice()
                  .sort((a, b) => {
                    const aId = Number(a.ivr_m_id ?? a.id ?? 0)
                    const bId = Number(b.ivr_m_id ?? b.id ?? 0)
                    return bId - aId   // newest first
                  })
                  .map((menuItem, i) => {
                    const meta = DEST_TYPE_META[String(menuItem.dest_type)] ?? DEST_TYPE_META['0']
                    return (
                      <tr key={menuItem.ivr_m_id ?? menuItem.id ?? i}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {dtmfLabel(menuItem.dtmf).split(' ')[0]}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-slate-700 font-medium">
                            {menuItem.dtmf_title || <span className="text-slate-300 italic">No label</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', meta.bg, meta.color)}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-mono text-slate-600">
                            {menuItem.dest || <span className="text-slate-300 italic">—</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setEditingItem(menuItem); setShowModal(true) }}
                              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={async () => {
                                if (await confirmDelete(`key ${menuItem.dtmf} route`))
                                  deleteMutation.mutate(menuItem.ivr_m_id ?? menuItem.id ?? 0)
                              }}
                              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showModal && selectedIvr && (
        <IvrMenuModal
          ivrId={selectedIvr.ivr_id}
          ivrNumId={Number(selectedIvr.id ?? selectedIvr.auto_id ?? 0)}
          item={editingItem}
          usedDtmf={usedDtmf}
          allIvrs={allIvrs}
          onClose={() => { setShowModal(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}

// ── IVR Form Modal ─────────────────────────────────────────────────────────────

function IvrFormModal({ ivr, onClose, formId = 'ivr-form', onSavingChange }: {
  ivr: Partial<Ivr> | null; onClose: () => void
  formId?: string; onSavingChange?: (s: boolean) => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    ivr_id: '', ann_id: '', ivr_desc: '', language: DEFAULT_LANG,
    voice_name: DEFAULT_VOICE, speech_text: '', prompt_option: '1', speed: 'medium', pitch: 'medium',
  })
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [ttsPreviewUrl, setTtsPreviewUrl] = useState<string | null>(null)
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null)
  const [recordPreviewUrl, setRecordPreviewUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ttsPreviewLoading, setTtsPreviewLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const ttsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ttsUrlRef = useRef<string | null>(null)
  const uploadUrlRef = useRef<string | null>(null)
  const recordUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (ivr) {
      const lang = normalizeLang(String(ivr.language ?? DEFAULT_LANG))
      setForm({
        ivr_id:        String(ivr.ivr_id ?? ''),
        ann_id:        String(ivr.ann_id ?? ''),
        ivr_desc:      String(ivr.ivr_desc ?? ''),
        language:      lang,
        voice_name:    resolveVoice(String(ivr.voice_name ?? ''), lang),
        speech_text:   String(ivr.speech_text ?? ''),
        prompt_option: String(ivr.prompt_option ?? '1'),
        speed:         String(ivr.speed ?? 'medium'),
        pitch:         String(ivr.pitch ?? 'medium'),
      })
    } else {
      setForm({ ivr_id: '', ann_id: '', ivr_desc: '', language: DEFAULT_LANG, voice_name: DEFAULT_VOICE, speech_text: '', prompt_option: '1', speed: 'medium', pitch: 'medium' })
    }
    setAudioFile(null); setRecordedBlob(null)
    setTtsPreviewUrl(null); setUploadPreviewUrl(null); setRecordPreviewUrl(null)
    ttsUrlRef.current = null; uploadUrlRef.current = null; recordUrlRef.current = null
  }, [ivr])

  useEffect(() => () => {
    if (ttsUrlRef.current) URL.revokeObjectURL(ttsUrlRef.current)
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current)
    if (recordUrlRef.current) URL.revokeObjectURL(recordUrlRef.current)
    if (ttsDebounceRef.current) clearTimeout(ttsDebounceRef.current)
  }, [])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const isEditing = !!(ivr?.auto_id || ivr?.id)

  const handleLangChange = (lang: string) => {
    const voices = getVoicesForLang(lang)
    setForm(p => ({ ...p, language: lang, voice_name: voices[0]?.value ?? p.voice_name }))
  }

  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(mp3|wav|ogg|webm|m4a|mp4)$/i)) {
      toast.error('Please upload a valid audio file'); return
    }
    setAudioFile(file)
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current)
    const uploadUrl = URL.createObjectURL(file)
    uploadUrlRef.current = uploadUrl
    setUploadPreviewUrl(uploadUrl)
    setRecordedBlob(null)
  }

  const handleRecorded = (blob: Blob, url: string) => {
    setRecordedBlob(blob)
    if (recordUrlRef.current) URL.revokeObjectURL(recordUrlRef.current)
    recordUrlRef.current = url
    setRecordPreviewUrl(url)
    setAudioFile(null)
  }

  // Auto-generate TTS preview (1.2s debounce after any TTS param change)
  useEffect(() => {
    if (form.prompt_option !== '1' || !form.speech_text.trim()) return
    if (ttsDebounceRef.current) clearTimeout(ttsDebounceRef.current)
    ttsDebounceRef.current = setTimeout(async () => {
      setTtsPreviewLoading(true)
      try {
        const voices = getVoicesForLang(form.language)
        const voiceGender = voices.find(v => v.value === form.voice_name)?.gender ?? 'FEMALE'
        const res = await ivrService.generateTts({
          speech_text: form.speech_text,
          language: form.language,
          voice_name: form.voice_name,
          voice_gender: voiceGender,
          speed: form.speed,
          pitch: form.pitch,
        })
        const relPath = (res.data as { data?: { relative_path?: string } })?.data?.relative_path ?? ''
        if (relPath) {
          const parts = relPath.split('/')
          const blobRes = await ivrService.fetchAudioBlob(parts[0], parts.slice(1).join('/'))
          const blob = new Blob([blobRes.data as BlobPart], {
            type: (blobRes.headers as Record<string, string>)['content-type'] || 'audio/mpeg',
          })
          if (ttsUrlRef.current) URL.revokeObjectURL(ttsUrlRef.current)
          const ttsUrl = URL.createObjectURL(blob)
          ttsUrlRef.current = ttsUrl
          setTtsPreviewUrl(ttsUrl)
        }
      } catch { /* silent — preview failure shouldn't block the user */ }
      finally { setTtsPreviewLoading(false) }
    }, 1200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.speech_text, form.language, form.voice_name, form.speed, form.pitch, form.prompt_option])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.ivr_desc.trim()) {
      toast.error('Display name is required'); return
    }
    // Auto-generate ivr_id from display name when creating
    if (!isEditing && !form.ivr_id.trim()) {
      const slug = form.ivr_desc.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
      const suffix = Math.random().toString(36).slice(2, 6)
      form.ivr_id = `${slug}_${suffix}`
    }
    setSaving(true)
    try {
      let annId = form.ann_id
      if (form.prompt_option === '1' && form.speech_text.trim()) {
        try {
          const voices = getVoicesForLang(form.language)
          const voiceGender = voices.find(v => v.value === form.voice_name)?.gender ?? 'FEMALE'
          const res = await ivrService.generateTts({
            speech_text: form.speech_text,
            language: form.language,
            voice_name: form.voice_name,
            voice_gender: voiceGender,
            speed: form.speed,
            pitch: form.pitch,
          })
          annId = (res.data as { data?: { relative_path?: string } })?.data?.relative_path ?? annId
        } catch { /* TTS generation failed — save metadata only */ }
      } else if (form.prompt_option !== '1' && (audioFile || recordedBlob)) {
        const fd = new FormData()
        if (audioFile) fd.append('audio', audioFile)
        else if (recordedBlob) fd.append('audio', recordedBlob, 'recording.webm')
        const res = await ivrService.uploadAudio(fd)
        annId = (res.data as { data?: { relative_path?: string } })?.data?.relative_path ?? annId
      }
      const payload: Record<string, unknown> = { ...form, ann_id: annId }
      if (isEditing) payload.auto_id = ivr!.auto_id ?? ivr!.id
      if (isEditing) await ivrService.update(payload)
      else await ivrService.create(payload)
      toast.success(isEditing ? 'IVR updated' : 'IVR created')
      qc.invalidateQueries({ queryKey: ['ivr-list'] })
      onClose()
    } catch {
      toast.error('Failed to save IVR')
    } finally { setSaving(false); onSavingChange?.(false) }
  }

  const voiceOptions = getVoicesForLang(form.language)

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label">Display Name <span className="text-red-500">*</span></label>
        <input className="input" value={form.ivr_desc}
          onChange={e => set('ivr_desc', e.target.value)} placeholder="Main Sales IVR" />
      </div>

      <div>
        <label className="label">Greeting Type</label>
        <div className="grid grid-cols-3 gap-2">
          {([['1', 'Text to Speech', <Volume2 key="v" size={14} />], ['0', 'Upload File', <Upload key="u" size={14} />], ['2', 'Record from Mic', <Mic key="m" size={14} />]] as [string, string, React.ReactNode][]).map(([v, l, icon]) => (
            <button key={v} type="button" onClick={() => set('prompt_option', v)}
              className={cn('flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all',
                form.prompt_option === v
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50')}>
              {icon}{l}
            </button>
          ))}
        </div>
      </div>

      {form.prompt_option === '1' && (
        <>
          <div>
            <label className="label">Greeting Message</label>
            <textarea className="input min-h-[60px] resize-none" value={form.speech_text}
              onChange={e => set('speech_text', e.target.value)}
              placeholder="Welcome to Acme Corp! Press 1 for Sales, press 2 for Support…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Language</label>
              <select className="input" value={form.language} onChange={e => handleLangChange(e.target.value)}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Voice</label>
              <select className="input" value={form.voice_name} onChange={e => set('voice_name', e.target.value)}>
                {voiceOptions.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Speed</label>
              <select className="input" value={form.speed} onChange={e => set('speed', e.target.value)}>
                {['slow', 'medium', 'fast'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Pitch</label>
              <select className="input" value={form.pitch} onChange={e => set('pitch', e.target.value)}>
                {['low', 'medium', 'high'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="h-8 flex items-center">
            {ttsPreviewLoading && (
              <span className="flex items-center gap-1.5 text-xs text-indigo-600">
                <Loader2 size={12} className="animate-spin" /> Generating preview…
              </span>
            )}
            {ttsPreviewUrl && !ttsPreviewLoading && (
              <audio controls src={ttsPreviewUrl} className="w-full h-8" />
            )}
            {!ttsPreviewUrl && !ttsPreviewLoading && form.speech_text.trim() && (
              <span className="text-xs text-slate-400">Preview generates automatically…</span>
            )}
          </div>
        </>
      )}

      {form.prompt_option === '0' && (
        <div>
          <label className="label">Audio File</label>
          <div
            className={cn('border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
              dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300')}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f) }}>
            <input ref={fileRef} type="file" accept=".mp3,.wav,.ogg,.webm,.m4a,.mp4" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />
            {audioFile ? (
              <div className="space-y-1">
                <Music size={20} className="text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">{audioFile.name}</p>
                <p className="text-xs text-slate-400">{(audioFile.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload size={20} className="text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">Drop file or click to browse</p>
                <p className="text-xs text-slate-400">MP3, WAV, OGG, WebM · Max 20 MB</p>
                {ivr?.ann_id && <p className="text-xs text-indigo-500 mt-1">Current: {String(ivr.ann_id).split('/').pop()}</p>}
              </div>
            )}
          </div>
          {uploadPreviewUrl && <audio controls src={uploadPreviewUrl} className="w-full mt-2" />}
        </div>
      )}

      {form.prompt_option === '2' && (
        <div>
          <label className="label">Record from Microphone</label>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <AudioRecorder onRecorded={handleRecorded} />
          </div>
          {recordPreviewUrl && (
            <audio controls src={recordPreviewUrl} className="w-full mt-2" />
          )}
        </div>
      )}

    </form>
  )
}

// ── IVR Tab ────────────────────────────────────────────────────────────────────

function IvrTab() {
  const qc = useQueryClient()
  const table = useServerTable()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Ivr | null>(null)
  const [ivrSaving, setIvrSaving] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ivrService.delete(id),
    onSuccess: () => { toast.success('IVR deleted'); qc.invalidateQueries({ queryKey: ['ivr-list'] }) },
    onError: () => toast.error('Failed to delete IVR'),
  })

  const greetingColors: Record<string, string> = {
    '0': 'bg-blue-50 text-blue-700',
    '1': 'bg-purple-50 text-purple-700',
    '2': 'bg-rose-50 text-rose-700',
  }

  const columns: Column<Ivr>[] = [
    {
      key: 'ivr_desc',
      header: 'IVR Name',
      render: (ivr) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <PhoneCall size={13} className="text-indigo-600" />
          </div>
          <span className="text-sm font-semibold text-slate-800">{ivr.ivr_desc}</span>
        </div>
      ),
    },
    {
      key: 'prompt_option',
      header: 'Greeting',
      render: (ivr) => {
        const pOpt = String(ivr.prompt_option ?? '1')
        return (
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', greetingColors[pOpt] ?? greetingColors['1'])}>
            {PROMPT_LABEL[pOpt] ?? 'TTS'}
          </span>
        )
      },
    },
    {
      key: 'ann_id',
      header: 'Preview',
      render: (ivr) => {
        const annId = String(ivr.ann_id ?? '')
        return annId.includes('/')
          ? <AudioPlayer annId={annId} />
          : <span className="text-xs text-slate-300">—</span>
      },
    },
    {
      key: '_actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (ivr) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => { setEditing(ivr); setShowModal(true) }}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
            <Pencil size={13} />
          </button>
          <button
            onClick={async () => {
              if (await confirmDelete(ivr.ivr_desc))
                deleteMutation.mutate(ivr.auto_id ?? ivr.id ?? 0)
            }}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="py-4">
      <ServerDataTable<Ivr>
        queryKey={['ivr-list']}
        queryFn={(params) => ivrService.list(params)}
        dataExtractor={(res: unknown) => {
          // IVR API returns: {success, total_rows, data: [...]} directly
          const r = res as { data?: { data?: Ivr[]; total_rows?: number } }
          return r?.data?.data ?? []
        }}
        totalExtractor={(res: unknown) => {
          const r = res as { data?: { total_rows?: number } }
          return r?.data?.total_rows ?? 0
        }}
        columns={columns}
        keyField="ivr_id"
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search IVRs…"
        page={table.page}
        limit={table.limit}
        onPageChange={table.setPage}
        headerActions={
          <button onClick={() => { setEditing(null); setShowModal(true) }}
            className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus size={14} /> Add IVR
          </button>
        }
        emptyText="No IVRs yet — create your first IVR to build an automated phone menu"
        emptyIcon={<PhoneCall size={28} />}
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <PhoneCall size={14} className="text-indigo-600" />
                </div>
                <p className="text-sm font-bold text-slate-900">{editing ? 'Edit IVR' : 'New IVR'}</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <X size={15} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <IvrFormModal ivr={editing} onClose={() => setShowModal(false)} formId="ivr-form" onSavingChange={setIvrSaving} />
            </div>
            <div className="flex justify-end gap-3 px-6 pt-4 pb-4 border-t border-slate-100 flex-shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="btn-outline">Cancel</button>
              <button type="submit" form="ivr-form" disabled={ivrSaving} className="btn-primary flex items-center gap-1.5">
                {ivrSaving ? <><Loader2 size={13} className="animate-spin" />Saving…</> : editing ? 'Save Changes' : 'Create IVR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

type MainTab = 'ivr' | 'menu' | 'audio'

const TABS: { key: MainTab; label: string; icon: React.ReactNode }[] = [
  { key: 'ivr',   label: 'IVR',           icon: <PhoneCall size={14} /> },
  { key: 'menu',  label: 'IVR Menu',       icon: <Music size={14} />     },
  { key: 'audio', label: 'Audio Messages', icon: <Music size={14} />     },
]

export function Ivr() {
  const [tab, setTab] = useState<MainTab>('ivr')
  const { setToolbar } = useDialerHeader()

  useEffect(() => {
    setToolbar(
      <div className="lt-right">
        <div className="flex items-center gap-1" style={{ background: '#f1f5f9', borderRadius: 8, padding: 2 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                tab === t.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>
    )
    return () => setToolbar(undefined)
  })

  return (
    <div>
      {tab === 'ivr'   && <IvrTab />}
      {tab === 'menu'  && <IvrMenuTab />}
      {tab === 'audio' && <AudioMessagesTab />}
    </div>
  )
}
