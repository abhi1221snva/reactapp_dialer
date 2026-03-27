import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Users, X, Check, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Modal } from '../../components/ui/Modal'
import { RowActions } from '../../components/ui/RowActions'
import { ringgroupService } from '../../services/ringgroup.service'
import { useAuthStore } from '../../stores/auth.store'
import { useServerTable } from '../../hooks/useServerTable'
import { confirmDelete } from '../../utils/confirmDelete'

interface RingGroup {
  id: number
  name?: string
  title?: string
  description?: string
  extensions?: string
  extension_name?: string
  ring_type?: number | string
  receive_on?: string
  emails?: string
  [key: string]: unknown
}

interface Extension {
  id: number
  extension?: string
  ext?: string
  name?: string
  full_name?: string
  [key: string]: unknown
}

// ── receive_on: DB enum values are 'web_phone' | 'mobile' | 'desk_phone' ──
const RECEIVE_ON_OPTIONS = [
  { value: 'desk_phone', label: 'Desk Phone' },
  { value: 'web_phone',  label: 'Web Phone'  },
  { value: 'mobile',     label: 'Mobile'     },
] as const

const RECEIVE_ON_LABEL: Record<string, string> = {
  desk_phone: 'Desk Phone',
  web_phone:  'Web Phone',
  mobile:     'Mobile',
  // legacy fallback mappings
  No:       'Desk Phone',
  external: 'Web Phone',
}

// ── ring_type: DB enum values are '1' | '2' | '3' ──
// 1 = Ring All (&), 2 = Sequence (-), 3 = Round Robin
const RING_TYPE_LABEL: Record<number, { label: string; cls: string }> = {
  1: { label: 'Ring All',    cls: 'bg-emerald-50 text-emerald-700' },
  2: { label: 'Sequence',    cls: 'bg-amber-50 text-amber-700' },
  3: { label: 'Round Robin', cls: 'bg-blue-50 text-blue-700' },
}

const EMPTY_FORM = {
  title:       '',
  description: '',
  extension:   [] as string[],
  email:       '',
  ring_type:   1,
  receive_on:  'web_phone',
}

