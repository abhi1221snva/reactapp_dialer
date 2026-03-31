import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { List, Upload, CheckCircle2, AlertCircle, ArrowLeft, X } from 'lucide-react'
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

type AddStep = 'choose' | 'existing' | 'upload' | 'mapping'

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

interface Props {
  campaignId: number
  onListsUpdated?: () => void
}

export function CampaignListsSection({ campaignId, onListsUpdated }: Props) {
  const queryClient = useQueryClient()

  // ── Add-lists flow
  const [addStep, setAddStep] = useState<AddStep>('choose')
  const [selectedListIds, setSelectedListIds] = useState<number[]>([])
  const [uploadFormData, setUploadFormData] = useState<UploadFormData | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)

  // ── Table state — must be at top level (hooks rule)
  const listTable = useServerTable({ defaultLimit: 15 })

  // ── Fetch attached lists for pre-ticking
  const { data: attachedListsData } = useQuery({
    queryKey: ['campaign-lists', campaignId],
    queryFn: () => listService.listByCampaign(campaignId, { page: 1, limit: 500, search: '', filters: {} }),
    enabled: Boolean(campaignId),
  })

  // ── Helpers
  const getListId   = (row: ListRow) => row.list_id ?? row.id
  const getListName = (row: ListRow) => row.l_title ?? row.title ?? row.list_name ?? `List #${getListId(row)}`
  const getLeadCount = (row: ListRow) => row.lead_count ?? row.rowListData ?? 0

  const toggleSelect = (lid: number) =>
    setSelectedListIds(prev =>
      prev.includes(lid) ? prev.filter(i => i !== lid) : [...prev, lid]
    )

  // ── Go to existing step with pre-ticked attached lists
  const goToExisting = () => {
    const attached = (attachedListsData as { data?: { data?: ListRow[] } })?.data?.data ?? []
    const ids = attached.map(r => getListId(r))
    setSelectedListIds(ids)
    setAddStep('existing')
  }

  // ── Mutations
  const assignMutation = useMutation({
    mutationFn: () => campaignService.assignLists(campaignId, selectedListIds),
    onSuccess: () => {
      toast.success('Lists assigned to campaign')
      setSelectedListIds([])
      queryClient.invalidateQueries({ queryKey: ['campaign-lists', campaignId] })
      if (onListsUpdated) onListsUpdated()
      else setAddStep('choose')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to assign lists')
    },
  })

  // ── Upload handlers
  const handleParsed = (formData: UploadFormData, result: ParseResult) => {
    setUploadFormData(formData)
    setParseResult(result)
    setAddStep('mapping')
  }

  const handleImported = (_result: ImportResult) => {
    toast.success('Leads imported successfully')
    queryClient.invalidateQueries({ queryKey: ['campaign-lists', campaignId] })
    if (onListsUpdated) onListsUpdated()
    else setAddStep('choose')
  }

  // ── Columns: "Select Existing" step
  const selectColumns: Column<ListRow>[] = [
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
            onClick={(e) => { e.stopPropagation(); toggleSelect(lid) }}
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
  //  Mapping step
  // ─────────────────────────────────────────────
  if (addStep === 'mapping' && uploadFormData && parseResult) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
          <button type="button" onClick={() => setAddStep('upload')} className="btn-ghost p-2 rounded-lg">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="text-sm font-bold text-slate-800 leading-none">Map Columns</h3>
            <p className="text-xs text-slate-400 mt-0.5">Map your file columns to lead fields</p>
          </div>
        </div>
        <div className="p-5">
          <ColumnMapping
            formData={uploadFormData}
            parseResult={parseResult}
            onImported={handleImported}
            onBack={() => setAddStep('upload')}
          />
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  //  Upload step
  // ─────────────────────────────────────────────
  if (addStep === 'upload') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
          <button type="button" onClick={() => setAddStep('choose')} className="btn-ghost p-2 rounded-lg">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="text-sm font-bold text-slate-800 leading-none">Upload New List</h3>
            <p className="text-xs text-slate-400 mt-0.5">Upload a CSV or Excel file with leads</p>
          </div>
        </div>
        <div className="p-5">
          <ListUpload onParsed={handleParsed} presetCampaignId={String(campaignId)} />
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  //  Select Existing step
  // ─────────────────────────────────────────────
  if (addStep === 'existing') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setAddStep('choose')} className="btn-ghost p-2 rounded-lg">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h3 className="text-sm font-bold text-slate-800 leading-none">Select Existing List</h3>
              <p className="text-xs text-slate-400 mt-0.5">Choose one or more lists to attach</p>
            </div>
          </div>
          <button type="button" onClick={() => { setAddStep('choose'); setSelectedListIds([]) }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {selectedListIds.length > 0 && (
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-indigo-600 flex-shrink-0" />
                <span className="text-sm font-medium text-indigo-800">
                  {selectedListIds.length} list{selectedListIds.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <button type="button" onClick={() => setSelectedListIds([])}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                Clear
              </button>
            </div>
          )}

          <ServerDataTable<ListRow>
            queryKey={['lists-attach-edit']}
            queryFn={(params) => listService.list(params)}
            dataExtractor={(res: unknown) => {
              const r = res as { data?: { data?: ListRow[] } }
              return r?.data?.data ?? []
            }}
            totalExtractor={(res: unknown) => {
              const r = res as { data?: { total_rows?: number } }
              return r?.data?.total_rows ?? 0
            }}
            columns={selectColumns}
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
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>Select at least one list to continue.</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setAddStep('choose'); setSelectedListIds([]) }}
              className="btn-outline flex items-center gap-2">
              <ArrowLeft size={15} />
              Back
            </button>
            <button
              type="button"
              onClick={() => assignMutation.mutate()}
              disabled={selectedListIds.length === 0 || assignMutation.isPending}
              className="btn-primary flex-1"
            >
              <CheckCircle2 size={14} />
              {assignMutation.isPending
                ? 'Assigning…'
                : `Assign ${selectedListIds.length > 0 ? `${selectedListIds.length} ` : ''}List${selectedListIds.length !== 1 ? 's' : ''} to Campaign`}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  //  Choose step (default)
  // ─────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-slate-50/80 to-transparent border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ background: '#6366f118', color: '#6366f1' }}>
          <List size={15} />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Update Lists</span>
          <p className="text-[11px] text-slate-400 mt-0.5">Select how you want to manage leads</p>
        </div>
      </div>
      <div className="p-5 grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={goToExisting}
          className="group bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-indigo-300 hover:shadow-md transition-all"
          style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
            <List size={18} className="text-indigo-600" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900 mb-1">Select Existing List</h4>
          <p className="text-xs text-slate-500 leading-relaxed">Choose from lists already in the system.</p>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:gap-2 transition-all">
            Browse lists
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setAddStep('upload')}
          className="group bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-indigo-300 hover:shadow-md transition-all"
          style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
            <Upload size={18} className="text-indigo-600" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900 mb-1">Upload New List</h4>
          <p className="text-xs text-slate-500 leading-relaxed">Upload a CSV or Excel file with leads.</p>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:gap-2 transition-all">
            Upload file
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </button>
      </div>
    </div>
  )
}
