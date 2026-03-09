import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Tag, AlertCircle, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { listService } from '../../services/list.service'
import type { UploadFormData, ParseResult, ImportResult } from './types'

interface Props {
  formData: UploadFormData
  parseResult: ParseResult
  onImported: (result: ImportResult) => void
  onBack: () => void
}

export function ListMapping({ formData, parseResult, onImported, onBack }: Props) {
  // mapping: { [excelHeader]: label_id (string) | '' for skip }
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    parseResult.headers.forEach(h => { initial[h] = '' })
    return initial
  })

  const importMutation = useMutation({
    mutationFn: () => {
      // Convert '' to null, numeric strings to numbers for the server
      const mappingObj: Record<string, number | null> = {}
      parseResult.headers.forEach(h => {
        mappingObj[h] = mapping[h] ? parseInt(mapping[h], 10) : null
      })

      return listService.importWithMapping({
        temp_key:    parseResult.temp_key,
        title:       formData.title,
        campaign:    formData.campaign_id,
        dial_column: '',
        duplicate_check: formData.duplicate_check ? '1' : undefined,
        mapping:     JSON.stringify(mappingObj),
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
        list_id: d.list_id,
        campaign_id: d.campaign_id ?? 0,
        imported: d.imported ?? 0,
      })
    },
    onError: () => toast.error('Import failed. Please try again.'),
  })

  const setCol = (header: string, labelId: string) =>
    setMapping(m => ({ ...m, [header]: labelId }))

  // Warn if no column is mapped to a phone label
  const hasPhoneMapping = parseResult.labels.some(l =>
    l.title.toLowerCase().includes('phone') &&
    Object.values(mapping).includes(String(l.id))
  )

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 text-sm text-amber-700">
        <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Map your columns to labels</p>
          <p className="text-xs mt-0.5">
            Assign a label to each column. Columns mapped to a <strong>Phone</strong> label
            will be auto-sanitized. Leave columns as <em>Skip</em> to import without a label.
          </p>
        </div>
      </div>

      {!hasPhoneMapping && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <p>
            No column is mapped to a <strong>Phone</strong> label yet. Calls require a phone number column.
          </p>
        </div>
      )}

      {/* Summary bar */}
      <div className="flex flex-wrap gap-3 text-sm text-slate-500">
        <span className="font-medium text-slate-700">{formData.title}</span>
        <span>·</span>
        <span>{parseResult.headers.length} columns</span>
        <span>·</span>
        <span>{parseResult.row_count.toLocaleString()} rows</span>
      </div>

      {/* Mapping table */}
      <div className="card overflow-hidden p-0">
        <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-2">
          <Tag size={15} className="text-indigo-500" />
          <h3 className="font-semibold text-slate-900 text-sm">Column Mapping</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {parseResult.headers.map((header, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              {/* Column index badge */}
              <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>

              {/* Excel header name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{header}</p>
                <p className="text-xs text-slate-400">Excel column {String.fromCharCode(65 + i)}</p>
              </div>

              {/* Label dropdown */}
              <select
                value={mapping[header] ?? ''}
                onChange={e => setCol(header, e.target.value)}
                className={`input w-48 text-sm ${
                  mapping[header]
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                    : 'text-slate-500'
                }`}
              >
                <option value="">— Skip (no label) —</option>
                {parseResult.labels.map(l => (
                  <option key={l.id} value={String(l.id)}>{l.title}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

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
          disabled={importMutation.isPending}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={16} />
          {importMutation.isPending ? 'Importing…' : 'Import List'}
        </button>
      </div>
    </div>
  )
}
