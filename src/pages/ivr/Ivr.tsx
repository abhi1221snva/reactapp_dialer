import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, PhoneCall, Music, Settings, Search,
  ChevronRight, X, Phone, Mic, Upload, Volume2, Hash,
  ArrowRight, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ivrService } from '../../services/ivr.service'
import { confirmDelete } from '../../utils/confirmDelete'
import { Modal } from '../../components/ui/Modal'

// ──────────── Types ────────────
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
  ivr_desc: string
  language?: string
  voice_name?: string
  speech_text?: string
  prompt_option?: string
  speed?: string
  pitch?: string
  [key: string]: unknown
}

// ──────────── Constants ────────────
const KEYPAD_KEYS = ['1','2','3','4','5','6','7','8','9','*','0','#']

const DEST_TYPE_META: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  '0': { label: 'Extension', color: 'text-indigo-700', bg: 'bg-indigo-50', ring: 'ring-indigo-200' },
  '1': { label: 'Queue',     color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  '2': { label: 'Voicemail', color: 'text-amber-700',  bg: 'bg-amber-50',  ring: 'ring-amber-200'  },
  '3': { label: 'IVR',       color: 'text-blue-700',   bg: 'bg-blue-50',   ring: 'ring-blue-200'   },
  '4': { label: 'Hangup',    color: 'text-red-700',    bg: 'bg-red-50',    ring: 'ring-red-200'    },
  '5': { label: 'External',  color: 'text-purple-700', bg: 'bg-purple-50', ring: 'ring-purple-200' },
}

