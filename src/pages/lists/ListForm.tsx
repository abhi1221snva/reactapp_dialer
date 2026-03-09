import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ListUpload } from '../../modules/lists/ListUpload'
import { ColumnMapping } from '../../modules/lists/ColumnMapping'
import { ImportProgress } from '../../modules/lists/ImportProgress'
import type { UploadFormData, ParseResult, ImportResult } from '../../modules/lists/types'

type Step = 'upload' | 'mapping' | 'done'

const STEP_LABELS: Record<Step, string> = {
  upload:  '1. Upload File',
  mapping: '2. Map Columns',
  done:    '3. Done',
}

export function ListForm() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('upload')
  const [formData, setFormData] = useState<UploadFormData | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const handleParsed = (fd: UploadFormData, pr: ParseResult) => {
    setFormData(fd)
    setParseResult(pr)
    setStep('mapping')
  }

  const handleImported = (result: ImportResult) => {
    setImportResult(result)
    setStep('done')
  }

  return (
    <div className="w-full space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        {step !== 'done' && (
          <button
            onClick={() => step === 'mapping' ? setStep('upload') : navigate('/lists')}
            className="btn-ghost p-2 rounded-lg"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New List</h1>
          <p className="page-subtitle">Upload a lead list from Excel or CSV</p>
        </div>
      </div>

      {/* Step indicator */}
      {step !== 'done' && (
        <div className="flex items-center gap-2">
          {(['upload', 'mapping'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-slate-200" />}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                step === s
                  ? 'bg-indigo-600 text-white'
                  : (s === 'upload' && step === 'mapping')
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400'
              }`}>
                {STEP_LABELS[s]}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step content */}
      {step === 'upload' && (
        <ListUpload onParsed={handleParsed} />
      )}

      {step === 'mapping' && formData && parseResult && (
        <ColumnMapping
          formData={formData}
          parseResult={parseResult}
          onImported={handleImported}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'done' && importResult && formData && (
        <ImportProgress result={importResult} listTitle={formData.title} />
      )}

      {/* Cancel (upload step only) */}
      {step === 'upload' && (
        <div>
          <button onClick={() => navigate('/lists')} className="btn-outline w-full">Cancel</button>
        </div>
      )}
    </div>
  )
}
