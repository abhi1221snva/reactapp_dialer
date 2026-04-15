import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Save, X, ArrowLeft, ListChecks, Type, AtSign, GitMerge } from 'lucide-react'
import toast from 'react-hot-toast'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { RowActions } from '../../components/ui/RowActions'
import { leadSourceService, type LeadSourceFieldPayload, type LeadSourceFieldType } from '../../services/leadSource.service'
import { showConfirm } from '../../utils/confirmDelete'
import { useDialerHeader } from '../../layouts/DialerLayout'
import api from '../../api/axios'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FieldItem {
  id: number
  lead_source_id: number
  field_name: string
  mapped_field_key: string | null
  field_label: string
  field_type: LeadSourceFieldType
  is_required: boolean
  description: string | null
  allowed_values: string[] | null
  display_order: number
  status: string
  [key: string]: unknown
}

interface CrmFieldOption {
  value: string
  label: string
  group: 'core' | 'custom'
}

// Standard CRM fields always available (from LeadEavService::CORE_FIELDS)
const CORE_CRM_FIELDS: CrmFieldOption[] = [
  { value: 'first_name',    label: 'First Name',    group: 'core' },
  { value: 'last_name',     label: 'Last Name',     group: 'core' },
  { value: 'email',         label: 'Email',         group: 'core' },
  { value: 'phone_number',  label: 'Phone Number',  group: 'core' },
  { value: 'company_name',  label: 'Company Name',  group: 'core' },
  { value: 'address',       label: 'Address',       group: 'core' },
  { value: 'city',          label: 'City',          group: 'core' },
  { value: 'state',         label: 'State',         group: 'core' },
  { value: 'zip',           label: 'Zip',           group: 'core' },
  { value: 'loan_amount',   label: 'Loan Amount',   group: 'core' },
  { value: 'temperature',   label: 'Temperature',   group: 'core' },
]

const TYPE_ICONS: Record<LeadSourceFieldType, React.ReactNode> = {
  text:  <Type size={13} className="text-indigo-500" />,
  email: <AtSign size={13} className="text-purple-500" />,
  list:  <ListChecks size={13} className="text-emerald-500" />,
}

const TYPE_LABELS: Record<LeadSourceFieldType, string> = {
  text:  'Text',
  email: 'Email',
  list:  'List of values',
}

// ─── Field Modal ─────────────────────────────────────────────────────────────

