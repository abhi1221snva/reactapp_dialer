import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Bot, MessageSquare, Mic, Save, Key, Globe, Phone, Info,
  FileText, Loader2, CheckCircle2, Eye, EyeOff,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { cn } from '../../utils/cn'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SmsAiSetting {
  id?: number
  introduction?: string
  description?: string
  cli?: string
  access_token?: string
  webhook_url?: string
  sms_ai_api_url?: string
}

interface ChatAiSetting {
  id?: number
  introduction?: string
  description?: string
  access_token?: string
}

interface VoiceAiSetting {
  id?: number
  voice_name?: string
  language?: string
  speech_text?: string
  [key: string]: unknown
}

const TABS = [
  { key: 'sms', label: 'SMS AI', icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { key: 'chat', label: 'Chat AI', icon: Bot, color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'voice', label: 'Voice AI', icon: Mic, color: 'text-emerald-600', bg: 'bg-emerald-50' },
] as const
type TabKey = typeof TABS[number]['key']

// ─── SMS AI Settings ────────────────────────────────────────────────────────────

function SmsAiSection() {
  const [form, setForm] = useState<SmsAiSetting>({
    introduction: '', description: '', cli: '',
    access_token: '', webhook_url: '', sms_ai_api_url: '',
  })
  const [showToken, setShowToken] = useState(false)
  const [existingId, setExistingId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sms-ai-setting'],
    queryFn: () => api.get('/open-ai-setting'),
  })

  useEffect(() => {
    const raw = (data as { data?: { data?: SmsAiSetting[] } })?.data?.data?.[0]
      ?? (data as { data?: SmsAiSetting[] })?.data?.[0]
    if (raw) {
      setExistingId(raw.id ?? null)
      setForm({
        introduction: raw.introduction ?? '',
        description: raw.description ?? '',
        cli: raw.cli ?? '',
        access_token: raw.access_token ?? '',
        webhook_url: raw.webhook_url ?? '',
        sms_ai_api_url: raw.sms_ai_api_url ?? '',
      })
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (d: SmsAiSetting) =>
      existingId
        ? api.post(`/update-open-ai-setting/${existingId}`, d)
        : api.post('/add-open-ai-setting', d),
    onSuccess: () => toast.success('SMS AI settings saved'),
    onError: () => toast.error('Failed to save SMS AI settings'),
  })

  const set = (k: keyof SmsAiSetting, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(form)
  }

  if (isLoading) return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-indigo-50 border border-indigo-100">
        <Info size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-indigo-700">
          Configure your SMS AI integration. The AI will automatically respond to inbound SMS
          using the OpenAI API based on your introduction and description.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group md:col-span-2">
          <label className="label">
            <Phone size={13} className="inline mr-1.5 text-slate-400" />CLI / Phone Number
          </label>
          <input className="input font-mono" value={form.cli}
            onChange={e => set('cli', e.target.value)}
            placeholder="+1 (555) 000-0000" />
          <p className="text-xs text-slate-400 mt-1">The DID used for SMS AI responses</p>
        </div>

        <div className="form-group md:col-span-2">
          <label className="label">
            <Key size={13} className="inline mr-1.5 text-slate-400" />Access Token
          </label>
          <div className="relative">
            <input
              className="input font-mono pr-10"
              type={showToken ? 'text' : 'password'}
              value={form.access_token}
              onChange={e => set('access_token', e.target.value)}
              placeholder="sk-..." />
            <button
              type="button"
              onClick={() => setShowToken(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="label">
            <Globe size={13} className="inline mr-1.5 text-slate-400" />Webhook URL
          </label>
          <input className="input" value={form.webhook_url}
            onChange={e => set('webhook_url', e.target.value)}
            placeholder="https://your-webhook-url.com" />
        </div>

        <div className="form-group">
          <label className="label">
            <Globe size={13} className="inline mr-1.5 text-slate-400" />SMS AI API URL
          </label>
          <input className="input" value={form.sms_ai_api_url}
            onChange={e => set('sms_ai_api_url', e.target.value)}
            placeholder="https://your-sms-ai-api.com" />
        </div>

        <div className="form-group md:col-span-2">
          <label className="label">Introduction</label>
          <textarea className="input min-h-[70px]" value={form.introduction}
            onChange={e => set('introduction', e.target.value)}
            placeholder="Hi, I'm an AI assistant for…" />
          <p className="text-xs text-slate-400 mt-1">Opening message or persona description</p>
        </div>

        <div className="form-group md:col-span-2">
          <label className="label">
            <FileText size={13} className="inline mr-1.5 text-slate-400" />System Description
          </label>
          <textarea className="input min-h-[90px]" value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Describe what the AI should do, its tone, and any rules…" />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saveMutation.isPending} className="btn-primary gap-2">
          {saveMutation.isPending
            ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
            : <><Save size={15} /> Save SMS AI Settings</>}
        </button>
      </div>
    </form>
  )
}

// ─── Chat AI Settings ───────────────────────────────────────────────────────────

function ChatAiSection() {
  const [form, setForm] = useState<ChatAiSetting>({ introduction: '', description: '', access_token: '' })
  const [showToken, setShowToken] = useState(false)
  const [existingId, setExistingId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['chat-ai-setting'],
    queryFn: () => api.get('/chat-ai-setting'),
  })

  useEffect(() => {
    const raw = (data as { data?: { data?: ChatAiSetting[] } })?.data?.data?.[0]
      ?? (data as { data?: ChatAiSetting[] })?.data?.[0]
    if (raw) {
      setExistingId(raw.id ?? null)
      setForm({
        introduction: raw.introduction ?? '',
        description: raw.description ?? '',
        access_token: raw.access_token ?? '',
      })
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (d: ChatAiSetting) =>
      existingId
        ? api.post(`/update-chat-ai-setting/${existingId}`, d)
        : api.post('/add-chat-ai-setting', d),
    onSuccess: () => toast.success('Chat AI settings saved'),
    onError: () => toast.error('Failed to save Chat AI settings'),
  })

  const set = (k: keyof ChatAiSetting, v: string) => setForm(p => ({ ...p, [k]: v }))

  if (isLoading) return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )

  return (
    <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form) }} className="space-y-5 max-w-2xl">
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-purple-50 border border-purple-100">
        <Info size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-purple-700">
          Chat AI powers the in-app chatbot experience. Configure the AI persona and OpenAI credentials.
        </p>
      </div>

      <div className="form-group">
        <label className="label">
          <Key size={13} className="inline mr-1.5 text-slate-400" />OpenAI Access Token
        </label>
        <div className="relative">
          <input
            className="input font-mono pr-10"
            type={showToken ? 'text' : 'password'}
            value={form.access_token}
            onChange={e => set('access_token', e.target.value)}
            placeholder="sk-..." />
          <button
            type="button"
            onClick={() => setShowToken(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="label">Introduction / Persona</label>
        <textarea className="input min-h-[70px]" value={form.introduction}
          onChange={e => set('introduction', e.target.value)}
          placeholder="You are a helpful AI assistant for…" />
      </div>

      <div className="form-group">
        <label className="label">System Description</label>
        <textarea className="input min-h-[100px]" value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Describe the AI's role, rules, and boundaries…" />
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saveMutation.isPending} className="btn-primary gap-2">
          {saveMutation.isPending
            ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
            : <><Save size={15} /> Save Chat AI Settings</>}
        </button>
      </div>
    </form>
  )
}

