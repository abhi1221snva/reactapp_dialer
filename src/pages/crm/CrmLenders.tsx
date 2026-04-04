import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, Check, Building2, Phone, Mail,
  Zap, Search, X, LayoutGrid, Sheet, ChevronLeft, ChevronRight,
  ArrowUpDown, ArrowUp, ArrowDown, Download,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { RowActions } from '../../components/ui/RowActions'
import { TablePagination } from '../../components/ui/TablePagination'
import type { Lender } from '../../types/crm.types'
import { confirmDelete } from '../../utils/confirmDelete'

const PER_PAGE = 15
const MASTER_PER_PAGE = 200

const LENDER_API_TYPES = [
  { value: 'ondeck',            label: 'OnDeck' },
  { value: 'credibly',          label: 'Credibly' },
  { value: 'cancapital',        label: 'CAN Capital' },
  { value: 'lendini',           label: 'Lendini' },
  { value: 'forward_financing', label: 'Forward Financing' },
  { value: 'bitty_advance',     label: 'Bitty Advance' },
  { value: 'fox_partner',       label: 'Fox Partner' },
  { value: 'specialty',         label: 'Specialty' },
  { value: 'biz2credit',        label: 'Biz2Credit' },
]

// ─── Master Sheet column definitions ─────────────────────────────────────────

type EditType = 'text' | 'number' | 'yesno' | 'status' | 'api_type' | 'api_status' | 'readonly'

interface SheetCol {
  key: string
  label: string
  group: string
  width: number
  format?: (v: unknown, row: Lender) => string
  editType?: EditType
}

const fmtYesNo = (v: unknown) => v === '1' || v === 1 || v === true ? 'Yes' : v === '0' || v === 0 || v === false ? 'No' : '—'
const fmtCurrency = (v: unknown) => { const n = Number(v); return isNaN(n) || !v ? '—' : `$${n.toLocaleString()}` }
const fmtPlain = (v: unknown) => (v != null && v !== '' ? String(v) : '—')
const fmtApi = (v: unknown, row: Lender) => {
  const t = LENDER_API_TYPES.find(t => t.value === row.lender_api_type)
  return String(row.api_status) === '1' && t ? t.label : '—'
}
const fmtStatus = (v: unknown) => Number(v) === 1 ? 'Active' : 'Inactive'

