import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, List, Upload, CheckCircle2, AlertCircle, Users, Hash, Radio, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { listService } from '../../services/list.service'
import { campaignService } from '../../services/campaign.service'
import { ListUpload } from '../lists/ListUpload'
import { ColumnMapping } from '../lists/ColumnMapping'
import type { UploadFormData, ParseResult, ImportResult } from '../lists/types'

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

  // ── Fetch all available lists (for "select existing" step) ──
  const { data: listsData, isLoading: loadingLists } = useQuery({
    queryKey: ['lists-all'],
    queryFn: () => listService.getAll(),
    enabled: step === 'existing',
  })
  const lists: ListRow[] =
    (listsData as { data?: { data?: unknown[] } })?.data?.data as ListRow[] ?? []

  // ── Assign existing lists to campaign ──
  const assignMutation = useMutation({
    mutationFn: () => campaignService.assignLists(campaignId, selectedListIds),
    onSuccess: () => {
      toast.success('Lists assigned to campaign successfully')
      navigate('/campaigns')
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
    navigate('/campaigns')
  }

  const getListId = (row: ListRow) => row.list_id ?? row.id
  const getListName = (row: ListRow) => row.l_title ?? row.title ?? row.list_name ?? `List #${getListId(row)}`
  const getLeadCount = (row: ListRow) => row.lead_count ?? row.rowListData ?? 0

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

        {/* List Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
          style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)' }}>

          {/* Panel Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <List size={15} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Available Lists</span>
              {!loadingLists && (
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {lists.length}
                </span>
              )}
            </div>
            {lists.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const allIds = lists.map(l => getListId(l))
                  const allSelected = allIds.every(id => selectedListIds.includes(id))
                  setSelectedListIds(allSelected ? [] : allIds)
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {lists.map(l => getListId(l)).every(id => selectedListIds.includes(id))
                  ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {loadingLists ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading lists…</p>
            </div>
          ) : lists.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <List size={24} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">No lists available</p>
              <p className="text-xs text-slate-400">Upload a new list to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {lists.map(list => {
                const lid = getListId(list)
                const isSelected = selectedListIds.includes(lid)
                const name = getListName(list)
                const leads = getLeadCount(list)
                const isActive = list.is_active === 1
                const isDialing = list.is_dialing === 1

                return (
                  <label
                    key={lid}
                    className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors select-none ${
                      isSelected
                        ? 'bg-indigo-50/80'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                    }`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleList(lid)}
                        className="sr-only"
                      />
                      {isSelected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>

                    {/* List Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected
                        ? 'bg-indigo-100'
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    }`}>
                      <List size={16} className={isSelected ? 'text-indigo-600' : 'text-white'} />
                    </div>

                    {/* List Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-indigo-800' : 'text-slate-800'}`}>
                          {name}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          <Hash size={9} />
                          {lid}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {/* Lead count */}
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Users size={11} className="text-slate-400" />
                          <span className="font-medium text-slate-700">{Number(leads).toLocaleString()}</span>
                          <span>leads</span>
                        </span>

                        {/* Campaign */}
                        {list.campaign && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Radio size={11} className="text-slate-400" />
                            <span className="truncate max-w-[120px]">{list.campaign}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {isActive ? (
                          <><ToggleRight size={10} /> Active</>
                        ) : (
                          <><ToggleLeft size={10} /> Inactive</>
                        )}
                      </span>
                      {isDialing && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Dialing
                        </span>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {selectedListIds.length === 0 && lists.length > 0 && (
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
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/campaigns')} className="btn-ghost p-2 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-none">Attach Leads</h1>
          <p className="text-xs text-slate-500 mt-1">Campaign #{campaignId} — add a lead list to start dialing</p>
        </div>
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
          onClick={() => navigate('/campaigns')}
          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
        >
          Skip for now — I'll add leads later
        </button>
      </div>
    </div>
  )
}
