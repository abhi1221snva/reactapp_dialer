import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
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

type Step = 'choose' | 'existing' | 'upload' | 'mapping'

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
  const campaignId = Number(id)

  const [step, setStep] = useState<Step>('choose')
  const [selectedListIds, setSelectedListIds] = useState<number[]>([])
  const [uploadFormData, setUploadFormData] = useState<UploadFormData | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)

  // Server table state for the "existing" step — must be at top level (hooks rule)
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

  // ── List upload parsed → go to mapping ──
  const handleParsed = (formData: UploadFormData, result: ParseResult) => {
    setUploadFormData(formData)
    setParseResult(result)
    setStep('mapping')
  }

  // ── Mapping complete → navigate back to campaigns ──
  const handleImported = (_result: ImportResult) => {
    toast.success('Leads imported successfully')
    navigate(`/campaigns/${campaignId}/add-review`)
  }

  const getListId = (row: ListRow) => row.list_id ?? row.id
  const getListName = (row: ListRow) => row.l_title ?? row.title ?? row.list_name ?? `List #${getListId(row)}`
  const getLeadCount = (row: ListRow) => row.lead_count ?? row.rowListData ?? 0

  // Columns matching Lists.tsx exactly, with a Select checkbox prepended
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <List size={15} className="text-white" />
          </div>
          <div>
            <p className="font-medium text-slate-900 text-sm">{getListName(row)}</p>
            {row.campaign && (
              <p className="text-xs text-slate-400 mt-0.5">{row.campaign as string}</p>
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
      key: 'is_dialing', header: 'Dialing',
      render: (row) => (
        <Badge variant={row.is_dialing === 1 ? 'blue' : 'gray'}>
          {row.is_dialing === 1 ? 'Yes' : 'No'}
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

  // ─────────────────────────────────────────────
  //  Render: Column Mapping step
  // ─────────────────────────────────────────────
  if (step === 'mapping' && uploadFormData && parseResult) {
    return (
      <div className="w-full space-y-4 animate-fadeIn">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setStep('upload')} className="btn-ghost p-2 rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-none">Map Columns</h1>
            <p className="text-xs text-slate-500 mt-1">Map your file columns to lead fields</p>
          </div>
        </div>
        <ColumnMapping
          formData={uploadFormData}
          parseResult={parseResult}
          onImported={handleImported}
          onBack={() => setStep('upload')}
        />
      </div>
    )
  }

  // ─────────────────────────────────────────────
  //  Render: Upload New List step
  // ─────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="w-full space-y-4 animate-fadeIn">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setStep('choose')} className="btn-ghost p-2 rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-none">Upload New List</h1>
            <p className="text-xs text-slate-500 mt-1">Upload a CSV or Excel file with leads</p>
          </div>
        </div>
        <ListUpload onParsed={handleParsed} presetCampaignId={String(campaignId)} />
      </div>
    )
  }

  // ─────────────────────────────────────────────
  //  Render: Select Existing List step
  // ─────────────────────────────────────────────
  if (step === 'existing') {
    return (
      <div className="w-full space-y-4 animate-fadeIn">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setStep('choose')} className="btn-ghost p-2 rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-none">Select Existing List</h1>
            <p className="text-xs text-slate-500 mt-1">Choose one or more lists to attach to this campaign</p>
          </div>
        </div>

        {/* Selection Summary Bar */}
        {selectedListIds.length > 0 && (
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-indigo-600 flex-shrink-0" />
              <span className="text-sm font-medium text-indigo-800">
                {selectedListIds.length} list{selectedListIds.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedListIds([])}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear selection
            </button>
          </div>
        )}

        {/* Exact same ServerDataTable as Lists page */}
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
          searchPlaceholder="Search lists by name…"
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

        {selectedListIds.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="flex-shrink-0" />
            <span>Select at least one list to continue.</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep('choose')}
            className="btn-outline flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <button
            type="button"
            onClick={() => assignMutation.mutate()}
            disabled={selectedListIds.length === 0 || assignMutation.isPending}
            className="btn-primary flex-1"
          >
            <CheckCircle2 size={15} />
            {assignMutation.isPending
              ? 'Assigning…'
              : `Assign ${selectedListIds.length > 0 ? `${selectedListIds.length} ` : ''}List${selectedListIds.length !== 1 ? 's' : ''} to Campaign`}
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  //  Render: Choose step (default)
  // ─────────────────────────────────────────────
  return (
    <div className="w-full space-y-4 animate-fadeIn">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/campaigns')}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm flex-shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-none">Attach Leads</h1>
            <p className="text-xs text-slate-400 mt-0.5">Campaign #{campaignId} — add a lead list to start dialing</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate(`/campaigns/${campaignId}/add-review`)}
          className="btn-primary px-6">
          Next: Review
          <ArrowRight size={15} />
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">1</span>
          Details
          <CheckCircle2 size={13} className="text-emerald-500" />
        </span>
        <span className="w-6 h-px bg-slate-200" />
        <span className="flex items-center gap-1.5 text-indigo-600 font-semibold">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
          Attach Leads
        </span>
        <span className="w-6 h-px bg-slate-200" />
        <span className="flex items-center gap-1.5 text-slate-400 font-medium">
          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-bold">3</span>
          Review
        </span>
      </div>

      {/* Two option cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Select Existing List */}
        <button
          type="button"
          onClick={() => setStep('existing')}
          className="group bg-white rounded-2xl border border-slate-200 p-6 text-left hover:border-indigo-300 hover:shadow-md transition-all"
          style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)' }}
        >
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
            <List size={20} className="text-indigo-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">Select Existing List</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Choose from lists already in the system and attach them to this campaign.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:gap-2 transition-all">
            Browse lists
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </button>

        {/* Upload New List */}
        <button
          type="button"
          onClick={() => setStep('upload')}
          className="group bg-white rounded-2xl border border-slate-200 p-6 text-left hover:border-indigo-300 hover:shadow-md transition-all"
          style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)' }}
        >
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
            <Upload size={20} className="text-indigo-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">Upload New List</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Upload a CSV or Excel file, map columns, and import leads directly to this campaign.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:gap-2 transition-all">
            Upload file
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </button>
      </div>

      {/* Skip link */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => navigate(`/campaigns/${campaignId}/add-review`)}
          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
        >
          Skip for now — I'll add leads later
        </button>
      </div>
    </div>
  )
}
