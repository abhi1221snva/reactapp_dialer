import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Phone, Trash2, Hash, X, RefreshCw, ShoppingCart,
  AlertCircle, Square, CheckSquare,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { plivoService } from '../../services/plivo.service'
import type { AvailablePlivoNumber, PlivoNumber } from '../../types/plivo.types'
import { showConfirm } from '../../utils/confirmDelete'

const SEARCH_LIMIT = 10
const COUNTRIES = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IN', 'MX', 'BR', 'ES']

function capLabel(caps: AvailablePlivoNumber['capabilities']): string {
  return [caps.voice && 'Voice', caps.sms && 'SMS'].filter(Boolean).join(', ') || '—'
}

function CapBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
      active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400 line-through'
    }`}>
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active:   'bg-green-100 text-green-700',
    released: 'bg-slate-100 text-slate-500',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${colors[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  )
}

function SearchSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          <td className="px-4 py-3"><div className="w-4 h-4 bg-slate-100 rounded animate-pulse" /></td>
          <td className="px-4 py-3"><div className="h-4 w-36 bg-slate-100 rounded animate-pulse" /></td>
          <td className="px-4 py-3"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></td>
          <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></td>
          <td className="px-4 py-3"><div className="h-4 w-16 bg-slate-100 rounded animate-pulse" /></td>
          <td className="px-4 py-3 text-right"><div className="h-7 w-14 bg-slate-100 rounded-lg animate-pulse ml-auto" /></td>
        </tr>
      ))}
    </>
  )
}

function PurchaseConfirmModal({
  numbers, isPending, error, onConfirm, onCancel,
}: {
  numbers: AvailablePlivoNumber[]
  isPending: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const isBulk = numbers.length > 1
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !isPending) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" style={{ animation: 'modalIn 0.18s ease-out' }}>
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <ShoppingCart size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isBulk ? `Purchase ${numbers.length} Numbers` : 'Confirm Purchase'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">This action will charge your Plivo account</p>
            </div>
          </div>
          <button onClick={onCancel} disabled={isPending} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 pb-5">
          <div className={`rounded-xl border border-slate-200 overflow-hidden mb-4 ${isBulk ? 'max-h-48 overflow-y-auto' : ''}`}>
            {numbers.map((n, idx) => (
              <div key={n.number} className={`flex items-center gap-3 px-4 py-3 bg-slate-50 ${idx > 0 ? 'border-t border-slate-200' : ''}`}>
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Phone size={14} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-bold text-slate-900 text-sm leading-none">{n.number}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {[n.country, n.region, capLabel(n.capabilities)].filter(Boolean).join(' · ')}
                    {n.monthly_rental_rate && ` · $${n.monthly_rental_rate}/mo`}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onCancel} disabled={isPending} className="flex-1 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors">Cancel</button>
            <button onClick={onConfirm} disabled={isPending} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-60 transition-colors">
              {isPending ? <><RefreshCw size={13} className="animate-spin" />Purchasing…</> : <><ShoppingCart size={13} />Confirm Purchase</>}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
    </div>
  )
}

export function PlivoNumbers() {
  const qc = useQueryClient()

  const [searchForm, setSearchForm] = useState({ country: 'US', area_code: '', voice: true, sms: false })
  const [searchTriggered, setSearchTriggered] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<AvailablePlivoNumber[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [ownedPage, setOwnedPage] = useState(1)
  const [ownedSearch, setOwnedSearch] = useState('')
  const [confirmNumbers, setConfirmNumbers] = useState<AvailablePlivoNumber[]>([])
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  const { data: ownedData, isLoading: ownedLoading } = useQuery({
    queryKey: ['plivo-numbers', { page: ownedPage, search: ownedSearch }],
    queryFn:  () => plivoService.listNumbers({ page: ownedPage, limit: 20, search: ownedSearch }),
  })

  const handleSearch = async () => {
    setSearchTriggered(true)
    setSearching(true)
    setSearchResults([])
    setSelected(new Set())

    const areaCodes = searchForm.area_code.split(',').map((s) => s.trim()).filter(Boolean)
    const baseFilters = { country: searchForm.country, voice: searchForm.voice, sms: searchForm.sms }

    try {
      let combined: AvailablePlivoNumber[] = []
      if (areaCodes.length === 0) {
        const res = await plivoService.searchNumbers(baseFilters)
        combined = res.data?.data?.numbers ?? []
      } else {
        const settled = await Promise.allSettled(
          areaCodes.map((ac) => plivoService.searchNumbers({ ...baseFilters, area_code: ac }))
        )
        for (const result of settled) {
          if (result.status === 'fulfilled') combined.push(...(result.value.data?.data?.numbers ?? []))
        }
      }
      const seen = new Set<string>()
      const dedup = combined.filter((n) => { if (seen.has(n.number)) return false; seen.add(n.number); return true })
      setSearchResults(dedup.slice(0, SEARCH_LIMIT))
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const purchaseMutation = useMutation({
    mutationFn: async (numbers: AvailablePlivoNumber[]) => {
      for (const n of numbers) {
        await plivoService.purchaseNumber(n.number, searchForm.country)
      }
    },
    onSuccess: (_data, numbers) => {
      setConfirmNumbers([]); setPurchaseError(null); setSelected(new Set())
      toast.success(numbers.length > 1 ? `${numbers.length} numbers purchased.` : 'Number purchased.')
      qc.invalidateQueries({ queryKey: ['plivo-numbers'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setPurchaseError(msg ?? 'Unable to purchase. Please try again.')
    },
  })

  const releaseMutation = useMutation({
    mutationFn: (number: string) => plivoService.releaseNumber(number),
    onSuccess: () => { toast.success('Number released'); qc.invalidateQueries({ queryKey: ['plivo-numbers'] }) },
    onError: () => toast.error('Failed to release number'),
  })

  const toggleSelect = (num: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(num) ? next.delete(num) : next.add(num); return next })
  }
  const toggleAll = () => { setSelected(selected.size === searchResults.length ? new Set() : new Set(searchResults.map((n) => n.number))) }
  const selectedNumbers = searchResults.filter((n) => selected.has(n.number))

  const owned: PlivoNumber[] = ownedData?.data?.data?.numbers ?? []
  const ownedTotal = ownedData?.data?.data?.total ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Plivo Phone Numbers</h1>
        <p className="text-sm text-slate-500 mt-0.5">Search, purchase, and manage your Plivo phone numbers</p>
      </div>

      {/* Search panel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Search size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">Search Available Numbers</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Country</label>
              <select value={searchForm.country} onChange={(e) => setSearchForm({ ...searchForm, country: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Area Code(s) <span className="font-normal text-slate-400">· comma-separated</span></label>
              <input value={searchForm.area_code} onChange={(e) => setSearchForm({ ...searchForm, area_code: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="e.g. 212, 646" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Capabilities</label>
              <div className="flex items-center gap-3 h-[38px]">
                {(['voice', 'sms'] as const).map((cap) => (
                  <label key={cap} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={searchForm[cap]} onChange={(e) => setSearchForm({ ...searchForm, [cap]: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-medium text-slate-600 uppercase">{cap}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <button onClick={handleSearch} disabled={searching} className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {searching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>
          </div>

          {searchTriggered && (
            <div className="space-y-3">
              {!searching && selectedNumbers.length > 0 && (
                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5">
                  <p className="text-sm font-medium text-indigo-800">{selectedNumbers.length} number{selectedNumbers.length > 1 ? 's' : ''} selected</p>
                  <button onClick={() => { setPurchaseError(null); setConfirmNumbers(selectedNumbers) }} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                    <ShoppingCart size={12} />Purchase Selected ({selectedNumbers.length})
                  </button>
                </div>
              )}
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2.5 w-8">
                        {!searching && searchResults.length > 0 && (
                          <button onClick={toggleAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
                            {selected.size === searchResults.length ? <CheckSquare size={14} className="text-indigo-600" /> : <Square size={14} />}
                          </button>
                        )}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Number</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Location</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Type</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Capabilities</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {searching && <SearchSkeletonRows />}
                    {!searching && searchResults.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No numbers found. Try different filters.</td></tr>
                    )}
                    {!searching && searchResults.map((n) => {
                      const isSelected = selected.has(n.number)
                      return (
                        <tr key={n.number} className={`transition-colors hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleSelect(n.number)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                              {isSelected ? <CheckSquare size={14} className="text-indigo-600" /> : <Square size={14} />}
                            </button>
                          </td>
                          <td className="px-4 py-3 font-mono font-medium text-slate-900">{n.number}</td>
                          <td className="px-4 py-3 text-slate-600">{[n.region, n.country].filter(Boolean).join(', ')}</td>
                          <td className="px-4 py-3 text-slate-500 capitalize">{n.type}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <CapBadge label="Voice" active={n.capabilities.voice} />
                              <CapBadge label="SMS" active={n.capabilities.sms} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => { setPurchaseError(null); setConfirmNumbers([n]) }} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                              <ShoppingCart size={12} />Buy{n.monthly_rental_rate && ` · $${n.monthly_rental_rate}/mo`}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!searching && searchResults.length > 0 && (
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400">Showing {searchResults.length} of up to {SEARCH_LIMIT} results</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Owned numbers */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash size={15} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">Your Numbers</h2>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">{ownedTotal}</span>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={ownedSearch} onChange={(e) => { setOwnedSearch(e.target.value); setOwnedPage(1) }} placeholder="Search…" className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44" />
          </div>
        </div>

        {ownedLoading ? (
          <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : owned.length === 0 ? (
          <div className="py-12 text-center">
            <Phone size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No phone numbers yet. Search and purchase above.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Number</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Country</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Alias</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Campaign</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {owned.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">{n.number}</td>
                    <td className="px-4 py-3 text-slate-600">{n.country_iso}</td>
                    <td className="px-4 py-3 text-slate-500">{n.alias ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{n.campaign_id ? `Campaign #${n.campaign_id}` : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={async () => { if (await showConfirm({ message: `Release ${n.number}? This cannot be undone.`, confirmText: 'Yes, release it' })) releaseMutation.mutate(n.number) }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Release number"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ownedTotal > 20 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">Showing {(ownedPage - 1) * 20 + 1}–{Math.min(ownedPage * 20, ownedTotal)} of {ownedTotal}</p>
                <div className="flex gap-1">
                  <button onClick={() => setOwnedPage((p) => Math.max(1, p - 1))} disabled={ownedPage === 1} className="px-2.5 py-1 text-xs border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50">Prev</button>
                  <button onClick={() => setOwnedPage((p) => p + 1)} disabled={ownedPage * 20 >= ownedTotal} className="px-2.5 py-1 text-xs border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {confirmNumbers.length > 0 && (
        <PurchaseConfirmModal
          numbers={confirmNumbers}
          isPending={purchaseMutation.isPending}
          error={purchaseError}
          onConfirm={() => purchaseMutation.mutate(confirmNumbers)}
          onCancel={() => { if (!purchaseMutation.isPending) { setConfirmNumbers([]); setPurchaseError(null) } }}
        />
      )}
    </div>
  )
}