const LANGUAGES = [
  { value: 'en',    label: 'English' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es',    label: 'Spanish' },
  { value: 'fr',    label: 'French' },
  { value: 'de',    label: 'German' },
]

const PROMPT_ICONS: Record<string, React.ReactNode> = {
  '0': <Upload size={13} />,
  '1': <Volume2 size={13} />,
  '2': <Mic size={13} />,
}

// ──────────── IVR Form (slide-in panel inside left sidebar) ────────────
function IvrFormPanel({
  ivr, onSave, onCancel
}: { ivr: Partial<Ivr> | null; onSave: () => void; onCancel: () => void }) {
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
      setForm({ ivr_id: '', ann_id: '', ivr_desc: '', language: 'en',
        voice_name: '', speech_text: '', prompt_option: '1', speed: 'medium', pitch: 'medium' })
    }
  }, [ivr])

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      ivr?.auto_id || ivr?.id ? ivrService.update(data) : ivrService.create(data),
    onSuccess: () => { toast.success(ivr?.auto_id || ivr?.id ? 'IVR updated' : 'IVR created'); onSave() },
    onError: () => toast.error('Failed to save IVR'),
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.ivr_id.trim() || !form.ivr_desc.trim()) {
      toast.error('IVR ID and description are required'); return
    }
    const payload: Record<string, unknown> = { ...form }
    if (ivr?.auto_id || ivr?.id) payload.auto_id = ivr.auto_id ?? ivr.id
    mutation.mutate(payload)
  }

  const isEditing = !!(ivr?.auto_id || ivr?.id)

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-sm font-semibold text-slate-800">
          {isEditing ? 'Edit IVR' : 'New IVR'}
        </span>
        <button onClick={onCancel} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
          <X size={15} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
        <div>
          <label className="label text-xs">IVR ID <span className="text-red-500">*</span></label>
          <input className="input text-sm" value={form.ivr_id}
            onChange={e => set('ivr_id', e.target.value)} placeholder="e.g. ivr_sales"
            disabled={isEditing} />
        </div>
        <div>
          <label className="label text-xs">Name / Description <span className="text-red-500">*</span></label>
          <input className="input text-sm" value={form.ivr_desc}
            onChange={e => set('ivr_desc', e.target.value)} placeholder="Sales IVR" />
        </div>

        {/* Greeting type */}
        <div>
          <label className="label text-xs">Greeting Type</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[['0', 'Upload', <Upload size={13}/>], ['1', 'TTS', <Volume2 size={13}/>], ['2', 'Record', <Mic size={13}/>]].map(([v, l, icon]) => (
              <button key={String(v)} type="button"
                onClick={() => set('prompt_option', String(v))}
                className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                  form.prompt_option === String(v)
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}>
                {icon as React.ReactNode}{l as string}
              </button>
            ))}
          </div>
        </div>

        {form.prompt_option === '1' && (
          <>
            <div>
              <label className="label text-xs">Speech Text</label>
              <textarea className="input text-sm min-h-[72px] resize-none" value={form.speech_text}
                onChange={e => set('speech_text', e.target.value)}
                placeholder="Welcome to our company. Press 1 for Sales…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Language</label>
                <select className="input text-sm" value={form.language} onChange={e => set('language', e.target.value)}>
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-xs">Voice</label>
                <input className="input text-sm" value={form.voice_name}
                  onChange={e => set('voice_name', e.target.value)} placeholder="e.g. Joanna" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Speed</label>
                <select className="input text-sm" value={form.speed} onChange={e => set('speed', e.target.value)}>
                  {['slow','medium','fast'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-xs">Pitch</label>
                <select className="input text-sm" value={form.pitch} onChange={e => set('pitch', e.target.value)}>
                  {['low','medium','high'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        <div>
          <label className="label text-xs">Announcement ID</label>
          <input className="input text-sm" value={form.ann_id}
            onChange={e => set('ann_id', e.target.value)} placeholder="ann_id (optional)" />
        </div>

        <div className="pt-2 flex gap-2">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending}
            className="flex-1 btn-primary text-sm py-2">
            {mutation.isPending ? <><Loader2 size={13} className="animate-spin"/>Saving…</> : isEditing ? 'Update' : 'Create IVR'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ──────────── Key Config Drawer (bottom of designer) ────────────
function KeyConfigDrawer({
  dtmf, ivrId, item, destTypes, onSave, onClose, onDelete,
}: {
  dtmf: string
  ivrId: string
  item: IvrMenuItem | null
  destTypes: { id: number; name: string }[]
  onSave: () => void
  onClose: () => void
  onDelete: () => void
}) {
  const [form, setForm] = useState({ dtmf_title: '', dest_type: '0', dest: '' })

  useEffect(() => {
    if (item) {
      setForm({ dtmf_title: item.dtmf_title ?? '', dest_type: String(item.dest_type), dest: item.dest })
    } else {
      setForm({ dtmf_title: '', dest_type: '0', dest: '' })
    }
  }, [item, dtmf])

  const qc = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: () => {
      if (item) {
        return ivrService.editMenu({ auto_id: item.ivr_m_id ?? item.id, ...form, ivr_id: ivrId })
      }
      return ivrService.addMenu({
        parameter: [{ dtmf, dtmf_title: form.dtmf_title, dest_type: form.dest_type, dest: form.dest, ivr_id: ivrId }]
      })
    },
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

  return (
    <div className="border-t border-slate-200 bg-white animate-[fadeIn_0.2s_ease]">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            {keyLabel}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Configure Key {keyLabel}</p>
            <p className="text-xs text-slate-500">Set where this key routes callers</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label text-xs">Label</label>
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
              placeholder="Ext / number / queue ID" />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div>
            {item && (
              <button type="button"
                onClick={async () => { if (await confirmDelete(`key ${dtmf}`)) deleteMutation.mutate() }}
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
              disabled={!form.dest || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="btn-primary text-sm px-5 py-2">
              {saveMutation.isPending ? <><Loader2 size={13} className="animate-spin"/>Saving…</> : 'Save Route'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────── Visual Keypad ────────────
function VisualKeypad({
  ivrId, menuItems, destTypes, onKeySelect, activeKey,
}: {
  ivrId: string
  menuItems: IvrMenuItem[]
  destTypes: { id: number; name: string }[]
  onKeySelect: (key: string) => void
  activeKey: string | null
}) {
  const byDtmf: Record<string, IvrMenuItem> = {}
  menuItems.forEach(m => { byDtmf[m.dtmf] = m })

  return (
    <div className="grid grid-cols-3 gap-3 p-1">
      {KEYPAD_KEYS.map(key => {
        const item = byDtmf[key]
        const meta = item ? (DEST_TYPE_META[item.dest_type] ?? DEST_TYPE_META['0']) : null
        const isActive = activeKey === key
        const keyDisplay = key === '*' ? '★' : key === '#' ? '＃' : key

        return (
          <button
            key={key}
            onClick={() => onKeySelect(key)}
            className={`
              relative group rounded-2xl border-2 text-left transition-all duration-200
              ${isActive
                ? 'border-indigo-500 ring-4 ring-indigo-100 shadow-lg scale-[1.02]'
                : item
                  ? `${meta!.ring} border-transparent ring-2 hover:scale-[1.02] hover:shadow-md`
                  : 'border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 hover:scale-[1.02]'
              }
            `}
          >
            {item && meta ? (
              <div className={`p-3 rounded-2xl ${meta.bg} h-full`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-lg font-bold ${meta.color} leading-none`}>{keyDisplay}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/70 ${meta.color}`}>
                    {meta.label}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                  {item.dtmf_title || '(no label)'}
                </p>
                <p className="text-xs text-slate-500 font-mono truncate mt-0.5">{item.dest}</p>
                <ArrowRight size={10} className={`mt-1 ${meta.color} opacity-60`} />
              </div>
            ) : (
              <div className="p-3 flex flex-col items-center justify-center h-[88px] gap-1.5">
                <span className="text-xl font-bold text-slate-300 group-hover:text-indigo-400 transition-colors leading-none">
                  {keyDisplay}
                </span>
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

// ──────────── Audio Message Tab Content ────────────
function AudioMessagesPane() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AudioMessage | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['audio-messages'],
    queryFn: () => ivrService.listAudio({ page: 1, limit: 100, search: '', filters: {} }),
  })

  const mutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => editing ? ivrService.updateAudio(d) : ivrService.createAudio(d),
    onSuccess: () => {
      toast.success(editing ? 'Audio updated' : 'Audio created')
      qc.invalidateQueries({ queryKey: ['audio-messages'] })
      setModalOpen(false)
    },
    onError: () => toast.error('Failed to save'),
  })

  const messages: AudioMessage[] = (data as { data?: { data?: AudioMessage[] } })?.data?.data ?? []
  const filtered = messages.filter(m =>
    !search || (m.ivr_desc ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col">
      {/* toolbar */}
      <div className="flex items-center gap-3 p-5 border-b border-slate-100">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input text-sm pl-9" placeholder="Search audio messages…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true) }} className="btn-primary text-sm">
          <Plus size={14} /> New Audio
        </button>
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
            <Music size={36} className="opacity-30" />
            <p className="text-sm">No audio messages yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((msg, i) => {
              const pOpt = String(msg.prompt_option ?? '1')
              return (
                <div key={msg.auto_id ?? msg.id ?? i}
                  className="group flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-sm transition-all">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Music size={15} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{msg.ivr_desc}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        {PROMPT_ICONS[pOpt]}
                        {pOpt === '0' ? 'Upload' : pOpt === '1' ? 'TTS' : 'Record'}
                      </span>
                      {msg.language && (
                        <span className="text-xs text-slate-400">· {msg.language}</span>
                      )}
                      {msg.voice_name && (
                        <span className="text-xs text-slate-400 truncate">· {String(msg.voice_name)}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => { setEditing(msg); setModalOpen(true) }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                    <Pencil size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Audio form modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Audio Message' : 'New Audio Message'} size="lg">
        <AudioForm editing={editing} onSave={() => setModalOpen(false)} onCancel={() => setModalOpen(false)} mutation={mutation} />
      </Modal>
    </div>
  )
}

function AudioForm({
  editing, onSave, onCancel, mutation,
}: {
  editing: AudioMessage | null
  onSave: () => void
  onCancel: () => void
  mutation: ReturnType<typeof useMutation<unknown, unknown, Record<string, unknown>>>
}) {
  const [form, setForm] = useState({
    ivr_desc: '', language: 'en', voice_name: '', speech_text: '', prompt_option: '1', speed: 'medium', pitch: 'medium',
  })

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
      })
    } else {
      setForm({ ivr_desc: '', language: 'en', voice_name: '', speech_text: '', prompt_option: '1', speed: 'medium', pitch: 'medium' })
    }
  }, [editing])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.ivr_desc.trim()) { toast.error('Description is required'); return }
    const payload: Record<string, unknown> = { ...form }
    if (editing) payload.auto_id = editing.auto_id ?? editing.id
    mutation.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Name / Description <span className="text-red-500">*</span></label>
        <input className="input" value={form.ivr_desc} onChange={e => set('ivr_desc', e.target.value)} placeholder="Main Greeting" />
      </div>
      <div>
        <label className="label">Type</label>
        <div className="grid grid-cols-3 gap-2">
          {[['0','Upload',<Upload size={13}/>],['1','TTS',<Volume2 size={13}/>],['2','Record',<Mic size={13}/>]].map(([v,l,icon]) => (
            <button key={String(v)} type="button" onClick={() => set('prompt_option', String(v))}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-medium transition-all ${
                form.prompt_option === String(v)
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}>
              {icon as React.ReactNode}{l as string}
            </button>
          ))}
        </div>
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
          <input className="input" value={form.voice_name} onChange={e => set('voice_name', e.target.value)} placeholder="e.g. Joanna" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Speed</label>
          <select className="input" value={form.speed} onChange={e => set('speed', e.target.value)}>
            {['slow','medium','fast'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Pitch</label>
          <select className="input" value={form.pitch} onChange={e => set('pitch', e.target.value)}>
            {['low','medium','high'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
          </select>
        </div>
      </div>
      {form.prompt_option === '1' && (
        <div>
          <label className="label">Speech Text</label>
          <textarea className="input min-h-[80px] resize-none" value={form.speech_text}
            onChange={e => set('speech_text', e.target.value)}
            placeholder="Welcome! Press 1 for Sales, press 2 for Support…" />
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? <><Loader2 size={13} className="animate-spin"/>Saving…</> : editing ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}

// ──────────── IVR Designer Panel ────────────
function IvrDesigner({ ivr }: { ivr: Ivr }) {
  const qc = useQueryClient()
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ['ivr-menu', ivr.ivr_id],
    queryFn: () => ivrService.getMenu(ivr.ivr_id),
  })

  const { data: destData } = useQuery({
    queryKey: ['dest-types'],
    queryFn: () => ivrService.getDestTypes(),
  })

  const menuItems: IvrMenuItem[] = (menuData as { data?: { data?: IvrMenuItem[] } })?.data?.data ?? []
  const destTypes: { id: number; name: string }[] = (destData as { data?: { data?: { id: number; name: string }[] } })?.data?.data ?? []

  const byDtmf: Record<string, IvrMenuItem> = {}
  menuItems.forEach(m => { byDtmf[m.dtmf] = m })

  const configuredCount = menuItems.length
  const pOpt = String(ivr.prompt_option ?? '1')

  const handleKeySelect = (key: string) => {
    setActiveKey(prev => prev === key ? null : key)
    setTimeout(() => drawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ivrService.delete(id),
    onSuccess: () => { toast.success('IVR deleted'); qc.invalidateQueries({ queryKey: ['ivr-list'] }) },
    onError: () => toast.error('Failed to delete'),
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* IVR Header bar */}
      <div className="flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b border-slate-100 bg-white">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <PhoneCall size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-slate-900 truncate">{ivr.ivr_desc}</h2>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-400 font-mono">{ivr.ivr_id}</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              {PROMPT_ICONS[pOpt]}
              {pOpt === '0' ? 'Upload' : pOpt === '1' ? 'TTS' : 'Record'}
            </span>
            {ivr.language && <>
              <span className="text-xs text-slate-300">·</span>
              <span className="text-xs text-slate-400">{ivr.language}</span>
            </>}
            <span className="text-xs text-slate-300">·</span>
            <span className={`flex items-center gap-1 text-xs font-medium ${configuredCount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
              {configuredCount > 0 ? <CheckCircle2 size={11}/> : <AlertCircle size={11}/>}
              {configuredCount} key{configuredCount !== 1 ? 's' : ''} configured
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSettings(s => !s)}
            className={`p-2 rounded-xl transition-colors ${showSettings ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            title="IVR Settings">
            <Settings size={16} />
          </button>
          <button
            onClick={async () => {
              if (await confirmDelete(ivr.ivr_desc))
                deleteMutation.mutate(ivr.auto_id ?? ivr.id ?? 0)
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete IVR">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Settings panel (collapse) */}
      {showSettings && (
        <div className="flex-shrink-0 border-b border-slate-100 bg-slate-50 px-6 py-4 animate-[fadeIn_0.15s_ease]">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Greeting Text</p>
              <p className="text-slate-800 text-xs leading-relaxed line-clamp-3">
                {ivr.speech_text || <span className="text-slate-400 italic">No speech text set</span>}
              </p>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-slate-500">Voice Name</p>
                <p className="text-xs text-slate-700">{String(ivr.voice_name || '—')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Speed / Pitch</p>
                <p className="text-xs text-slate-700 capitalize">{ivr.speed ?? '—'} / {ivr.pitch ?? '—'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-slate-500">Announcement ID</p>
                <p className="text-xs text-slate-700 font-mono">{ivr.ann_id || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Language</p>
                <p className="text-xs text-slate-700">{ivr.language || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main designer area */}
      <div className="flex-1 overflow-y-auto">
        {/* Call flow header */}
        <div className="px-6 pt-5 pb-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Keypad Routing</h3>
          <p className="text-xs text-slate-400 mt-0.5">Click any key to assign a call route</p>
        </div>

        {/* Keypad */}
        <div className="px-6 pb-4">
          {menuLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : (
            <VisualKeypad
              ivrId={ivr.ivr_id}
              menuItems={menuItems}
              destTypes={destTypes}
              onKeySelect={handleKeySelect}
              activeKey={activeKey}
            />
          )}
        </div>

        {/* Destination type legend */}
        <div className="px-6 pb-5">
          <div className="flex flex-wrap gap-2">
            {Object.entries(DEST_TYPE_META).map(([, m]) => (
              <span key={m.label} className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${m.bg} ${m.color}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                {m.label}
              </span>
            ))}
          </div>
        </div>

        {/* Key config drawer */}
        <div ref={drawerRef}>
          {activeKey && (
            <KeyConfigDrawer
              dtmf={activeKey}
              ivrId={ivr.ivr_id}
              item={byDtmf[activeKey] ?? null}
              destTypes={destTypes}
              onSave={() => setActiveKey(null)}
              onClose={() => setActiveKey(null)}
              onDelete={() => setActiveKey(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ──────────── Main Page ────────────
type Tab = 'ivr' | 'audio'

export function Ivr() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('ivr')
  const [search, setSearch] = useState('')
  const [selectedIvr, setSelectedIvr] = useState<Ivr | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingIvr, setEditingIvr] = useState<Ivr | null>(null)

  // Load full IVR list (use large limit since we need client-side search on sidebar)
  const { data: ivrData, isLoading } = useQuery({
    queryKey: ['ivr-list', 'all'],
    queryFn: () => ivrService.list({ page: 1, limit: 200, search: '', filters: {} }),
    enabled: activeTab === 'ivr',
  })

  const allIvrs: Ivr[] = (ivrData as { data?: { data?: Ivr[] } })?.data?.data ?? []
  const filteredIvrs = allIvrs.filter(iv =>
    !search ||
    iv.ivr_id.toLowerCase().includes(search.toLowerCase()) ||
    iv.ivr_desc.toLowerCase().includes(search.toLowerCase())
  )

  const handleFormSave = () => {
    setShowForm(false)
    setEditingIvr(null)
    qc.invalidateQueries({ queryKey: ['ivr-list', 'all'] })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Page header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">IVR Designer</h1>
            <p className="text-sm text-slate-500">Build interactive voice response menus</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {([
            ['ivr', 'IVR Menus', <Phone size={13}/>],
            ['audio', 'Audio Messages', <Music size={13}/>],
          ] as [Tab, string, React.ReactNode][]).map(([key, label, icon]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {activeTab === 'audio' ? (
        <div className="flex-1 overflow-hidden bg-white">
          <AudioMessagesPane />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">

          {/* ── Left panel: IVR List ── */}
          <div className="w-[300px] flex-shrink-0 flex flex-col border-r border-slate-200 bg-white overflow-hidden">

            {showForm ? (
              <IvrFormPanel
                ivr={editingIvr}
                onSave={handleFormSave}
                onCancel={() => { setShowForm(false); setEditingIvr(null) }}
              />
            ) : (
              <>
                {/* Search + New button */}
                <div className="flex-shrink-0 p-3 border-b border-slate-100 space-y-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-slate-400"
                      placeholder="Search IVRs…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <button onClick={() => { setEditingIvr(null); setShowForm(true) }}
                    className="w-full btn-primary text-sm py-2">
                    <Plus size={14} /> New IVR
                  </button>
                </div>

                {/* IVR cards */}
                <div className="flex-1 overflow-y-auto p-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 size={20} className="animate-spin text-indigo-400" />
                    </div>
                  ) : filteredIvrs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
                      <PhoneCall size={32} className="opacity-30" />
                      <p className="text-sm text-center">
                        {search ? 'No IVRs match your search' : 'No IVRs yet. Create one to start.'}
                      </p>
                    </div>
                  ) : (
                    filteredIvrs.map(ivr => {
                      const isSelected = selectedIvr?.ivr_id === ivr.ivr_id
                      const pOpt = String(ivr.prompt_option ?? '1')
                      return (
                        <button
                          key={ivr.ivr_id}
                          onClick={() => setSelectedIvr(ivr)}
                          className={`w-full text-left group p-3 rounded-xl mb-1 transition-all duration-150 ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected ? 'bg-white/20' : 'bg-indigo-50'
                            }`}>
                              <PhoneCall size={13} className={isSelected ? 'text-white' : 'text-indigo-600'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                {ivr.ivr_desc}
                              </p>
                              <p className={`text-xs font-mono truncate ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                {ivr.ivr_id}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {/* Edit button */}
                              <span
                                role="button"
                                onClick={e => { e.stopPropagation(); setEditingIvr(ivr); setShowForm(true) }}
                                className={`opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all ${
                                  isSelected
                                    ? 'hover:bg-white/20 text-indigo-100 hover:text-white'
                                    : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'
                                }`}
                                title="Edit IVR"
                              >
                                <Pencil size={12} />
                              </span>
                              <ChevronRight size={13} className={isSelected ? 'text-indigo-200' : 'text-slate-300'} />
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 ml-10">
                            <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              isSelected ? 'bg-white/15 text-indigo-100' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {PROMPT_ICONS[pOpt]}
                              {pOpt === '0' ? 'Upload' : pOpt === '1' ? 'TTS' : 'Record'}
                            </span>
                            {ivr.language && (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                isSelected ? 'bg-white/15 text-indigo-100' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {String(ivr.language)}
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Right panel: Designer ── */}
          <div className="flex-1 overflow-hidden bg-slate-50">
            {selectedIvr ? (
              <IvrDesigner key={selectedIvr.ivr_id} ivr={selectedIvr} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                <div className="w-20 h-20 rounded-3xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center">
                  <Hash size={32} className="opacity-30" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-slate-600">Select an IVR to design</p>
                  <p className="text-sm mt-1">Choose from the list or create a new IVR</p>
                </div>
                <button onClick={() => { setEditingIvr(null); setShowForm(true) }} className="btn-primary text-sm mt-2">
                  <Plus size={14} /> Create your first IVR
                </button>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
