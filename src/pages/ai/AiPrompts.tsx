import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Save, X, Search, Bot, Zap,
  MessageSquare, Phone, Globe, Terminal, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { RowActions } from '../../components/ui/RowActions'
import { useServerTable } from '../../hooks/useServerTable'
import { useDialerHeader } from '../../layouts/DialerLayout'
import { formatDateTime } from '../../utils/format'
import { confirmDelete } from '../../utils/confirmDelete'
import { promptService, type Prompt, type PromptFunction, type PromptFunctionType } from '../../services/prompt.service'

// ─── Constants ────────────────────────────────────────────────────────────────

const FUNCTION_TYPES: { value: PromptFunctionType; label: string; icon: typeof MessageSquare; color: string }[] = [
  { value: 'sms', label: 'SMS', icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
  { value: 'email', label: 'Email', icon: MessageSquare, color: 'text-purple-600 bg-purple-50' },
  { value: 'call', label: 'Call', icon: Phone, color: 'text-emerald-600 bg-emerald-50' },
  { value: 'curl', label: 'cURL', icon: Terminal, color: 'text-orange-600 bg-orange-50' },
  { value: 'api', label: 'API', icon: Globe, color: 'text-indigo-600 bg-indigo-50' },
]

const API_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const

// ─── Function Editor ──────────────────────────────────────────────────────────

function FunctionEditor({
  fn,
  index,
  onChange,
  onRemove,
}: {
  fn: PromptFunction
  index: number
  onChange: (index: number, updated: PromptFunction) => void
  onRemove: (index: number) => void
}) {
  const [expanded, setExpanded] = useState(!fn.id)
  const typeInfo = FUNCTION_TYPES.find(t => t.value === fn.type)

  const update = (field: string, value: string) => {
    onChange(index, { ...fn, [field]: value })
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${typeInfo?.color ?? 'text-slate-600 bg-slate-100'}`}>
          {typeInfo ? <typeInfo.icon size={12} /> : <Zap size={12} />}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-slate-800 truncate block">
            {fn.name || `Function #${index + 1}`}
          </span>
          {fn.description && (
            <span className="text-xs text-slate-400 truncate block">{fn.description}</span>
          )}
        </div>
        <span className="px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-medium text-slate-500 uppercase">{fn.type}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(index) }}
          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
        {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-4 space-y-3 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Type *</label>
              <select
                className="input"
                value={fn.type}
                onChange={e => update('type', e.target.value)}
              >
                {FUNCTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Name *</label>
              <input
                className="input"
                placeholder="e.g. send_welcome_sms"
                value={fn.name}
                onChange={e => update('name', e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Letters, numbers, underscores only</p>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Description</label>
            <input
              className="input"
              placeholder="What does this function do?"
              value={fn.description ?? ''}
              onChange={e => update('description', e.target.value)}
            />
          </div>

          {/* Type-specific fields */}
          {(fn.type === 'sms' || fn.type === 'email') && (
            <>
              <div className="form-group">
                <label className="label">Message Template</label>
                <textarea
                  className="input min-h-[70px]"
                  placeholder="Message content…"
                  value={fn.message ?? ''}
                  onChange={e => update('message', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">DID Number / From</label>
                <input
                  className="input"
                  placeholder="+15551234567"
                  value={fn.did_number ?? ''}
                  onChange={e => update('did_number', e.target.value)}
                />
              </div>
            </>
          )}

          {fn.type === 'call' && (
            <div className="form-group">
              <label className="label">Phone Number</label>
              <input
                className="input"
                placeholder="+15551234567"
                value={fn.phone ?? ''}
                onChange={e => update('phone', e.target.value)}
              />
            </div>
          )}

          {fn.type === 'curl' && (
            <>
              <div className="form-group">
                <label className="label">cURL Request</label>
                <textarea
                  className="input min-h-[80px] font-mono text-xs"
                  placeholder="curl -X POST https://api.example.com ..."
                  value={fn.curl_request ?? ''}
                  onChange={e => update('curl_request', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">Expected Response</label>
                <textarea
                  className="input min-h-[60px] font-mono text-xs"
                  placeholder='{"status": "success", ...}'
                  value={fn.curl_response ?? ''}
                  onChange={e => update('curl_response', e.target.value)}
                />
              </div>
            </>
          )}

          {fn.type === 'api' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="form-group">
                  <label className="label">Method *</label>
                  <select
                    className="input"
                    value={fn.api_method ?? 'GET'}
                    onChange={e => update('api_method', e.target.value)}
                  >
                    {API_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label className="label">URL *</label>
                  <input
                    className="input font-mono text-xs"
                    placeholder="https://api.example.com/endpoint"
                    value={fn.api_url ?? ''}
                    onChange={e => update('api_url', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Request Body (JSON)</label>
                <textarea
                  className="input min-h-[60px] font-mono text-xs"
                  placeholder='{"key": "value"}'
                  value={fn.api_body ?? ''}
                  onChange={e => update('api_body', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="label">Expected Response (JSON)</label>
                <textarea
                  className="input min-h-[60px] font-mono text-xs"
                  placeholder='{"result": "..."}'
                  value={fn.api_response ?? ''}
                  onChange={e => update('api_response', e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Prompt Modal ─────────────────────────────────────────────────────────────

function PromptModal({
  promptId,
  onClose,
  onSaved,
}: {
  promptId: number | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [functions, setFunctions] = useState<PromptFunction[]>([])
  const [savedPromptId, setSavedPromptId] = useState<number | null>(promptId)
  const inputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const isEdit = !!promptId

  // Load existing prompt data
  const { isLoading } = useQuery({
    queryKey: ['prompt-detail', promptId],
    queryFn: () => promptService.show(promptId!),
    enabled: !!promptId,
  })

  // Set form data when query resolves
  const { data: promptData } = useQuery({
    queryKey: ['prompt-detail', promptId],
    queryFn: () => promptService.show(promptId!),
    enabled: !!promptId,
  })

  useEffect(() => {
    if (promptData?.data?.data) {
      const { prompt, functions: fns } = promptData.data.data
      setTitle(prompt.title ?? '')
      setDescription(prompt.description ?? '')
      setFunctions(fns ?? [])
      setSavedPromptId(prompt.id)
    }
  }, [promptData])

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // Save prompt mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { title: title.trim(), description: description.trim() }
      return savedPromptId
        ? promptService.update(savedPromptId, payload)
        : promptService.create(payload)
    },
    onSuccess: (res) => {
      const newId = (res.data as { data?: { id?: number } })?.data?.id
      if (!savedPromptId && newId) {
        setSavedPromptId(newId)
      }
      toast.success(isEdit ? 'Prompt updated' : 'Prompt created')
      qc.invalidateQueries({ queryKey: ['prompts'] })
      // If no functions to save, close
      if (functions.length === 0) {
        onSaved()
      }
    },
    onError: () => toast.error('Failed to save prompt'),
  })

  // Save functions mutation
  const fnMutation = useMutation({
    mutationFn: () => promptService.saveFunctions(savedPromptId!, functions),
    onSuccess: () => {
      toast.success('Functions saved')
      qc.invalidateQueries({ queryKey: ['prompts'] })
      onSaved()
    },
    onError: () => toast.error('Failed to save functions'),
  })

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    // Save prompt first
    saveMutation.mutate(undefined, {
      onSuccess: (res) => {
        const id = savedPromptId ?? (res.data as { data?: { id?: number } })?.data?.id
        if (id && functions.length > 0) {
          setSavedPromptId(id)
          // Save functions after prompt is saved
          setTimeout(() => fnMutation.mutate(), 100)
        } else {
          onSaved()
        }
      },
    })
  }

  const handleSaveAll = () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (savedPromptId) {
      // Already have an ID — save prompt + functions in parallel
      saveMutation.mutate()
      if (functions.length > 0) {
        fnMutation.mutate()
      } else {
        // Just close after prompt saves
      }
    } else {
      handleSave()
    }
  }

  const addFunction = () => {
    setFunctions(prev => [
      ...prev,
      { type: 'sms', name: '', description: '' },
    ])
  }

  const updateFunction = (idx: number, updated: PromptFunction) => {
    setFunctions(prev => prev.map((f, i) => (i === idx ? updated : f)))
  }

  const removeFunction = (idx: number) => {
    setFunctions(prev => prev.filter((_, i) => i !== idx))
  }

  const isPending = saveMutation.isPending || fnMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-base">
            {isEdit ? 'Edit Prompt' : 'New Prompt'}
          </h3>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
            </div>
          ) : (
            <>
              {/* Prompt Details */}
              <div className="space-y-3">
                <div className="form-group">
                  <label className="label">Title *</label>
                  <input
                    ref={inputRef}
                    className="input"
                    placeholder="e.g. Sales Outbound Agent, Customer Support Bot"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="label">System Prompt / Description</label>
                  <textarea
                    className="input min-h-[100px]"
                    placeholder="Describe what this AI prompt should do, its tone, rules, and behavior…"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Functions Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-500" />
                    <span className="text-sm font-semibold text-slate-700">Functions</span>
                    {functions.length > 0 && (
                      <span className="text-xs text-slate-400">({functions.length})</span>
                    )}
                  </div>
                  <button
                    onClick={addFunction}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Function
                  </button>
                </div>

                {functions.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg">
                    <Zap size={20} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">No functions yet</p>
                    <p className="text-xs text-slate-400 mt-1">Functions let the AI call external actions (SMS, API, etc.)</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {functions.map((fn, idx) => (
                      <FunctionEditor
                        key={fn.id ?? `new-${idx}`}
                        fn={fn}
                        index={idx}
                        onChange={updateFunction}
                        onRemove={removeFunction}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={handleSaveAll}
            disabled={!title.trim() || isPending}
            className="btn-primary flex-1"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AiPrompts() {
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })
  const { setToolbar } = useDialerHeader()

  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  useEffect(() => {
    setToolbar(
      <>
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input type="text" value={table.search} placeholder="Search prompts…" onChange={e => table.setSearch(e.target.value)} />
          {table.search && (
            <button onClick={() => table.setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className="lt-divider" />
        <div className="lt-right">
          <button onClick={() => { setEditId(null); setShowModal(true) }} className="lt-b lt-p">
            <Plus size={13} /> New Prompt
          </button>
        </div>
      </>
    )
    return () => setToolbar(undefined)
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['prompts'] })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => promptService.delete(id),
    onSuccess: () => { toast.success('Prompt deleted'); invalidate() },
    onError: () => toast.error('Failed to delete prompt'),
  })

  const columns: Column<Prompt>[] = [
    {
      key: 'title',
      header: 'Prompt',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Bot size={13} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium text-slate-900 block truncate">{row.title}</span>
            {row.description && (
              <span className="text-xs text-slate-400 block truncate max-w-[300px]">{row.description}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'functions',
      header: 'Functions',
      render: (row) => {
        const fns = row.functions ?? []
        if (fns.length === 0) return <span className="text-xs text-slate-400">—</span>
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {fns.slice(0, 3).map((f, i) => {
              const info = FUNCTION_TYPES.find(t => t.value === f.type)
              return (
                <span key={i} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${info?.color ?? 'text-slate-600 bg-slate-50'}`}>
                  {f.type}
                </span>
              )
            })}
            {fns.length > 3 && (
              <span className="text-[10px] text-slate-400">+{fns.length - 3}</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.created_at ? formatDateTime(row.created_at) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (row) => (
        <RowActions actions={[
          {
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit',
            onClick: () => { setEditId(row.id); setShowModal(true) },
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: async () => {
              if (await confirmDelete(row.title)) deleteMutation.mutate(row.id)
            },
            disabled: deleteMutation.isPending,
          },
        ]} />
      ),
    },
  ]

  return (
    <>
      {showModal && (
        <PromptModal
          promptId={editId}
          onClose={() => { setShowModal(false); setEditId(null) }}
          onSaved={() => { setShowModal(false); setEditId(null); invalidate() }}
        />
      )}

      <div className="space-y-5">
        <ServerDataTable<Prompt>
          queryKey={['prompts']}
          queryFn={(params) => promptService.list({
            start: ((params.page ?? 1) - 1) * (params.limit ?? 15),
            limit: params.limit ?? 15,
            search: params.search ?? '',
          })}
          dataExtractor={(res: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = res as any
            return r?.data?.data ?? r?.data ?? []
          }}
          totalExtractor={(res: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = res as any
            return r?.data?.total_rows ?? r?.data?.data?.length ?? 0
          }}
          columns={columns}
          searchPlaceholder="Search prompts…"
          emptyText="No AI prompts found"
          emptyIcon={<Bot size={40} />}
          search={table.search}
          onSearchChange={table.setSearch}
          activeFilters={table.filters}
          onFilterChange={table.setFilter}
          onResetFilters={table.resetFilters}
          hasActiveFilters={table.hasActiveFilters}
          page={table.page}
          limit={table.limit}
          onPageChange={table.setPage}
          hideToolbar
        />
      </div>
    </>
  )
}
