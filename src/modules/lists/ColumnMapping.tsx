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

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center gap-3"
          style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.04)' }}>
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText size={15} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 leading-none">List Name</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate max-w-[140px]">{formData.title}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center gap-3"
          style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.04)' }}>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Rows3 size={15} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 leading-none">Total Rows</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{parseResult.row_count.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center gap-3"
          style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.04)' }}>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <MapPin size={15} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 leading-none">Columns</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">
              {parseResult.headers.length}
              {mappedCount > 0 && (
                <span className="text-xs font-normal text-indigo-600 ml-1">({mappedCount} mapped)</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-blue-600" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Map your columns</p>
          <p className="text-xs mt-0.5 text-blue-700">
            Select the <strong>Dialing</strong> column (required — the phone number column), then optionally map columns to labels for search and display.
            Unmapped columns are still imported.
          </p>
        </div>
      </div>

      {/* Mapping Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
        style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)' }}>

        {/* Table Header */}
        <div className="grid grid-cols-[2.5rem_1fr_7rem_1fr] gap-4 items-center px-5 py-3 bg-slate-50/80 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">#</span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Column Name</span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Dial Column</span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Map to Label</span>
        </div>

        <div className="divide-y divide-slate-100">
          {parseResult.headers.map((header, i) => {
            const isDial = dialColumn === header
            const hasLabel = !!mapping[header]
            return (
              <div
                key={i}
                className={`grid grid-cols-[2.5rem_1fr_7rem_1fr] gap-4 items-center px-5 py-3.5 transition-colors ${
                  isDial ? 'bg-indigo-50/60' : hasLabel ? 'bg-slate-50/40' : 'hover:bg-slate-50/30'
                }`}
              >
                {/* Index */}
                <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                  isDial ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                }`}>
                  {i + 1}
                </span>

                {/* Column name */}
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${isDial ? 'text-indigo-800' : 'text-slate-800'}`}>
                    {header}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Column {String.fromCharCode(65 + i)}
                    {isDial && <span className="ml-1.5 text-indigo-500 font-semibold">· Dialing Number</span>}
                    {hasLabel && !isDial && (
                      <span className="ml-1.5 text-emerald-600 font-semibold">
                        · {parseResult.labels.find(l => String(l.id) === mapping[header])?.title ?? 'Mapped'}
                      </span>
                    )}
                  </p>
                </div>

                {/* Dial toggle */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setDialColumn(isDial ? '' : header)}
                    title={isDial ? 'Remove as dialing column' : 'Set as dialing number column'}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isDial
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    <Phone size={11} />
                    {isDial ? 'Dial' : 'Set'}
                  </button>
                </div>

                {/* Label dropdown */}
                <select
                  value={mapping[header] ?? ''}
                  onChange={e => setLabel(header, e.target.value)}
                  className={`input text-sm py-1.5 ${
                    mapping[header]
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'text-slate-500'
                  }`}
                >
                  <option value="">— Skip (no label) —</option>
                  {parseResult.labels.map(l => (
                    <option key={l.id} value={String(l.id)}>{l.title}</option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dial column not selected warning */}
      {!canImport && (
        <div className="flex items-center gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="flex-shrink-0 text-red-500" />
          <span>Please select a <strong>Dialing</strong> column (the phone number column) to continue.</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={importMutation.isPending}
          className="btn-outline flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={() => importMutation.mutate()}
          disabled={!canImport || importMutation.isPending}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={16} />
          {importMutation.isPending ? 'Importing…' : `Import ${parseResult.row_count.toLocaleString()} Leads`}
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-5 text-xs text-slate-400 pb-2">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-indigo-600 inline-block" />
          Dialing column (required)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300 inline-block" />
          Mapped to label
        </span>
        <span className="flex items-center gap-1.5">
          <Tag size={12} />
          Label = semantic field for search &amp; display
        </span>
      </div>
    </div>
  )
}
