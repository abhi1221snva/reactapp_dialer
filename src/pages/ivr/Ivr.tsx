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
import { cn } from '../../utils/cn'
import { ServerDataTable } from '../../components/ui/ServerDataTable'
import type { Column } from '../../components/ui/ServerDataTable'
import { useServerTable } from '../../hooks/useServerTable'

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
  { value: 'ar',    label: 'Arabic' },
  { value: 'zh',    label: 'Chinese (Mandarin)' },
  { value: 'zh-TW', label: 'Chinese (Traditional)' },
  { value: 'da',    label: 'Danish' },
  { value: 'nl',    label: 'Dutch' },
  { value: 'en',    label: 'English' },
  { value: 'en-AU', label: 'English (Australian)' },
  { value: 'en-GB', label: 'English (British)' },
  { value: 'en-IN', label: 'English (Indian)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'fi',    label: 'Finnish' },
  { value: 'fr',    label: 'French' },
  { value: 'fr-CA', label: 'French (Canadian)' },
  { value: 'de',    label: 'German' },
  { value: 'el',    label: 'Greek' },
  { value: 'hi',    label: 'Hindi' },
  { value: 'id',    label: 'Indonesian' },
  { value: 'it',    label: 'Italian' },
  { value: 'ja',    label: 'Japanese' },
  { value: 'ko',    label: 'Korean' },
  { value: 'ms',    label: 'Malay' },
  { value: 'nb',    label: 'Norwegian' },
  { value: 'pl',    label: 'Polish' },
  { value: 'pt',    label: 'Portuguese' },
  { value: 'pt-BR', label: 'Portuguese (Brazilian)' },
  { value: 'ro',    label: 'Romanian' },
  { value: 'ru',    label: 'Russian' },
  { value: 'es',    label: 'Spanish' },
  { value: 'es-MX', label: 'Spanish (Mexican)' },
  { value: 'es-US', label: 'Spanish (US)' },
  { value: 'sv',    label: 'Swedish' },
  { value: 'tr',    label: 'Turkish' },
  { value: 'uk',    label: 'Ukrainian' },
  { value: 'cy',    label: 'Welsh' },
]

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
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const toggle = async () => {
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
      return
    }
    if (audioRef.current?.src) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
      setPlaying(true)
      return
    }
    setLoading(true)
    try {
      const parts = annId.split('/')
      const subdir = parts[0]
      const filename = parts.slice(1).join('/')
      const res = await ivrService.fetchAudioBlob(subdir, filename)
      const blob = new Blob([res.data as BlobPart], {
        type: (res.headers as Record<string, string>)['content-type'] || 'audio/mpeg',
      })
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setPlaying(false)
      await audio.play()
      setPlaying(true)
    } catch {
      toast.error('Could not load audio file')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  return (
    <button type="button" onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold transition-colors">
      {loading
        ? <Loader2 size={12} className="animate-spin" />
        : playing ? <Square size={12} /> : <Play size={12} />}
      {loading ? 'Loading…' : playing ? 'Stop' : 'Play'}
    </button>
  )
}

// ── Audio Recorder ─────────────────────────────────────────────────────────────

function AudioRecorder({ onRecorded }: { onRecorded: (blob: Blob, url: string) => void }) {
  const [recording, setRecording] = useState(false)
  const [time, setTime] = useState(0)
  const mrRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
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
    } catch {
      toast.error('Microphone access denied.')
    }
  }

  const stop = () => {
    mrRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <button type="button" onClick={recording ? stop : start}
        className={cn(
          'w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg',
          recording
            ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-200 animate-pulse'
            : 'bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 ring-4 ring-indigo-100'
        )}>
        {recording ? <Square size={28} className="text-white" /> : <Mic size={28} className="text-white" />}
      </button>
      <div className="text-center">
        <p className={cn('text-2xl font-mono font-bold', recording ? 'text-red-600' : 'text-slate-400')}>
          {fmt(time)}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {recording ? 'Recording… click to stop' : 'Click the button to start recording'}
        </p>
      </div>
    </div>
  )
}

// ── Audio Form (shared modal body for Audio Messages) ──────────────────────────

