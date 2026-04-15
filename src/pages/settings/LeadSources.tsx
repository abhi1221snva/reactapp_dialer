import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Globe, Save, X, Settings2, Copy, RefreshCw, Webhook } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { RowActions } from '../../components/ui/RowActions'
import { leadSourceService } from '../../services/leadSource.service'
import { showConfirm } from '../../utils/confirmDelete'
import { formatDateTime } from '../../utils/format'
import { capFirst } from '../../utils/cn'
import { useDialerHeader } from '../../layouts/DialerLayout'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeadSourceItem {
  id: number
  source_title: string
  url: string
  status: number
  unique_id: string
  webhook_secret?: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_URL as string ?? '').replace(/\/$/, '')

function buildWebhookUrl(secret: string): string {
  return `${API_BASE}/webhook/lead-source/${secret}`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={copy}
      title="Copy to clipboard"
      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
    >
      <Copy size={12} className={copied ? 'text-emerald-500' : ''} />
    </button>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function LeadSourceModal({
  source,
  onClose,
  onSaved,
}: {
  source: LeadSourceItem | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(source?.source_title ?? '')
  const [url, setUrl] = useState(source?.url ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { source_title: title.trim(), url: url.trim() }
      if (source) return leadSourceService.update(source.id, payload)
      return leadSourceService.create(payload)
    },
    onSuccess: () => {
      toast.success(source ? 'Lead source updated' : 'Lead source created')
      onSaved()
    },
    onError: () => toast.error(source ? 'Failed to update' : 'Failed to create'),
  })

  const isValid = title.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-base">
            {source ? 'Edit Lead Source' : 'Add Lead Source'}
          </h3>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="form-group">
          <label className="label">Source Title *</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="e.g. Google Ads, Referral, Facebook"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">URL</label>
          <input
            className="input"
            placeholder="https://example.com (optional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!isValid || saveMutation.isPending}
            className="btn-primary flex-1"
          >
            <Save size={14} />
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Webhook URL Modal ────────────────────────────────────────────────────────

interface FieldItem {
  id: number
  field_name: string
  field_label: string
  field_type: 'text' | 'email' | 'list'
  is_required: boolean
  allowed_values: string[] | null
}

function exampleValue(field: FieldItem): string {
  if (field.field_type === 'email') return 'john@example.com'
  if (field.field_type === 'list' && field.allowed_values?.length) return field.allowed_values[0]
  // text — guess from name
  const n = field.field_name.toLowerCase()
  if (n.includes('first')) return 'John'
  if (n.includes('last'))  return 'Doe'
  if (n.includes('phone')) return '5551234567'
  if (n.includes('company') || n.includes('business')) return 'Acme Corp'
  if (n.includes('name'))  return 'John Doe'
  if (n.includes('zip') || n.includes('postal')) return '90210'
  if (n.includes('city'))  return 'Los Angeles'
  if (n.includes('state')) return 'CA'
  return 'value'
}

function WebhookModal({
  source,
  onClose,
  onRotated,
}: {
  source: LeadSourceItem
  onClose: () => void
  onRotated: (newSecret: string) => void
}) {
  const secret = (source.webhook_secret as string) ?? ''
  const webhookUrl = secret ? buildWebhookUrl(secret) : ''

  // Load configured fields for this source
  const { data: fieldsData, isLoading: fieldsLoading } = useQuery({
    queryKey: ['lead-source-fields', source.id],
    queryFn: () => leadSourceService.listFields(source.id),
  })

  const fields: FieldItem[] = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = fieldsData as any
    const d = r?.data?.data ?? r?.data
    return Array.isArray(d) ? d : []
  })()

  // Build dynamic cURL body from configured fields
  const curlBody = fields.length
    ? fields.reduce<Record<string, string>>((acc, f) => {
        acc[f.field_name] = exampleValue(f)
        return acc
      }, {})
    : { first_name: 'John', last_name: 'Doe', email: 'john@example.com', phone: '5551234567' }

  const curlBodyJson = JSON.stringify(curlBody, null, 4)
  const curlText = `curl -X POST "${webhookUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '${curlBodyJson}'`

  const rotateMutation = useMutation({
    mutationFn: () => leadSourceService.rotateSecret(source.id),
    onSuccess: (res) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newSecret = (res as any)?.data?.data?.webhook_secret
      if (newSecret) {
        onRotated(newSecret)
        toast.success('Webhook secret rotated. Update any integrations using the old URL.')
      }
    },
    onError: () => toast.error('Failed to rotate secret'),
  })

  const handleRotate = async () => {
    if (!await showConfirm({
      title: 'Rotate Webhook Secret?',
      message: 'This will invalidate the current URL. Any integrations using it must be updated.',
      confirmText: 'Rotate',
      danger: true,
    })) return
    rotateMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Webhook size={15} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">{capFirst(source.source_title)} — Webhook</h3>
              <p className="text-xs text-slate-400">POST endpoint for pushing lead data</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Webhook URL — full width */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <span className="text-xs font-medium text-slate-400 flex-shrink-0 uppercase tracking-wide">POST</span>
          <code className="text-xs text-slate-700 flex-1 break-all">{webhookUrl || '—'}</code>
          {webhookUrl && <CopyButton text={webhookUrl} />}
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-2 gap-4 items-start">

          {/* Left: fields table + how to use */}
          <div className="space-y-3">
            {/* How to use */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-800 mb-1.5">How to use</p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Send a <strong>POST</strong> request to the URL above</li>
                <li>Body: <code className="bg-blue-100 px-1 rounded">application/json</code></li>
                <li>Required fields return <code className="bg-blue-100 px-1 rounded">422</code> if missing</li>
                <li>Success returns <code className="bg-blue-100 px-1 rounded">201 &#123;"lead_id": N&#125;</code></li>
              </ul>
            </div>

            {/* Fields table */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Fields {fieldsLoading && <span className="text-slate-400 normal-case font-normal">(loading…)</span>}
              </label>
              {fields.length > 0 ? (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-1.5 text-slate-500 font-medium">Key</th>
                        <th className="text-left px-3 py-1.5 text-slate-500 font-medium">Type</th>
                        <th className="text-left px-3 py-1.5 text-slate-500 font-medium">Req.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fields.map(f => (
                        <tr key={f.id}>
                          <td className="px-3 py-1.5 font-mono text-slate-700">{f.field_name}</td>
                          <td className="px-3 py-1.5 text-slate-500">{f.field_type}</td>
                          <td className="px-3 py-1.5">
                            {f.is_required
                              ? <span className="text-red-500 font-medium">Yes</span>
                              : <span className="text-slate-400">No</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !fieldsLoading ? (
                <p className="text-xs text-slate-400 italic">No fields configured for this source.</p>
              ) : null}
            </div>
          </div>

          {/* Right: cURL example */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Example cURL</label>
            <div className="relative h-full">
              <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs leading-relaxed overflow-auto" style={{ maxHeight: 320 }}>
                {curlText}
              </pre>
              <div className="absolute top-2 right-2">
                <CopyButton text={curlText} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer: rotate secret */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-700">Rotate Secret</p>
            <p className="text-xs text-slate-400">Invalidates the current URL and generates a new one.</p>
          </div>
          <button
            onClick={handleRotate}
            disabled={rotateMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
          >
            <RefreshCw size={12} className={rotateMutation.isPending ? 'animate-spin' : ''} />
            {rotateMutation.isPending ? 'Rotating…' : 'Rotate'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function LeadSources() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [showModal, setShowModal]       = useState(false)
  const [editSource, setEditSource]     = useState<LeadSourceItem | null>(null)
  const [webhookSource, setWebhookSource] = useState<LeadSourceItem | null>(null)
  const { setToolbar } = useDialerHeader()

  useEffect(() => {
    setToolbar(
      <>
        <div className="lt-right" style={{ marginLeft: 'auto' }}>
          <button onClick={() => { setEditSource(null); setShowModal(true) }} className="lt-b lt-p">
            <Plus size={13} /> Add Lead Source
          </button>
        </div>
      </>
    )
    return () => setToolbar(undefined)
  })

  const { data, isLoading } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: () => leadSourceService.list(),
  })

  const sources: LeadSourceItem[] = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = data as any
    const d = r?.data?.data
    return Array.isArray(d) ? d : []
  })()

  const deleteMutation = useMutation({
    mutationFn: (id: number) => leadSourceService.delete(id),
    onSuccess: () => {
      toast.success('Lead source deleted')
      qc.invalidateQueries({ queryKey: ['lead-sources'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  const handleDelete = async (row: LeadSourceItem) => {
    if (!await showConfirm({
      title: 'Delete Lead Source?',
      message: `Are you sure you want to delete "${row.source_title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    })) return
    deleteMutation.mutate(row.id)
  }

  const handleSaved = () => {
    setShowModal(false)
    setEditSource(null)
    qc.invalidateQueries({ queryKey: ['lead-sources'] })
  }

  // After rotation, patch the cached list with the new secret
  const handleRotated = (newSecret: string) => {
    if (!webhookSource) return
    setWebhookSource(prev => prev ? { ...prev, webhook_secret: newSecret } : null)
    qc.invalidateQueries({ queryKey: ['lead-sources'] })
  }

  const columns: Column<LeadSourceItem>[] = [
    {
      key: 'source_title',
      header: 'Title',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Globe size={13} className="text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-slate-900">{capFirst(row.source_title)}</span>
        </div>
      ),
    },
    {
      key: 'webhook_secret',
      header: 'Webhook URL',
      render: (row) => {
        const secret = row.webhook_secret as string | undefined
        if (!secret) return <span className="text-slate-400 text-xs">—</span>
        const url = buildWebhookUrl(secret)
        return (
          <div className="flex items-center gap-1.5 max-w-[340px]">
            <code className="text-xs text-slate-500 truncate flex-1">{url}</code>
            <CopyButton text={url} />
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 1 ? 'green' : 'gray'}>
          {row.status === 1 ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row) => (
        <span className="text-sm text-slate-500">
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
            label: 'Webhook',
            icon: <Webhook size={13} />,
            variant: 'default',
            onClick: () => setWebhookSource(row),
          },
          {
            label: 'Configure Fields',
            icon: <Settings2 size={13} />,
            variant: 'default',
            onClick: () => navigate(`/settings/lead-sources/${row.id}/fields`),
          },
          {
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit',
            onClick: () => { setEditSource(row); setShowModal(true) },
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: () => handleDelete(row),
          },
        ]} />
      ),
    },
  ]

  return (
    <>
      {showModal && (
        <LeadSourceModal
          source={editSource}
          onClose={() => { setShowModal(false); setEditSource(null) }}
          onSaved={handleSaved}
        />
      )}

      {webhookSource && (
        <WebhookModal
          source={webhookSource}
          onClose={() => setWebhookSource(null)}
          onRotated={handleRotated}
        />
      )}

      <div className="space-y-2">
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
          <DataTable
            columns={columns}
            data={sources}
            loading={isLoading}
            keyField="id"
            emptyText="No lead sources yet. Click 'Add Lead Source' to create one."
          />
        </div>
      </div>
    </>
  )
}