const SHEET_COLUMNS: SheetCol[] = [
  // Contact
  { key: 'lender_name',    label: 'Lender Name',     group: 'Contact',       width: 180, editType: 'text' },
  { key: 'email',          label: 'Email',            group: 'Contact',       width: 200, editType: 'text' },
  { key: 'secondary_email',label: 'Email 2',          group: 'Contact',       width: 180, editType: 'text' },
  { key: 'contact_person', label: 'Contact Person',   group: 'Contact',       width: 140, editType: 'text' },
  { key: 'phone',          label: 'Phone',            group: 'Contact',       width: 120, editType: 'text' },
  { key: 'status',         label: 'Status',           group: 'Contact',       width: 80,  format: fmtStatus, editType: 'status' },
  // Location
  { key: 'city',           label: 'City',             group: 'Location',      width: 110, editType: 'text' },
  { key: 'state',          label: 'State',            group: 'Location',      width: 80,  editType: 'text' },
  { key: 'country',        label: 'Country',          group: 'Location',      width: 90,  editType: 'text' },
  // Loan Requirements
  { key: 'min_credit_score',     label: 'Min Credit Score', group: 'Loan Req',  width: 120, editType: 'number' },
  { key: 'max_negative_days',    label: 'Max Neg Days',     group: 'Loan Req',  width: 110, editType: 'number' },
  { key: 'max_advance',          label: 'Max Advance',      group: 'Loan Req',  width: 110, format: fmtCurrency, editType: 'number' },
  { key: 'min_amount',           label: 'Min Amount',       group: 'Loan Req',  width: 100, format: fmtCurrency, editType: 'number' },
  { key: 'min_deposits',         label: 'Min Deposits',     group: 'Loan Req',  width: 110, editType: 'number' },
  { key: 'min_monthly_deposit',  label: 'Min Monthly Dep',  group: 'Loan Req',  width: 130, format: fmtCurrency, editType: 'number' },
  { key: 'min_avg_revenue',      label: 'Min Avg Revenue',  group: 'Loan Req',  width: 130, format: fmtCurrency, editType: 'number' },
  { key: 'min_time_business',    label: 'Min Time in Biz',  group: 'Loan Req',  width: 120, editType: 'text' },
  { key: 'nsfs',                 label: 'NSFs',             group: 'Loan Req',  width: 70,  editType: 'number' },
  { key: 'max_position',         label: 'Max Position',     group: 'Loan Req',  width: 100, editType: 'number' },
  { key: 'max_term',             label: 'Max Term',         group: 'Loan Req',  width: 90,  editType: 'text' },
  { key: 'daily_balance',        label: 'Daily Balance',    group: 'Loan Req',  width: 110, format: fmtCurrency, editType: 'number' },
  { key: 'factor_rate',          label: 'Factor Rate',      group: 'Loan Req',  width: 100, editType: 'text' },
  // Eligibility
  { key: 'white_label',          label: 'White Label',      group: 'Eligibility', width: 100, format: fmtYesNo, editType: 'yesno' },
  { key: 'consolidation',        label: 'Consolidation',    group: 'Eligibility', width: 110, format: fmtYesNo, editType: 'yesno' },
  { key: 'reverse_consolidation',label: 'Rev Consolidation',group: 'Eligibility', width: 130, format: fmtYesNo, editType: 'yesno' },
  { key: 'sole_prop',            label: 'Sole Prop',        group: 'Eligibility', width: 90,  format: fmtYesNo, editType: 'yesno' },
  { key: 'home_business',        label: 'Home Biz',         group: 'Eligibility', width: 90,  format: fmtYesNo, editType: 'yesno' },
  { key: 'non_profit',           label: 'Non-Profit',       group: 'Eligibility', width: 90,  format: fmtYesNo, editType: 'yesno' },
  { key: 'daily',                label: 'Daily',            group: 'Eligibility', width: 70,  format: fmtYesNo, editType: 'yesno' },
  { key: 'coj_req',              label: 'COJ Req',          group: 'Eligibility', width: 80,  format: fmtYesNo, editType: 'yesno' },
  { key: 'bank_verify',          label: 'Bank Verify',      group: 'Eligibility', width: 100, format: fmtYesNo, editType: 'yesno' },
  { key: 'loc',                  label: 'LOC',              group: 'Eligibility', width: 70,  format: fmtYesNo, editType: 'yesno' },
  { key: 'ownership_percentage', label: 'Ownership %',      group: 'Eligibility', width: 100, editType: 'number' },
  { key: 'max_mca_payoff_amount',label: 'Max MCA Payoff',   group: 'Eligibility', width: 120, format: fmtCurrency, editType: 'number' },
  // Restrictions
  { key: 'prohibited_industry',  label: 'Prohibited Industry', group: 'Restrictions', width: 200, editType: 'text' },
  { key: 'guideline_state',      label: 'Restricted States',   group: 'Restrictions', width: 200, editType: 'text' },
  // API
  { key: 'api_status',           label: 'API',              group: 'API',        width: 100, format: fmtApi, editType: 'api_status' },
  { key: 'lender_api_type',      label: 'API Type',         group: 'API',        width: 130, editType: 'api_type' },
]