function AudioForm({ editing, onClose }: { editing: AudioMessage | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    ivr_desc: '', language: 'en', voice_name: '', speech_text: '',
    prompt_option: '1', speed: 'medium', pitch: 'medium', ann_id: '',
  })
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setForm({
        ivr_desc:      editing.ivr_desc ?? '',
        language:      String(editing.language ?? 'en'),
        voice_name:    String(editing.voice_name ?? ''),
        speech_text:   String(editing.speech_text ?? ''),
        prompt_option: String(editing.prompt_option ?? '1'),
        speed:         String(editing.speed ?? 'medium'),
        pitch:         String(editing.pitch ?? 'medium'),
        ann_id:        String(editing.ann_id ?? ''),
      })
    } else {
      setForm({ ivr_desc: '', language: 'en', voice_name: '', speech_text: '', prompt_option: '1', speed: 'medium', pitch: 'medium', ann_id: '' })
    }
    setAudioFile(null); setRecordedBlob(null); setPreviewUrl(null)
  }, [editing])

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(mp3|wav|ogg|webm|m4a|mp4)$/i)) {
      toast.error('Please upload a valid audio file'); return
    }
    setAudioFile(file)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    setRecordedBlob(null)
  }

  const handleRecorded = (blob: Blob, url: string) => {
    setRecordedBlob(blob)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(url)
    setAudioFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.ivr_desc.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      let annId = form.ann_id
      if (form.prompt_option !== '1' && (audioFile || recordedBlob)) {
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
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            <textarea className="input min-h-[80px] resize-none" value={form.speech_text}
              onChange={e => set('speech_text', e.target.value)}
              placeholder="Welcome to our company! Press 1 for Sales…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Language</label>
              <select className="input" value={form.language} onChange={e => set('language', e.target.value)}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Voice</label>
              <input className="input" value={form.voice_name}
                onChange={e => set('voice_name', e.target.value)} placeholder="e.g. Joanna" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Speed</label>
              <select className="input" value={form.speed} onChange={e => set('speed', e.target.value)}>
                {['slow', 'medium', 'fast'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Pitch</label>
              <select className="input" value={form.pitch} onChange={e => set('pitch', e.target.value)}>
                {['low', 'medium', 'high'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
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
        </div>
      )}

      {form.prompt_option === '2' && (
        <div>
          <label className="label">Record from Microphone</label>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <AudioRecorder onRecorded={handleRecorded} />
          </div>
          {recordedBlob && (
            <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
              <CheckCircle2 size={12} /> Recording ready
            </p>
          )}
        </div>
      )}

      {previewUrl && (
        <div>
          <label className="label">Preview</label>
          <audio controls src={previewUrl} className="w-full h-10 rounded-lg" />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-1.5">
          {saving ? <><Loader2 size={13} className="animate-spin" />Saving…</> : editing ? 'Save Changes' : 'Create'}
        </button>
      </div>
    </form>
  )
}

// ── Audio Messages Tab ─────────────────────────────────────────────────────────

function AudioMessagesTab() {
  const qc = useQueryClient()
  const table = useServerTable()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<AudioMessage | null>(null)

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
      header: '',
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
    <div className="flex-1 overflow-y-auto p-6">
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
            <Plus size={14} /> New Audio Message
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
              <AudioForm editing={editing} onClose={() => setShowModal(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── IVR Menu – Destination helpers ────────────────────────────────────────────

interface ExtensionItem { extension: string; first_name?: string; last_name?: string; [key: string]: unknown }
interface RingGroupItem { id: number; title: string; [key: string]: unknown }

function DestinationSelect({
  destType, value, onChange, allIvrs, ivrId,
}: {
  destType: string; value: string; onChange: (v: string) => void
  allIvrs: Ivr[]; ivrId: string
}) {
  const { data: extRaw } = useQuery({
    queryKey: ['client-extensions'],
    queryFn: () => ivrService.getClientExtensions(),
    enabled: destType === '0' || destType === '2',
  })
  const { data: rgRaw } = useQuery({
    queryKey: ['ring-groups'],
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
            {ext.extension}{ext.first_name || ext.last_name
              ? ` — ${[ext.first_name, ext.last_name].filter(Boolean).join(' ')}` : ''}
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
  // Use numeric id as select value to avoid string/type-mismatch with ivr_id
  const [selectedNumId, setSelectedNumId] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<IvrMenuItem | null>(null)

  const { data: ivrRaw, isLoading: ivrLoading } = useQuery({
    queryKey: ['ivr-list', 'all'],
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

  const menuItems = extractList<IvrMenuItem>(menuRaw)
  const usedDtmf = menuItems.map(m => m.dtmf)

  const dtmfLabel = (key: string) => key === '*' ? '★ Star' : key === '#' ? '# Hash' : key

  return (
    <div className="flex-1 overflow-y-auto p-6">
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
                    const order = ['1','2','3','4','5','6','7','8','9','*','0','#']
                    return order.indexOf(a.dtmf) - order.indexOf(b.dtmf)
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
          ivrNumId={Number(selectedNumId)}
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

function IvrFormModal({ ivr, onClose }: { ivr: Partial<Ivr> | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    ivr_id: '', ann_id: '', ivr_desc: '', language: 'en',
    voice_name: '', speech_text: '', prompt_option: '1', speed: 'medium', pitch: 'medium',
  })
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ivr) {
      setForm({
        ivr_id:        String(ivr.ivr_id ?? ''),
        ann_id:        String(ivr.ann_id ?? ''),
        ivr_desc:      String(ivr.ivr_desc ?? ''),
        language:      String(ivr.language ?? 'en'),
        voice_name:    String(ivr.voice_name ?? ''),
        speech_text:   String(ivr.speech_text ?? ''),
        prompt_option: String(ivr.prompt_option ?? '1'),
        speed:         String(ivr.speed ?? 'medium'),
        pitch:         String(ivr.pitch ?? 'medium'),
      })
    } else {
      setForm({ ivr_id: '', ann_id: '', ivr_desc: '', language: 'en', voice_name: '', speech_text: '', prompt_option: '1', speed: 'medium', pitch: 'medium' })
    }
    setAudioFile(null); setRecordedBlob(null); setPreviewUrl(null)
  }, [ivr])

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const isEditing = !!(ivr?.auto_id || ivr?.id)

  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(mp3|wav|ogg|webm|m4a|mp4)$/i)) {
      toast.error('Please upload a valid audio file'); return
    }
    setAudioFile(file)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    setRecordedBlob(null)
  }

  const handleRecorded = (blob: Blob, url: string) => {
    setRecordedBlob(blob)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(url)
    setAudioFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.ivr_id.trim() || !form.ivr_desc.trim()) {
      toast.error('IVR ID and name are required'); return
    }
    setSaving(true)
    try {
      let annId = form.ann_id
      if (form.prompt_option !== '1' && (audioFile || recordedBlob)) {
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
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">IVR ID <span className="text-red-500">*</span></label>
          <input className="input" value={form.ivr_id}
            onChange={e => set('ivr_id', e.target.value)}
            placeholder="e.g. ivr_main" disabled={isEditing} />
          {!isEditing && <p className="text-xs text-slate-400 mt-1">Unique identifier — no spaces</p>}
        </div>
        <div>
          <label className="label">Display Name <span className="text-red-500">*</span></label>
          <input className="input" value={form.ivr_desc}
            onChange={e => set('ivr_desc', e.target.value)} placeholder="Main Sales IVR" />
        </div>
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
            <textarea className="input min-h-[72px] resize-none" value={form.speech_text}
              onChange={e => set('speech_text', e.target.value)}
              placeholder="Welcome to Acme Corp! Press 1 for Sales, press 2 for Support…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Language</label>
              <select className="input" value={form.language} onChange={e => set('language', e.target.value)}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Voice</label>
              <input className="input" value={form.voice_name}
                onChange={e => set('voice_name', e.target.value)} placeholder="e.g. Joanna" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Speed</label>
              <select className="input" value={form.speed} onChange={e => set('speed', e.target.value)}>
                {['slow', 'medium', 'fast'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Pitch</label>
              <select className="input" value={form.pitch} onChange={e => set('pitch', e.target.value)}>
                {['low', 'medium', 'high'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
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
        </div>
      )}

      {form.prompt_option === '2' && (
        <div>
          <label className="label">Record from Microphone</label>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <AudioRecorder onRecorded={handleRecorded} />
          </div>
          {recordedBlob && (
            <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
              <CheckCircle2 size={12} /> Recording ready
            </p>
          )}
        </div>
      )}

      {previewUrl && (
        <div>
          <label className="label">Preview</label>
          <audio controls src={previewUrl} className="w-full h-10 rounded-lg" />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-1.5">
          {saving ? <><Loader2 size={13} className="animate-spin" />Saving…</> : isEditing ? 'Save Changes' : 'Create IVR'}
        </button>
      </div>
    </form>
  )
}

// ── IVR Tab ────────────────────────────────────────────────────────────────────

function IvrTab() {
  const qc = useQueryClient()
  const table = useServerTable()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Ivr | null>(null)

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
      key: 'ivr_id',
      header: 'IVR ID',
      render: (ivr) => (
        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
          {ivr.ivr_id}
        </span>
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
      header: '',
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
    <div className="flex-1 overflow-y-auto p-6">
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
            <Plus size={14} /> New IVR
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
              <IvrFormModal ivr={editing} onClose={() => setShowModal(false)} />
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

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">IVR System</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Build phone menus, configure key routing, and manage voice prompts
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  tab === t.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-slate-50 flex flex-col">
        {tab === 'ivr'   && <IvrTab />}
        {tab === 'menu'  && <IvrMenuTab />}
        {tab === 'audio' && <AudioMessagesTab />}
      </div>
    </div>
  )
}
