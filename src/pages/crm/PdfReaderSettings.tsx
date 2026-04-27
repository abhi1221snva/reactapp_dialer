import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Loader2, FileText, Search, X, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { crmService } from '../../services/crm.service'
import type { CrmLabel } from '../../types/crm.types'

interface PdfMapping {
  id: number
  pdf_label: string
  crm_label_id: number | null
  status: string
}

export function PdfReaderSettings() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [localMappings, setLocalMappings] = useState<Record<number, number | null>>({})
  const [dirty, setDirty] = useState(false)

  // ── Fetch PDF label mappings ──
  const { data: mappingsRaw, isLoading: loadingMappings } = useQuery({
    queryKey: ['pdf-reader-mappings'],
    queryFn: async () => {
      const res = await crmService.getPdfReaderMappings()
      return (res.data?.data ?? res.data ?? []) as PdfMapping[]
    },
  })

  // ── Fetch CRM labels ──
  const { data: crmLabels, isLoading: loadingLabels } = useQuery({
    queryKey: ['crm-lead-fields'],
    queryFn: async () => {
      const res = await crmService.getLeadFields()
      return (res.data?.data ?? res.data ?? []) as CrmLabel[]
    },
  })

  const activeLabels = useMemo(
    () => (crmLabels ?? []).filter(l => l.status === true || (l.status as unknown) == 1),
    [crmLabels],
  )

  const mappings = mappingsRaw ?? []

  // ── Filter by search ──
  const filtered = useMemo(() => {
    if (!search.trim()) return mappings
    const q = search.toLowerCase()
    return mappings.filter(m => m.pdf_label.toLowerCase().includes(q))
  }, [mappings, search])

  // ── Group by section (portion before the dot) ──
  const grouped = useMemo(() => {
    const groups: Record<string, PdfMapping[]> = {}
    for (const m of filtered) {
      const dotIdx = m.pdf_label.indexOf('.')
      const section = dotIdx >= 0 ? m.pdf_label.slice(0, dotIdx) : 'other'
      if (!groups[section]) groups[section] = []
      groups[section].push(m)
    }
    return groups
  }, [filtered])

  // ── Get current value (local override or DB value) ──
  const getCurrentValue = (m: PdfMapping): number | null => {
    if (m.id in localMappings) return localMappings[m.id]
    // Treat 0 as unmapped (DB stores 0 instead of NULL for unmapped rows)
    return m.crm_label_id && m.crm_label_id > 0 ? m.crm_label_id : null
  }

  // ── Handle change ──
  const handleChange = (id: number, val: string) => {
    setLocalMappings(prev => ({ ...prev, [id]: val ? Number(val) : null }))
    setDirty(true)
  }

  // ── Save mutation ──
  const saveMutation = useMutation({
    mutationFn: () => crmService.updatePdfReaderMappings(localMappings),
    onSuccess: () => {
      toast.success('PDF field mappings saved')
      setDirty(false)
      setLocalMappings({})
      qc.invalidateQueries({ queryKey: ['pdf-reader-mappings'] })
    },
    onError: () => toast.error('Failed to save mappings'),
  })

  // ── Stats ──
  const totalMapped = mappings.filter(m => getCurrentValue(m) !== null).length
  const totalFields = mappings.length

  const formatLabel = (pdfLabel: string) => {
    const dotIdx = pdfLabel.indexOf('.')
    const leaf = dotIdx >= 0 ? pdfLabel.slice(dotIdx + 1) : pdfLabel
    return leaf.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const formatSection = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const isLoading = loadingMappings || loadingLabels

  return (
    <div className="-mx-5 -mt-5 flex flex-col" style={{ height: 'calc(100vh - 70px)' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#eef2ff' }}>
              <FileText size={16} style={{ color: '#6366f1' }} />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-800 leading-tight">PDF Reader Settings</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Map extracted PDF fields to CRM lead fields
                {!isLoading && (
                  <span className="ml-2 text-indigo-500 font-medium">
                    {totalMapped}/{totalFields} mapped
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!dirty || saveMutation.isPending}
            className="btn-success flex items-center gap-1.5 text-xs px-3 py-1.5 h-auto disabled:opacity-40"
          >
            {saveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save Mappings
          </button>
        </div>
      </div>

      {/* ── Green accent ──────────────────────────────────────────────── */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, #c7d2fe, #6366f1)', margin: 0 }} />

      {/* ── Search bar ────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-2 bg-white border-b border-slate-100">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search PDF fields..."
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300 outline-none transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={24} className="animate-spin text-indigo-400 mb-3" />
            <span className="text-sm">Loading mappings...</span>
          </div>
        ) : totalFields === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText size={32} className="mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No PDF field mappings found</p>
            <p className="text-xs text-slate-400 mt-1">Run the PDF label seeder to populate the mapping table.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([section, items]) => (
              <div key={section} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Section header */}
                <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {formatSection(section)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                    {items.length} field{items.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Field rows */}
                <div className="divide-y divide-slate-100">
                  {items.map(m => {
                    const currentVal = getCurrentValue(m)
                    const isMapped = currentVal !== null
                    return (
                      <div key={m.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50 transition-colors">
                        {/* PDF field name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">
                            {formatLabel(m.pdf_label)}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                            {m.pdf_label}
                          </p>
                        </div>

                        {/* Arrow */}
                        <span className="text-slate-300 text-xs flex-shrink-0">&rarr;</span>

                        {/* CRM label dropdown */}
                        <div className="w-64 flex-shrink-0">
                          <select
                            value={currentVal ?? ''}
                            onChange={e => handleChange(m.id, e.target.value)}
                            className={`w-full text-xs px-3 py-2 border rounded-lg outline-none transition-colors ${
                              isMapped
                                ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
                                : 'border-slate-200 bg-white text-slate-500'
                            } focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300`}
                          >
                            <option value="">— Not mapped —</option>
                            {activeLabels.map(l => (
                              <option key={l.id} value={l.id}>
                                {l.label_name} ({l.field_key})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Status dot */}
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: isMapped ? '#10b981' : '#cbd5e1' }}
                          title={isMapped ? 'Mapped' : 'Not mapped'}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
