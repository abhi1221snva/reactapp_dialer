import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MailCheck, Eye, Send, Save, X, ToggleLeft, ToggleRight, Code, Sparkles,
  Plus, Trash2,
} from 'lucide-react'
import {
  systemEmailTemplateService,
  type SystemEmailTemplate,
  type PlaceholderDef,
  type UpdatePayload,
  type CreatePayload,
} from '../../services/systemEmailTemplate.service'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { useAuth } from '../../hooks/useAuth'
import { LEVELS } from '../../utils/permissions'
import toast from 'react-hot-toast'
import { confirmDelete } from '../../utils/confirmDelete'

// ── Helpers ──────────────────────────────────────────────────────────────────

function parsePlaceholders(raw: PlaceholderDef[] | string | null): PlaceholderDef[] {
  if (!raw) return []
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return raw
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:28px 36px;text-align:center;">
<span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">{{siteName}}</span>
</td></tr>
<tr><td style="padding:36px 36px 28px;">
<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1e293b;">Your Title Here</h2>
<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#374151;">Your email content goes here. Use {{placeholders}} for dynamic content.</p>
</td></tr>
<tr><td style="background:#f8fafc;padding:20px 36px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="margin:0;font-size:12px;color:#94a3b8;">{{companyName}}</p>
<p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">This is an automated message — please do not reply.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

// ── Create Modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void
}