// Group colors for header
const GROUP_COLORS: Record<string, string> = {
  'Contact':      'bg-indigo-600 text-white',
  'Location':     'bg-sky-600 text-white',
  'Loan Req':     'bg-violet-600 text-white',
  'Eligibility':  'bg-emerald-600 text-white',
  'Restrictions': 'bg-amber-600 text-white',
  'API':          'bg-slate-600 text-white',
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

function exportCsv(lenders: Lender[], cols: SheetCol[]) {
  const header = cols.map(c => `"${c.label}"`).join(',')
  const rows = lenders.map(l =>
    cols.map(c => {
      const raw = (l as Record<string, unknown>)[c.key]
      const val = c.format ? c.format(raw, l) : fmtPlain(raw)
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `lenders-master-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CrmLenders() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<'cards' | 'sheet'>('cards')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const sheetRef = useRef<HTMLDivElement>(null)

  // Read filter state from URL
  const page   = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const search = searchParams.get('search') || ''

  const setFilter = (key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page')
      return next
    })
  }

  const goToPage = (p: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (p <= 1) next.delete('page')
      else next.set('page', String(p))
      return next
    })
  }

  const reset = () => setSearchParams({})

  // Cards view — paginated
  const { data, isLoading } = useQuery({
    queryKey: ['lenders', page, search],
    queryFn: async () => {
      const res = await crmService.getLenders({ page, per_page: PER_PAGE, ...(search ? { search } : {}) })
      return res.data
    },
    staleTime: 30_000,
  })

  // Master sheet — load all lenders
  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: ['lenders-all', search],
    queryFn: async () => {
      const res = await crmService.getLenders({ per_page: MASTER_PER_PAGE, ...(search ? { search } : {}) })
      return res.data
    },
    enabled: view === 'sheet',
    staleTime: 60_000,
  })

  const lenders: Lender[]  = data?.data?.data ?? data?.data ?? data?.records ?? data ?? []
  const total: number      = data?.data?.total ?? data?.total ?? 0
  const totalPages: number = data?.data?.last_page ?? data?.last_page ?? (Math.ceil(total / PER_PAGE) || 1)
  const allLenders: Lender[] = allData?.data?.data ?? allData?.data ?? allData?.records ?? allData ?? []

  // Sorted lenders for sheet
  const sortedLenders = useMemo(() => {
    if (!sortKey) return allLenders
    const col = SHEET_COLUMNS.find(c => c.key === sortKey)
    return [...allLenders].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey]
      const bv = (b as Record<string, unknown>)[sortKey]
      const as = col?.format ? col.format(av, a) : String(av ?? '')
      const bs = col?.format ? col.format(bv, b) : String(bv ?? '')
      const numA = parseFloat(as.replace(/[^0-9.-]/g, ''))
      const numB = parseFloat(bs.replace(/[^0-9.-]/g, ''))
      if (!isNaN(numA) && !isNaN(numB)) return sortDir === 'asc' ? numA - numB : numB - numA
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
    })
  }, [allLenders, sortKey, sortDir])

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // ─── Inline editing ────────────────────────────────────────────────────────
  const [editCell, setEditCell] = useState<{ id: number; key: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const editInputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

  const startEdit = useCallback((lender: Lender, col: SheetCol) => {
    const raw = (lender as Record<string, unknown>)[col.key]
    // For yes/no fields store '1'/'0', for status same, for others store raw string
    const et = col.editType ?? 'text'
    let initial: string
    if (et === 'yesno' || et === 'status' || et === 'api_status') {
      initial = String(raw ?? '0')
    } else {
      initial = raw != null && raw !== '' ? String(raw) : ''
    }
    setEditCell({ id: lender.id, key: col.key })
    setEditValue(initial)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditCell(null)
    setEditValue('')
  }, [])

  const cellUpdateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      crmService.updateLender(id, data),
    onSuccess: () => {
      toast.success('Saved')
      qc.invalidateQueries({ queryKey: ['lenders'] })
      qc.invalidateQueries({ queryKey: ['lenders-all'] })
    },
    onError: () => toast.error('Failed to save'),
  })

  const commitEdit = useCallback(() => {
    if (!editCell) return
    const lender = sortedLenders.find(l => l.id === editCell.id)
    if (!lender) { cancelEdit(); return }

    const oldRaw = (lender as Record<string, unknown>)[editCell.key]
    const oldStr = oldRaw != null ? String(oldRaw) : ''
    if (editValue === oldStr) { cancelEdit(); return } // no change

    cellUpdateMutation.mutate({ id: editCell.id, data: { [editCell.key]: editValue || null } })
    cancelEdit()
  }, [editCell, editValue, sortedLenders, cancelEdit, cellUpdateMutation])

  // Focus input when cell enters edit mode
  useEffect(() => {
    if (editCell && editInputRef.current) {
      editInputRef.current.focus()
      if (editInputRef.current instanceof HTMLInputElement) {
        editInputRef.current.select()
      }
    }
  }, [editCell])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
    if (e.key === 'Tab') { commitEdit() } // let Tab naturally move focus out
  }, [commitEdit, cancelEdit])

  const toggleMutation = useMutation({
    mutationFn: (l: Lender) => crmService.toggleLender(l.id, Number(l.status) === 1 ? 0 : 1),
    onSuccess: () => { toast.success('Lender updated'); qc.invalidateQueries({ queryKey: ['lenders'] }) },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteLender(id),
    onSuccess: () => { toast.success('Lender deleted'); qc.invalidateQueries({ queryKey: ['lenders'] }) },
    onError: () => toast.error('Failed to delete'),
  })

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      <div className="lt">
        <div className="lt-title">
          <h1>Lenders</h1>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, background: '#f1f5f9', padding: '1px 7px', borderRadius: 8, lineHeight: '16px' }}>
            {isLoading ? '…' : total}
          </span>
        </div>
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input
            type="text"
            value={search}
            placeholder="Search name, email, contact…"
            onChange={e => setFilter('search', e.target.value)}
          />
          {search && (
            <button
              onClick={reset}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
            >
              <X size={12} />
            </button>
          )}
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: 6, padding: 2, gap: 2, flexShrink: 0 }}>
          <button
            onClick={() => setView('cards')}
            style={{
              height: 28, padding: '0 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all .12s', display: 'flex', alignItems: 'center', gap: 4,
              background: view === 'cards' ? '#fff' : 'transparent',
              color: view === 'cards' ? '#0f172a' : '#64748b',
              boxShadow: view === 'cards' ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
            }}
          >
            <LayoutGrid size={11} /> Cards
          </button>
          <button
            onClick={() => setView('sheet')}
            style={{
              height: 28, padding: '0 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all .12s', display: 'flex', alignItems: 'center', gap: 4,
              background: view === 'sheet' ? '#fff' : 'transparent',
              color: view === 'sheet' ? '#0f172a' : '#64748b',
              boxShadow: view === 'sheet' ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
            }}
          >
            <Sheet size={11} /> Sheet
          </button>
        </div>
        {view === 'sheet' && (
          <button onClick={() => exportCsv(sortedLenders, SHEET_COLUMNS)} className="lt-b" title="Export CSV">
            <Download size={12} /> Export
          </button>
        )}
        <div className="lt-divider" />
        <div className="lt-right">
          <button onClick={() => navigate('/crm/lenders/create')} className="lt-b lt-g">
            <Plus size={13} /> Add Lender
          </button>
        </div>
      </div>
      <div className="lt-accent lt-accent-green" />

      {/* ── Cards View ──────────────────────────────────────────────────────── */}
      {view === 'cards' && (
        <div className="table-wrapper" style={{ marginTop: 8 }}>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  {['Lender', 'Contact', 'Location', 'API', 'Status', 'Action'].map(h => (
                    <th key={h} className={h === 'Action' ? 'text-right' : ''}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="py-12"><div className="flex justify-center"><Loader2 size={20} className="animate-spin text-indigo-500" /></div></td></tr>
                ) : lenders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12">
                      <div className="text-center">
                        <Building2 size={32} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-sm text-slate-400">
                          {search ? 'No lenders match your search' : 'No lenders added yet'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : lenders.map(l => {
                  const apiType = LENDER_API_TYPES.find(t => t.value === l.lender_api_type)
                  return (
                    <tr key={l.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50">
                            <Building2 size={15} className="text-indigo-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{l.lender_name}</p>
                            {l.email && (
                              <p className="text-xs flex items-center gap-1 mt-0.5 text-slate-400">
                                <Mail size={10} /> {l.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        {l.contact_person && <p className="text-sm text-slate-700">{l.contact_person}</p>}
                        {l.phone && (
                          <p className="text-xs flex items-center gap-1 mt-0.5 text-slate-400">
                            <Phone size={10} /> {l.phone}
                          </p>
                        )}
                      </td>
                      <td className="text-slate-500">
                        {[l.city, l.state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td>
                        {String(l.api_status) === '1' && apiType ? (
                          <span className="badge badge-indigo flex items-center gap-1 w-fit">
                            <Zap size={10} /> {apiType.label}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => toggleMutation.mutate(l)}
                          className={Number(l.status) === 1
                            ? 'badge badge-green hover:opacity-80 transition-opacity'
                            : 'badge badge-gray hover:opacity-80 transition-opacity'
                          }
                        >
                          {Number(l.status) === 1 ? <><Check size={10} /> Active</> : 'Inactive'}
                        </button>
                      </td>
                      <td className="w-px whitespace-nowrap">
                        <RowActions actions={[
                          {
                            label: 'Edit',
                            icon: <Pencil size={13} />,
                            variant: 'edit',
                            onClick: () => navigate(`/crm/lenders/${l.id}/edit`),
                          },
                          {
                            label: 'Delete',
                            icon: <Trash2 size={13} />,
                            variant: 'delete',
                            onClick: async () => { if (await confirmDelete(l.lender_name)) deleteMutation.mutate(l.id) },
                            disabled: deleteMutation.isPending,
                          },
                        ]} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {(totalPages > 1 || total > 0) && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={PER_PAGE}
              onPageChange={goToPage}
            />
          )}
        </div>
      )}

      {/* ── Master Sheet View ───────────────────────────────────────────────── */}
      {view === 'sheet' && (
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden" style={{ marginTop: 8 }}>
          {/* Sheet info bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500">
            <span>{allLoading ? 'Loading…' : `${sortedLenders.length} lenders · ${SHEET_COLUMNS.length} columns · Double-click any cell to edit`}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-600" /> Contact</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-sky-600" /> Location</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-600" /> Loan Req</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-600" /> Eligibility</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-600" /> Restrictions</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-600" /> API</span>
            </div>
          </div>

          <div ref={sheetRef} className="overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            {allLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
              </div>
            ) : (
              <table className="border-collapse" style={{ minWidth: SHEET_COLUMNS.reduce((s, c) => s + c.width, 40) }}>
                {/* Group header row */}
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th
                      className="bg-slate-700 text-white text-[10px] font-semibold px-2 py-1 border-r border-slate-600 sticky left-0 z-30"
                      style={{ width: 40 }}
                    >
                      #
                    </th>
                    {(() => {
                      const groups: { group: string; span: number; width: number }[] = []
                      SHEET_COLUMNS.forEach(col => {
                        const last = groups[groups.length - 1]
                        if (last && last.group === col.group) {
                          last.span++
                          last.width += col.width
                        } else {
                          groups.push({ group: col.group, span: 1, width: col.width })
                        }
                      })
                      return groups.map(g => (
                        <th
                          key={g.group}
                          colSpan={g.span}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 text-center border-r border-white/20 ${GROUP_COLORS[g.group] ?? 'bg-slate-600 text-white'}`}
                        >
                          {g.group}
                        </th>
                      ))
                    })()}
                  </tr>
                  {/* Column header row */}
                  <tr>
                    <th
                      className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-1.5 border-r border-b border-slate-200 sticky left-0 z-30"
                      style={{ width: 40 }}
                    />
                    {SHEET_COLUMNS.map(col => (
                      <th
                        key={col.key}
                        onClick={() => toggleSort(col.key)}
                        className="bg-slate-50 text-[10px] font-semibold text-slate-600 px-2 py-1.5 border-r border-b border-slate-200 whitespace-nowrap cursor-pointer select-none hover:bg-slate-100 transition-colors"
                        style={{ width: col.width, minWidth: col.width }}
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key ? (
                            sortDir === 'asc' ? <ArrowUp size={10} className="text-indigo-500" /> : <ArrowDown size={10} className="text-indigo-500" />
                          ) : (
                            <ArrowUpDown size={9} className="text-slate-300" />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedLenders.length === 0 ? (
                    <tr>
                      <td colSpan={SHEET_COLUMNS.length + 1} className="py-16 text-center">
                        <Building2 size={28} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-xs text-slate-400">{search ? 'No lenders match' : 'No lenders yet'}</p>
                      </td>
                    </tr>
                  ) : sortedLenders.map((l, idx) => (
                    <tr
                      key={l.id}
                      className="hover:bg-indigo-50/40 transition-colors"
                    >
                      <td
                        className="text-[10px] text-slate-400 text-center px-2 py-1 border-r border-b border-slate-100 bg-white sticky left-0 z-10 font-mono cursor-pointer"
                        style={{ width: 40 }}
                        onClick={() => navigate(`/crm/lenders/${l.id}/edit`)}
                        title="Click to open full edit page"
                      >
                        {idx + 1}
                      </td>
                      {SHEET_COLUMNS.map(col => {
                        const raw = (l as Record<string, unknown>)[col.key]
                        const val = col.format ? col.format(raw, l) : fmtPlain(raw)
                        const isEditing = editCell?.id === l.id && editCell?.key === col.key
                        const et = col.editType ?? 'text'
                        const isStatus = col.key === 'status'
                        const isActive = isStatus && Number(l.status) === 1
                        const isInactive = isStatus && Number(l.status) !== 1

                        // Shared cell input styles
                        const inputCls = 'w-full h-full bg-white text-[11px] text-slate-800 px-1.5 py-0.5 border-0 outline-none focus:ring-2 focus:ring-indigo-400 rounded-sm'
                        const selectCls = 'w-full h-full bg-white text-[11px] text-slate-800 px-1 py-0.5 border-0 outline-none focus:ring-2 focus:ring-indigo-400 rounded-sm cursor-pointer'

                        return (
                          <td
                            key={col.key}
                            className={`text-[11px] text-slate-700 px-2 py-1 border-r border-b border-slate-100 whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer ${
                              isEditing ? '!p-0 !overflow-visible bg-indigo-50 ring-2 ring-inset ring-indigo-400' : 'hover:bg-indigo-50/50'
                            }`}
                            style={{ maxWidth: col.width, width: col.width }}
                            title={!isEditing && val !== '—' ? val : undefined}
                            onDoubleClick={(e) => { e.stopPropagation(); startEdit(l, col) }}
                          >
                            {isEditing ? (
                              // ── Edit mode inputs ──
                              et === 'yesno' ? (
                                <select
                                  ref={el => { editInputRef.current = el }}
                                  className={selectCls}
                                  value={editValue === '1' || editValue === 'true' ? '1' : '0'}
                                  onChange={e => { setEditValue(e.target.value); }}
                                  onBlur={commitEdit}
                                  onKeyDown={handleKeyDown}
                                >
                                  <option value="1">Yes</option>
                                  <option value="0">No</option>
                                </select>
                              ) : et === 'status' ? (
                                <select
                                  ref={el => { editInputRef.current = el }}
                                  className={selectCls}
                                  value={editValue === '1' || editValue === 'true' ? '1' : '0'}
                                  onChange={e => { setEditValue(e.target.value); }}
                                  onBlur={commitEdit}
                                  onKeyDown={handleKeyDown}
                                >
                                  <option value="1">Active</option>
                                  <option value="0">Inactive</option>
                                </select>
                              ) : et === 'api_status' ? (
                                <select
                                  ref={el => { editInputRef.current = el }}
                                  className={selectCls}
                                  value={editValue === '1' ? '1' : '0'}
                                  onChange={e => { setEditValue(e.target.value); }}
                                  onBlur={commitEdit}
                                  onKeyDown={handleKeyDown}
                                >
                                  <option value="1">Enabled</option>
                                  <option value="0">Disabled</option>
                                </select>
                              ) : et === 'api_type' ? (
                                <select
                                  ref={el => { editInputRef.current = el }}
                                  className={selectCls}
                                  value={editValue}
                                  onChange={e => { setEditValue(e.target.value); }}
                                  onBlur={commitEdit}
                                  onKeyDown={handleKeyDown}
                                >
                                  <option value="">— None —</option>
                                  {LENDER_API_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  ref={el => { editInputRef.current = el }}
                                  type={et === 'number' ? 'number' : 'text'}
                                  className={inputCls}
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onBlur={commitEdit}
                                  onKeyDown={handleKeyDown}
                                />
                              )
                            ) : (
                              // ── Display mode ──
                              isActive ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-px text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700"><Check size={9} /> Active</span>
                              ) : isInactive ? (
                                <span className="inline-flex items-center px-1.5 py-px text-[10px] font-medium rounded bg-slate-100 text-slate-500">Inactive</span>
                              ) : val === '—' ? (
                                <span className="text-slate-300">—</span>
                              ) : val === 'Yes' ? (
                                <span className="text-emerald-600 font-medium">{val}</span>
                              ) : val === 'No' ? (
                                <span className="text-slate-400">{val}</span>
                              ) : (
                                val
                              )
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