// ──────────── Helpers ────────────
function parseExtensions(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(e => String(e).replace(/^SIP\//i, '').trim()).filter(Boolean)
  return String(raw).split(/[&,\-]+/).map(e => e.replace(/^SIP\//i, '').trim()).filter(Boolean)
}

// Normalise legacy receive_on values saved before the enum change
function normaliseReceiveOn(v: unknown): string {
  const s = String(v ?? '').trim()
  if (!s) return 'web_phone'
  const map: Record<string, string> = {
    No:        'desk_phone',
    external:  'web_phone',
    deskphone: 'desk_phone',
    both:      'web_phone',
  }
  return map[s] ?? s
}

// ──────────── Extension Multi-Select ────────────
function ExtensionPicker({
  selected, onChange, extensions,
}: {
  selected: string[]
  onChange: (v: string[]) => void
  extensions: Extension[]
}) {
  const [q, setQ] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = extensions.filter(e => {
    const val = e.extension ?? e.ext ?? ''
    const label = `${val} ${e.full_name ?? e.name ?? ''}`
    return label.toLowerCase().includes(q.toLowerCase())
  })

  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val])

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setIsOpen(o => !o)}
        className="input cursor-pointer flex flex-wrap items-center gap-1.5 min-h-[38px]"
      >
        {selected.length === 0 ? (
          <span className="text-slate-400 text-sm flex-1">Select extensions…</span>
        ) : (
          selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
              {s}
              <button type="button" onClick={(e) => { e.stopPropagation(); toggle(s) }}>
                <X size={10} />
              </button>
            </span>
          ))
        )}
        <ChevronDown size={14} className={`ml-auto flex-shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-20 w-full top-full mt-1 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-lg">
          <div className="p-2 border-b border-slate-100">
            <input className="input text-sm py-1.5" placeholder="Search extensions…"
              value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
            {filtered.length === 0
              ? <p className="px-4 py-3 text-sm text-slate-400">No extensions found</p>
              : filtered.map(e => {
                const val = String(e.extension ?? e.ext ?? e.id)
                const label = e.full_name ?? e.name ?? ''
                const checked = selected.includes(val)
                return (
                  <button key={e.id} type="button" onClick={() => toggle(val)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                      checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                      {checked && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-sm font-mono text-indigo-600 font-medium">{val}</span>
                    {label && <span className="text-sm text-slate-500 truncate">{label}</span>}
                  </button>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────── Ring Group Form Modal ────────────
function RingGroupFormModal({
  isOpen, onClose, editing,
}: { isOpen: boolean; onClose: () => void; editing: RingGroup | null }) {
  const qc = useQueryClient()
  const clientId = useAuthStore(s => s.user?.parent_id)
  const [form, setForm] = useState(EMPTY_FORM)

  // Tracks whether form.extension has been set for the current modal open.
  // Prevents Effect 2 from re-running if the extensions query refetches.
  const extInitializedRef = useRef(false)

  const { data: extData } = useQuery({
    queryKey: ['extensions-for-rg', clientId],
    queryFn: () => ringgroupService.getExtensions(),
  })
  const extensions: Extension[] = (extData as { data?: { data?: Extension[] } })?.data?.data ?? []

  // Effect 1: Initialize non-extension fields when modal opens or editing row changes.
  // Extensions are intentionally left empty here — Effect 2 sets them once the picker
  // is available, using extension_id (user DB IDs) to resolve MAIN extension numbers only.
  useEffect(() => {
    if (!isOpen) {
      extInitializedRef.current = false
      return
    }
    if (editing) {
      const emailStr = Array.isArray(editing.emails)
        ? String((editing.emails as string[])[0] ?? '')
        : String(editing.emails ?? '').split(',')[0]?.trim() ?? ''
      setForm({
        title:       String(editing.title ?? editing.name ?? ''),
        description: String(editing.description ?? ''),
        extension:   [],   // populated by Effect 2 once picker is available
        email:       emailStr,
        ring_type:   Number(editing.ring_type ?? 1),
        receive_on:  normaliseReceiveOn(editing.receive_on),
      })
      extInitializedRef.current = false  // let Effect 2 set extensions
    } else {
      setForm(EMPTY_FORM)
      extInitializedRef.current = true   // new group: user picks from picker directly
    }
  }, [isOpen, editing])

  // Effect 2: Set form.extension once the extension picker list is available.
  //
  // The DB stores e.g. "SIP/1001&SIP/38429" where 38429 is the ALT extension of user 1001.
  // ringGroupUpdate() only accepts MAIN extension numbers (User::where('extension', $value)),
  // so sending alt extension numbers causes "Extension not found" errors.
  //
  // Primary approach: use editing.extension_id (array of user DB IDs from ringGroupDetail)
  //   to look up each user's MAIN extension in the picker — guaranteed to be only main exts.
  // Fallback: filter the raw extension string against the picker (strips alt exts by exclusion).
  useEffect(() => {
    if (!isOpen || !editing || extInitializedRef.current || extensions.length === 0) return
    extInitializedRef.current = true

    const userIds: number[] = Array.isArray(editing.extension_id)
      ? (editing.extension_id as number[])
      : []

    let mainExts: string[] = []

    if (userIds.length > 0) {
      // Map user DB IDs → main extension numbers using the picker
      mainExts = userIds
        .map(uid => extensions.find(e => e.id === uid))
        .filter(Boolean)
        .map(e => String(e!.extension ?? e!.ext ?? ''))
        .filter(Boolean)
    }

    if (mainExts.length === 0) {
      // Fallback: strip alt exts by filtering the raw string against the picker
      const rawExts = parseExtensions(String(editing.extensions ?? editing.extension_name ?? ''))
      mainExts = rawExts.filter(v =>
        extensions.some(e => String(e.extension ?? e.ext ?? '') === v)
      )
    }

    setForm(prev => ({ ...prev, extension: mainExts }))
  }, [isOpen, editing, extensions])

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editing ? ringgroupService.update(data) : ringgroupService.create(data),
    onSuccess: async (response) => {
      const body = (response as { data?: { success?: string | boolean; message?: string } })?.data
      const succeeded = body?.success === true || body?.success === 'true'
      if (!succeeded) {
        toast.error(body?.message ?? 'Failed to save Ring Group')
        return
      }
      toast.success(editing ? 'Ring Group updated' : 'Ring Group created')
      await qc.invalidateQueries({ queryKey: ['ring-groups'] })
      onClose()
    },
    onError: () => toast.error('Failed to save Ring Group'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Block submit until the picker has loaded so Effect 2 can set the correct main extensions
    if (editing && extensions.length === 0) {
      toast.error('Extension data is still loading — please try again in a moment')
      return
    }
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (form.extension.length === 0) { toast.error('Select at least one extension'); return }

    // Safety net: ensure only main extensions reach the backend.
    // Effect 2 should have already set form.extension to main-only values via extension_id lookup,
    // but filter here as well in case the user manually added values through the picker.
    const mainExts = extensions.length > 0
      ? form.extension.filter(v => extensions.some(e => String(e.extension ?? e.ext ?? '') === v))
      : form.extension  // new group only: user picked from picker, all values are main exts

    const payload: Record<string, unknown> = {
      title:       form.title,
      description: form.description,
      // Backend addRingGroup / ringGroupUpdate both do is_array($request->input('extension'))
      extension:   mainExts,
      // Backend does is_array($request->input('emails')) — must be an array
      emails:      [form.email],
      ring_type:   form.ring_type,
      // DB enum: 'web_phone' | 'mobile' | 'desk_phone'
      receive_on:  form.receive_on,
    }
    if (editing) payload.ring_id = editing.id
    mutation.mutate(payload)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={editing ? 'Edit Ring Group' : 'Add Ring Group'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Name <span className="text-red-500">*</span></label>
            <input className="input" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Sales Team" />
          </div>
          <div>
            <label className="label">Ring Mode</label>
            <select className="input" value={form.ring_type}
              onChange={e => setForm(p => ({ ...p, ring_type: Number(e.target.value) }))}>
              <option value={1}>Ring All</option>
              <option value={2}>Sequence</option>
              <option value={3}>Round Robin</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <input className="input" value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Optional description" />
        </div>

        <div>
          <label className="label">Extensions <span className="text-red-500">*</span>
            <span className="text-slate-400 font-normal ml-1">({form.extension.length} selected)</span>
          </label>
          <ExtensionPicker
            selected={form.extension}
            onChange={(v) => setForm(p => ({ ...p, extension: v }))}
            extensions={extensions}
          />
        </div>

        <div>
          <label className="label">Receive On</label>
          <select className="input" value={form.receive_on}
            onChange={e => setForm(p => ({ ...p, receive_on: e.target.value }))}>
            {RECEIVE_ON_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Email</label>
          <input className="input" value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            type="email" placeholder="email@example.com" />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Saving…' : editing ? 'Update Ring Group' : 'Add Ring Group'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ──────────── Main Page ────────────
export function RingGroups() {
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<RingGroup | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ringgroupService.delete(id),
    onSuccess: async () => {
      toast.success('Ring Group deleted')
      await qc.invalidateQueries({ queryKey: ['ring-groups'] })
    },
    onError: () => toast.error('Failed to delete Ring Group'),
  })

  const columns: Column<RingGroup>[] = [
    {
      key: 'title', header: 'Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-50">
            <Users size={14} className="text-emerald-600" />
          </div>
          <p className="font-medium text-slate-900 text-sm">{row.title ?? row.name}</p>
        </div>
      ),
    },
    {
      key: 'description', header: 'Desc',
      render: (row) => (
        <span className="text-sm text-slate-500">{row.description ? String(row.description) : '—'}</span>
      ),
    },
    {
      key: 'extension_name', header: 'Extension',
      render: (row) => {
        const raw = row.extension_name ?? row.extensions ?? ''
        const names = parseExtensions(raw)
        return (
          <div className="flex flex-wrap gap-1">
            {names.slice(0, 3).map((n, i) => (
              <span key={i} className="px-1.5 py-0.5 text-xs rounded bg-indigo-50 text-indigo-700 font-mono">{n}</span>
            ))}
            {names.length > 3 && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-slate-100 text-slate-500">+{names.length - 3}</span>
            )}
            {names.length === 0 && <span className="text-slate-400 text-sm">—</span>}
          </div>
        )
      },
    },
    {
      key: 'emails', header: 'Email',
      render: (row) => (
        <span className="text-sm text-slate-600">{row.emails ? String(row.emails) : '—'}</span>
      ),
    },
    {
      key: 'ring_type', header: 'Ring Type',
      render: (row) => {
        const rt = RING_TYPE_LABEL[Number(row.ring_type)] ?? { label: String(row.ring_type ?? '—'), cls: 'bg-slate-50 text-slate-600' }
        return <span className={`px-2 py-1 text-xs rounded-full font-medium ${rt.cls}`}>{rt.label}</span>
      },
    },
    {
      key: 'actions', header: 'Action',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (row) => (
        <RowActions actions={[
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
              if (await confirmDelete(row.title ?? row.name))
                deleteMutation.mutate(row.id)
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
          <h1 className="page-title">Ring Groups</h1>
          <p className="page-subtitle">Manage extension ring groups for inbound call routing</p>
        </div>
      </div>

      <ServerDataTable<RingGroup>
        queryKey={['ring-groups']}
        queryFn={(params) => ringgroupService.list(params)}
        dataExtractor={(res: unknown) => {
          const r = res as { data?: { data?: RingGroup[] } }
          return Array.isArray(r?.data?.data) ? r.data!.data! : []
        }}
        totalExtractor={(res: unknown) => {
          const r = res as { data?: { total_rows?: number; total?: number } }
          return r?.data?.total_rows ?? r?.data?.total ?? 0
        }}
        columns={columns}
        searchPlaceholder="Search ring groups…"
        emptyText="No ring groups found"
        emptyIcon={<Users size={40} />}
        search={table.search} onSearchChange={table.setSearch}
        activeFilters={table.filters} onFilterChange={table.setFilter}
        onResetFilters={table.resetFilters} hasActiveFilters={table.hasActiveFilters}
        page={table.page} limit={table.limit} onPageChange={table.setPage}
        headerActions={
          <button onClick={() => { setEditing(null); setModal(true) }} className="btn-primary">
            <Plus size={15} /> Add Ring Group
          </button>
        }
      />

      <RingGroupFormModal
        isOpen={modal}
        onClose={() => { setModal(false); setEditing(null) }}
        editing={editing}
      />
    </div>
  )
}