// ─── Voice AI Settings ──────────────────────────────────────────────────────────

function VoiceAiSection() {
  const [form, setForm] = useState<VoiceAiSetting>({ voice_name: '', language: 'en-US', speech_text: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['voice-ai-setting'],
    queryFn: () => api.get('/view-voice-ai'),
  })

  useEffect(() => {
    const raw = (data as { data?: { data?: VoiceAiSetting[] } })?.data?.data?.[0]
      ?? (data as { data?: VoiceAiSetting[] })?.data?.[0]
    if (raw) {
      setForm({
        voice_name: raw.voice_name ?? '',
        language: raw.language ?? 'en-US',
        speech_text: raw.speech_text ?? '',
      })
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (d: VoiceAiSetting) => api.post('/add-voice-ai', d),
    onSuccess: () => toast.success('Voice AI settings saved'),
    onError: () => toast.error('Failed to save Voice AI settings'),
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  if (isLoading) return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )

  return (
    <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form) }} className="space-y-5 max-w-2xl">
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
        <Info size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-emerald-700">
          Voice AI uses Google Cloud Text-to-Speech to generate voicemail greetings and automated audio responses.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <label className="label">Language</label>
          <select className="input" value={form.language} onChange={e => set('language', e.target.value)}>
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="es-US">Spanish (US)</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
            <option value="pt-BR">Portuguese (Brazil)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="label">Voice Name</label>
          <input className="input" value={form.voice_name ?? ''}
            onChange={e => set('voice_name', e.target.value)}
            placeholder="e.g. en-US-Standard-A" />
          <p className="text-xs text-slate-400 mt-1">Google TTS voice identifier</p>
        </div>
      </div>

      <div className="form-group">
        <label className="label">Default Speech Text</label>
        <textarea className="input min-h-[100px]" value={form.speech_text ?? ''}
          onChange={e => set('speech_text', e.target.value)}
          placeholder="Hi, you've reached our voice assistant. Please leave a message after the beep…" />
        <p className="text-xs text-slate-400 mt-1">Default text used when generating AI voice greetings</p>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saveMutation.isPending} className="btn-primary gap-2">
          {saveMutation.isPending
            ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
            : <><Save size={15} /> Save Voice AI Settings</>}
        </button>
      </div>
    </form>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export function AiSettings() {
  const [tab, setTab] = useState<TabKey>('sms')
  const active = TABS.find(t => t.key === tab)!

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
          <CheckCircle2 size={13} className="text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700">AI Ready</span>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Tab nav */}
        <div className="w-52 flex-shrink-0 space-y-1">
          {TABS.map(({ key, label, icon: Icon, color, bg }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all text-left',
                tab === key
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                tab === key ? 'bg-white/15' : bg
              )}>
                <Icon size={15} className={tab === key ? 'text-white' : color} />
              </div>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="card">
            <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-100">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', active.bg)}>
                <active.icon size={18} className={active.color} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-base">{active.label} Configuration</h2>
                <p className="text-xs text-slate-500">
                  {tab === 'sms' && 'Automated SMS responses powered by OpenAI'}
                  {tab === 'chat' && 'In-app chatbot AI configuration'}
                  {tab === 'voice' && 'Text-to-speech and voice automation settings'}
                </p>
              </div>
            </div>

            {tab === 'sms'   && <SmsAiSection />}
            {tab === 'chat'  && <ChatAiSection />}
            {tab === 'voice' && <VoiceAiSection />}
          </div>
        </div>
      </div>
    </div>
  )
}