function FieldModal({
  field,
  sourceId,
  onClose,
  onSaved,
}: {
  field: FieldItem | null
  sourceId: number
  onClose: () => void
  onSaved: () => void
}) {
  const [fieldName,      setFieldName]      = useState(field?.field_name      ?? '')
  const [fieldLabel,     setFieldLabel]     = useState(field?.field_label     ?? '')
  const [fieldType,      setFieldType]      = useState<LeadSourceFieldType>(field?.field_type ?? 'text')
  const [mappedFieldKey, setMappedFieldKey] = useState(field?.mapped_field_key ?? '')
  const [isRequired,     setIsRequired]     = useState(field?.is_required     ?? false)
  const [description,    setDescription]    = useState(field?.description     ?? '')
  const [allowedRaw,     setAllowedRaw]     = useState(
    field?.allowed_values ? field.allowed_values.join('\n') : ''
  )
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => firstRef.current?.focus(), 50) }, [])

  // Auto-generate field_name from label (only when creating)
  useEffect(() => {
    if (!field) {
      setFieldName(
        fieldLabel.trim().toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
      )
    }
  }, [fieldLabel, field])

  // Fetch custom CRM fields (crm_labels)
  const { data: crmFieldsData } = useQuery({
    queryKey: ['crm-lead-fields-for-mapping'],
    queryFn: () => api.get('/crm/lead-fields'),
    staleTime: 5 * 60 * 1000,
  })

  const customCrmFields: CrmFieldOption[] = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = crmFieldsData as any
    const list: { field_key: string; label_name: string }[] = r?.data?.data ?? r?.data ?? []
    return list
      .filter(f => f.field_key)
      .map(f => ({ value: f.field_key, label: f.label_name || f.field_key, group: 'custom' as const }))
  })()

  // Deduplicate: don't show custom fields that share a key with a core field
  const coreKeys = new Set(CORE_CRM_FIELDS.map(f => f.value))
  const filteredCustom = customCrmFields.filter(f => !coreKeys.has(f.value))

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: LeadSourceFieldPayload = {
        field_name:       fieldName.trim(),
        field_label:      fieldLabel.trim(),
        field_type:       fieldType,
        mapped_field_key: mappedFieldKey || null,
        is_required:      isRequired,
        description:      description.trim() || undefined,
        allowed_values:   fieldType === 'list'
          ? allowedRaw.split('\n').map(v => v.trim()).filter(Boolean)
          : undefined,
      }
      if (field) {
        return leadSourceService.updateField(sourceId, field.id, payload)
      }
      return leadSourceService.createField(sourceId, payload)
    },
    onSuccess: () => {
      toast.success(field ? 'Field updated' : 'Field created')
      onSaved()
    },
    onError: () => toast.error(field ? 'Failed to update field' : 'Failed to create field'),
  })

  const isValid =
    fieldLabel.trim().length > 0 &&
    fieldName.trim().length > 0 &&
    (fieldType !== 'list' || allowedRaw.split('\n').filter(Boolean).length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8 p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-base">
            {field ? 'Edit Field' : 'Add Field'}
          </h3>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Field Label */}
        <div className="form-group">
          <label className="label">Field Label *</label>
          <input
            ref={firstRef}
            className="input"
            placeholder="e.g. First Name"
            value={fieldLabel}
            onChange={e => setFieldLabel(e.target.value)}
          />
        </div>

        {/* Field Name (key) */}
        <div className="form-group">
          <label className="label">Field Key *</label>
          <input
            className="input font-mono text-sm"
            placeholder="e.g. first_name"
            value={fieldName}
            onChange={e => setFieldName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
          />
          <p className="text-xs text-slate-400 mt-1">Alphanumeric and underscores only. Auto-generated from label.</p>
        </div>

        {/* Maps to CRM Field */}
        <div className="form-group">
          <label className="label flex items-center gap-1.5">
            <GitMerge size={13} className="text-indigo-400" />
            Maps to CRM Field
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <select
            className="input"
            value={mappedFieldKey}
            onChange={e => setMappedFieldKey(e.target.value)}
          >
            <option value="">— No mapping (use field key as-is) —</option>
            <optgroup label="Core Fields">
              {CORE_CRM_FIELDS.map(f => (
                <option key={f.value} value={f.value}>{f.label} ({f.value})</option>
              ))}
            </optgroup>
            {filteredCustom.length > 0 && (
              <optgroup label="Custom CRM Fields">
                {filteredCustom.map(f => (
                  <option key={f.value} value={f.value}>{f.label} ({f.value})</option>
                ))}
              </optgroup>
            )}
          </select>
          <p className="text-xs text-slate-400 mt-1">
            Select which CRM field this value will be stored under. Useful when the webhook key name differs from the CRM field key.
          </p>
        </div>

        {/* Field Type */}
        <div className="form-group">
          <label className="label">Field Type *</label>
          <div className="flex gap-2">
            {(['text', 'email', 'list'] as LeadSourceFieldType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setFieldType(t)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  fieldType === t
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {TYPE_ICONS[t]}
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Allowed Values (list type only) */}
        {fieldType === 'list' && (
          <div className="form-group">
            <label className="label">Allowed Values * <span className="text-slate-400 font-normal">(one per line)</span></label>
            <textarea
              className="input min-h-[140px] font-mono text-sm"
              placeholder={"Up to $100,000\nBetween $100,000 and $250,000\nBetween $250,000 and $500,000\nGreater than $500,000"}
              value={allowedRaw}
              onChange={e => setAllowedRaw(e.target.value)}
            />
          </div>
        )}

        {/* Required */}
        <div className="flex items-center gap-2">
          <input
            id="is_required"
            type="checkbox"
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
            checked={isRequired}
            onChange={e => setIsRequired(e.target.checked)}
          />
          <label htmlFor="is_required" className="text-sm text-slate-700 cursor-pointer select-none">
            Required field
          </label>
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="label">Description <span className="text-slate-400 font-normal">(optional)</span></label>
          <input
            className="input"
            placeholder="Short description of this field"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!isValid || saveMutation.isPending}
            className="btn-primary flex-1"
          >
            <Save size={14} />
            {saveMutation.isPending ? 'Saving…' : 'Save Field'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function LeadSourceFields() {
  const { sourceId } = useParams<{ sourceId: string }>()
  const sid = Number(sourceId)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { setToolbar } = useDialerHeader()

  const [showModal, setShowModal] = useState(false)
  const [editField, setEditField] = useState<FieldItem | null>(null)

  // Fetch parent source name
  const { data: sourcesData } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: () => leadSourceService.list(),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sourceTitle = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = sourcesData as any
    const list: { id: number; source_title: string }[] =
      r?.data?.data ?? r?.data ?? []
    return list.find(s => s.id === sid)?.source_title ?? `Source #${sid}`
  })()

  // Fetch fields
  const { data: fieldsData, isLoading } = useQuery({
    queryKey: ['lead-source-fields', sid],
    queryFn: () => leadSourceService.listFields(sid),
    enabled: !!sid,
  })

  const fields: FieldItem[] = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = fieldsData as any
    const d = r?.data?.data ?? r?.data
    return Array.isArray(d) ? d : []
  })()

  // Toolbar
  useEffect(() => {
    setToolbar(
      <div className="lt-right" style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        <button
          onClick={() => navigate('/settings/lead-sources')}
          className="lt-b"
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <ArrowLeft size={13} /> Back to Lead Sources
        </button>
        <button
          onClick={() => { setEditField(null); setShowModal(true) }}
          className="lt-b lt-p"
        >
          <Plus size={13} /> Add Field
        </button>
      </div>
    )
    return () => setToolbar(undefined)
  })

  const deleteMutation = useMutation({
    mutationFn: (fieldId: number) => leadSourceService.deleteField(sid, fieldId),
    onSuccess: () => {
      toast.success('Field deleted')
      qc.invalidateQueries({ queryKey: ['lead-source-fields', sid] })
    },
    onError: () => toast.error('Failed to delete field'),
  })

  const handleDelete = async (row: FieldItem) => {
    if (!await showConfirm({
      title: 'Delete Field?',
      message: `Delete "${row.field_label}"? This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    })) return
    deleteMutation.mutate(row.id)
  }

  const handleSaved = () => {
    setShowModal(false)
    setEditField(null)
    qc.invalidateQueries({ queryKey: ['lead-source-fields', sid] })
  }

  const columns: Column<FieldItem>[] = [
    {
      key: 'field_label',
      header: 'Field Label',
      render: row => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
            {TYPE_ICONS[row.field_type]}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{row.field_label}</p>
            <p className="text-xs text-slate-400 font-mono">{row.field_name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'field_type',
      header: 'Type',
      render: row => (
        <Badge variant={row.field_type === 'list' ? 'purple' : row.field_type === 'email' ? 'blue' : 'gray'}>
          {TYPE_LABELS[row.field_type]}
        </Badge>
      ),
    },
    {
      key: 'is_required',
      header: 'Required',
      render: row => (
        <Badge variant={row.is_required ? 'red' : 'gray'}>
          {row.is_required ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'mapped_field_key',
      header: 'Maps to CRM Field',
      render: row => {
        if (!row.mapped_field_key) {
          return <span className="text-slate-400 text-sm font-mono">{row.field_name}</span>
        }
        const coreMatch = CORE_CRM_FIELDS.find(f => f.value === row.mapped_field_key)
        return (
          <span className="inline-flex items-center gap-1 text-sm">
            <GitMerge size={12} className="text-indigo-400 flex-shrink-0" />
            <span className="font-mono text-indigo-700">{row.mapped_field_key}</span>
            {coreMatch && (
              <span className="text-slate-400 text-xs">({coreMatch.label})</span>
            )}
          </span>
        )
      },
    },
    {
      key: 'allowed_values',
      header: 'Allowed Values',
      render: row => {
        if (row.field_type !== 'list' || !row.allowed_values?.length) {
          return <span className="text-slate-400 text-sm">—</span>
        }
        const preview = row.allowed_values.slice(0, 3)
        const extra = row.allowed_values.length - 3
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {preview.map((v, i) => (
              <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs">
                {v}
              </span>
            ))}
            {extra > 0 && (
              <span className="text-xs text-slate-400">+{extra} more</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'description',
      header: 'Description',
      render: row => (
        <span className="text-sm text-slate-500 truncate max-w-[200px] block">
          {row.description || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: row => (
        <RowActions actions={[
          {
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit',
            onClick: () => { setEditField(row); setShowModal(true) },
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
        <FieldModal
          field={editField}
          sourceId={sid}
          onClose={() => { setShowModal(false); setEditField(null) }}
          onSaved={handleSaved}
        />
      )}

      <div className="space-y-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <button
            onClick={() => navigate('/settings/lead-sources')}
            className="hover:text-slate-700 transition-colors"
          >
            Lead Sources
          </button>
          <span>/</span>
          <span className="text-slate-900 font-medium">{sourceTitle}</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Fields</span>
        </div>

        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
          <DataTable
            columns={columns}
            data={fields}
            loading={isLoading}
            keyField="id"
            emptyText="No fields configured. Click 'Add Field' to define fields for this lead source."
          />
        </div>
      </div>
    </>
  )
}
