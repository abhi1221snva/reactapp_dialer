import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, PhoneCall, Music, Search, X,
  Mic, Upload, Volume2, Hash, ArrowRight, AlertCircle,
  CheckCircle2, Loader2, Play, Square, Info, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ivrService } from '../../services/ivr.service'
import { confirmDelete } from '../../utils/confirmDelete'
import { cn } from '../../utils/cn'

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

const DEST_TYPE_META: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  '0': { label: 'Extension', color: 'text-indigo-700',  bg: 'bg-indigo-50',  ring: 'ring-indigo-200'  },
  '1': { label: 'Queue',     color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  '2': { label: 'Voicemail', color: 'text-amber-700',   bg: 'bg-amber-50',   ring: 'ring-amber-200'   },
  '3': { label: 'IVR',       color: 'text-blue-700',    bg: 'bg-blue-50',    ring: 'ring-blue-200'    },
  '4': { label: 'Hangup',    color: 'text-red-700',     bg: 'bg-red-50',     ring: 'ring-red-200'     },
  '5': { label: 'External',  color: 'text-purple-700',  bg: 'bg-purple-50',  ring: 'ring-purple-200'  },
}

const LANGUAGES = [
  { value: 'en',    label: 'English' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es',    label: 'Spanish' },
  { value: 'fr',    label: 'French' },
  { value: 'de',    label: 'German' },
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

// ── Info Box ──────────────────────────────────────────────────────────────────

function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/60 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left">
        <Info size={14} className="text-indigo-500 flex-shrink-0" />
        <span className="text-sm font-semibold text-indigo-700 flex-1">{title}</span>
        <ChevronDown size={14} className={cn('text-indigo-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-4 pb-3 pt-0.5 text-xs text-indigo-900/80 leading-relaxed border-t border-indigo-100">
          {children}
        </div>
      )}
    </div>
  )
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
    // Reuse already-loaded audio
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
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors">
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
      toast.error('Microphone access denied. Please allow microphone access in your browser settings.')
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

// ── Audio Form (create / edit modal content) ───────────────────────────────────

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
    setAudioFile(null)
    setRecordedBlob(null)
    setPreviewUrl(null)
  }, [editing])

  // Clean up object URLs on unmount
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(mp3|wav|ogg|webm|m4a|mp4)$/i)) {
      toast.error('Please upload a valid audio file (MP3, WAV, OGG, WebM, M4A)')
      return
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
      // Upload file / recording first
      if (form.prompt_option !== '1' && (audioFile || recordedBlob)) {
        const fd = new FormData()
        if (audioFile) fd.append('audio', audioFile)
        else if (recordedBlob) fd.append('audio', recordedBlob, 'recording.webm')
        const res = await ivrService.uploadAudio(fd)
        annId = (res.data as { data?: { relative_path?: string } })?.data?.relative_path ?? annId
      }
      const payload: Record<string, unknown> = { ...form, ann_id: annId }
      if (editing) payload.auto_id = editing.auto_id ?? editing.id
      const fn = editing ? ivrService.updateAudio : ivrService.createAudio
      await fn(payload)
      toast.success(editing ? 'Audio message updated' : 'Audio message created')
      qc.invalidateQueries({ queryKey: ['audio-messages'] })
      onClose()
    } catch {
      toast.error('Failed to save audio message')
    } finally {
      setSaving(false)
    }
  }

  const typeOpts = [
    { v: '1', l: 'Text to Speech', icon: <Volume2 size={14} /> },
    { v: '0', l: 'Upload File',    icon: <Upload size={14} />  },
    { v: '2', l: 'Record from Mic',icon: <Mic size={14} />    },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Name <span className="text-red-500">*</span></label>
        <input className="input" value={form.ivr_desc}
          onChange={e => set('ivr_desc', e.target.value)}
          placeholder="e.g. Main Greeting, After-Hours Message" />
      </div>

      {/* Type selector */}
      <div>
        <label className="label">Audio Type</label>
        <div className="grid grid-cols-3 gap-2">
          {typeOpts.map(({ v, l, icon }) => (
            <button key={v} type="button" onClick={() => set('prompt_option', v)}
              className={cn(
                'flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all',
                form.prompt_option === v
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              )}>
              {icon}{l}
            </button>
          ))}
        </div>
      </div>

      {/* TTS settings */}
      {form.prompt_option === '1' && (
        <>
          <div>
            <label className="label">Greeting Message</label>
            <textarea className="input min-h-[80px] resize-none" value={form.speech_text}
              onChange={e => set('speech_text', e.target.value)}
              placeholder="Welcome to our company! Press 1 for Sales, press 2 for Support…" />
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

      {/* File Upload */}
      {form.prompt_option === '0' && (
        <div>
          <label className="label">Audio File</label>
          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
              dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50'
            )}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setDragOver(false)
              const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f)
            }}>
            <input ref={fileRef} type="file" accept=".mp3,.wav,.ogg,.webm,.m4a,.mp4"
              className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />
            {audioFile ? (
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto">
                  <Music size={18} className="text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-slate-700">{audioFile.name}</p>
                <p className="text-xs text-slate-400">{(audioFile.size / 1024).toFixed(0)} KB — click to change</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto">
                  <Upload size={18} className="text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600">Drop audio file here or click to browse</p>
                <p className="text-xs text-slate-400">MP3, WAV, OGG, WebM, M4A · Max 20 MB</p>
                {editing?.ann_id && (
                  <p className="text-xs text-indigo-500 mt-1">
                    Current: {editing.ann_id.split('/').pop()} — drop new file to replace
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Browser Recording */}
      {form.prompt_option === '2' && (
        <div>
          <label className="label">Record from Microphone</label>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <AudioRecorder onRecorded={handleRecorded} />
          </div>
          {recordedBlob && (
            <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
              <CheckCircle2 size={12} /> Recording ready — save to upload it
            </p>
          )}
        </div>
      )}

      {/* Preview player */}
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
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<AudioMessage | null>(null)

  const { data: raw, isLoading } = useQuery({
    queryKey: ['audio-messages'],
    queryFn: () => ivrService.listAudio({ page: 1, limit: 200, search: '', filters: {} }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ivrService.deleteAudio(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['audio-messages'] }) },
    onError: () => toast.error('Failed to delete'),
  })

  const messages = extractList<AudioMessage>(raw)
  const filtered = messages.filter(m =>
    !search || (m.ivr_desc ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const typeColors: Record<string, string> = {
    '0': 'bg-blue-50 text-blue-700',
    '1': 'bg-purple-50 text-purple-700',
    '2': 'bg-rose-50 text-rose-700',
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <InfoBox title="What are Audio Messages?">
        <div className="pt-1.5 space-y-1">
          <p>Audio Messages are the voice prompts callers hear when they reach your IVR. Three ways to create them:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li><strong>Text to Speech (TTS)</strong> — type your message, the system reads it aloud automatically.</li>
            <li><strong>Upload File</strong> — upload a pre-recorded MP3, WAV, or similar audio file.</li>
            <li><strong>Record from Mic</strong> — record directly from your browser microphone right now.</li>
          </ul>
          <p className="mt-1">Once created, reference the Audio Message in your IVR settings via its Announcement ID.</p>
        </div>
      </InfoBox>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input className="input pl-9 text-sm" placeholder="Search audio messages…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={14} /> New Audio Message
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-indigo-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Music size={26} className="text-slate-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-600">
              {search ? 'No messages match your search' : 'No audio messages yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Try a different search term' : 'Create your first audio message to use as an IVR greeting'}
            </p>
          </div>
          {!search && (
            <button onClick={() => { setEditing(null); setShowModal(true) }} className="btn-primary text-sm">
              <Plus size={14} /> Create Audio Message
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {['Name', 'Type', 'Language', 'Preview / Text', 'Actions'].map((h, i) => (
                  <th key={h} className={cn('px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider',
                    i === 4 ? 'text-right' : 'text-left')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((msg, i) => {
                const pOpt = String(msg.prompt_option ?? '1')
                const hasFile = msg.ann_id && msg.ann_id.includes('/') && pOpt !== '1'
                return (
                  <tr key={msg.auto_id ?? msg.id ?? i}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                          <Music size={13} className="text-purple-600" />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{msg.ivr_desc}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', typeColors[pOpt] ?? typeColors['1'])}>
                        {PROMPT_LABEL[pOpt] ?? 'TTS'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{msg.language || '—'}</td>
                    <td className="px-4 py-3.5">
                      {hasFile
                        ? <AudioPlayer annId={msg.ann_id!} />
                        : msg.speech_text
                          ? <span className="text-xs text-slate-400 italic line-clamp-1 max-w-[220px]">
                              &ldquo;{msg.speech_text}&rdquo;
                            </span>
                          : <span className="text-xs text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3.5 text-right">
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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Music size={14} className="text-purple-600" />
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {editing ? 'Edit Audio Message' : 'New Audio Message'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
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

// ── Key Config Drawer ──────────────────────────────────────────────────────────

function KeyConfigDrawer({
  dtmf, ivrId, item, destTypes, onSave, onClose, onDelete,
}: {
  dtmf: string; ivrId: string; item: IvrMenuItem | null
  destTypes: { id: number; name: string }[]
  onSave: () => void; onClose: () => void; onDelete: () => void
}) {
  const [form, setForm] = useState({ dtmf_title: '', dest_type: '0', dest: '' })
  const qc = useQueryClient()

  useEffect(() => {
    setForm(item
      ? { dtmf_title: item.dtmf_title ?? '', dest_type: String(item.dest_type), dest: item.dest }
      : { dtmf_title: '', dest_type: '0', dest: '' }
    )
  }, [item, dtmf])

  const saveMutation = useMutation({
    mutationFn: () => item
      ? ivrService.editMenu({ auto_id: item.ivr_m_id ?? item.id, ...form, ivr_id: ivrId })
      : ivrService.addMenu({ parameter: [{ dtmf, ...form, ivr_id: ivrId }] }),
    onSuccess: () => {
      toast.success(item ? 'Route updated' : 'Route added')
      qc.invalidateQueries({ queryKey: ['ivr-menu', ivrId] })
      onSave()
    },
    onError: () => toast.error('Failed to save route'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => ivrService.deleteMenu(item?.ivr_m_id ?? item?.id ?? 0),
    onSuccess: () => {
      toast.success('Route removed')
      qc.invalidateQueries({ queryKey: ['ivr-menu', ivrId] })
      onDelete()
    },
    onError: () => toast.error('Failed to remove route'),
  })

  const keyLabel = dtmf === '*' ? '★' : dtmf === '#' ? '＃' : dtmf
  const destMeta = DEST_TYPE_META[form.dest_type]

  return (
    <div className="mt-4 border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {keyLabel}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Configure Key {keyLabel}</p>
            <p className="text-xs text-slate-500">Set where pressing {keyLabel} routes callers</p>
          </div>
        </div>
        <button type="button" onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label text-xs">Key Label</label>
            <input className="input text-sm" value={form.dtmf_title}
              onChange={e => setForm(p => ({ ...p, dtmf_title: e.target.value }))}
              placeholder="e.g. Sales" />
          </div>
          <div>
            <label className="label text-xs">Route Type</label>
            <select className="input text-sm" value={form.dest_type}
              onChange={e => setForm(p => ({ ...p, dest_type: e.target.value }))}>
              {destTypes.length > 0
                ? destTypes.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)
                : Object.entries(DEST_TYPE_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)
              }
            </select>
          </div>
          <div>
            <label className="label text-xs">Destination</label>
            <input className="input text-sm" value={form.dest}
              onChange={e => setForm(p => ({ ...p, dest: e.target.value }))}
              placeholder={form.dest_type === '4' ? 'N/A' : 'Ext / Queue ID…'} />
          </div>
        </div>

        {/* Route preview */}
        {destMeta && (
          <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl mt-4 text-xs', destMeta.bg)}>
            <span className={cn('w-6 h-6 rounded-full flex items-center justify-center font-bold ring-1', destMeta.ring, destMeta.color)}>
              {keyLabel}
            </span>
            <ArrowRight size={12} className={destMeta.color} />
            <span className={cn('font-semibold', destMeta.color)}>{destMeta.label}</span>
            {form.dest && <span className={cn('font-mono opacity-80', destMeta.color)}>{form.dest}</span>}
            {form.dtmf_title && <span className={cn('opacity-60', destMeta.color)}>({form.dtmf_title})</span>}
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div>
            {item && (
              <button type="button"
                onClick={async () => { if (await confirmDelete(`route for key ${dtmf}`)) deleteMutation.mutate() }}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
                <Trash2 size={13} /> Remove Route
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="button"
              disabled={(form.dest_type !== '4' && !form.dest) || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="btn-primary text-sm px-5 py-2">
              {saveMutation.isPending ? <><Loader2 size={13} className="animate-spin" />Saving…</> : 'Save Route'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Visual Keypad ──────────────────────────────────────────────────────────────

function VisualKeypad({
  menuItems, onKeySelect, activeKey,
}: { menuItems: IvrMenuItem[]; onKeySelect: (k: string) => void; activeKey: string | null }) {
  const byDtmf: Record<string, IvrMenuItem> = {}
  menuItems.forEach(m => { byDtmf[m.dtmf] = m })

  return (
    <div className="grid grid-cols-3 gap-3">
      {KEYPAD_KEYS.map(key => {
        const item = byDtmf[key]
        const meta = item ? (DEST_TYPE_META[item.dest_type] ?? DEST_TYPE_META['0']) : null
        const isActive = activeKey === key
        const kd = key === '*' ? '★' : key === '#' ? '＃' : key

        return (
          <button key={key} onClick={() => onKeySelect(key)}
            className={cn(
              'group relative rounded-2xl border-2 text-left transition-all duration-200 focus:outline-none',
              isActive
                ? 'border-indigo-500 ring-4 ring-indigo-100 shadow-lg scale-[1.02]'
                : item
                  ? cn('border-transparent ring-2', meta!.ring, 'hover:scale-[1.02] hover:shadow-md')
                  : 'border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 hover:scale-[1.02]'
            )}>
            {item && meta ? (
              <div className={cn('p-3 rounded-2xl h-full', meta.bg)}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={cn('text-lg font-bold leading-none', meta.color)}>{kd}</span>
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/70', meta.color)}>
                    {meta.label}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                  {item.dtmf_title || '(no label)'}
                </p>
                <p className="text-xs text-slate-500 font-mono truncate mt-0.5">{item.dest}</p>
                <ArrowRight size={10} className={cn('mt-1 opacity-60', meta.color)} />
              </div>
            ) : (
              <div className="p-3 flex flex-col items-center justify-center h-[88px] gap-1.5">
                <span className="text-xl font-bold text-slate-300 group-hover:text-indigo-400 transition-colors leading-none">{kd}</span>
                <div className="w-5 h-5 rounded-full border-2 border-dashed border-slate-200 group-hover:border-indigo-400 flex items-center justify-center transition-colors">
                  <Plus size={10} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
                <span className="text-[10px] text-slate-300 group-hover:text-indigo-400 transition-colors">Add route</span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── IVR Menu Tab ───────────────────────────────────────────────────────────────

function IvrMenuTab() {
  const [selectedIvrId, setSelectedIvrId] = useState('')
  const [activeKey, setActiveKey] = useState<string | null>(null)

  const { data: ivrRaw, isLoading: ivrLoading } = useQuery({
    queryKey: ['ivr-list', 'all'],
    queryFn: () => ivrService.list({ page: 1, limit: 200, search: '', filters: {} }),
  })

  const { data: menuRaw, isLoading: menuLoading } = useQuery({
    queryKey: ['ivr-menu', selectedIvrId],
    queryFn: () => ivrService.getMenu(selectedIvrId),
    enabled: !!selectedIvrId,
  })

  const { data: destRaw } = useQuery({
    queryKey: ['dest-types'],
    queryFn: () => ivrService.getDestTypes(),
  })

  const allIvrs = extractList<Ivr>(ivrRaw)
  const menuItems = extractList<IvrMenuItem>(menuRaw)
  const destTypes = extractList<{ id: number; name: string }>(destRaw)
  const byDtmf: Record<string, IvrMenuItem> = {}
  menuItems.forEach(m => { byDtmf[m.dtmf] = m })

  const selectedIvr = allIvrs.find(iv => iv.ivr_id === selectedIvrId)

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <InfoBox title="What is the IVR Menu (Key Routing)?">
        <div className="pt-1.5 space-y-1">
          <p>The IVR Menu tells your phone system what to do when a caller presses a key (DTMF input).</p>
          <p className="mt-1">Example: <em>"Press 1 for Sales, press 2 for Support, press 0 for the operator"</em></p>
          <p className="mt-1">Each key (0–9, *, #) can route to: an Extension, Queue, Voicemail, another IVR, or hang up.</p>
          <p className="mt-1"><strong>How to use:</strong> Select an IVR below, then click any key tile to assign a routing rule.</p>
        </div>
      </InfoBox>

      {/* IVR Selector */}
      <div className="mb-6">
        <label className="label">Select IVR to Configure</label>
        {ivrLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={14} className="animate-spin" /> Loading IVRs…
          </div>
        ) : allIvrs.length === 0 ? (
          <div className="flex items-center gap-2.5 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            No IVRs found. Go to the <strong className="mx-1">IVR</strong> tab to create one first.
          </div>
        ) : (
          <select className="input max-w-md" value={selectedIvrId}
            onChange={e => { setSelectedIvrId(e.target.value); setActiveKey(null) }}>
            <option value="">— Choose an IVR —</option>
            {allIvrs.map(ivr => (
              <option key={ivr.ivr_id} value={ivr.ivr_id}>
                {ivr.ivr_desc} ({ivr.ivr_id})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Keypad designer */}
      {selectedIvr ? (
        <>
          {/* IVR info strip */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 mb-5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <PhoneCall size={14} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">{selectedIvr.ivr_desc}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs font-mono text-indigo-600">{selectedIvr.ivr_id}</span>
                <span className={cn('flex items-center gap-1 text-xs font-medium',
                  menuItems.length > 0 ? 'text-emerald-600' : 'text-slate-400')}>
                  {menuItems.length > 0 ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                  {menuItems.length} key{menuItems.length !== 1 ? 's' : ''} configured
                </span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(DEST_TYPE_META).map(([, m]) => (
              <span key={m.label} className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full', m.bg, m.color)}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                {m.label}
              </span>
            ))}
          </div>

          {menuLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : (
            <VisualKeypad
              menuItems={menuItems}
              onKeySelect={key => setActiveKey(p => p === key ? null : key)}
              activeKey={activeKey}
            />
          )}

          {activeKey && (
            <KeyConfigDrawer
              dtmf={activeKey}
              ivrId={selectedIvr.ivr_id}
              item={byDtmf[activeKey] ?? null}
              destTypes={destTypes}
              onSave={() => setActiveKey(null)}
              onClose={() => setActiveKey(null)}
              onDelete={() => setActiveKey(null)}
            />
          )}
        </>
      ) : !ivrLoading && allIvrs.length > 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center">
            <Hash size={26} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Select an IVR above to configure its keys</p>
        </div>
      ) : null}
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
  }, [ivr])

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      ivr?.auto_id || ivr?.id ? ivrService.update(data) : ivrService.create(data),
    onSuccess: () => {
      toast.success(ivr?.auto_id || ivr?.id ? 'IVR updated' : 'IVR created')
      qc.invalidateQueries({ queryKey: ['ivr-list', 'all'] })
      onClose()
    },
    onError: () => toast.error('Failed to save IVR'),
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const isEditing = !!(ivr?.auto_id || ivr?.id)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.ivr_id.trim() || !form.ivr_desc.trim()) {
      toast.error('IVR ID and name are required'); return
    }
    const payload: Record<string, unknown> = { ...form }
    if (isEditing) payload.auto_id = ivr!.auto_id ?? ivr!.id
    mutation.mutate(payload)
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
          {[['1', 'Text to Speech', <Volume2 size={14} />], ['0', 'Upload File', <Upload size={14} />], ['2', 'Record', <Mic size={14} />]].map(([v, l, icon]) => (
            <button key={String(v)} type="button" onClick={() => set('prompt_option', String(v))}
              className={cn('flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all',
                form.prompt_option === String(v)
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50')}>
              {icon as React.ReactNode}{l as string}
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
              placeholder="Welcome to Acme Corp! Press 1 for Sales, press 2 for Support, press 0 for the operator." />
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

      {(form.prompt_option === '0' || form.prompt_option === '2') && (
        <div>
          <label className="label">Announcement ID</label>
          <input className="input" value={form.ann_id}
            onChange={e => set('ann_id', e.target.value)}
            placeholder="Reference an Audio Message ann_id or file path" />
          <p className="text-xs text-slate-400 mt-1">
            Create your audio file in the <strong>Audio Messages</strong> tab, then paste its file path here.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-1.5">
          {mutation.isPending ? <><Loader2 size={13} className="animate-spin" />Saving…</> : isEditing ? 'Save Changes' : 'Create IVR'}
        </button>
      </div>
    </form>
  )
}

// ── IVR Tab ────────────────────────────────────────────────────────────────────

function IvrTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Ivr | null>(null)

  const { data: raw, isLoading } = useQuery({
    queryKey: ['ivr-list', 'all'],
    queryFn: () => ivrService.list({ page: 1, limit: 200, search: '', filters: {} }),
  })

  const allIvrs = extractList<Ivr>(raw)
  const filtered = allIvrs.filter(iv =>
    !search ||
    iv.ivr_id.toLowerCase().includes(search.toLowerCase()) ||
    iv.ivr_desc.toLowerCase().includes(search.toLowerCase())
  )

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ivrService.delete(id),
    onSuccess: () => { toast.success('IVR deleted'); qc.invalidateQueries({ queryKey: ['ivr-list', 'all'] }) },
    onError: () => toast.error('Failed to delete IVR'),
  })

  const greetingColors: Record<string, string> = {
    '0': 'bg-blue-50 text-blue-700',
    '1': 'bg-purple-50 text-purple-700',
    '2': 'bg-rose-50 text-rose-700',
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <InfoBox title="What is an IVR (Interactive Voice Response)?">
        <div className="pt-1.5 space-y-1">
          <p>An IVR is an automated phone menu. Callers hear a greeting and can press keys to navigate to different departments.</p>
          <p className="mt-1">Example: <em>"Welcome to Acme Corp! Press 1 for Sales, press 2 for Support…"</em></p>
          <p className="mt-1"><strong>Quick start:</strong></p>
          <ol className="list-decimal list-inside mt-0.5 space-y-0.5">
            <li>Create an IVR here (name + greeting)</li>
            <li>Go to <strong>IVR Menu</strong> to assign what each key press does</li>
            <li>Assign the IVR to a phone number (DID) in DID Management</li>
          </ol>
        </div>
      </InfoBox>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input className="input pl-9 text-sm" placeholder="Search IVRs…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={14} /> New IVR
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-indigo-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <PhoneCall size={26} className="text-slate-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-600">
              {search ? 'No IVRs match your search' : 'No IVRs yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Try a different search term' : 'Create your first IVR to build an automated phone menu'}
            </p>
          </div>
          {!search && (
            <button onClick={() => { setEditing(null); setShowModal(true) }} className="btn-primary text-sm">
              <Plus size={14} /> Create IVR
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {['IVR Name', 'IVR ID', 'Greeting', 'Language', 'Actions'].map((h, i) => (
                  <th key={h} className={cn('px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider',
                    i === 4 ? 'text-right' : 'text-left')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(ivr => {
                const pOpt = String(ivr.prompt_option ?? '1')
                return (
                  <tr key={ivr.ivr_id}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <PhoneCall size={13} className="text-indigo-600" />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{ivr.ivr_desc}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {ivr.ivr_id}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', greetingColors[pOpt] ?? greetingColors['1'])}>
                        {PROMPT_LABEL[pOpt] ?? 'TTS'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{String(ivr.language || '—')}</td>
                    <td className="px-4 py-3.5 text-right">
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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <PhoneCall size={14} className="text-indigo-600" />
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {editing ? 'Edit IVR' : 'New IVR'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
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
  { key: 'menu',  label: 'IVR Menu',       icon: <Hash size={14} />      },
  { key: 'audio', label: 'Audio Messages', icon: <Music size={14} />     },
]

export function Ivr() {
  const [tab, setTab] = useState<MainTab>('ivr')

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">IVR System</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Build phone menus, configure key routing, and manage voice prompts
            </p>
          </div>
          {/* Tab bar */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  tab === t.key
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-slate-50 flex flex-col">
        {tab === 'ivr'   && <IvrTab />}
        {tab === 'menu'  && <IvrMenuTab />}
        {tab === 'audio' && <AudioMessagesTab />}
      </div>
    </div>
  )
}
