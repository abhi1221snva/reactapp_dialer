import { useState, useRef, useCallback } from 'react'
import { FileText, Upload, X, Loader2, AlertCircle, File } from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'

interface PdfUploadModalProps {
  onClose: () => void
  onSuccess: (data: Record<string, string>) => void
}

const MAX_FILE_MB = 20
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

export function PdfUploadModal({ onClose, onSuccess }: PdfUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return 'Only PDF files are allowed.'
    }
    if (file.size > MAX_FILE_BYTES) {
      return `File size must be under ${MAX_FILE_MB} MB.`
    }
    return null
  }

  const handleFileSelect = (file: File) => {
    const err = validateFile(file)
    if (err) {
      setError(err)
      setSelectedFile(null)
      return
    }
    setError(null)
    setSelectedFile(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    e.target.value = ''
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setError(null)

    try {
      const res = await crmService.uploadPdfForExtraction(selectedFile)
      const extracted = res.data?.data ?? res.data

      if (!extracted || (typeof extracted === 'object' && Object.keys(extracted).length === 0)) {
        setError('No fields could be extracted from this PDF. Please check the PDF format or mapping settings.')
        setIsUploading(false)
        return
      }

      toast.success('PDF data extracted successfully')
      onSuccess(extracted as Record<string, string>)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to extract data from PDF. Please try again.'
      setError(msg)
    } finally {
      setIsUploading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget && !isUploading) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', padding: '16px 20px' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#6366f1' }}>
                <FileText size={17} className="text-white" />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>
                  Upload PDF
                </h3>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0, marginTop: 2 }}>
                  Extract lead data from a PDF file
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isUploading}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors disabled:opacity-40"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div style={{ padding: '20px' }}>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
              padding: '10px 13px', color: '#991b1b', fontSize: 12, display: 'flex',
              alignItems: 'flex-start', gap: 8, marginBottom: 16,
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && inputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? '#6366f1' : selectedFile ? '#10b981' : '#cbd5e1'}`,
              borderRadius: 14,
              padding: selectedFile ? '16px' : '32px 16px',
              textAlign: 'center',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              background: isDragging ? '#eef2ff' : selectedFile ? '#f0fdf4' : '#fafafa',
              transition: 'all 0.15s ease',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleInputChange}
              style={{ display: 'none' }}
            />

            {selectedFile ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#dcfce7' }}>
                  <File size={18} style={{ color: '#16a34a' }} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedFile.name}
                  </p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0, marginTop: 2 }}>
                    {formatSize(selectedFile.size)}
                  </p>
                </div>
                {!isUploading && (
                  <button
                    onClick={e => { e.stopPropagation(); setSelectedFile(null); setError(null) }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: '#f1f5f9' }}>
                  <Upload size={22} style={{ color: '#94a3b8' }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: 0, marginBottom: 4 }}>
                  Drop PDF here or click to browse
                </p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                  PDF files only, max {MAX_FILE_MB} MB
                </p>
              </>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────��────────────────────────────────── */}
        <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-40 flex items-center gap-2"
            style={{ background: !selectedFile || isUploading ? '#a5b4fc' : '#6366f1' }}
          >
            {isUploading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Extracting data...
              </>
            ) : (
              <>
                <Upload size={13} />
                Extract & Pre-fill
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
