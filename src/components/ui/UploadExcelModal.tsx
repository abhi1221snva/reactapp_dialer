import { useRef, useState } from 'react'
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react'

interface Props {
  title: string
  description: string
  onClose: () => void
  onUpload: (file: File) => Promise<unknown>
  isUploading: boolean
}

export function UploadExcelModal({ title, description, onClose, onUpload, isUploading }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  const validateAndSet = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['xls', 'xlsx', 'csv'].includes(ext)) {
      setError('Only .xls, .xlsx, or .csv files are accepted.')
      setSelectedFile(null)
      return
    }
    setError('')
    setSelectedFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndSet(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSet(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <FileSpreadsheet size={15} className="text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">{title}</h3>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-slate-500">{description}</p>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors
            ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}
            ${selectedFile ? 'border-emerald-400 bg-emerald-50' : ''}
          `}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx,.csv"
            className="hidden"
            onChange={handleFileChange}
          />

          {selectedFile ? (
            <>
              <CheckCircle2 size={32} className="text-emerald-500" />
              <div className="text-center">
                <p className="text-sm font-medium text-emerald-700">{selectedFile.name}</p>
                <p className="text-xs text-emerald-500">{(selectedFile.size / 1024).toFixed(1)} KB — click to change</p>
              </div>
            </>
          ) : (
            <>
              <Upload size={32} className="text-slate-300" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600">Drag & drop or click to browse</p>
                <p className="text-xs text-slate-400">.xls, .xlsx, .csv accepted</p>
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-outline flex-1" disabled={isUploading}>
            Cancel
          </button>
          <button
            onClick={() => selectedFile && onUpload(selectedFile)}
            disabled={!selectedFile || isUploading || !!error}
            className="btn-primary flex-1"
          >
            <Upload size={14} />
            {isUploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}
