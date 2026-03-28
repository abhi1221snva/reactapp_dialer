import { useState, useEffect, useRef, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Layers, X, Check, ChevronDown, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { RowActions } from '../../components/ui/RowActions'
import { extensiongroupService } from '../../services/extensiongroup.service'
import { useAuthStore } from '../../stores/auth.store'
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
  first_name?: string
  last_name?: string
  [key: string]: unknown
}

// Form state uses extension number strings — the same format both create and update accept.
const EMPTY_FORM = { title: '', extensions: [] as string[] }

// ──────────── Helpers ────────────
function parseExtensionField(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.flatMap(e => {
      if (typeof e === 'object' && e !== null) {
        const obj = e as Record<string, unknown>
        const val = obj.extension ?? obj.ext ?? obj.number ?? obj.id
        return val != null ? [String(val).replace(/^SIP\//i, '').trim()] : []
      }
      return [String(e).replace(/^SIP\//i, '').trim()]
    }).filter(Boolean)
  }
  if (typeof raw === 'string') {
    if (raw.startsWith('[')) {
      try { return parseExtensionField(JSON.parse(raw)) } catch { /* fall through */ }
    }
    return raw.split(/[,;&|]+/).map(e => e.replace(/^SIP\//i, '').trim()).filter(Boolean)
  }
  return []
}

// ──────────── Extension Cell ────────────
function ExtensionCell({ groupId }: { groupId: number }) {
  const { data: mapData } = useQuery({
    queryKey: ['ext-group-map', groupId],
    queryFn: () => extensiongroupService.getExtensionsForGroup(groupId),
    staleTime: 60_000,
    retry: 1,
  })

  const names = useMemo(() => {
    const rawData = (mapData as { data?: { data?: unknown } })?.data?.data
    const items: Array<Record<string, unknown>> = Array.isArray(rawData) ? rawData : []
    return items
      .map(item => {
        const fullName = [item.first_name, item.last_name].filter(Boolean).join(' ').trim()
        return fullName || String(item.extension ?? item.ext ?? '').replace(/^SIP\//i, '').trim()
      })
      .filter(Boolean)
  }, [mapData])

  if (names.length === 0) return <span className="text-slate-400 text-sm">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {names.slice(0, 4).map((name, i) => (
        <span key={i} className="px-1.5 py-0.5 text-xs rounded bg-indigo-50 text-indigo-700">{name}</span>
      ))}
      {names.length > 4 && (
        <span className="px-1.5 py-0.5 text-xs rounded bg-slate-100 text-slate-500">+{names.length - 4}</span>
      )}
    </div>
  )
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

  // Map extension number → display name for chip labels
  const extNameMap = useMemo(() => {
    const map = new Map<string, string>()
    extensions.forEach(e => {
      const val = String(e.extension ?? e.ext ?? e.id)
      const name = [e.first_name, e.last_name, e.full_name, e.name].filter(Boolean).join(' ')
      if (val) map.set(val, name)
    })
    return map
  }, [extensions])

  const filtered = extensions.filter(e => {
    const val = String(e.extension ?? e.ext ?? '')
    const name = [e.first_name, e.last_name, e.full_name, e.name].filter(Boolean).join(' ')
    return `${val} ${name}`.toLowerCase().includes(q.toLowerCase())
  })

  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val])

  const formatChip = (val: string) => {
    const name = extNameMap.get(val)
    return name || val
  }

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
              {formatChip(s)}
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
                const label = [e.first_name, e.last_name, e.full_name, e.name].filter(Boolean).join(' ')
                const checked = selected.includes(val)
                const displayLabel = label || val
                return (
                  <button key={e.id} type="button" onClick={() => toggle(val)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                      checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                      {checked && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-sm text-slate-700">{displayLabel}</span>
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
  const clientId = useAuthStore(s => s.user?.parent_id)
  const [form, setForm] = useState(EMPTY_FORM)

  // All available extensions from the picker endpoint — used to validate pre-fill values
  // and to show the picker dropdown.
  const { data: extData } = useQuery({
    queryKey: ['extensions-for-eg', clientId],
    queryFn: () => extensiongroupService.getExtensions(),
  })
  const extensions: Extension[] = (extData as { data?: { data?: Extension[] } })?.data?.data ?? []

  // Fetch which extensions currently belong to this group.
  // staleTime: 0 ensures we always get fresh data when the modal reopens.
  // The 'isFetching' flag is used to block form submission until data is ready.
  const {
    data: groupMapData,
    isFetching: mapFetching,
  } = useQuery({
    queryKey: ['ext-group-map', editing?.id],
    queryFn: () => extensiongroupService.getExtensionsForGroup(editing!.id),
    enabled: isOpen && !!editing?.id,
    staleTime: 0,
    retry: false,
  })

  // Single effect handles all pre-fill scenarios.
  //
  // Why a single effect (no ref guard):
  //   The group map is async — it arrives AFTER the modal opens. A ref guard
  //   ("already initialized") causes the effect to mark itself done before the map loads,
  //   then ignores the map when it arrives, leaving form.extensions = [].
  //   Re-running on every dep change is safe: extensions query has no time-based refetch,
  //   and groupMapData only changes when a fresh fetch completes.
  //
  // Extension format: we store extension NUMBER strings (e.g. "1001") — the same format
  //   the create endpoint accepts. Filtering against the picker guarantees we only send
  //   active main extensions (excludes SIP/alt entries the map may return).
  useEffect(() => {
    if (!isOpen) return

    if (editing) {
      const rawData = (groupMapData as { data?: { data?: unknown } })?.data?.data
      const mapArr: Array<Record<string, unknown>> = Array.isArray(rawData) ? rawData : []

      // Extract every extension identifier the map returns (strips SIP/ prefix)
      const allMapExts = mapArr
        .map(item =>
          String(item.extension ?? item.ext ?? item.extension_number ?? '')
            .replace(/^SIP\//i, '').trim()
        )
        .filter(Boolean)

      // Build a set of extension numbers that currently exist in the picker.
      // The picker only lists active main extensions, so intersecting with it
      // strips out deleted users and alt-extension entries automatically.
      const pickerSet = new Set(
        extensions
          .map(e => String(e.extension ?? e.ext ?? '').replace(/^SIP\//i, '').trim())
          .filter(Boolean)
      )

      // If picker hasn't loaded yet, keep all map exts (effect will re-run when picker loads).
      // If picker is loaded, filter to the valid intersection only.
      const validExts = pickerSet.size > 0
        ? allMapExts.filter(v => pickerSet.has(v))
        : allMapExts

      setForm({
        title:      String(editing.title ?? ''),
        extensions: validExts,
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [isOpen, editing, groupMapData, extensions])

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editing
        ? extensiongroupService.update(editing.id, data)
        : extensiongroupService.create(data),
    onSuccess: async (res) => {
      const body = (res as { data?: { success?: boolean | number | string; message?: string } })?.data
      console.log('[ExtGroup response]', JSON.stringify(body))
      // Backend may return success as boolean true, integer 1, or string "true"/"1".
      // Treat any of these as success; everything else (false, 0, "false") is failure.
      const succeeded =
        body?.success === true  ||
        body?.success === 1     ||
        body?.success === 'true'||
        body?.success === '1'
      if (!succeeded) {
        toast.error(body?.message || 'Failed to save group')
        return
      }
      toast.success(editing ? 'Group updated' : 'Group created')
      await qc.invalidateQueries({ queryKey: ['extension-groups'] })
      await qc.invalidateQueries({ queryKey: ['ext-group-map', editing?.id] })
      onClose()
    },
    onError: (err: unknown) => {
      const axiosErr = err as {
        response?: { data?: { message?: string }; status?: number }
        request?: unknown
        message?: string
      }
      if (!axiosErr.response && axiosErr.request) {
        toast.error('Request was blocked — possible CORS issue. Contact your server admin.')
        return
      }
      const msg = axiosErr.response?.data?.message
      toast.error(msg || 'Failed to save group')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }

    // Block submit while the extension picker hasn't loaded — pre-fill filtering depends on it.
    if (extensions.length === 0) {
      toast.error('Extension data is loading — please try again in a moment')
      return
    }

    // Block submit while the group's extension map is still fetching — submitting before
    // it resolves would send an empty extensions array and the backend would reject it.
    if (editing && mapFetching) {
      toast.error('Loading group data — please wait a moment')
      return
    }

    // Guard against empty extensions array for edit.
    if (editing && form.extensions.length === 0) {
      toast.error('Please select at least one extension')
      return
    }

    const payload = { title: form.title.trim(), extensions: form.extensions.map(String) }
    console.log('[ExtGroup submit]', { editing_id: editing?.id, payload })
    mutation.mutate(payload)
  }

  const isMapLoading = editing && mapFetching

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
            {isMapLoading
              ? <span className="text-slate-400 font-normal ml-1 inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading…</span>
              : <span className="text-slate-400 font-normal ml-1">({form.extensions.length} selected)</span>
            }
          </label>
          <ExtensionPicker
            selected={form.extensions}
            onChange={(v) => setForm(p => ({ ...p, extensions: v }))}
            extensions={extensions}
          />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={mutation.isPending || !!isMapLoading} className="btn-primary">
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
      render: (row) => <ExtensionCell groupId={row.id} />,
    },
    {
      key: 'status', header: 'Status',
      render: (row) => (
        <button
          onClick={() => toggleMutation.mutate({ id: row.id, status: !!isActive(row) })}
          disabled={toggleMutation.isPending}
          title={isActive(row) ? 'Click to deactivate' : 'Click to activate'}
          className="cursor-pointer hover:opacity-75 transition-opacity"
        >
          <Badge variant={isActive(row) ? 'green' : 'gray'}>
            {isActive(row) ? 'Active' : 'Inactive'}
          </Badge>
        </button>
      ),
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
