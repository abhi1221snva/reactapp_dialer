import { X, FileText, ExternalLink } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { formatDateTime } from '../../utils/format'

export interface FaxItem {
  id: number
  faxurl: string | null
  dialednumber: string | null
  callerid: string | null
  faxstatus: string | null
  numofpages: string | null
  received: string | null
  start_time: string | null
  ref_id: string | null
  extension: string | null
  charge: string | number | null
  delivery_status: string | number | null
  fax_type: number | null
  isFree: number | null
  [key: string]: unknown
}

interface Props {
  fax: FaxItem
  onClose: () => void
}

function faxStatusBadge(status: string | null) {
  const s = String(status ?? '').toUpperCase()
  if (s === '1' || s === 'COMPLETE' || s === 'COMPLETED') return { variant: 'green' as const, label: 'Completed' }
  if (s === 'TRYING' || s === 'SENDING' || s === 'PENDING' || s === '0') return { variant: 'yellow' as const, label: s === '0' ? 'Pending' : 'Sending' }
  if (s === 'FAILED' || s === 'ERROR') return { variant: 'red' as const, label: 'Failed' }
  return { variant: 'gray' as const, label: status ?? '—' }
}

export function ViewFaxModal({ fax, onClose }: Props) {
  const { variant, label } = faxStatusBadge(fax.faxstatus)

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: 'Fax ID', value: fax.id },
    { label: 'Dialed Number', value: fax.dialednumber ?? '—' },
    { label: 'Caller ID', value: fax.callerid ?? '—' },
    { label: 'Extension', value: fax.extension ?? '—' },
    { label: 'Fax Status', value: <Badge variant={variant}>{label}</Badge> },
    { label: 'Delivery Status', value: fax.delivery_status ?? '—' },
    { label: 'Pages', value: fax.numofpages ?? '—' },
    { label: 'Charge', value: fax.charge != null ? `$${Number(fax.charge).toFixed(4)}` : '—' },
    { label: 'Free', value: Number(fax.isFree) === 1 ? 'Yes' : 'No' },
    { label: 'Ref ID', value: fax.ref_id ?? '—' },
    { label: 'Received', value: fax.received ?? '—' },
    { label: 'Start Time', value: fax.start_time ? formatDateTime(fax.start_time) : '—' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText size={17} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Fax Details</h3>
              <p className="text-xs text-slate-400">ID #{fax.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Fax URL */}
        {fax.faxurl && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs text-slate-500 mb-1.5 font-medium">Fax Document</p>
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-600 truncate flex-1">{fax.faxurl}</span>
              <a
                href={fax.faxurl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline text-xs px-2 py-1 flex items-center gap-1 flex-shrink-0"
              >
                <ExternalLink size={11} />
                View PDF
              </a>
            </div>
          </div>
        )}

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {fields.map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                <p className="text-sm text-slate-800 font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-outline w-full">Close</button>
        </div>
      </div>
    </div>
  )
}
