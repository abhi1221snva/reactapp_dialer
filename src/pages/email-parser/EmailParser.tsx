import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileSearch, RefreshCw, Download, RotateCcw, UserPlus, X, ArrowDownLeft, ArrowUpRight, Paperclip, DollarSign, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { EmptyState } from '../../components/ui/EmptyState'
import {
  emailParserService,
  type ParsedAttachment,
  type ParsedApplication,
  type ParserStatus,
  type AuditLogEntry,
  type LenderConversation,
  type LenderEmailStats,
} from '../../services/emailParser.service'

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatCurrency(val: number | null) {
  if (val === null || val === undefined) return '—'
  return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ── Badge Components ────────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span className="text-slate-400 text-xs">—</span>
  const cls =
    score >= 80 ? 'bg-green-100 text-green-700' :
    score >= 50 ? 'bg-yellow-100 text-yellow-700' :
    'bg-red-100 text-red-700'
  const label = score >= 80 ? 'HIGH' : score >= 50 ? 'MED' : 'LOW'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {score.toFixed(0)}% {label}
    </span>
  )
}

const DOC_TYPE_COLORS: Record<string, string> = {
  application: 'bg-blue-100 text-blue-700',
  bank_statement: 'bg-green-100 text-green-700',
  void_cheque: 'bg-purple-100 text-purple-700',
  invoice: 'bg-amber-100 text-amber-700',
  unknown: 'bg-slate-100 text-slate-600',
  pending: 'bg-slate-100 text-slate-500',
}

function DocTypeBadge({ type }: { type: string }) {
  const cls = DOC_TYPE_COLORS[type] ?? DOC_TYPE_COLORS.unknown
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {type.replace('_', ' ')}
    </span>
  )
}

// ── Create Lead Modal ───────────────────────────────────────────────────────

interface CreateLeadModalProps {
  app: ParsedApplication
  onClose: () => void
  onCreated: () => void
}

