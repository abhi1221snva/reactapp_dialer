import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, FileText, Save, X, ArrowLeft, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { smsAiService } from '../../services/smsAi.service'
import { useServerTable } from '../../hooks/useServerTable'
import { formatDateTime } from '../../utils/format'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'

interface TemplateItem {
  id: number
  template_name: string
  introduction?: string
  description?: string
  status?: string | number
  is_deleted?: number
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

function TemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: TemplateItem | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(template?.template_name ?? '')
  const [intro, setIntro] = useState(template?.introduction ?? '')
  const [desc, setDesc] = useState(template?.description ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const saveMutation = useMutation({
    mutationFn: () =>
      template
        ? smsAiService.updateTemplate(template.id, {
            template_name: name.trim(),
            introduction: intro.trim(),
            description: desc.trim(),
          })
        : smsAiService.createTemplate({
            template_name: name.trim(),
            introduction: intro.trim(),
            description: desc.trim(),
          }),
    onSuccess: () => {
      toast.success(template ? 'Template updated' : 'Template created')
      onSaved()
    },
    onError: () => toast.error(template ? 'Failed to update' : 'Failed to create'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-base">
            {template ? 'Edit Template' : 'New SMS AI Template'}
          </h3>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="form-group">
          <label className="label">Template Name *</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="e.g. Welcome Message, Follow Up"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">Introduction</label>
          <textarea
            className="input min-h-[70px]"
            placeholder="Opening message or persona description…"
            value={intro}
            onChange={e => setIntro(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">The initial greeting or persona for the AI</p>
        </div>

        <div className="form-group">
          <label className="label">Description / System Prompt</label>
          <textarea
            className="input min-h-[90px]"
            placeholder="Describe what the AI should do, its tone, and any rules…"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!name.trim() || saveMutation.isPending}
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

export function SmsAiTemplates() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 15 })

  const [showCreate, setShowCreate] = useState(false)
  const [editTemplate, setEditTemplate] = useState<TemplateItem | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['smsai-templates'] })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => smsAiService.deleteTemplate(id),
    onSuccess: () => { toast.success('Template deleted'); invalidate() },
    onError: () => toast.error('Failed to delete template'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      smsAiService.updateTemplateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); invalidate() },
    onError: () => toast.error('Failed to update status'),
  })

  const columns: Column<TemplateItem>[] = [
    {
      key: 'template_name',
      header: 'Template Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <FileText size={13} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium text-slate-900 block truncate">{row.template_name}</span>
            {row.introduction && (
              <span className="text-xs text-slate-400 block truncate max-w-[250px]">{row.introduction}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const isActive = String(row.status) === '1' || String(row.status) === 'active'
        return (
          <button
            onClick={() => statusMutation.mutate({
              id: row.id,
              status: isActive ? '0' : '1',
            })}
            disabled={statusMutation.isPending}
            className="cursor-pointer hover:opacity-75 transition-opacity"
          >
            <Badge variant={isActive ? 'green' : 'gray'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </button>
        )
      },
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.created_at ? formatDateTime(row.created_at as string) : '—'}
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
            onClick: () => setEditTemplate(row),
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: async () => {
              if (await confirmDelete(row.template_name)) deleteMutation.mutate(row.id)
            },
            disabled: deleteMutation.isPending,
          },
        ]} />
      ),
    },
  ]

  return (
    <>
      {(showCreate || editTemplate) && (
        <TemplateModal
          template={editTemplate}
          onClose={() => { setShowCreate(false); setEditTemplate(null) }}
          onSaved={() => { setShowCreate(false); setEditTemplate(null); invalidate() }}
        />
      )}

      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/smsai/demo')} className="btn-ghost p-2 rounded-lg mt-0.5">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="page-header">
              <div>
                <h1 className="page-title">SMS AI Templates</h1>
                <p className="page-subtitle">Manage AI response templates for SMS campaigns</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditTemplate(null); setShowCreate(true) }}
                  className="btn-primary"
                >
                  <Plus size={15} />
                  New Template
                </button>
              </div>
            </div>
          </div>
        </div>

        <ServerDataTable<TemplateItem>
          queryKey={['smsai-templates']}
          queryFn={(params) => smsAiService.listTemplates(params)}
          dataExtractor={(res: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = res as any
            return r?.data?.data ?? r?.data ?? []
          }}
          totalExtractor={(res: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = res as any
            return r?.data?.total ?? r?.data?.data?.length ?? 0
          }}
          columns={columns}
          searchPlaceholder="Search templates…"
          emptyText="No SMS AI templates found"
          emptyIcon={<FileText size={40} />}
          search={table.search}
          onSearchChange={table.setSearch}
          activeFilters={table.filters}
          onFilterChange={table.setFilter}
          onResetFilters={table.resetFilters}
          hasActiveFilters={table.hasActiveFilters}
          page={table.page}
          limit={table.limit}
          onPageChange={table.setPage}
        />
      </div>
    </>
  )
}
