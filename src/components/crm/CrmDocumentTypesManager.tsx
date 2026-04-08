import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, X, Loader2, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { confirmDelete } from '../../utils/confirmDelete'

// ─── Types ───────────────────────────────────────────────────────────────────
export interface DocumentType {
  id: number
  title: string
  type_title_url: string
  values: string | null      // JSON array string or comma-separated or null
  status: '0' | '1' | 0 | 1
}

export function parseValues(raw: string | null | undefined): string[] {
  if (!raw) return []
  // Runtime safety: API may return actual array instead of JSON string
  if (Array.isArray(raw)) return (raw as unknown as string[]).filter(Boolean)
  if (typeof raw !== 'string') return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch { /* fall through */ }
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function serializeValues(tags: string[]): string {
  return JSON.stringify(tags)
}

// ─── Tag input ────────────────────────────────────────────────────────────────
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')

  function add() {
    const val = input.trim()
    if (val && !tags.includes(val)) onChange([...tags, val])
    setInput('')
  }

  return (
    <div className="rounded-lg border border-slate-200 p-2 flex flex-wrap gap-1.5 min-h-[42px] bg-white focus-within:border-indigo-400 transition-colors">
      {tags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter(t => t !== tag))}
            className="hover:text-red-500 transition-colors"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
          if (e.key === 'Backspace' && !input && tags.length) onChange(tags.slice(0, -1))
        }}
        onBlur={add}
        placeholder={tags.length === 0 ? 'Type and press Enter to add (e.g. January, February…)' : 'Add more…'}
        className="flex-1 min-w-[120px] text-xs outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
      />
    </div>
  )
}

// ─── Inline form ─────────────────────────────────────────────────────────────
interface FormProps {
  initial?: { title: string; tags: string[] }
  onSave: (title: string, tags: string[]) => void
  onCancel: () => void
  saving: boolean
}

function DocTypeForm({ initial, onSave, onCancel, saving }: FormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [tags,  setTags]  = useState<string[]>(initial?.tags ?? [])

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Type Name <span className="text-red-400">*</span></label>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="input w-full"
          placeholder="e.g. Bank Statement"
          onKeyDown={e => e.key === 'Enter' && title.trim() && onSave(title.trim(), tags)}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Sub-values <span className="text-slate-400 font-normal">(optional — e.g. months for Bank Statement)</span>
        </label>
        <TagInput tags={tags} onChange={setTags} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => title.trim() && onSave(title.trim(), tags)}
          disabled={!title.trim() || saving}
          className="btn-success text-xs px-4 py-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : 'Save'}
        </button>
        <button onClick={onCancel} className="btn-outline text-xs px-4 py-1.5">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ active, onToggle, disabled }: { active: boolean; onToggle: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${active ? 'bg-indigo-500' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${active ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

// ─── Main Manager Modal ───────────────────────────────────────────────────────
interface Props { onClose: () => void }

export function CrmDocumentTypesManager({ onClose }: Props) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd]       = useState(false)
  const [editId, setEditId]         = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const res = await crmService.getDocumentTypes()
      return (res.data?.data ?? res.data ?? []) as DocumentType[]
    },
  })

  const types = data ?? []

  const createMut = useMutation({
    mutationFn: ({ title, tags }: { title: string; tags: string[] }) =>
      crmService.createDocumentType({ title, values: serializeValues(tags) }),
    onSuccess: () => {
      toast.success('Document type added')
      setShowAdd(false)
      qc.invalidateQueries({ queryKey: ['document-types'] })
    },
    onError: () => toast.error('Failed to add type'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, title, tags }: { id: number; title: string; tags: string[] }) =>
      crmService.updateDocumentType(id, { title, values: serializeValues(tags) }),
    onSuccess: () => {
      toast.success('Document type updated')
      setEditId(null)
      qc.invalidateQueries({ queryKey: ['document-types'] })
    },
    onError: () => toast.error('Failed to update type'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => crmService.deleteDocumentType(id),
    onSuccess: () => {
      toast.success('Document type deleted')
      qc.invalidateQueries({ queryKey: ['document-types'] })
    },
    onError: () => toast.error('Failed to delete type'),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 0 | 1 }) =>
      crmService.toggleDocumentTypeStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-types'] }),
    onError: () => toast.error('Failed to update status'),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden bg-white" style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-indigo-500" />
            <h2 className="text-base font-bold text-slate-800">Document Types</h2>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-600">
              {types.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!showAdd && (
              <button
                onClick={() => { setShowAdd(true); setEditId(null) }}
                className="btn-success text-xs px-3 py-1.5"
              >
                <Plus size={13} /> Add Type
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* Add form */}
          {showAdd && (
            <DocTypeForm
              onSave={(title, tags) => createMut.mutate({ title, tags })}
              onCancel={() => setShowAdd(false)}
              saving={createMut.isPending}
            />
          )}

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-indigo-400" />
            </div>
          ) : types.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              No document types yet. Click <strong>Add Type</strong> to create one.
            </div>
          ) : (
            types.map(dt => {
              const isActive  = String(dt.status) === '1'
              const tags      = parseValues(dt.values)
              const isEditing = editId === dt.id
              const expanded  = expandedId === dt.id

              return (
                <div key={dt.id} className={`rounded-xl border transition-colors ${isActive ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'}`}>

                  {/* Row header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                        {dt.title}
                      </p>
                      {tags.length > 0 && !isEditing && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {tags.slice(0, 4).join(' · ')}{tags.length > 4 ? ` +${tags.length - 4} more` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Expand sub-values */}
                      {tags.length > 0 && !isEditing && (
                        <button
                          onClick={() => setExpandedId(expanded ? null : dt.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Show sub-values"
                        >
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}

                      {/* Status toggle */}
                      <Toggle
                        active={isActive}
                        onToggle={() => toggleMut.mutate({ id: dt.id, status: isActive ? 0 : 1 })}
                        disabled={toggleMut.isPending}
                      />

                      {/* Edit */}
                      <button
                        onClick={() => { setEditId(isEditing ? null : dt.id); setShowAdd(false) }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={async () => {
                          if (await confirmDelete(dt.title))
                            deleteMut.mutate(dt.id)
                        }}
                        disabled={deleteMut.isPending}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded sub-values view */}
                  {expanded && !isEditing && tags.length > 0 && (
                    <div className="px-4 pb-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
                      {tags.map(tag => (
                        <span key={tag} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Inline edit form */}
                  {isEditing && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                      <DocTypeForm
                        initial={{ title: dt.title, tags }}
                        onSave={(title, newTags) => updateMut.mutate({ id: dt.id, title, tags: newTags })}
                        onCancel={() => setEditId(null)}
                        saving={updateMut.isPending}
                      />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0">
          <p className="text-xs text-slate-400">
            Only <strong>active</strong> types appear in the upload dropdown. Sub-values (e.g. months) show as a second selector when uploading.
          </p>
        </div>
      </div>
    </div>
  )
}
