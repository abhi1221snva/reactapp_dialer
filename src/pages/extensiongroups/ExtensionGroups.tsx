import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Layers, X, Check, ToggleLeft, ToggleRight, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { RowActions } from '../../components/ui/RowActions'
import { extensiongroupService } from '../../services/extensiongroup.service'
import { useServerTable } from '../../hooks/useServerTable'
import { confirmDelete } from '../../utils/confirmDelete'

interface ExtGroup {
  id: number
  title: string
  status?: boolean | number
  extensions?: string[] | string
  extension_name?: string
  extension_list?: string
  is_deleted?: number
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

const EMPTY_FORM = { title: '', extensions: [] as string[] }

// ──────────── Helpers ────────────
function parseExtensionField(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(e => String(e).replace(/^SIP\//i, '').trim()).filter(Boolean)
  return String(raw).split(/[,&]+/).map(e => e.replace(/^SIP\//i, '').trim()).filter(Boolean)
}

// ──────────── Extension Picker ────────────
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
    const val = String(e.extension ?? e.ext ?? '')
    const name = String(e.full_name ?? e.name ?? '')
    return `${val} ${name}`.toLowerCase().includes(q.toLowerCase())
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

// ──────────── Form Modal ────────────
function ExtGroupFormModal({
  isOpen, onClose, editing,
}: { isOpen: boolean; onClose: () => void; editing: ExtGroup | null }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: extData } = useQuery({
    queryKey: ['extensions-for-eg'],
    queryFn: () => extensiongroupService.getExtensions(),
  })
  const extensions: Extension[] = (extData as { data?: { data?: Extension[] } })?.data?.data ?? []

  // Fetch existing extension mappings for this group.
  // The JOIN ON egm.extension = up.extension means only main-extension entries are returned,
  // so these values are safe to send directly to the PATCH endpoint.
  // This also avoids the spurious 403 that GET /extension-group/{id} returns for non-admin users.
  const { data: groupMapData } = useQuery({
    queryKey: ['ext-group-map', editing?.id],
    queryFn: () => extensiongroupService.getExtensionsForGroup(editing!.id),
    enabled: isOpen && !!editing?.id,
    staleTime: 0,
    retry: false,
  })

  useEffect(() => {
    if (!isOpen) return

    if (editing) {
      // Response shape: axios wraps body in .data, so groupMapData.data = { success, data: [...items] }
      const mapArr = (groupMapData as { data?: { data?: Array<Record<string, unknown>> } })?.data?.data ?? []
      const groupExts = mapArr.map(item => String(item.extension ?? '')).filter(Boolean)

      setForm({
        title:      String(editing.title ?? ''),
        extensions: groupExts,
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [isOpen, editing, groupMapData])

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editing
        ? extensiongroupService.update(editing.id, data)
        : extensiongroupService.create(data),
    // Await invalidation so the table reflects new data before modal closes
    onSuccess: async () => {
      toast.success(editing ? 'Group updated' : 'Group created')
      await qc.invalidateQueries({ queryKey: ['extension-groups'] })
      onClose()
    },
    onError: () => toast.error('Failed to save group'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title is required'); return }
    // Backend GroupController@add and @patchNew both expect 'extensions' as array
    mutation.mutate({
      title:      form.title,
      extensions: form.extensions,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={editing ? 'Edit Extension Group' : 'Add Extension Group'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Name <span className="text-red-500">*</span></label>
          <input className="input" value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Support Team" />
        </div>

        <div>
          <label className="label">
            Extensions
            <span className="text-slate-400 font-normal ml-1">({form.extensions.length} selected)</span>
          </label>
          <ExtensionPicker
            selected={form.extensions}
            onChange={(v) => setForm(p => ({ ...p, extensions: v }))}
            extensions={extensions}
          />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Saving…' : editing ? 'Update Group' : 'Add Group'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ──────────── Main Page ────────────
export function ExtensionGroups() {
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<ExtGroup | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => extensiongroupService.delete(id),
    onSuccess: async () => {
      toast.success('Group deleted')
      await qc.invalidateQueries({ queryKey: ['extension-groups'] })
    },
    onError: () => toast.error('Failed to delete group'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: boolean }) =>
      extensiongroupService.updateStatus(id, !status),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['extension-groups'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const isActive = (row: ExtGroup) => row.status === true || row.status === 1

  const columns: Column<ExtGroup>[] = [
    {
      key: 'title', header: 'Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-violet-50">
            <Layers size={14} className="text-violet-600" />
          </div>
          <p className="font-medium text-slate-900 text-sm">{row.title}</p>
        </div>
      ),
    },
    {
      key: 'extensions', header: 'Extension',
      render: (row) => {
        // Check all possible field names the API might return
        const raw =
          row.extensions    ?? row.extension_name ??
          row.extension_list ?? row.extension ?? ''
        const exts = parseExtensionField(raw)
        return exts.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {exts.slice(0, 4).map((e, i) => (
              <span key={i} className="px-1.5 py-0.5 text-xs rounded bg-indigo-50 text-indigo-700 font-mono">{e}</span>
            ))}
            {exts.length > 4 && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-slate-100 text-slate-500">+{exts.length - 4}</span>
            )}
          </div>
        ) : <span className="text-slate-400 text-sm">—</span>
      },
    },
    {
      key: 'status', header: 'Status',
      render: (row) => (
        <Badge variant={isActive(row) ? 'green' : 'gray'}>
          {isActive(row) ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      // w-px whitespace-nowrap: makes column as narrow as content (matches Lead Status / Custom Fields)
      key: 'actions', header: 'Action',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (row) => (
        <RowActions actions={[
          {
            label: isActive(row) ? 'Deactivate' : 'Activate',
            icon: isActive(row) ? <ToggleLeft size={13} /> : <ToggleRight size={13} />,
            variant: isActive(row) ? 'warning' : 'success',
            onClick: () => toggleMutation.mutate({ id: row.id, status: !!isActive(row) }),
            disabled: toggleMutation.isPending,
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
              if (await confirmDelete(row.title)) deleteMutation.mutate(row.id)
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
          <h1 className="page-title">Extension Groups</h1>
          <p className="page-subtitle">Organize extensions into groups for routing and monitoring</p>
        </div>
      </div>

      <ServerDataTable<ExtGroup>
        queryKey={['extension-groups']}
        queryFn={(params) => extensiongroupService.list(params)}
        dataExtractor={(res: unknown) => {
          const r = res as { data?: { data?: ExtGroup[]; data2?: ExtGroup[] } }
          return r?.data?.data ?? r?.data?.data2 ?? []
        }}
        totalExtractor={(res: unknown) => {
          const r = res as { data?: { total?: number; total_rows?: number } }
          return r?.data?.total ?? r?.data?.total_rows ?? 0
        }}
        columns={columns}
        searchPlaceholder="Search groups…"
        emptyText="No extension groups found"
        emptyIcon={<Layers size={40} />}
        search={table.search} onSearchChange={table.setSearch}
        activeFilters={table.filters} onFilterChange={table.setFilter}
        onResetFilters={table.resetFilters} hasActiveFilters={table.hasActiveFilters}
        page={table.page} limit={table.limit} onPageChange={table.setPage}
        headerActions={
          <button onClick={() => { setEditing(null); setModal(true) }} className="btn-primary">
            <Plus size={15} /> Add Group
          </button>
        }
      />

      <ExtGroupFormModal
        isOpen={modal}
        onClose={() => { setModal(false); setEditing(null) }}
        editing={editing}
      />
    </div>
  )
}
