import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Voicemail, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { RowActions } from '../../components/ui/RowActions'
import { voicemailService } from '../../services/voicemail.service'
import { useServerTable } from '../../hooks/useServerTable'
import { confirmDelete } from '../../utils/confirmDelete'

interface VmDrop {
  id?: number
  ivr_id?: number | string
  ann_id?: number | string
  ivr_desc?: string
  language?: string
  voice_name?: string
  speech_text?: string
  prompt_option?: string | number
  vm_drop_location?: string
  [key: string]: unknown
}

const EMPTY_FORM = {
  ivr_desc: '',
  language: 'en',
  voice_name: '',
  speech_text: '',
  prompt_option: '1',
  vm_drop_location: '',
}

const PROMPT_OPTIONS = [
  { value: '1', label: 'Text-to-Speech' },
  { value: '0', label: 'Upload File' },
  { value: '2', label: 'Record' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
]

// ──────────── Send to Email Modal ────────────
function SendEmailModal({
  isOpen, onClose, filePath,
}: { isOpen: boolean; onClose: () => void; filePath: string }) {
  const [email, setEmail] = useState('')
  const mutation = useMutation({
    mutationFn: () => voicemailService.sendToEmail(email, filePath),
    onSuccess: () => { toast.success('Sent to email'); onClose() },
    onError: () => toast.error('Failed to send email'),
  })
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Voicemail to Email" size="sm">
      <div className="space-y-4">
        <div>
          <label className="label">Email Address</label>
          <input className="input" type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!email || mutation.isPending}
            className="btn-primary">
            {mutation.isPending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ──────────── VM Drop Form Modal ────────────
function VmDropFormModal({
  isOpen, onClose, editing,
}: { isOpen: boolean; onClose: () => void; editing: VmDrop | null }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (isOpen) {
      if (editing) {
        setForm({
          ivr_desc: editing.ivr_desc ?? '',
          language: editing.language ?? 'en',
          voice_name: editing.voice_name ?? '',
          speech_text: editing.speech_text ?? '',
          prompt_option: String(editing.prompt_option ?? '1'),
          vm_drop_location: editing.vm_drop_location ?? '',
        })
      } else {
        setForm(EMPTY_FORM)
      }
    }
  }, [isOpen, editing])

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editing ? voicemailService.update(data) : voicemailService.create(data),
    onSuccess: () => {
      toast.success(editing ? 'Voicemail drop updated' : 'Voicemail drop created')
      qc.invalidateQueries({ queryKey: ['voicemail-drops'] })
      onClose()
    },
    onError: () => toast.error('Failed to save voicemail drop'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.ivr_desc.trim()) { toast.error('Description is required'); return }
    const payload: Record<string, unknown> = { ...form }
    if (editing) payload.auto_id = editing.id
    mutation.mutate(payload)
  }

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={editing ? 'Edit Voicemail Drop' : 'Add Voicemail Drop'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Description <span className="text-red-500">*</span></label>
          <input className="input" value={form.ivr_desc}
            onChange={e => set('ivr_desc', e.target.value)}
            placeholder="e.g. Sales follow-up voicemail" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Prompt Type</label>
            <select className="input" value={form.prompt_option}
              onChange={e => set('prompt_option', e.target.value)}>
              {PROMPT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Language</label>
            <select className="input" value={form.language}
              onChange={e => set('language', e.target.value)}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Voice Name</label>
          <input className="input" value={form.voice_name}
            onChange={e => set('voice_name', e.target.value)}
            placeholder="e.g. Joanna" />
        </div>

        {form.prompt_option === '1' && (
          <div>
            <label className="label">Speech Text</label>
            <textarea className="input min-h-[80px]" value={form.speech_text}
              onChange={e => set('speech_text', e.target.value)}
              placeholder="Hi, this is a message from…" />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Saving…' : editing ? 'Update' : 'Add Voicemail Drop'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ──────────── Main Page ────────────
export function VoicemailDrops() {
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<VmDrop | null>(null)
  const [emailModal, setEmailModal] = useState<{ open: boolean; path: string }>({ open: false, path: '' })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => voicemailService.delete(id),
    onSuccess: () => { toast.success('Voicemail drop deleted'); qc.invalidateQueries({ queryKey: ['voicemail-drops'] }) },
    onError: () => toast.error('Failed to delete'),
  })

  const columns: Column<VmDrop>[] = [
    {
      key: 'ivr_desc', header: 'Voicemail Drop',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-orange-50">
            <Voicemail size={14} className="text-orange-500" />
          </div>
          <div>
            <p className="font-medium text-slate-900 text-sm">{row.ivr_desc || '—'}</p>
            {row.speech_text && (
              <p className="text-xs text-slate-400 truncate max-w-[200px]">{String(row.speech_text)}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'language', header: 'Language',
      render: (row) => row.language
        ? <Badge variant="blue">{String(row.language)}</Badge>
        : <span className="text-slate-400 text-sm">—</span>,
    },
    {
      key: 'voice_name', header: 'Voice',
      render: (row) => <span className="text-sm text-slate-600">{row.voice_name || '—'}</span>,
    },
    {
      key: 'prompt_option', header: 'Prompt',
      render: (row) => {
        const labels: Record<string, string> = { '0': 'Upload', '1': 'TTS', '2': 'Record' }
        return <Badge variant="gray">{labels[String(row.prompt_option)] ?? '—'}</Badge>
      },
    },
    {
      key: 'actions', header: 'Action',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (row) => (
        <RowActions actions={[
          {
            label: 'Send to Email',
            icon: <Mail size={13} />,
            variant: 'default',
            onClick: () => setEmailModal({ open: true, path: String(row.vm_drop_location ?? '') }),
          },
          {
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit',
            onClick: () => { setEditing(row); setModal(true) },
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: async () => {
              if (await confirmDelete(row.ivr_desc)) deleteMutation.mutate(row.id ?? 0)
            },
          },
        ]} />
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Voicemail Drops</h1>
          <p className="page-subtitle">Pre-recorded voicemail messages for automated drop campaigns</p>
        </div>
      </div>

      <ServerDataTable<VmDrop>
        queryKey={['voicemail-drops']}
        queryFn={(params) => voicemailService.list(params)}
        dataExtractor={(res: unknown) => {
          const r = res as { data?: { data?: VmDrop[] } }
          return Array.isArray(r?.data?.data) ? r.data!.data! : []
        }}
        totalExtractor={(res: unknown) => {
          const r = res as { data?: { total?: number; total_rows?: number } }
          return r?.data?.total ?? r?.data?.total_rows ?? 0
        }}
        columns={columns}
        searchPlaceholder="Search voicemail drops…"
        emptyText="No voicemail drops found"
        emptyIcon={<Voicemail size={40} />}
        search={table.search} onSearchChange={table.setSearch}
        activeFilters={table.filters} onFilterChange={table.setFilter}
        onResetFilters={table.resetFilters} hasActiveFilters={table.hasActiveFilters}
        page={table.page} limit={table.limit} onPageChange={table.setPage}
        headerActions={
          <button onClick={() => { setEditing(null); setModal(true) }} className="btn-primary">
            <Plus size={15} /> Add Voicemail Drop
          </button>
        }
      />

      <VmDropFormModal
        isOpen={modal}
        onClose={() => { setModal(false); setEditing(null) }}
        editing={editing}
      />
      <SendEmailModal
        isOpen={emailModal.open}
        onClose={() => setEmailModal({ open: false, path: '' })}
        filePath={emailModal.path}
      />
    </div>
  )
}
