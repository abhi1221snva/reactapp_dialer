import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ShoppingCart, Search, Phone, MessageSquare, Image,
  Globe, MapPin, Filter, X, Check, Loader2,
  Copy, History, CreditCard,
  RefreshCw, ChevronLeft, ChevronRight,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../utils/cn'
import { formatPhoneNumber } from '../../utils/format'
import { buyDidService } from '../../services/buyDid.service'
import type { DidNumber, DidProvider, SearchParams, PurchaseLog } from '../../services/buyDid.service'

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVIDER_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  plivo:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200', badge: 'bg-green-100 text-green-800' },
  twilio: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',   badge: 'bg-red-100 text-red-800' },
}

const CAPABILITY_ICONS = {
  voice: { Icon: Phone, label: 'Voice', color: 'text-blue-600' },
  sms:   { Icon: MessageSquare, label: 'SMS', color: 'text-emerald-600' },
  mms:   { Icon: Image, label: 'MMS', color: 'text-purple-600' },
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="h-5 bg-slate-200 rounded w-3/4" />
      <div className="h-4 bg-slate-100 rounded w-1/2" />
      <div className="flex gap-2">
        <div className="h-6 bg-slate-100 rounded-full w-14" />
        <div className="h-6 bg-slate-100 rounded-full w-14" />
      </div>
      <div className="h-4 bg-slate-200 rounded w-1/3" />
    </div>
  )
}

// ─── Number Card ──────────────────────────────────────────────────────────────

function NumberCard({
  number, selected, onToggle,
}: {
  number: DidNumber
  selected: boolean
  onToggle: () => void
}) {
  const providerStyle = PROVIDER_COLORS[number.provider] || PROVIDER_COLORS.plivo
  const formatted = formatPhoneNumber(number.phone_number)

  const copyNumber = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(number.phone_number)
    toast.success('Number copied')
  }

  return (
    <div
      onClick={onToggle}
      className={cn(
        'relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200',
        'hover:shadow-md hover:scale-[1.01]',
        selected
          ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-200'
          : 'border-slate-200 bg-white hover:border-slate-300'
      )}
    >
      {/* Selection indicator */}
      <div className={cn(
        'absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
        selected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
      )}>
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>

      {/* Phone number */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono font-semibold text-slate-900 text-sm">{formatted}</span>
        <button
          onClick={copyNumber}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="Copy number"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Region / Area code */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
        {number.region && (
          <>
            <MapPin className="w-3 h-3" />
            <span>{number.region}</span>
          </>
        )}
        {number.area_code && (
          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
            {number.area_code}
          </span>
        )}
      </div>

      {/* Capabilities */}
      <div className="flex items-center gap-1.5 mb-3">
        {Object.entries(number.capabilities).map(([cap, enabled]) => {
          if (!enabled) return null
          const cfg = CAPABILITY_ICONS[cap as keyof typeof CAPABILITY_ICONS]
          if (!cfg) return null
          return (
            <span
              key={cap}
              className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100', cfg.color)}
            >
              <cfg.Icon className="w-3 h-3" />
              {cfg.label}
            </span>
          )
        })}
      </div>

      {/* Pricing + Provider */}
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="font-semibold text-slate-900">${number.monthly_cost.toFixed(2)}</span>
          <span className="text-slate-500">/mo</span>
          {number.setup_cost > 0 && (
            <span className="ml-1.5 text-xs text-slate-400">+ ${number.setup_cost.toFixed(2)} setup</span>
          )}
        </div>
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', providerStyle.badge)}>
          {number.provider}
        </span>
      </div>
    </div>
  )
}

// ─── Purchase History Section ─────────────────────────────────────────────────

