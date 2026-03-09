import { useState, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Upload, X, FileSpreadsheet, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { listService } from '../../services/list.service'
import { campaignService } from '../../services/campaign.service'
import type { UploadFormData, ParseResult } from './types'

interface Props {
  onParsed: (formData: UploadFormData, result: ParseResult) => void
  presetCampaignId?: string
}

export function ListUpload({ onParsed, presetCampaignId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<UploadFormData>({
    title: '',
    campaign_id: presetCampaignId ?? '',
    duplicate_check: false,
    file: null as unknown as File,
  })
  const [dragOver, setDragOver] = useState(false)

  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-all'],
    queryFn: () => campaignService.getAll(),
  })

  const campaigns: Array<{ id: number; title?: string; campaign_name?: string }> =
    campaignsData?.data?.data || campaignsData?.data || []

  const parseMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('campaign', form.campaign_id)
      fd.append('file', form.file)
      if (form.duplicate_check) fd.append('duplicate_check', '1')
      return listService.parseHeaders(fd)
    },
    onSuccess: (res: unknown) => {
      const r = res as { data?: { data?: ParseResult } }
      const parsed = r?.data?.data
      if (!parsed?.temp_key) {
        toast.error('Failed to parse file headers')
        return
      }
      onParsed(form, parsed)
    },
    onError: () => toast.error('Failed to parse file. Please check the format and try again.'),
  })

  const set = <K extends keyof UploadFormData>(key: K, value: UploadFormData[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const handleFileDrop = (file: File) => {
    const allowed = ['.xls', '.xlsx', '.csv']
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowed.includes(ext)) {
      toast.error('Only .xls, .xlsx, and .csv files are allowed')
      return
    }
    set('file', file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileDrop(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileDrop(file)
  }

  const isValid = form.title.trim() && form.campaign_id && form.file

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* List details */}
      <div className="card space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-semibold text-slate-900">List Details</h3>
          <p className="text-xs text-slate-500 mt-0.5">Name and campaign assignment</p>
        </div>

        <div className="form-group">
          <label className="label">List Name <span className="text-red-500">*</span></label>
          <input
            className="input"
            placeholder="e.g. June 2025 Leads"
            value={form.title}
            onChange={e => set('title', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">Assign to Campaign <span className="text-red-500">*</span></label>
          <select
            className="input"
            value={form.campaign_id}
            onChange={e => set('campaign_id', e.target.value)}
          >
            <option value="">— Select Campaign —</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>
                {c.title || c.campaign_name}
              </option>
            ))}
          </select>
        </div>

        <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
          form.duplicate_check ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
        }`}>
          <input
            type="checkbox"
            checked={form.duplicate_check}
            onChange={e => set('duplicate_check', e.target.checked)}
            className="rounded accent-indigo-600 w-4 h-4 flex-shrink-0"
          />
          <div>
            <p className={`text-sm font-semibold ${form.duplicate_check ? 'text-indigo-700' : 'text-slate-700'}`}>
              Duplicate check
            </p>
            <p className="text-xs text-slate-400">Skip leads already in the system</p>
          </div>
        </label>
      </div>

      {/* File upload */}
      <div className="card space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-semibold text-slate-900">Upload File</h3>
          <p className="text-xs text-slate-500 mt-0.5">Supported: .xls, .xlsx, .csv</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 text-sm text-blue-700">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Required format</p>
            <p className="text-xs mt-0.5">
              First row must be column headers. You'll map columns to labels in the next step.
            </p>
          </div>
        </div>

        {form.file ? (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <FileSpreadsheet size={20} className="text-emerald-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{form.file.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{(form.file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={() => {
                set('file', null as unknown as File)
                if (fileRef.current) fileRef.current.value = ''
              }}
              className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
            }`}
          >
            <Upload size={28} className="mx-auto mb-3 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">Drop your file here</p>
            <p className="text-xs text-slate-400 mt-1">or click to browse — .xls, .xlsx, .csv</p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".xls,.xlsx,.csv"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Continue button */}
      <div className="lg:col-span-2">
        <button
          onClick={() => parseMutation.mutate()}
          disabled={!isValid || parseMutation.isPending}
          className="btn-primary w-full"
        >
          {parseMutation.isPending ? 'Reading file…' : 'Continue — Map Columns →'}
        </button>
      </div>
    </div>
  )
}
