import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useDialerHeader } from '../../layouts/DialerLayout'
import { ListUpload } from '../../modules/lists/ListUpload'
import { ColumnMapping } from '../../modules/lists/ColumnMapping'
import { ImportProgress } from '../../modules/lists/ImportProgress'
import type { UploadFormData, ParseResult, ImportResult } from '../../modules/lists/types'

type Step = 'upload' | 'mapping' | 'done'

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload',  label: '1. Upload' },
  { key: 'mapping', label: '2. Mapping' },
]

export function ListForm() {
  const navigate = useNavigate()
  const { setToolbar, headerKey } = useDialerHeader()

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

  const stepIndex = STEPS.findIndex(s => s.key === step)

  // Inject back button + step pills into the standard .lt toolbar
  useEffect(() => {
    setToolbar(
      <>
        {/* Back button */}
        <button
          className="lt-b"
          onClick={() => step === 'mapping' ? setStep('upload') : navigate('/lists')}
        >
          <ArrowLeft size={13} />
          Back
        </button>

        {/* Step pills (right-aligned) */}
        {step !== 'done' && (
          <div className="lt-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {STEPS.map((s, i) => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && <div style={{ width: 16, height: 1, background: '#e2e8f0' }} />}
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: step === s.key ? '#6366f1' : stepIndex > i ? '#e0e7ff' : '#f1f5f9',
                    color: step === s.key ? '#fff' : stepIndex > i ? '#4338ca' : '#94a3b8',
                    whiteSpace: 'nowrap',
                  }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    )
  }, [step, headerKey])

  return (
    <div className="max-w-4xl mx-auto">
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
    </div>
  )
}