function CreateModal({ onClose }: CreateModalProps) {
  const qc = useQueryClient()
  const [templateKey, setTemplateKey] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState(DEFAULT_HTML)

  const createMut = useMutation({
    mutationFn: (data: CreatePayload) => systemEmailTemplateService.create(data),
    onSuccess: () => {
      toast.success('Template created')
      qc.invalidateQueries({ queryKey: ['system-email-templates'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create template'
      toast.error(msg)
    },
  })

  const handleCreate = () => {
    if (!templateKey.trim()) { toast.error('Template key is required'); return }
    if (!templateName.trim()) { toast.error('Template name is required'); return }
    if (!subject.trim()) { toast.error('Subject is required'); return }
    createMut.mutate({ template_key: templateKey, template_name: templateName, subject, body_html: bodyHtml })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Plus size={20} className="text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-800">Create New Template</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Template Key <span className="text-red-400">*</span></label>
              <input
                value={templateKey}
                onChange={e => setTemplateKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                placeholder="e.g. invoice-reminder"
              />
              <p className="text-xs text-slate-400 mt-1">Unique identifier. Lowercase, dashes, underscores only.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Template Name <span className="text-red-400">*</span></label>
              <input
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                placeholder="e.g. Invoice Reminder"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Subject Line <span className="text-red-400">*</span></label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
              placeholder="e.g. Your Invoice from {{siteName}}"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">HTML Body</label>
            <textarea
              value={bodyHtml}
              onChange={e => setBodyHtml(e.target.value)}
              rows={14}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono leading-relaxed focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-y"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={createMut.isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus size={14} />
            {createMut.isPending ? 'Creating...' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  template: SystemEmailTemplate
  onClose: () => void
}

function EditModal({ template, onClose }: EditModalProps) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [subject, setSubject] = useState(template.subject)
  const [bodyHtml, setBodyHtml] = useState(template.body_html)
  const [templateName, setTemplateName] = useState(template.template_name)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewSubject, setPreviewSubject] = useState('')
  const [testEmail, setTestEmail] = useState('')

  const placeholders = useMemo(() => parsePlaceholders(template.placeholders), [template.placeholders])

  const saveMut = useMutation({
    mutationFn: (data: UpdatePayload) => systemEmailTemplateService.update(template.id, data),
    onSuccess: () => {
      toast.success('Template saved')
      qc.invalidateQueries({ queryKey: ['system-email-templates'] })
    },
    onError: () => toast.error('Failed to save template'),
  })

  const previewMut = useMutation({
    mutationFn: () => systemEmailTemplateService.preview(template.id),
    onSuccess: (res) => {
      const d = res.data?.data
      setPreviewHtml(d?.html ?? '')
      setPreviewSubject(d?.subject ?? '')
      setTab('preview')
    },
    onError: () => toast.error('Preview failed'),
  })

  const testMut = useMutation({
    mutationFn: (email: string) => systemEmailTemplateService.testSend(template.id, email),
    onSuccess: () => toast.success('Test email sent!'),
    onError: () => toast.error('Failed to send test email'),
  })

  const handleSave = () => {
    saveMut.mutate({ template_name: templateName, subject, body_html: bodyHtml })
  }

  const insertPlaceholder = (key: string) => {
    setBodyHtml(prev => prev + `{{${key}}}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 my-8" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <MailCheck size={20} className="text-indigo-500" />
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Edit Template</h2>
              <p className="text-xs text-slate-400 font-mono">{template.template_key}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3">
          <button
            onClick={() => setTab('edit')}
            className={`px-4 py-2 text-sm rounded-t-lg font-medium ${
              tab === 'edit' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Code size={14} className="inline mr-1.5" />Edit HTML
          </button>
          <button
            onClick={() => previewMut.mutate()}
            className={`px-4 py-2 text-sm rounded-t-lg font-medium ${
              tab === 'preview' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Eye size={14} className="inline mr-1.5" />Preview
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {tab === 'edit' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Template Name</label>
                <input
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Subject Line</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                  placeholder="Email subject..."
                />
              </div>

              {placeholders.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    <Sparkles size={12} className="inline mr-1" />Available Placeholders
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {placeholders.map(p => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => insertPlaceholder(p.key)}
                        className="px-2 py-1 text-xs font-mono bg-indigo-50 text-indigo-600 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors"
                        title={`${p.label} — sample: ${p.sample}`}
                      >
                        {'{{' + p.key + '}}'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">HTML Body</label>
                <textarea
                  value={bodyHtml}
                  onChange={e => setBodyHtml(e.target.value)}
                  rows={18}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono leading-relaxed focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none resize-y"
                  spellCheck={false}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-slate-500">
                <strong>Subject:</strong> {previewSubject}
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <iframe
                  srcDoc={previewHtml}
                  title="Email Preview"
                  className="w-full border-0"
                  style={{ minHeight: '500px' }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <div className="flex items-center gap-2">
            <input
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm w-56 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
              placeholder="test@example.com"
            />
            <button
              onClick={() => {
                if (!testEmail) { toast.error('Enter an email'); return }
                testMut.mutate(testEmail)
              }}
              disabled={testMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <Send size={14} />
              {testMut.isPending ? 'Sending...' : 'Test Send'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveMut.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save size={14} />
              {saveMut.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

interface PreviewModalProps {
  template: SystemEmailTemplate
  onClose: () => void
  onEdit: () => void
}

function PreviewModal({ template, onClose, onEdit }: PreviewModalProps) {
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewSubject, setPreviewSubject] = useState('')

  const previewMut = useMutation({
    mutationFn: () => systemEmailTemplateService.preview(template.id),
    onSuccess: (res) => {
      const d = res.data?.data
      setPreviewHtml(d?.html ?? '')
      setPreviewSubject(d?.subject ?? '')
    },
    onError: () => toast.error('Preview failed'),
  })

  // Load preview on mount
  useEffect(() => { previewMut.mutate() }, [template.id])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 my-8" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Eye size={20} className="text-indigo-500" />
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Preview: {template.template_name}</h2>
              <p className="text-xs text-slate-400 font-mono">{template.template_key}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {previewMut.isPending ? (
            <div className="flex items-center justify-center py-20 text-slate-400">Loading preview...</div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-slate-500">
                <strong>Subject:</strong> {previewSubject}
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <iframe
                  srcDoc={previewHtml}
                  title="Email Preview"
                  className="w-full border-0"
                  style={{ minHeight: '500px' }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            Close
          </button>
          <button
            onClick={() => { onClose(); onEdit() }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Code size={14} />
            Edit Template
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function SystemEmailTemplates() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<SystemEmailTemplate | null>(null)
  const [creating, setCreating] = useState(false)
  const [previewing, setPreviewing] = useState<SystemEmailTemplate | null>(null)

  const { data: templates, isLoading } = useQuery({
    queryKey: ['system-email-templates'],
    queryFn: () => systemEmailTemplateService.getAll().then(r => r.data?.data ?? []),
  })

  // Toggle active/inactive
  const toggleMut = useMutation({
    mutationFn: (tpl: SystemEmailTemplate) =>
      systemEmailTemplateService.update(tpl.id, { is_active: !tpl.is_active }),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['system-email-templates'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  // Delete
  const deleteMut = useMutation({
    mutationFn: (id: number) => systemEmailTemplateService.delete(id),
    onSuccess: () => {
      toast.success('Template deleted')
      qc.invalidateQueries({ queryKey: ['system-email-templates'] })
    },
    onError: () => toast.error('Failed to delete template'),
  })

  const handleDelete = async (tpl: SystemEmailTemplate) => {
    if (await confirmDelete(tpl.template_name)) {
      deleteMut.mutate(tpl.id)
    }
  }

  const columns = useMemo<Column<SystemEmailTemplate>[]>(() => [
    {
      key: 'template_name',
      header: 'Template',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800">{row.template_name}</div>
          <div className="text-xs text-slate-400 font-mono">{row.template_key}</div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (row) => (
        <span className="text-sm text-slate-600 truncate max-w-xs block">{row.subject}</span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleMut.mutate(row) }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            row.is_active
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
          }`}
        >
          {row.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          {row.is_active ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    {
      key: 'updated_at',
      header: 'Last Updated',
      render: (row) => (
        <span className="text-xs text-slate-400">{formatDate(row.updated_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); setPreviewing(row) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
            title="Preview email"
          >
            <Eye size={13} />
            Preview
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(row) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            <Code size={13} />
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row) }}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Delete template"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ], [toggleMut])

  // Guard: superadmin only
  if ((user?.level ?? 0) < LEVELS.SUPERADMIN) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        You don't have permission to access this page.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <MailCheck size={20} className="text-indigo-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">System Email Templates</h1>
            <p className="text-sm text-slate-400">Manage templates for forgot password, welcome, OTP, and more.</p>
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Add Template
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={templates ?? []}
          loading={isLoading}
          emptyText="No email templates found. Templates are seeded automatically."
        />
      </div>

      {/* Create Modal */}
      {creating && (
        <CreateModal onClose={() => setCreating(false)} />
      )}

      {/* Preview Modal */}
      {previewing && (
        <PreviewModal
          template={previewing}
          onClose={() => setPreviewing(null)}
          onEdit={() => setEditing(previewing)}
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <EditModal
          template={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
