import { useState, useRef, useCallback } from 'react'
import type { ChangeEvent, DragEvent as ReactDragEvent, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Upload, FileText, X, Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { parseValues, type DocumentType } from './CrmDocumentTypesManager'

// ── Defaults ───────────────────────────────────────────────────────────────────
export const DEFAULT_ALLOWED_MIMES = new Set<string>([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png',
  // Some browsers/OS report these for Office files
  'application/zip', 'application/octet-stream', 'application/x-cfb',
])
export const DEFAULT_ALLOWED_EXTS = new Set<string>(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'])
export const DEFAULT_ALLOWED_EXT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png'
export const DEFAULT_MAX_FILE_MB = 20
export const DEFAULT_MAX_FILES = 10

// ── Helpers (exported for reuse) ───────────────────────────────────────────────
export function getFileExt(name: string): string {
  return (name.split('.').pop() ?? '').toLowerCase()
}

export function formatBytes(b: number): string {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

export function getFileType(p: string | null | undefined): 'pdf' | 'image' | 'other' {
  if (!p) return 'other'
  const e = (p.split('.').pop() ?? '').toLowerCase()
  if (e === 'pdf') return 'pdf'
  if (['jpg', 'jpeg', 'png'].includes(e)) return 'image'
  return 'other'
}

export function getFileIcon(p: string | null | undefined): { bg: string; color: string } {
  const t = getFileType(p)
  if (t === 'pdf') return { bg: 'bg-red-50', color: 'text-red-500' }
  if (t === 'image') return { bg: 'bg-sky-50', color: 'text-sky-500' }
  return { bg: 'bg-emerald-50', color: 'text-emerald-600' }
}

export function validateFiles(
  files: File[],
  opts?: {
    maxFiles?: number
    maxFileMb?: number
    allowedMimes?: Set<string>
    allowedExts?: Set<string>
  }
): { valid: File[]; errors: string[] } {
  const maxFiles = opts?.maxFiles ?? DEFAULT_MAX_FILES
  const maxFileMb = opts?.maxFileMb ?? DEFAULT_MAX_FILE_MB
  const allowedMimes = opts?.allowedMimes ?? DEFAULT_ALLOWED_MIMES
  const allowedExts = opts?.allowedExts ?? DEFAULT_ALLOWED_EXTS

  const valid: File[] = []
  const errors: string[] = []

  if (files.length > maxFiles) {
    errors.push(`Maximum ${maxFiles} files allowed.`)
    return { valid, errors }
  }
  for (const f of files) {
    const ext = getFileExt(f.name)
    const mimeOk = allowedMimes.has(f.type) || !f.type // empty type → trust extension
    const extOk = allowedExts.has(ext)
    if (!mimeOk && !extOk) {
      const extList = Array.from(allowedExts).map(e => e.toUpperCase()).join(', ')
      errors.push(`"${f.name}" — unsupported type. Allowed: ${extList}.`)
    } else if (f.size > maxFileMb * 1024 * 1024) {
      errors.push(`"${f.name}" — exceeds ${maxFileMb} MB.`)
    } else {
      valid.push(f)
    }
  }
  return { valid, errors }
}

// ── Public types ───────────────────────────────────────────────────────────────
export type StagedFile = { file: File; documentType: string; subType: string }

export interface DocumentUploadButtonProps {
  /** Called when user clicks Save & Upload. Caller is responsible for building FormData and hitting the API. */
  onUpload: (items: StagedFile[], onProgress: (pct: number) => void) => Promise<unknown>
  /** Fired on successful upload (after the default toast). */
  onSuccess?: (result: unknown) => void

  /** Trigger button */
  buttonLabel?: string
  buttonClassName?: string
  disabled?: boolean

  /** Modal copy */
  modalTitle?: string
  modalSubtitle?: string

  /** Per-file Document Type column (default true). Hide for module-specific metadata (bank-statement tier etc). */
  showDocumentType?: boolean
  /** Per-file Sub Type column (only when showDocumentType=true; default true). */
  showSubType?: boolean
  /** Explicit options. When not provided AND showDocumentType=true, fetched from /crm/document-types. */
  documentTypeOptions?: string[]
  /** Custom sub-type resolver. When not provided, inferred from /crm/document-types values. */
  getSubTypeOptions?: (type: string) => string[]
  /** Default document type for every staged file (pre-selects the dropdown). */
  defaultDocumentType?: string

  /** File validation overrides */
  allowedExt?: string
  allowedMimes?: Set<string>
  allowedExts?: Set<string>
  maxFileMb?: number
  maxFiles?: number

  /** Slot rendered above the drop zone inside the modal (e.g. a tier selector). */
  headerExtra?: ReactNode

  /** Toast messages */
  successMessage?: (count: number) => string
  failureMessage?: string
}

// ── Component ──────────────────────────────────────────────────────────────────
export function DocumentUploadButton(props: DocumentUploadButtonProps) {
  const {
    onUpload,
    onSuccess,
    buttonLabel = 'Upload Files',
    buttonClassName = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors',
    disabled = false,
    modalTitle = 'Upload Documents',
    modalSubtitle = 'Select files, then assign document type & sub-type for each.',
    showDocumentType = true,
    showSubType = true,
    documentTypeOptions: propDocTypes,
    getSubTypeOptions: propGetSubOpts,
    defaultDocumentType = '',
    allowedExt = DEFAULT_ALLOWED_EXT,
    allowedMimes = DEFAULT_ALLOWED_MIMES,
    allowedExts = DEFAULT_ALLOWED_EXTS,
    maxFileMb = DEFAULT_MAX_FILE_MB,
    maxFiles = DEFAULT_MAX_FILES,
    headerExtra,
    successMessage = (c: number) => `${c} file${c !== 1 ? 's' : ''} uploaded`,
    failureMessage = 'Upload failed — please try again.',
  } = props

  const [modalOpen, setModalOpen] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showSaveError, setShowSaveError] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Fetch document types from API only when showing the doc-type column AND caller didn't pass options
  const shouldFetch = showDocumentType && !propDocTypes
  const { data: docTypesData } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const res = await crmService.getDocumentTypes()
      const payload = res.data?.data ?? res.data ?? []
      const arr = Array.isArray(payload)
        ? payload
        : (Array.isArray((payload as { data?: unknown }).data) ? (payload as { data: DocumentType[] }).data : [])
      return arr as DocumentType[]
    },
    staleTime: 5 * 60 * 1000,
    enabled: shouldFetch,
  })
  const allDocTypes: DocumentType[] = docTypesData ?? []

  const documentTypeOptions: string[] = propDocTypes ?? Array.from(
    new Set(allDocTypes.map(dt => dt.title).filter(Boolean))
  )

  const getSubTypeOptions = useCallback((docTypeTitle: string): string[] => {
    if (propGetSubOpts) return propGetSubOpts(docTypeTitle)
    if (!docTypeTitle) return []
    const dt = allDocTypes.find(x => x.title === docTypeTitle)
    return dt ? parseValues(dt.values) : []
  }, [propGetSubOpts, allDocTypes])

  function addFiles(raw: File[]) {
    if (!raw.length) return
    setShowSaveError(false)
    if (stagedFiles.length + raw.length > maxFiles) {
      setValidationErrors([`Maximum ${maxFiles} files allowed.`])
      return
    }
    const { valid, errors } = validateFiles(raw, { maxFiles, maxFileMb, allowedMimes, allowedExts })
    setValidationErrors(errors)
    if (valid.length) {
      setStagedFiles(prev => [
        ...prev,
        ...valid.map(f => ({ file: f, documentType: defaultDocumentType, subType: '' })),
      ])
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = Array.from(e.target.files ?? [])
    e.target.value = ''
    addFiles(raw)
  }

  function handleDrop(e: ReactDragEvent<HTMLDivElement>) {
    e.preventDefault(); e.stopPropagation()
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files ?? []))
  }

  function updateStagedType(idx: number, type: string) {
    setStagedFiles(prev => prev.map((s, i) => i === idx ? { ...s, documentType: type, subType: '' } : s))
  }

  function updateStagedSubType(idx: number, subType: string) {
    setStagedFiles(prev => prev.map((s, i) => i === idx ? { ...s, subType } : s))
  }

  function removeStaged(idx: number) {
    setStagedFiles(prev => prev.filter((_, i) => i !== idx))
    setValidationErrors([])
  }

  function openModal() {
    setModalOpen(true)
    setShowSaveError(false)
    setValidationErrors([])
  }

  function closeModal() {
    if (isPending) return
    setModalOpen(false)
    setStagedFiles([])
    setValidationErrors([])
    setShowSaveError(false)
    setUploadProgress(0)
  }

  function isStagedComplete(s: StagedFile): boolean {
    if (!showDocumentType) return true
    if (!s.documentType) return false
    if (!showSubType) return true
    const subOpts = getSubTypeOptions(s.documentType)
    if (subOpts.length > 0 && !s.subType) return false
    return true
  }
  const allAssigned = stagedFiles.length > 0 && stagedFiles.every(isStagedComplete)
  const canSave = allAssigned && !isPending

  async function handleSaveClick() {
    if (stagedFiles.length === 0) return
    if (!allAssigned) {
      setShowSaveError(true)
      const msg = showDocumentType && showSubType
        ? 'Please select document type and sub-type for every file'
        : showDocumentType
          ? 'Please select document type for every file'
          : 'Please complete all fields before saving'
      toast.error(msg)
      return
    }
    setIsPending(true)
    setUploadProgress(0)
    try {
      const result = await onUpload(stagedFiles, (pct) => setUploadProgress(pct))
      const count = stagedFiles.length
      toast.success(successMessage(count))
      onSuccess?.(result)
      setStagedFiles([])
      setValidationErrors([])
      setUploadProgress(0)
      setShowSaveError(false)
      setModalOpen(false)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ? `Upload failed: ${msg}` : failureMessage)
      setUploadProgress(0)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={disabled}
        className={buttonClassName}
      >
        <Upload size={13} /> {buttonLabel}
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.55)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col overflow-hidden bg-white" style={{ maxHeight: '90vh' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Upload size={16} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">{modalTitle}</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">{modalSubtitle}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                disabled={isPending}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {headerExtra && <div className="mb-4">{headerExtra}</div>}

              {/* Drag & drop + click-to-select zone */}
              <div
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (!isPending) setIsDragging(true) }}
                onDragEnter={e => { e.preventDefault(); e.stopPropagation(); if (!isPending) setIsDragging(true) }}
                onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }}
                onDrop={handleDrop}
                onClick={() => { if (!isPending) fileRef.current?.click() }}
                className={`w-full rounded-xl border-2 border-dashed py-10 flex flex-col items-center gap-3 transition-all cursor-pointer ${
                  isPending
                    ? 'border-slate-200 bg-slate-50/50 opacity-40 cursor-not-allowed'
                    : isDragging
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 bg-slate-50/40'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  <Upload size={24} className={isDragging ? 'text-emerald-600' : 'text-emerald-500'} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    or <span className="text-emerald-600 font-semibold underline">click to browse</span>
                  </p>
                </div>
                <p className="text-[10px] text-slate-400">
                  {Array.from(allowedExts).map(e => e.toUpperCase()).join(', ')} &middot; Max {maxFileMb} MB each &middot; up to {maxFiles} files
                </p>
              </div>
              <input ref={fileRef} type="file" multiple accept={allowedExt} className="hidden" onChange={handleFileChange} />

              {/* Validation errors */}
              {validationErrors.length > 0 && (
                <div className="mt-4 rounded-lg bg-red-50 border border-red-100 p-3 space-y-1">
                  {validationErrors.map((err, i) => (
                    <p key={i} className="flex items-start gap-1.5 text-xs text-red-600">
                      <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />{err}
                    </p>
                  ))}
                </div>
              )}

              {/* Staged files table */}
              {stagedFiles.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      {showDocumentType ? `Assign Document Type (${stagedFiles.length})` : `Files (${stagedFiles.length})`}
                    </span>
                    <button
                      onClick={() => { setStagedFiles([]); setValidationErrors([]); setShowSaveError(false) }}
                      disabled={isPending}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30 font-semibold"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-bold" style={{ width: showDocumentType ? '34%' : '80%' }}>File Name</th>
                          <th className="px-3 py-2.5 text-left font-bold" style={{ width: '8%' }}>Type</th>
                          {showDocumentType && (
                            <th className="px-3 py-2.5 text-left font-bold" style={{ width: showSubType ? '26%' : '52%' }}>
                              Document Type <span className="text-red-500">*</span>
                            </th>
                          )}
                          {showDocumentType && showSubType && (
                            <th className="px-3 py-2.5 text-left font-bold" style={{ width: '26%' }}>Sub Type</th>
                          )}
                          <th className="px-2 py-2.5" style={{ width: '6%' }}></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stagedFiles.map((s, i) => {
                          const ic = getFileIcon(s.file.name)
                          const ext = getFileExt(s.file.name).toUpperCase() || '—'
                          const subOpts = showDocumentType && showSubType ? getSubTypeOptions(s.documentType) : []
                          const subRequired = subOpts.length > 0
                          const typeMissing = showSaveError && showDocumentType && !s.documentType
                          const subMissing = showSaveError && showDocumentType && showSubType && subRequired && !s.subType
                          return (
                            <tr key={i} className={typeMissing || subMissing ? 'bg-red-50/60' : 'bg-white'}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ic.bg}`}>
                                    <FileText size={14} className={ic.color} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-slate-800 font-medium text-sm" title={s.file.name}>
                                      {s.file.name}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">{formatBytes(s.file.size)}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 font-mono">{ext}</span>
                              </td>
                              {showDocumentType && (
                                <td className="px-3 py-3">
                                  <select
                                    value={s.documentType}
                                    onChange={e => updateStagedType(i, e.target.value)}
                                    disabled={isPending}
                                    className={`w-full text-xs rounded-lg border px-2.5 py-2 focus:outline-none focus:ring-2 transition-colors ${
                                      typeMissing
                                        ? 'border-red-300 focus:ring-red-300 bg-white'
                                        : 'border-slate-200 focus:ring-emerald-300 focus:border-emerald-400 bg-white'
                                    }`}
                                  >
                                    <option value="">— Select —</option>
                                    {documentTypeOptions.length === 0 && (
                                      <option value="" disabled>No document types — add at /crm/document-types</option>
                                    )}
                                    {documentTypeOptions.map(t => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </td>
                              )}
                              {showDocumentType && showSubType && (
                                <td className="px-3 py-3">
                                  <select
                                    value={s.subType}
                                    onChange={e => updateStagedSubType(i, e.target.value)}
                                    disabled={isPending || !s.documentType || subOpts.length === 0}
                                    className={`w-full text-xs rounded-lg border px-2.5 py-2 focus:outline-none focus:ring-2 transition-colors disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
                                      subMissing
                                        ? 'border-red-300 focus:ring-red-300 bg-white'
                                        : 'border-slate-200 focus:ring-emerald-300 focus:border-emerald-400 bg-white'
                                    }`}
                                  >
                                    {!s.documentType ? (
                                      <option value="">Select type first</option>
                                    ) : subOpts.length === 0 ? (
                                      <option value="">— N/A —</option>
                                    ) : (
                                      <>
                                        <option value="">— Select —</option>
                                        {subOpts.map(o => <option key={o} value={o}>{o}</option>)}
                                      </>
                                    )}
                                  </select>
                                </td>
                              )}
                              <td className="px-2 py-3 text-center">
                                <button
                                  onClick={() => removeStaged(i)}
                                  disabled={isPending}
                                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                                  title="Remove file"
                                >
                                  <X size={15} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Inline save-error banner */}
                  {showSaveError && !canSave && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                      {showDocumentType && showSubType
                        ? 'Please assign both Document Type and Sub Type (when applicable) for every file before saving.'
                        : showDocumentType
                          ? 'Please assign Document Type for every file before saving.'
                          : 'Please fix the errors above before saving.'}
                    </div>
                  )}

                  {/* Progress bar */}
                  {isPending && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-600">Uploading…</span>
                        <span className="text-xs font-mono text-slate-500">{uploadProgress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer — Save button */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
              <button
                onClick={handleSaveClick}
                disabled={!canSave || stagedFiles.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending
                  ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                  : <><Upload size={15} /> Save &amp; Upload {stagedFiles.length > 0 ? `${stagedFiles.length} File${stagedFiles.length !== 1 ? 's' : ''}` : 'Files'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