function CreateLeadModal({ app, onClose, onCreated }: CreateLeadModalProps) {
  const [fields, setFields] = useState({
    company_name: app.business_name ?? '',
    first_name: app.owner_first_name ?? '',
    last_name: app.owner_last_name ?? '',
    email: app.owner_email ?? '',
    phone_number: app.owner_phone ?? '',
    address: app.business_address ?? '',
    city: app.business_city ?? '',
    state: app.business_state ?? '',
    zip: app.business_zip ?? '',
    loan_amount: app.requested_amount?.toString() ?? '',
  })

  const mutation = useMutation({
    mutationFn: () => {
      const overrides: Record<string, unknown> = {}
      Object.entries(fields).forEach(([k, v]) => {
        if (v !== '') overrides[k] = k === 'loan_amount' ? parseFloat(v) || 0 : v
      })
      return emailParserService.createLead(app.id, overrides)
    },
    onSuccess: () => {
      toast.success('Lead created successfully')
      onCreated()
    },
    onError: () => toast.error('Failed to create lead'),
  })

  const handleChange = (key: string, value: string) =>
    setFields(prev => ({ ...prev, [key]: value }))

  const fieldLabels: Record<string, string> = {
    company_name: 'Company Name',
    first_name: 'First Name',
    last_name: 'Last Name',
    email: 'Email',
    phone_number: 'Phone',
    address: 'Address',
    city: 'City',
    state: 'State',
    zip: 'ZIP',
    loan_amount: 'Requested Amount',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-slate-800">Create Lead from Application</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {Object.entries(fields).map(([key, val]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{fieldLabels[key] ?? key}</label>
              <input
                type={key === 'loan_amount' ? 'number' : 'text'}
                value={val}
                onChange={e => handleChange(key, e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Creating...' : 'Create Lead'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard Tab ───────────────────────────────────────────────────────────

function DashboardTab({ status, onScan, scanning }: {
  status: ParserStatus | null
  onScan: () => void
  scanning: boolean
}) {
  if (!status) return <div className="p-8 text-center text-slate-400">Loading...</div>

  const stats = [
    { label: 'Total Attachments', value: status.total_attachments, color: 'text-slate-800' },
    { label: 'Applications Found', value: status.total_applications, color: 'text-blue-600' },
    { label: 'Leads Created', value: status.leads_created, color: 'text-green-600' },
    { label: 'Pending Review', value: status.pending_review, color: 'text-amber-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onScan}
          disabled={scanning}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Scanning...' : 'Scan Inbox'}
        </button>
      </div>

      {Object.keys(status.by_doc_type).length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">By Document Type</h4>
          <div className="flex flex-wrap gap-3">
            {Object.entries(status.by_doc_type).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <DocTypeBadge type={type} />
                <span className="text-sm font-medium text-slate-700">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(status.by_parse_status).length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">By Parse Status</h4>
          <div className="flex flex-wrap gap-3">
            {Object.entries(status.by_parse_status).map(([s, count]) => (
              <div key={s} className="flex items-center gap-2">
                <StatusBadge status={s} />
                <span className="text-sm font-medium text-slate-700">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Applications Tab ────────────────────────────────────────────────────────

function ApplicationsTab() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedApp, setSelectedApp] = useState<ParsedApplication | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['email-parser-applications', page, search],
    queryFn: () => emailParserService.getApplications({ page, per_page: 20, search: search || undefined }),
  })

  const apps: ParsedApplication[] = data?.data?.data?.applications ?? []
  const total = data?.data?.data?.total ?? 0
  const perPage = data?.data?.data?.per_page ?? 20

  const columns: Column<ParsedApplication>[] = [
    {
      key: 'business_name',
      header: 'Business Name',
      render: (r) => <span className="font-medium text-slate-800">{r.business_name || '—'}</span>,
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (r) => `${r.owner_first_name ?? ''} ${r.owner_last_name ?? ''}`.trim() || '—',
    },
    {
      key: 'confidence_score',
      header: 'Confidence',
      render: (r) => <ConfidenceBadge score={r.confidence_score} />,
    },
    {
      key: 'requested_amount',
      header: 'Amount',
      render: (r) => formatCurrency(r.requested_amount),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'created_at',
      header: 'Received',
      render: (r) => <span className="text-xs text-slate-500">{formatDate(r.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-1">
          {r.status !== 'lead_created' && !r.lead_id && (
            <button
              onClick={() => setSelectedApp(r)}
              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
              title="Create Lead"
            >
              <UserPlus size={15} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by business or owner name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {apps.length === 0 && !isLoading ? (
        <EmptyState icon={FileSearch} title="No applications found" description="Scan your inbox to find MCA application PDFs" />
      ) : (
        <DataTable<ParsedApplication>
          columns={columns}
          data={apps}
          loading={isLoading}
          keyField="id"
          pagination={{
            page,
            total,
            perPage,
            onChange: setPage,
          }}
        />
      )}

      {selectedApp && (
        <CreateLeadModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onCreated={() => {
            setSelectedApp(null)
            queryClient.invalidateQueries({ queryKey: ['email-parser-applications'] })
            queryClient.invalidateQueries({ queryKey: ['email-parser-status'] })
          }}
        />
      )}
    </div>
  )
}

// ── Attachments Tab ─────────────────────────────────────────────────────────

function AttachmentsTab() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['email-parser-attachments', page, search, docTypeFilter, statusFilter],
    queryFn: () => emailParserService.getAttachments({
      page,
      per_page: 20,
      search: search || undefined,
      doc_type: docTypeFilter || undefined,
      parse_status: statusFilter || undefined,
    }),
  })

  const reparseMutation = useMutation({
    mutationFn: (id: number) => emailParserService.reparseAttachment(id),
    onSuccess: () => {
      toast.success('Re-parse job dispatched')
      queryClient.invalidateQueries({ queryKey: ['email-parser-attachments'] })
    },
    onError: () => toast.error('Failed to reparse'),
  })

  const attachments: ParsedAttachment[] = data?.data?.data?.attachments ?? []
  const total = data?.data?.data?.total ?? 0
  const perPage = data?.data?.data?.per_page ?? 20

  const columns: Column<ParsedAttachment>[] = [
    {
      key: 'filename',
      header: 'Filename',
      render: (r) => (
        <div className="flex items-center gap-2">
          <FileSearch size={14} className="text-red-500 shrink-0" />
          <span className="text-sm font-medium text-slate-800 truncate max-w-[200px]" title={r.filename}>
            {r.filename}
          </span>
        </div>
      ),
    },
    {
      key: 'email_from',
      header: 'From',
      render: (r) => <span className="text-xs text-slate-600 truncate max-w-[150px] block">{r.email_from || '—'}</span>,
    },
    {
      key: 'email_subject',
      header: 'Subject',
      render: (r) => <span className="text-xs text-slate-600 truncate max-w-[200px] block">{r.email_subject || '—'}</span>,
    },
    {
      key: 'doc_type',
      header: 'Type',
      render: (r) => <DocTypeBadge type={r.doc_type} />,
    },
    {
      key: 'parse_status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.parse_status} />,
    },
    {
      key: 'classification_confidence',
      header: 'Confidence',
      render: (r) => <ConfidenceBadge score={r.classification_confidence} />,
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (r) => <span className="text-xs text-slate-500">{formatDate(r.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-1">
          {r.local_path && (
            <a
              href={emailParserService.downloadAttachmentUrl(r.id)}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded"
              title="Download"
            >
              <Download size={14} />
            </a>
          )}
          {r.parse_status === 'failed' && (
            <button
              onClick={() => reparseMutation.mutate(r.id)}
              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
              title="Reparse"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={docTypeFilter}
          onChange={(e) => { setDocTypeFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Types</option>
          <option value="application">Application</option>
          <option value="bank_statement">Bank Statement</option>
          <option value="void_cheque">Void Cheque</option>
          <option value="invoice">Invoice</option>
          <option value="unknown">Unknown</option>
          <option value="pending">Pending</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="parsing">Parsing</option>
          <option value="parsed">Parsed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {attachments.length === 0 && !isLoading ? (
        <EmptyState icon={FileSearch} title="No attachments found" description="Scan your inbox to detect PDF attachments" />
      ) : (
        <DataTable<ParsedAttachment>
          columns={columns}
          data={attachments}
          loading={isLoading}
          keyField="id"
          pagination={{
            page,
            total,
            perPage,
            onChange: setPage,
          }}
        />
      )}
    </div>
  )
}

// ── Audit Log Tab ───────────────────────────────────────────────────────────

function AuditLogTab() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['email-parser-audit', page],
    queryFn: () => emailParserService.getAuditLog({ page, per_page: 20 }),
  })

  const entries: AuditLogEntry[] = data?.data?.data?.entries ?? []
  const total = data?.data?.data?.total ?? 0
  const perPage = data?.data?.data?.per_page ?? 20

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'action',
      header: 'Action',
      render: (r) => <StatusBadge status={r.action.includes('fail') ? 'failed' : 'info'} label={r.action} />,
    },
    {
      key: 'entity_type',
      header: 'Entity',
      render: (r) => r.entity_type ? `${r.entity_type} #${r.entity_id}` : '—',
    },
    {
      key: 'gmail_message_id',
      header: 'Message ID',
      render: (r) => (
        <span className="text-xs text-slate-500 font-mono truncate max-w-[120px] block">
          {r.gmail_message_id || '—'}
        </span>
      ),
    },
    {
      key: 'metadata',
      header: 'Details',
      render: (r) => (
        <span className="text-xs text-slate-500 truncate max-w-[200px] block">
          {r.metadata ? JSON.stringify(r.metadata).substring(0, 80) : '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Timestamp',
      render: (r) => <span className="text-xs text-slate-500">{formatDate(r.created_at)}</span>,
    },
  ]

  return (
    <div>
      {entries.length === 0 && !isLoading ? (
        <EmptyState icon={FileSearch} title="No audit entries" description="Audit entries will appear here as emails are processed" />
      ) : (
        <DataTable<AuditLogEntry>
          columns={columns}
          data={entries}
          loading={isLoading}
          keyField="id"
          pagination={{
            page,
            total,
            perPage,
            onChange: setPage,
          }}
        />
      )}
    </div>
  )
}

// ── Lender Emails Tab ──────────────────────────────────────────────────────

function LenderEmailsTab() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [dirFilter, setDirFilter] = useState('')
  const [offerFilter, setOfferFilter] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: statsData } = useQuery({
    queryKey: ['lender-email-stats'],
    queryFn: () => emailParserService.getLenderEmailStats(),
  })
  const stats: LenderEmailStats | null = statsData?.data?.data ?? null

  const { data, isLoading } = useQuery({
    queryKey: ['lender-email-conversations', page, search, dirFilter, offerFilter],
    queryFn: () => emailParserService.getLenderConversations({
      page,
      per_page: 20,
      search: search || undefined,
      offer_detected: offerFilter === 'yes' ? true : offerFilter === 'no' ? false : undefined,
    }),
  })

  const scanMutation = useMutation({
    mutationFn: () => emailParserService.scanLenderEmails(),
    onSuccess: (res) => {
      const d = res?.data?.data ?? {}
      toast.success(`Scan complete. ${d.conversations_logged ?? 0} new conversations logged.`)
      queryClient.invalidateQueries({ queryKey: ['lender-email-conversations'] })
      queryClient.invalidateQueries({ queryKey: ['lender-email-stats'] })
    },
    onError: () => toast.error('Lender email scan failed'),
  })

  const conversations: LenderConversation[] = data?.data?.data?.conversations ?? []
  const total = data?.data?.data?.total ?? 0
  const perPage = data?.data?.data?.per_page ?? 20

  // Filter conversations by direction locally
  const filtered = dirFilter
    ? conversations.filter(c => c.direction === dirFilter)
    : conversations

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500 mb-1">Total Conversations</p>
            <p className="text-2xl font-bold text-slate-800">{stats.total_conversations}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500 mb-1">Offers Detected</p>
            <p className="text-2xl font-bold text-green-600">{stats.offers_detected}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500 mb-1">Inbound</p>
            <p className="text-2xl font-bold text-blue-600">{stats.inbound}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500 mb-1">Outbound</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.outbound}</p>
          </div>
        </div>
      )}

      {/* Scan button + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={scanMutation.isPending ? 'animate-spin' : ''} />
          {scanMutation.isPending ? 'Scanning...' : 'Scan Lender Emails'}
        </button>
        <input
          type="text"
          placeholder="Search subject, email, merchant..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={dirFilter}
          onChange={(e) => { setDirFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </select>
        <select
          value={offerFilter}
          onChange={(e) => { setOfferFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All</option>
          <option value="yes">Offer Detected</option>
          <option value="no">No Offer</option>
        </select>
      </div>

      {/* By Lender breakdown */}
      {stats && stats.by_lender.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">By Lender</h4>
          <div className="flex flex-wrap gap-3">
            {stats.by_lender.map(l => (
              <div key={l.lender_id} className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                  {l.lender_name}
                </span>
                <span className="text-sm font-medium text-slate-700">{l.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table — full-width columns, scrollable, with expandable body */}
      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={Mail} title="No lender conversations found" description="Scan your inbox to detect emails from known lenders mentioning your merchants" />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Dir</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">From</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Merchant</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Subject</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Attach</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Offer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400"><RefreshCw size={16} className="animate-spin inline mr-2" />Loading...</td></tr>
                ) : filtered.map(r => (
                  <React.Fragment key={r.id}>
                    <tr
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${expandedId === r.id ? 'bg-indigo-50/40' : ''}`}
                      onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{formatDate(r.conversation_date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.direction === 'inbound' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            <ArrowDownLeft size={10} /> Inbound
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <ArrowUpRight size={10} /> Outbound
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{r.from_email}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{r.detected_merchant_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{r.subject || '(no subject)'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.has_attachments ? (
                          <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                            <Paperclip size={12} /> {r.attachment_count}
                            {r.attachment_filenames && r.attachment_filenames.length > 0 && (
                              <span className="text-xs text-slate-400 ml-1">({r.attachment_filenames.join(', ')})</span>
                            )}
                          </span>
                        ) : <span className="text-slate-300 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.offer_detected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            <DollarSign size={11} /> Offer Detected
                          </span>
                        ) : <span className="text-slate-300 text-sm">—</span>}
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr>
                        <td colSpan={7} className="px-0 py-0">
                          <div className="border-t border-indigo-100 bg-slate-50/70 px-6 py-4">
                            {/* Header meta */}
                            <div className="flex items-start gap-6 mb-3 text-xs text-slate-500">
                              <div><span className="font-semibold text-slate-600">From:</span> {r.from_email}</div>
                              <div><span className="font-semibold text-slate-600">To:</span> {r.to_email || '—'}</div>
                              <div><span className="font-semibold text-slate-600">Date:</span> {formatDate(r.conversation_date)}</div>
                              {r.detected_merchant_name && (
                                <div><span className="font-semibold text-slate-600">Matched:</span> {r.detected_merchant_name} <span className="text-slate-400">({r.detection_source})</span></div>
                              )}
                            </div>
                            {r.subject && (
                              <div className="mb-3">
                                <span className="text-xs font-semibold text-slate-600">Subject: </span>
                                <span className="text-sm font-medium text-slate-800">{r.subject}</span>
                              </div>
                            )}
                            {/* Offer details */}
                            {r.offer_detected && r.offer_details && (
                              <div className="mb-3 p-3 rounded-lg bg-green-50 border border-green-200">
                                <p className="text-xs font-semibold text-green-700 mb-1">Offer Details</p>
                                <div className="flex flex-wrap gap-3 text-xs text-green-800">
                                  {!!r.offer_details.amount && <span>Amount: <strong>${Number(r.offer_details.amount).toLocaleString()}</strong></span>}
                                  {!!r.offer_details.factor_rate && <span>Factor Rate: <strong>{String(r.offer_details.factor_rate)}</strong></span>}
                                  {!!r.offer_details.term && <span>Term: <strong>{String(r.offer_details.term)}</strong></span>}
                                  {!!r.offer_details.daily_payment && <span>Daily Payment: <strong>${Number(r.offer_details.daily_payment).toLocaleString()}</strong></span>}
                                </div>
                              </div>
                            )}
                            {/* Attachments */}
                            {r.has_attachments && r.attachment_filenames && r.attachment_filenames.length > 0 && (
                              <div className="mb-3">
                                <span className="text-xs font-semibold text-slate-600">Attachments: </span>
                                {r.attachment_filenames.map((f, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded bg-slate-200 text-xs text-slate-700">
                                    <Paperclip size={10} /> {f}
                                  </span>
                                ))}
                              </div>
                            )}
                            {/* Full email body */}
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-slate-600 mb-1">Email Content</p>
                              <div className="bg-white rounded-lg border border-slate-200 p-4 max-h-[500px] overflow-y-auto">
                                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{r.body_preview || '(no body)'}</pre>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">{total} result{total !== 1 ? 's' : ''}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 text-xs border rounded hover:bg-slate-50 disabled:opacity-40"
                >Prev</button>
                <span className="px-3 py-1 text-xs text-slate-600">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-xs border rounded hover:bg-slate-50 disabled:opacity-40"
                >Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

const TABS = ['Dashboard', 'Applications', 'Attachments', 'Audit Log', 'Lender Emails'] as const
type Tab = typeof TABS[number]

export default function EmailParser() {
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard')
  const queryClient = useQueryClient()

  const { data: statusData } = useQuery({
    queryKey: ['email-parser-status'],
    queryFn: () => emailParserService.getStatus(),
    refetchInterval: 30000,
  })

  const status: ParserStatus | null = statusData?.data?.data ?? null

  const scanMutation = useMutation({
    mutationFn: () => emailParserService.triggerScan(),
    onSuccess: (res) => {
      const count = res?.data?.data?.new_attachments ?? 0
      toast.success(`Scan complete. Found ${count} new attachment(s).`)
      queryClient.invalidateQueries({ queryKey: ['email-parser-status'] })
      queryClient.invalidateQueries({ queryKey: ['email-parser-attachments'] })
      queryClient.invalidateQueries({ queryKey: ['email-parser-applications'] })
    },
    onError: () => toast.error('Scan failed'),
  })

  return (
    <div className="p-6">
      <PageHeader
        title="Email Parser"
        subtitle="Scan Gmail for PDF attachments, classify documents, and extract application data"
        actions={
          <button
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={16} className={scanMutation.isPending ? 'animate-spin' : ''} />
            {scanMutation.isPending ? 'Scanning...' : 'Scan Inbox'}
          </button>
        }
      />

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
              {tab === 'Applications' && status?.pending_review ? (
                <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                  {status.pending_review}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'Dashboard' && (
        <DashboardTab
          status={status}
          onScan={() => scanMutation.mutate()}
          scanning={scanMutation.isPending}
        />
      )}
      {activeTab === 'Applications' && <ApplicationsTab />}
      {activeTab === 'Attachments' && <AttachmentsTab />}
      {activeTab === 'Audit Log' && <AuditLogTab />}
      {activeTab === 'Lender Emails' && <LenderEmailsTab />}
    </div>
  )
}