function PurchaseHistoryPanel({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['buy-did-history', page],
    queryFn: () => buyDidService.getPurchaseHistory(page, 20).then(r => r.data),
  })

  const logs = data?.data ?? []
  const meta = data?.meta as { total?: number; total_pages?: number } | undefined

  const statusColors: Record<string, string> = {
    completed: 'text-emerald-700 bg-emerald-50',
    failed:    'text-red-700 bg-red-50',
    pending:   'text-amber-700 bg-amber-50',
    released:  'text-slate-700 bg-slate-50',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4" />
          Purchase History
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse h-12 bg-slate-100 rounded-lg" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No purchase history yet.</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {logs.map((log: PurchaseLog) => (
            <div key={log.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 bg-white">
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm text-slate-900 truncate">
                  {formatPhoneNumber(log.phone_number)}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(log.created_at).toLocaleDateString()} &middot; {log.provider}
                </div>
              </div>
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', statusColors[log.status] || '')}>
                {log.status}
              </span>
              <span className="text-xs text-slate-600 font-medium">
                ${parseFloat(log.monthly_cost).toFixed(2)}/mo
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && (meta.total_pages ?? 0) > 1 && (
        <div className="flex items-center justify-between pt-2 border-t">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500">Page {page} of {meta.total_pages}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= (meta.total_pages ?? 1)}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface BuyDidModalProps {
  isOpen: boolean
  onClose: () => void
  onPurchaseComplete?: () => void
}

export default function BuyDidModal({ isOpen, onClose, onPurchaseComplete }: BuyDidModalProps) {
  // ── State ──
  const [provider, setProvider] = useState<string>('')
  const [country, setCountry] = useState('US')
  const [areaCode, setAreaCode] = useState('')
  const [capabilities, setCapabilities] = useState({ voice: true, sms: false, mms: false })
  const [searchResults, setSearchResults] = useState<DidNumber[]>([])
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set())
  const [showHistory, setShowHistory] = useState(false)
  const [searchOffset, setSearchOffset] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)

  const SEARCH_LIMIT = 20

  // ── Queries ──
  const { data: providersData, isLoading: loadingProviders } = useQuery({
    queryKey: ['buy-did-providers'],
    queryFn: () => buyDidService.getProviders().then(r => r.data),
    enabled: isOpen,
  })

  const providers: DidProvider[] = providersData?.providers ?? []

  // Auto-select first available provider
  useEffect(() => {
    if (!provider && providers.length > 0) {
      const configured = providers.find(p => p.configured && p.is_active)
      if (configured) setProvider(configured.provider)
    }
  }, [providers, provider])

  const selectedProvider = providers.find(p => p.provider === provider)
  const countries = selectedProvider?.countries ?? []

  // ── Search mutation ──
  const searchMutation = useMutation({
    mutationFn: (params: SearchParams) => buyDidService.searchNumbers(params).then(r => r.data),
    onSuccess: (data) => {
      setSearchResults(data.data ?? [])
      setHasSearched(true)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Search failed')
    },
  })

  // Search function — accepts optional overrides for area code
  const doSearch = useCallback((offset = 0, overrides?: { areaCode?: string }) => {
    if (!provider) {
      toast.error('Please select a provider')
      return
    }

    const raw = overrides?.areaCode !== undefined ? overrides.areaCode : areaCode
    // Parse comma-separated area codes
    const codes = raw.split(/[,\s]+/).map(c => c.trim()).filter(Boolean)

    const params: SearchParams = {
      provider,
      country,
      limit: SEARCH_LIMIT,
      offset,
    }

    if (codes.length > 1) {
      params.area_codes = codes.join(',')
    } else if (codes.length === 1) {
      params.area_code = codes[0]
    }

    if (capabilities.voice) params.voice = true
    if (capabilities.sms) params.sms = true
    if (capabilities.mms) params.mms = true

    setSearchOffset(offset)
    searchMutation.mutate(params)
  }, [provider, country, areaCode, capabilities])

  // ── Purchase mutation ──
  const purchaseMutation = useMutation({
    mutationFn: () => {
      const numbers = Array.from(selectedNumbers).map(num => {
        const found = searchResults.find(r => r.phone_number === num)
        return {
          phone_number: num,
          country_code: found?.country_code ?? country,
          area_code: found?.area_code ?? (areaCode || undefined),
          monthly_cost: found?.monthly_cost ?? 0,
          setup_cost: found?.setup_cost ?? 0,
          capabilities: found?.capabilities ?? { voice: true },
        }
      })
      return buyDidService.purchase({ provider, numbers }).then(r => r.data)
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Numbers purchased successfully!')
        setSelectedNumbers(new Set())
        setSearchResults([])
        setHasSearched(false)
        onPurchaseComplete?.()
      } else {
        toast.error(data.message || 'Some purchases failed')
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Purchase failed')
    },
  })

  // ── Helpers ──
  const toggleNumber = (phoneNumber: string) => {
    setSelectedNumbers(prev => {
      const next = new Set(prev)
      if (next.has(phoneNumber)) next.delete(phoneNumber)
      else next.add(phoneNumber)
      return next
    })
  }

  const selectAll = () => {
    if (selectedNumbers.size === searchResults.length) {
      setSelectedNumbers(new Set())
    } else {
      setSelectedNumbers(new Set(searchResults.map(n => n.phone_number)))
    }
  }

  const estimatedMonthly = useMemo(() => {
    return Array.from(selectedNumbers).reduce((sum, num) => {
      const found = searchResults.find(r => r.phone_number === num)
      return sum + (found?.monthly_cost ?? 0)
    }, 0)
  }, [selectedNumbers, searchResults])

  const estimatedSetup = useMemo(() => {
    return Array.from(selectedNumbers).reduce((sum, num) => {
      const found = searchResults.find(r => r.phone_number === num)
      return sum + (found?.setup_cost ?? 0)
    }, 0)
  }, [selectedNumbers, searchResults])

  // ── Reset on close ──
  useEffect(() => {
    if (!isOpen) {
      setSearchResults([])
      setSelectedNumbers(new Set())
      setHasSearched(false)
      setShowHistory(false)
      setSearchOffset(0)
    }
  }, [isOpen])

  if (!isOpen) return null

  // ── Render ──
  return (
    <div className="fixed inset-0 z-[9999] flex items-stretch justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-[960px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100">
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Buy DID Numbers</h2>
              <p className="text-xs text-slate-500">Search and purchase phone numbers from your providers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showHistory ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-500'
              )}
              title="Purchase History"
            >
              <History className="w-4.5 h-4.5" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body: Split layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Filters Panel */}
          <div className="w-[280px] flex-shrink-0 border-r border-slate-200 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
            {showHistory ? (
              <PurchaseHistoryPanel onClose={() => setShowHistory(false)} />
            ) : (
              <>
                {/* Provider selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                    Provider
                  </label>
                  {loadingProviders ? (
                    <div className="animate-pulse h-10 bg-slate-200 rounded-lg" />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {providers.map(p => (
                        <button
                          key={p.provider}
                          onClick={() => { setProvider(p.provider); setSearchResults([]); setHasSearched(false) }}
                          disabled={!p.configured}
                          className={cn(
                            'px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all border',
                            provider === p.provider
                              ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                              : p.configured
                                ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                          )}
                        >
                          {p.provider}
                          {!p.configured && <span className="block text-[10px] text-slate-400 mt-0.5">Not configured</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Country */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                    <Globe className="w-3.5 h-3.5 inline mr-1" />
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={e => { setCountry(e.target.value); setSearchResults([]); setHasSearched(false) }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition"
                  >
                    {countries.length > 0 ? (
                      countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)
                    ) : (
                      <option value="US">United States</option>
                    )}
                  </select>
                </div>

                {/* Area codes — supports multiple comma-separated */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                    <MapPin className="w-3.5 h-3.5 inline mr-1" />
                    Area Code(s)
                  </label>
                  <input
                    type="text"
                    value={areaCode}
                    onChange={e => setAreaCode(e.target.value.replace(/[^\d,\s]/g, '').slice(0, 50))}
                    placeholder="e.g. 212, 310, 516"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Separate multiple codes with commas</p>
                </div>

                {/* Capabilities */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                    <Filter className="w-3.5 h-3.5 inline mr-1" />
                    Capabilities
                  </label>
                  <div className="space-y-2">
                    {Object.entries(CAPABILITY_ICONS).map(([key, cfg]) => (
                      <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={capabilities[key as keyof typeof capabilities]}
                          onChange={e => setCapabilities(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <cfg.Icon className={cn('w-4 h-4', cfg.color)} />
                        <span className="text-sm text-slate-700 group-hover:text-slate-900">{cfg.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Search button */}
                <button
                  onClick={() => doSearch(0)}
                  disabled={!provider || searchMutation.isPending}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                    'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm'
                  )}
                >
                  {searchMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Search Numbers
                </button>

                {/* Quick stats */}
                {selectedNumbers.size > 0 && (
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-indigo-600 font-medium">Selected</span>
                      <span className="font-bold text-indigo-900">{selectedNumbers.size} numbers</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-indigo-600 font-medium">Monthly</span>
                      <span className="font-bold text-indigo-900">${estimatedMonthly.toFixed(2)}/mo</span>
                    </div>
                    {estimatedSetup > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-indigo-600 font-medium">Setup</span>
                        <span className="font-bold text-indigo-900">${estimatedSetup.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT: Results Panel */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Loading state */}
            {searchMutation.isPending && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {/* Empty state */}
            {!searchMutation.isPending && !hasSearched && (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-700 mb-1">Search for Numbers</h3>
                <p className="text-sm text-slate-500 max-w-xs">
                  Select a provider, choose your filters, and click search to find available DID numbers.
                </p>
              </div>
            )}

            {/* No results */}
            {!searchMutation.isPending && hasSearched && searchResults.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                  <AlertCircle className="w-7 h-7 text-amber-500" />
                </div>
                <h3 className="text-base font-semibold text-slate-700 mb-1">No Numbers Found</h3>
                <p className="text-sm text-slate-500 max-w-xs mb-4">
                  {areaCode
                    ? `No numbers available for area code ${areaCode}. Provider inventory for specific area codes can be limited.`
                    : 'Try adjusting your filters or selecting a different country.'}
                </p>
                {areaCode && (
                  <button
                    onClick={() => { setAreaCode(''); doSearch(0, { areaCode: '' }) }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Search without area code
                  </button>
                )}
              </div>
            )}

            {/* Results header */}
            {!searchMutation.isPending && searchResults.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {searchResults.length} Numbers Available
                    </h3>
                    <button
                      onClick={selectAll}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {selectedNumbers.size === searchResults.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <button
                    onClick={() => doSearch(0)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                    title="Refresh results"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                </div>

                {/* Grid of number cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchResults.map(num => (
                    <NumberCard
                      key={num.phone_number}
                      number={num}
                      selected={selectedNumbers.has(num.phone_number)}
                      onToggle={() => toggleNumber(num.phone_number)}
                    />
                  ))}
                </div>

                {/* Load more / Pagination */}
                {searchResults.length >= SEARCH_LIMIT && (
                  <div className="flex items-center justify-center gap-3 mt-5">
                    {searchOffset > 0 && (
                      <button
                        onClick={() => doSearch(Math.max(0, searchOffset - SEARCH_LIMIT))}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Previous
                      </button>
                    )}
                    <button
                      onClick={() => doSearch(searchOffset + SEARCH_LIMIT)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
                    >
                      Load More
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        {selectedNumbers.size > 0 && (
          <div className="border-t border-slate-200 px-6 py-4 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-100">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {selectedNumbers.size} number{selectedNumbers.size > 1 ? 's' : ''} selected
                    </div>
                    <div className="text-xs text-slate-500">
                      ${estimatedMonthly.toFixed(2)}/mo
                      {estimatedSetup > 0 && ` + $${estimatedSetup.toFixed(2)} setup`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedNumbers(new Set())}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Clear
                </button>
                <button
                  onClick={() => purchaseMutation.mutate()}
                  disabled={purchaseMutation.isPending}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm',
                    'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 hover:shadow-md',
                    'disabled:opacity-60 disabled:cursor-not-allowed'
                  )}
                >
                  {purchaseMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Purchasing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Purchase {selectedNumbers.size > 1 ? `${selectedNumbers.size} Numbers` : 'Number'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
