import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Phone, AlertCircle, CheckCircle2, Tag, MapPin, FileText, Rows3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { listService } from '../../services/list.service'
import type { UploadFormData, ParseResult, ImportResult } from './types'

interface Props {
  formData: UploadFormData
  parseResult: ParseResult
  onImported: (result: ImportResult) => void
  onBack: () => void
}

export function ColumnMapping({ formData, parseResult, onImported, onBack }: Props) {
  // mapping: excelHeader → label_id string ('' = skip)
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    parseResult.headers.forEach(h => { init[h] = '' })
    return init
  })

  // dialColumn: which header is the dialing number (exactly one)
  const [dialColumn, setDialColumn] = useState<string>('')

  const importMutation = useMutation({
    mutationFn: () => {
      const mappingObj: Record<string, number | null> = {}
      parseResult.headers.forEach(h => {
        mappingObj[h] = mapping[h] ? parseInt(mapping[h], 10) : null
      })

      return listService.importWithMapping({
        temp_key:     parseResult.temp_key,
        title:        formData.title,
        campaign:     formData.campaign_id,
        dial_column:  dialColumn,
        duplicate_check: formData.duplicate_check ? '1' : undefined,
        mapping:      JSON.stringify(mappingObj),
      })
    },
    onSuccess: (res: unknown) => {
      const r = res as { data?: { list_id?: number; campaign_id?: number; imported?: number } }
      const d = r?.data
      if (!d?.list_id) {
        toast.error('Import failed. Please try again.')
        return
      }
      onImported({
        list_id:     d.list_id,
        campaign_id: d.campaign_id ?? 0,
        imported:    d.imported ?? 0,
      })
    },
    onError: () => toast.error('Import failed. Please try again.'),
  })

  const setLabel = (header: string, labelId: string) =>
    setMapping(m => ({ ...m, [header]: labelId }))

  const canImport = dialColumn !== ''
  const mappedCount = Object.values(mapping).filter(v => v !== '').length

  return (
    <div className="space-y-4">

      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={importMutation.isPending}
          className="btn-outline flex items-center gap-1.5 text-xs px-3 py-1.5 h-auto"
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <button
          onClick={() => importMutation.mutate()}
          disabled={!canImport || importMutation.isPending}
          className="btn-primary flex items-center gap-1.5 text-xs px-4 py-1.5 h-auto disabled:opacity-50"
        >
          <CheckCircle2 size={13} />
          {importMutation.isPending ? 'Importing…' : `Import ${parseResult.row_count.toLocaleString()} Leads`}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3"
          style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.04)' }}>
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText size={13} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 leading-none">List</p>
            <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{formData.title}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3"
          style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.04)' }}>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Rows3 size={13} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 leading-none">Rows</p>
            <p className="text-xs font-semibold text-slate-800 mt-0.5">{parseResult.row_count.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3"
          style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.04)' }}>
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <MapPin size={13} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 leading-none">Columns</p>
            <p className="text-xs font-semibold text-slate-800 mt-0.5">
              {parseResult.headers.length}
              {mappedCount > 0 && (
                <span className="text-[11px] font-normal text-indigo-600 ml-1">({mappedCount} mapped)</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Mapping Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
        style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)' }}>

        {/* Info banner inside card */}
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex gap-2.5">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-blue-600" />
          <p className="text-[11px] text-blue-700">
            Select the <strong>Dialing</strong> column (required), then optionally map columns to labels.
            Unmapped columns are still imported.
          </p>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[2rem_1fr_5.5rem_1fr] gap-3 items-center px-4 py-2.5 bg-slate-50/80 border-b border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">#</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Column Name</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Dial</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Map to Label</span>
        </div>

        <div className="divide-y divide-slate-100">
          {parseResult.headers.map((header, i) => {
            const isDial = dialColumn === header
            const hasLabel = !!mapping[header]
            return (
              <div
                key={i}
                className={`grid grid-cols-[2rem_1fr_5.5rem_1fr] gap-3 items-center px-4 py-2.5 transition-colors ${
                  isDial ? 'bg-indigo-50/60' : hasLabel ? 'bg-slate-50/40' : 'hover:bg-slate-50/30'
                }`}
              >
                {/* Index */}
                <span className={`w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                  isDial ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                }`}>
                  {i + 1}
                </span>

                {/* Column name */}
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${isDial ? 'text-indigo-800' : 'text-slate-800'}`}>
                    {header}
                  </p>
                  {(isDial || hasLabel) && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {isDial && <span className="text-indigo-500 font-semibold">Dialing Number</span>}
                      {hasLabel && !isDial && (
                        <span className="text-emerald-600 font-semibold">
                          {parseResult.labels.find(l => String(l.id) === mapping[header])?.title ?? 'Mapped'}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Dial toggle */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setDialColumn(isDial ? '' : header)}
                    title={isDial ? 'Remove as dialing column' : 'Set as dialing number column'}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all ${
                      isDial
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    <Phone size={10} />
                    {isDial ? 'Dial' : 'Set'}
                  </button>
                </div>

                {/* Label dropdown */}
                <select
                  value={mapping[header] ?? ''}
                  onChange={e => setLabel(header, e.target.value)}
                  className={`input text-xs py-1.5 ${
                    mapping[header]
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'text-slate-500'
                  }`}
                >
                  <option value="">-- Skip --</option>
                  {parseResult.labels.map(l => (
                    <option key={l.id} value={String(l.id)}>{l.title}</option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>

        {/* Footer legend */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-indigo-600 inline-block" />
            Dialing (required)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
            Mapped
          </span>
        </div>
      </div>

      {/* Dial column not selected warning */}
      {!canImport && (
        <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <AlertCircle size={13} className="flex-shrink-0 text-red-500" />
          <span>Please select a <strong>Dialing</strong> column (phone number) to continue.</span>
        </div>
      )}
    </div>
  )
}
