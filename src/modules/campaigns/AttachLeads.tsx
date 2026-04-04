import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, List, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { listService } from '../../services/list.service'
import { campaignService } from '../../services/campaign.service'
import { ListUpload } from '../lists/ListUpload'
import { ColumnMapping } from '../lists/ColumnMapping'
import type { UploadFormData, ParseResult, ImportResult } from '../lists/types'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { formatDateTime } from '../../utils/format'
import { useServerTable } from '../../hooks/useServerTable'
import { useDialerHeader } from '../../layouts/DialerLayout'

type Step = 'choose' | 'existing' | 'upload' | 'mapping'

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: 'choose',   label: '1. Choose' },
  { key: 'existing', label: '2. Select' },
  { key: 'upload',   label: '2. Upload' },
  { key: 'mapping',  label: '3. Map' },
]

interface ListRow {
  id: number
  list_id?: number
  title?: string
  list_name?: string
  l_title?: string
  lead_count?: number
  rowListData?: number
  is_active?: number
  is_dialing?: number
  campaign?: string
  campaign_id?: number
  updated_at?: string
  created_at?: string
  [key: string]: unknown
}

export function AttachLeads() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setToolbar, headerKey } = useDialerHeader()
  const campaignId = Number(id)

  const [step, setStep] = useState<Step>('choose')
  const [selectedListIds, setSelectedListIds] = useState<number[]>([])
  const [uploadFormData, setUploadFormData] = useState<UploadFormData | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)

  const { data: campaignData } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignService.getById(campaignId),
    enabled: !!campaignId,
  })
  const campaignRaw = (campaignData as { data?: { data?: { title?: string; campaign_name?: string } } })?.data?.data
  const campaignName = campaignRaw?.title || campaignRaw?.campaign_name || ''

  const listTable = useServerTable({ defaultLimit: 15 })

  // ── Assign existing lists to campaign ──
  const assignMutation = useMutation({
    mutationFn: () => campaignService.assignLists(campaignId, selectedListIds),
    onSuccess: () => {
      toast.success('Lists assigned to campaign successfully')
      navigate(`/campaigns/${campaignId}/add-review`)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to assign lists')
    },
  })

  const toggleList = (listId: number) =>
    setSelectedListIds(prev =>
      prev.includes(listId) ? prev.filter(i => i !== listId) : [...prev, listId]
    )

  const handleParsed = (formData: UploadFormData, result: ParseResult) => {
    setUploadFormData(formData)
    setParseResult(result)
    setStep('mapping')
  }

  const handleImported = (_result: ImportResult) => {
    toast.success('Leads imported successfully')
    navigate(`/campaigns/${campaignId}/add-review`)
  }

  const goBack = () => {
    if (step === 'mapping') setStep('upload')
    else if (step === 'existing' || step === 'upload') setStep('choose')
    else navigate(`/campaigns/${campaignId}`)
  }

  const getListId = (row: ListRow) => row.list_id ?? row.id
  const getListName = (row: ListRow) => row.l_title ?? row.title ?? row.list_name ?? `List #${getListId(row)}`
  const getLeadCount = (row: ListRow) => row.lead_count ?? row.rowListData ?? 0

  // ── Toolbar ──
  useEffect(() => {
    // Step pills to show
    const visibleSteps = step === 'upload' || step === 'mapping'
      ? [STEP_LABELS[0], STEP_LABELS[2], STEP_LABELS[3]]
      : [STEP_LABELS[0], STEP_LABELS[1]]

    const stepIdx = visibleSteps.findIndex(s => s.key === step)

    setToolbar(
      <>
        <button className="lt-b" onClick={goBack}>
          <ArrowLeft size={13} />
          Back
        </button>

        <span className="lt-desc">
          <strong style={{ color: '#94a3b8', fontWeight: 600, marginRight: 4 }}>Campaign:</strong>
          {campaignName || `#${campaignId}`}
        </span>

        {step === 'existing' && selectedListIds.length > 0 && (
          <span className="lt-desc" style={{ background: '#eef2ff', borderColor: '#c7d2fe', color: '#4338ca' }}>
            {selectedListIds.length} list{selectedListIds.length !== 1 ? 's' : ''} selected
          </span>
        )}

        <div className="lt-right">
          {/* Step pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {visibleSteps.map((s, i) => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {i > 0 && <div style={{ width: 16, height: 1, background: '#e2e8f0' }} />}
                <span style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  background: step === s.key ? '#6366f1' : stepIdx > i ? '#e0e7ff' : '#f1f5f9',
                  color: step === s.key ? '#fff' : stepIdx > i ? '#4338ca' : '#94a3b8',
                  whiteSpace: 'nowrap',
                }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="lt-divider" />

          <button className="lt-b lt-p" onClick={() => navigate(`/campaigns/${campaignId}/add-review`)}>
            Next: Review
            <ArrowRight size={13} />
          </button>
        </div>
      </>
    )
  }, [headerKey, step, selectedListIds.length, campaignName])

  // ── List columns ──
  const listColumns: Column<ListRow>[] = [
    {
      key: 'select',
      header: '',
      headerClassName: 'w-10 text-center',
      className: 'w-10 text-center',
      render: (row) => {
        const lid = getListId(row)
        const isSelected = selectedListIds.includes(lid)
        return (
          <div
            className={`w-4 h-4 rounded border-2 flex items-center justify-center mx-auto cursor-pointer transition-all ${
              isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white hover:border-indigo-400'
            }`}
            onClick={(e) => { e.stopPropagation(); toggleList(lid) }}
          >
            {isSelected && (
              <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        )
      },
    },
    {
      key: 'name', header: 'List Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <List size={13} className="text-white" />
          </div>
          <div>
            <p className="font-medium text-slate-900 text-sm">{getListName(row)}</p>
            {row.campaign && (
              <p className="text-[11px] text-slate-400">{row.campaign as string}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'lead_count', header: 'Leads',
      render: (row) => (
        <span className="text-sm font-medium text-slate-700">
          {Number(getLeadCount(row)).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'is_active', header: 'Status',
      render: (row) => (
        <Badge variant={row.is_active === 1 ? 'green' : 'gray'}>
          {row.is_active === 1 ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'updated_at', header: 'Updated',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.updated_at ? formatDateTime(row.updated_at as string) : '—'}
        </span>
      ),
    },
  ]

  // ────────────────────────────────────────────────
  //  Render: Column Mapping step
  // ────────────────────────────────────────────────
  if (step === 'mapping' && uploadFormData && parseResult) {
    return (
      <div className="max-w-4xl mx-auto">
        <ColumnMapping
          formData={uploadFormData}
          parseResult={parseResult}
          onImported={handleImported}
          onBack={() => setStep('upload')}
        />
      </div>
    )
  }

  // ────────────────────────────────────────────────
  //  Render: Upload New List step
  // ────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="max-w-4xl mx-auto">
        <ListUpload onParsed={handleParsed} presetCampaignId={String(campaignId)} />
      </div>
    )
  }

  // ────────────────────────────────────────────────
  //  Render: Select Existing List step
  // ────────────────────────────────────────────────
  if (step === 'existing') {
    return (
      <div className="space-y-3">
        {/* Selection Summary */}
        {selectedListIds.length > 0 && (
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-indigo-600 flex-shrink-0" />
              <span className="text-xs font-medium text-indigo-800">
                {selectedListIds.length} list{selectedListIds.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedListIds([])}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear
            </button>
          </div>
        )}

        <ServerDataTable<ListRow>
          queryKey={['lists-attach']}
          queryFn={(params) => listService.list(params)}
          dataExtractor={(res: unknown) => {
            const r = res as { data?: { data?: ListRow[] } }
            return r?.data?.data ?? []
          }}
          totalExtractor={(res: unknown) => {
            const r = res as { data?: { total_rows?: number } }
            return r?.data?.total_rows ?? 0
          }}
          columns={listColumns}
          keyField="id"
          searchPlaceholder="Search lists…"
          filters={[
            { key: 'is_active', label: 'All Status', options: [
              { value: '1', label: 'Active' },
              { value: '0', label: 'Inactive' },
            ]},
          ]}
          emptyText="No lists found"
          emptyIcon={<List size={40} />}
          search={listTable.search}
          onSearchChange={listTable.setSearch}
          activeFilters={listTable.filters}
          onFilterChange={listTable.setFilter}
          onResetFilters={listTable.resetFilters}
          hasActiveFilters={listTable.hasActiveFilters}
          page={listTable.page}
          limit={listTable.limit}
          onPageChange={listTable.setPage}
        />

        {/* Assign button */}
        <div className="flex items-center justify-end gap-3">
          {selectedListIds.length === 0 && (
            <span className="flex items-center gap-1.5 text-[11px] text-amber-600">
              <AlertCircle size={12} />
              Select at least one list
            </span>
          )}
          <button
            type="button"
            onClick={() => assignMutation.mutate()}
            disabled={selectedListIds.length === 0 || assignMutation.isPending}
            className="btn-primary flex items-center gap-2 text-xs px-4 py-2 h-auto disabled:opacity-50"
          >
            <CheckCircle2 size={13} />
            {assignMutation.isPending
              ? 'Assigning…'
              : `Assign ${selectedListIds.length > 0 ? `${selectedListIds.length} ` : ''}List${selectedListIds.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────
  //  Render: Choose step (default)
  // ────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* Two option cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Select Existing List */}
        <button
          type="button"
          onClick={() => setStep('existing')}
          className="group bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-indigo-300 hover:shadow-md transition-all"
          style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
            <List size={18} className="text-indigo-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Select Existing List</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Choose from lists already in the system and attach them to this campaign.
          </p>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 group-hover:gap-2 transition-all">
            Browse lists <ArrowRight size={12} />
          </div>
        </button>

        {/* Upload New List */}
        <button
          type="button"
          onClick={() => setStep('upload')}
          className="group bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-indigo-300 hover:shadow-md transition-all"
          style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
            <Upload size={18} className="text-indigo-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Upload New List</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Upload a CSV or Excel file, map columns, and import leads directly.
          </p>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 group-hover:gap-2 transition-all">
            Upload file <ArrowRight size={12} />
          </div>
        </button>
      </div>

      {/* Skip link */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => navigate(`/campaigns/${campaignId}/add-review`)}
          className="text-[11px] text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
        >
          Skip for now — I'll add leads later
        </button>
      </div>
    </div>
  )
}
