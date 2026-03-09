import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, PhoneCall, Music, Menu, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { RowActions } from '../../components/ui/RowActions'
import { ivrService } from '../../services/ivr.service'
import { useServerTable } from '../../hooks/useServerTable'
import { confirmDelete } from '../../utils/confirmDelete'

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

interface AudioMessage {
  id?: number
  auto_id?: number
  ivr_id?: string
  ann_id?: string
  ivr_desc: string
  language?: string
  voice_name?: string
  speech_text?: string
  prompt_option?: string
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

// Typed form interfaces without index signature
interface IvrForm {
  ivr_id: string; ann_id: string; ivr_desc: string; language: string
  voice_name: string; speech_text: string; prompt_option: string; speed: string; pitch: string
}

interface AudioForm {
  ivr_id: string; ann_id: string; ivr_desc: string; language: string
  voice_name: string; speech_text: string; prompt_option: string; speed: string; pitch: string
}

const EMPTY_IVR: IvrForm = {
  ivr_id: '', ann_id: '', ivr_desc: '', language: 'en',
  voice_name: '', speech_text: '', prompt_option: '1', speed: 'medium', pitch: 'medium',
}

const EMPTY_AUDIO: AudioForm = {
  ivr_id: '', ann_id: '', ivr_desc: '', language: 'en',
  voice_name: '', speech_text: '', prompt_option: 'text', speed: 'medium', pitch: 'medium',
}

const PROMPT_OPTIONS = [
  { value: '0', label: 'Upload File' },
  { value: '1', label: 'Text-to-Speech' },
  { value: '2', label: 'Record' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
]

// ──────────── IVR Form Modal ────────────
function IvrFormModal({
  isOpen, onClose, editing,
}: { isOpen: boolean; onClose: () => void; editing: Ivr | null }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<IvrForm>(EMPTY_IVR)

  useEffect(() => {
    if (!isOpen) return
    if (editing) {
      setForm({
        ivr_id: editing.ivr_id ?? '',
        ann_id: String(editing.ann_id ?? ''),
        ivr_desc: editing.ivr_desc ?? '',
        language: String(editing.language ?? 'en'),
        voice_name: String(editing.voice_name ?? ''),
        speech_text: String(editing.speech_text ?? ''),
        prompt_option: String(editing.prompt_option ?? '1'),
        speed: String(editing.speed ?? 'medium'),
        pitch: String(editing.pitch ?? 'medium'),
      })
    } else {
      setForm(EMPTY_IVR)
    }
  }, [isOpen, editing])

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editing ? ivrService.update(data) : ivrService.create(data),
    onSuccess: () => {
      toast.success(editing ? 'IVR updated' : 'IVR created')
      qc.invalidateQueries({ queryKey: ['ivr-list'] })
      onClose()
    },
    onError: () => toast.error('Failed to save IVR'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.ivr_id.trim() || !form.ivr_desc.trim()) {
      toast.error('IVR ID and description are required')
      return
    }
    const payload: Record<string, unknown> = { ...form }
    if (editing) payload.auto_id = editing.auto_id ?? editing.id
    mutation.mutate(payload)
  }

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit IVR' : 'Add IVR'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">IVR ID <span className="text-red-500">*</span></label>
            <input className="input" value={form.ivr_id}
              onChange={e => set('ivr_id', e.target.value)} placeholder="e.g. ivr_001" />
          </div>
          <div>
            <label className="label">Announcement ID</label>
            <input className="input" value={form.ann_id ?? ''}
              onChange={e => set('ann_id', e.target.value)} placeholder="ann_id" />
          </div>
        </div>

        <div>
          <label className="label">Description <span className="text-red-500">*</span></label>
          <input className="input" value={form.ivr_desc}
            onChange={e => set('ivr_desc', e.target.value)} placeholder="IVR description" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Prompt Option</label>
            <select className="input" value={String(form.prompt_option ?? '1')}
              onChange={e => set('prompt_option', e.target.value)}>
              {PROMPT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Language</label>
            <select className="input" value={form.language ?? 'en'}
              onChange={e => set('language', e.target.value)}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Voice Name</label>
            <input className="input" value={form.voice_name ?? ''}
              onChange={e => set('voice_name', e.target.value)} placeholder="e.g. Joanna" />
          </div>
          <div>
            <label className="label">Speed</label>
            <select className="input" value={form.speed ?? 'medium'}
              onChange={e => set('speed', e.target.value)}>
              {['slow', 'medium', 'fast'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {String(form.prompt_option) === '1' && (
          <div>
            <label className="label">Speech Text</label>
            <textarea className="input min-h-[80px]" value={form.speech_text ?? ''}
              onChange={e => set('speech_text', e.target.value)}
              placeholder="Enter TTS text..." />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Saving…' : editing ? 'Update IVR' : 'Add IVR'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ──────────── IVR Menu Modal ────────────
function IvrMenuModal({ isOpen, onClose, ivr }: { isOpen: boolean; onClose: () => void; ivr: Ivr | null }) {
  const qc = useQueryClient()
  const [newEntry, setNewEntry] = useState({ dtmf: '', dtmf_title: '', dest_type: '0', dest: '' })

  const { data: menuData, isLoading } = useQuery({
    queryKey: ['ivr-menu', ivr?.ivr_id],
    queryFn: () => ivrService.getMenu(ivr!.ivr_id),
    enabled: !!ivr?.ivr_id && isOpen,
  })

  const { data: destData } = useQuery({
    queryKey: ['dest-types'],
    queryFn: () => ivrService.getDestTypes(),
  })

  const menuItems: IvrMenuItem[] = (menuData as { data?: { data?: IvrMenuItem[] } })?.data?.data ?? []
  const destTypes: { id: number; name: string }[] = (destData as { data?: { data?: { id: number; name: string }[] } })?.data?.data ?? []

  const addMutation = useMutation({
    mutationFn: () =>
      ivrService.addMenu({
        parameter: [{
          dtmf: newEntry.dtmf,
          dtmf_title: newEntry.dtmf_title,
          dest_type: newEntry.dest_type,
          dest: newEntry.dest,
          ivr_id: ivr!.ivr_id,
        }],
      }),
    onSuccess: () => {
      toast.success('Menu entry added')
      qc.invalidateQueries({ queryKey: ['ivr-menu', ivr?.ivr_id] })
      setNewEntry({ dtmf: '', dtmf_title: '', dest_type: '0', dest: '' })
    },
    onError: () => toast.error('Failed to add menu entry'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ivrService.deleteMenu(id),
    onSuccess: () => {
      toast.success('Entry deleted')
      qc.invalidateQueries({ queryKey: ['ivr-menu', ivr?.ivr_id] })
    },
    onError: () => toast.error('Failed to delete entry'),
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={`IVR Menu — ${ivr?.ivr_desc ?? ''}`} size="xl">
      <div className="space-y-5">
        {/* Existing entries */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Menu Entries</h3>
          {isLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : menuItems.length === 0 ? (
            <p className="text-sm text-slate-400">No menu entries yet.</p>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['DTMF', 'Title', 'Dest Type', 'Destination', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {menuItems.map((item, i) => (
                    <tr key={item.ivr_m_id ?? i} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono font-semibold text-indigo-600">{item.dtmf}</td>
                      <td className="px-4 py-2.5 text-slate-700">{item.dtmf_title ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500">{item.dest_type}</td>
                      <td className="px-4 py-2.5 text-slate-700">{item.dest}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={async () => {
                            if (await confirmDelete(item.dtmf_title ?? String(item.dtmf)))
                              deleteMutation.mutate(item.ivr_m_id ?? item.id ?? 0)
                          }}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add new entry */}
        <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Add Menu Entry</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="label text-xs">DTMF Key</label>
              <input className="input text-sm" maxLength={1} value={newEntry.dtmf}
                onChange={e => setNewEntry(p => ({ ...p, dtmf: e.target.value }))}
                placeholder="1–9, 0, *" />
            </div>
            <div>
              <label className="label text-xs">Title</label>
              <input className="input text-sm" value={newEntry.dtmf_title}
                onChange={e => setNewEntry(p => ({ ...p, dtmf_title: e.target.value }))}
                placeholder="e.g. Sales" />
            </div>
            <div>
              <label className="label text-xs">Dest Type</label>
              <select className="input text-sm" value={newEntry.dest_type}
                onChange={e => setNewEntry(p => ({ ...p, dest_type: e.target.value }))}>
                {destTypes.length > 0
                  ? destTypes.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)
                  : <option value="0">Extension</option>}
              </select>
            </div>
            <div>
              <label className="label text-xs">Destination</label>
              <input className="input text-sm" value={newEntry.dest}
                onChange={e => setNewEntry(p => ({ ...p, dest: e.target.value }))}
                placeholder="Ext or number" />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={() => addMutation.mutate()} disabled={!newEntry.dtmf || !newEntry.dest || addMutation.isPending}
              className="btn-primary text-sm">
              <Plus size={14} /> Add Entry
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ──────────── Audio Message Form Modal ────────────
function AudioFormModal({
  isOpen, onClose, editing,
}: { isOpen: boolean; onClose: () => void; editing: AudioMessage | null }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<AudioForm>(EMPTY_AUDIO)

  useEffect(() => {
    if (!isOpen) return
    if (editing) {
      setForm({
        ivr_id: String(editing.ivr_id ?? ''),
        ann_id: String(editing.ann_id ?? ''),
        ivr_desc: editing.ivr_desc ?? '',
        language: String(editing.language ?? 'en'),
        voice_name: String(editing.voice_name ?? ''),
        speech_text: String(editing.speech_text ?? ''),
        prompt_option: String(editing.prompt_option ?? 'text'),
        speed: String(editing.speed ?? 'medium'),
        pitch: String(editing.pitch ?? 'medium'),
      })
    } else {
      setForm(EMPTY_AUDIO)
    }
  }, [isOpen, editing])

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editing ? ivrService.updateAudio(data) : ivrService.createAudio(data),
    onSuccess: () => {
      toast.success(editing ? 'Audio message updated' : 'Audio message created')
      qc.invalidateQueries({ queryKey: ['audio-messages'] })
      onClose()
    },
    onError: () => toast.error('Failed to save audio message'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.ivr_desc.trim()) { toast.error('Description is required'); return }
    const payload: Record<string, unknown> = { ...form }
    if (editing) payload.auto_id = editing.auto_id ?? editing.id
    mutation.mutate(payload)
  }

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={editing ? 'Edit Audio Message' : 'Add Audio Message'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Description <span className="text-red-500">*</span></label>
          <input className="input" value={form.ivr_desc}
            onChange={e => set('ivr_desc', e.target.value)} placeholder="Message description" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Language</label>
            <select className="input" value={form.language ?? 'en'}
              onChange={e => set('language', e.target.value)}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Voice Name</label>
            <input className="input" value={form.voice_name ?? ''}
              onChange={e => set('voice_name', e.target.value)} placeholder="e.g. Joanna" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Speed</label>
            <select className="input" value={form.speed ?? 'medium'}
              onChange={e => set('speed', e.target.value)}>
              {['slow', 'medium', 'fast'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Pitch</label>
            <select className="input" value={form.pitch ?? 'medium'}
              onChange={e => set('pitch', e.target.value)}>
              {['low', 'medium', 'high'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Speech Text</label>
          <textarea className="input min-h-[80px]" value={form.speech_text ?? ''}
            onChange={e => set('speech_text', e.target.value)}
            placeholder="Enter TTS text…" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Saving…' : editing ? 'Update' : 'Add Audio Message'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ──────────── Main Page ────────────
type Tab = 'ivr' | 'audio'

export function Ivr() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('ivr')

  // IVR tab state
  const ivrTable = useServerTable({ defaultLimit: 15 })
  const [ivrModal, setIvrModal] = useState(false)
  const [editingIvr, setEditingIvr] = useState<Ivr | null>(null)
  const [menuIvr, setMenuIvr] = useState<Ivr | null>(null)

  // Audio tab state
  const audioTable = useServerTable({ defaultLimit: 15 })
  const [audioModal, setAudioModal] = useState(false)
  const [editingAudio, setEditingAudio] = useState<AudioMessage | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ivrService.delete(id),
    onSuccess: () => { toast.success('IVR deleted'); qc.invalidateQueries({ queryKey: ['ivr-list'] }) },
    onError: () => toast.error('Failed to delete IVR'),
  })

  const deleteAudioMutation = useMutation({
    mutationFn: (_id: number) => Promise.resolve({ data: { success: true } }), // audio delete not in spec
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audio-messages'] }),
  })

  const ivrColumns: Column<Ivr>[] = [
    {
      key: 'ivr_id', header: 'IVR',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <PhoneCall size={14} className="text-white" />
          </div>
          <div>
            <p className="font-medium text-slate-900 text-sm">{row.ivr_id}</p>
            <p className="text-xs text-slate-400">{row.ivr_desc}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'ann_id', header: 'Ann ID',
      render: (row) => <span className="text-sm text-slate-600 font-mono">{row.ann_id || '—'}</span>,
    },
    {
      key: 'language', header: 'Language',
      render: (row) => row.language
        ? <Badge variant="blue">{String(row.language)}</Badge>
        : <span className="text-slate-400">—</span>,
    },
    {
      key: 'prompt_option', header: 'Prompt',
      render: (row) => {
        const labels: Record<string, string> = { '0': 'Upload', '1': 'TTS', '2': 'Record' }
        return <Badge variant="gray">{labels[String(row.prompt_option)] ?? '—'}</Badge>
      },
    },
    {
      key: 'actions', header: 'Actions',
      render: (row) => (
        <RowActions actions={[
          {
            label: 'View Menu',
            icon: <Menu size={12} />,
            variant: 'view',
            onClick: () => setMenuIvr(row),
          },
          {
            label: 'Edit',
            icon: <Pencil size={12} />,
            variant: 'edit',
            onClick: () => { setEditingIvr(row); setIvrModal(true) },
          },
          {
            label: 'Delete',
            icon: <Trash2 size={12} />,
            variant: 'delete',
            onClick: async () => {
              if (await confirmDelete(row.ivr_desc))
                deleteMutation.mutate(row.auto_id ?? row.id ?? 0)
            },
          },
        ]} />
      ),
    },
  ]

  const audioColumns: Column<AudioMessage>[] = [
    {
      key: 'ivr_desc', header: 'Message',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-50">
            <Music size={14} className="text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900 text-sm">{row.ivr_desc}</p>
            {row.speech_text && (
              <p className="text-xs text-slate-400 truncate max-w-[200px]">{String(row.speech_text)}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'language', header: 'Language',
      render: (row) => row.language ? <Badge variant="blue">{String(row.language)}</Badge> : <span className="text-slate-400">—</span>,
    },
    {
      key: 'voice_name', header: 'Voice',
      render: (row) => <span className="text-sm text-slate-600">{row.voice_name || '—'}</span>,
    },
    {
      key: 'prompt_option', header: 'Type',
      render: (row) => <Badge variant="gray">{String(row.prompt_option) || '—'}</Badge>,
    },
    {
      key: 'actions', header: 'Actions',
      render: (row) => (
        <RowActions actions={[
          {
            label: 'Edit',
            icon: <Pencil size={12} />,
            variant: 'edit',
            onClick: () => { setEditingAudio(row); setAudioModal(true) },
          },
          {
            label: 'Delete',
            icon: <Trash2 size={12} />,
            variant: 'delete',
            onClick: async () => {
              if (await confirmDelete(row.ivr_desc))
                deleteAudioMutation.mutate(row.auto_id ?? row.id ?? 0)
            },
          },
        ]} />
      ),
    },
  ]

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'ivr', label: 'IVR List', icon: <PhoneCall size={15} /> },
    { key: 'audio', label: 'Audio Messages', icon: <Music size={15} /> },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">IVR Management</h1>
          <p className="page-subtitle">Configure Interactive Voice Response menus and audio messages</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors duration-150 ${
              activeTab === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* IVR Tab */}
      {activeTab === 'ivr' && (
        <ServerDataTable<Ivr>
          queryKey={['ivr-list']}
          queryFn={(params) => ivrService.list(params)}
          dataExtractor={(res: unknown) => {
            const r = res as { data?: { data?: Ivr[] } }
            return Array.isArray(r?.data?.data) ? r.data!.data! : []
          }}
          totalExtractor={(res: unknown) => {
            const r = res as { data?: { total_rows?: number; total?: number } }
            return r?.data?.total_rows ?? r?.data?.total ?? 0
          }}
          columns={ivrColumns}
          searchPlaceholder="Search IVRs…"
          emptyText="No IVRs found"
          emptyIcon={<PhoneCall size={40} />}
          search={ivrTable.search} onSearchChange={ivrTable.setSearch}
          activeFilters={ivrTable.filters} onFilterChange={ivrTable.setFilter}
          onResetFilters={ivrTable.resetFilters} hasActiveFilters={ivrTable.hasActiveFilters}
          page={ivrTable.page} limit={ivrTable.limit} onPageChange={ivrTable.setPage}
          headerActions={
            <button onClick={() => { setEditingIvr(null); setIvrModal(true) }} className="btn-primary">
              <Plus size={15} /> Add IVR
            </button>
          }
        />
      )}

      {/* Audio Messages Tab */}
      {activeTab === 'audio' && (
        <ServerDataTable<AudioMessage>
          queryKey={['audio-messages']}
          queryFn={(params) => ivrService.listAudio(params)}
          dataExtractor={(res: unknown) => {
            const r = res as { data?: { data?: AudioMessage[] } }
            return Array.isArray(r?.data?.data) ? r.data!.data! : []
          }}
          totalExtractor={(res: unknown) => {
            const r = res as { data?: { total?: number; total_rows?: number } }
            return r?.data?.total ?? r?.data?.total_rows ?? 0
          }}
          columns={audioColumns}
          searchPlaceholder="Search audio messages…"
          emptyText="No audio messages found"
          emptyIcon={<Music size={40} />}
          search={audioTable.search} onSearchChange={audioTable.setSearch}
          activeFilters={audioTable.filters} onFilterChange={audioTable.setFilter}
          onResetFilters={audioTable.resetFilters} hasActiveFilters={audioTable.hasActiveFilters}
          page={audioTable.page} limit={audioTable.limit} onPageChange={audioTable.setPage}
          headerActions={
            <button onClick={() => { setEditingAudio(null); setAudioModal(true) }} className="btn-primary">
              <Plus size={15} /> Add Audio Message
            </button>
          }
        />
      )}

      {/* Modals */}
      <IvrFormModal
        isOpen={ivrModal}
        onClose={() => { setIvrModal(false); setEditingIvr(null) }}
        editing={editingIvr}
      />
      <AudioFormModal
        isOpen={audioModal}
        onClose={() => { setAudioModal(false); setEditingAudio(null) }}
        editing={editingAudio}
      />
      <IvrMenuModal
        isOpen={!!menuIvr}
        onClose={() => setMenuIvr(null)}
        ivr={menuIvr}
      />
    </div>
  )
}
