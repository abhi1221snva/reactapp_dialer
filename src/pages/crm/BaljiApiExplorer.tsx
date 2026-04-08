import { useState, useCallback } from 'react'
import {
  Loader2, Send, Copy, Check, Terminal, Globe, Clock, FileJson,
  ChevronDown, Zap, Search, ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { bankStatementService } from '../../services/bankStatement.service'

const ENDPOINTS = [
  { value: 'session',      label: 'Session Details',   method: 'GET', path: '/bank-statement/sessions/{id}' },
  { value: 'summary',      label: 'Summary',           method: 'GET', path: '/bank-statement/sessions/{id}/summary' },
  { value: 'transactions', label: 'Transactions',      method: 'GET', path: '/bank-statement/sessions/{id}/transactions' },
  { value: 'mca-analysis', label: 'MCA Analysis',      method: 'GET', path: '/bank-statement/sessions/{id}/mca-analysis' },
  { value: 'monthly',      label: 'Monthly Data',      method: 'GET', path: '/bank-statement/sessions/{id}/monthly' },
]

const BASE_URL = 'https://ai.easify.app/api/v1'

function StatusBadge({ status }: { status: number | null }) {
  if (!status) return null
  const color = status >= 200 && status < 300 ? 'bg-emerald-500' : status >= 400 ? 'bg-red-500' : 'bg-amber-500'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-white ${color}`}>
      {status}
    </span>
  )
}

export function BaljiApiExplorer() {
  useCrmHeader()

  const [sessionId, setSessionId] = useState('')
  const [endpoint, setEndpoint] = useState('session')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<{ status: number; duration: string; url: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<Array<{ sessionId: string; endpoint: string; status: number; duration: string; timestamp: string }>>([])

  const selectedEndpoint = ENDPOINTS.find(e => e.value === endpoint)!
  const fullUrl = `${BASE_URL}${selectedEndpoint.path.replace('{id}', sessionId || '{session_id}')}`

  const handleSend = useCallback(async () => {
    if (!sessionId.trim()) {
      toast.error('Enter a session ID')
      return
    }

    setLoading(true)
    setError(null)
    setResponse(null)
    setMeta(null)

    try {
      const res = await bankStatementService.apiExplorer({ session_id: sessionId.trim(), endpoint })
      const payload = res.data?.data ?? res.data ?? {}
      setResponse(payload.response ?? payload)
      setMeta({
        status: payload.meta?.status ?? 200,
        duration: payload.meta?.duration ?? '—',
        url: payload.request?.url ?? fullUrl,
      })
      setHistory(prev => [{
        sessionId: sessionId.trim(),
        endpoint,
        status: payload.meta?.status ?? 200,
        duration: payload.meta?.duration ?? '—',
        timestamp: new Date().toLocaleTimeString(),
      }, ...prev].slice(0, 20))
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Request failed'
      setError(msg)
      setMeta({
        status: err?.response?.status ?? 0,
        duration: '—',
        url: fullUrl,
      })
      setHistory(prev => [{
        sessionId: sessionId.trim(),
        endpoint,
        status: err?.response?.status ?? 0,
        duration: '—',
        timestamp: new Date().toLocaleTimeString(),
      }, ...prev].slice(0, 20))
    } finally {
      setLoading(false)
    }
  }, [sessionId, endpoint, fullUrl])

  const handleCopy = useCallback(() => {
    if (!response) return
    navigator.clipboard.writeText(JSON.stringify(response, null, 2))
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }, [response])

  const copyCurl = useCallback(() => {
    const curl = `curl -X 'GET' \\\n  '${fullUrl}' \\\n  -H 'accept: application/json' \\\n  -H 'Authorization: Bearer {token}'`
    navigator.clipboard.writeText(curl)
    toast.success('cURL copied')
  }, [fullUrl])

  return (
    <div className="space-y-4">

      {/* Request Builder */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Top bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-3">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-emerald-400" />
            <span className="text-sm font-bold text-white">Balji API Explorer</span>
            <span className="text-[10px] text-slate-400 ml-1">ai.easify.app/api/v1</span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* URL bar */}
          <div className="flex items-center gap-2">
            <span className="shrink-0 px-2.5 py-1.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded">
              GET
            </span>
            <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
              <span className="px-3 text-xs text-slate-400 shrink-0 border-r border-slate-200">{BASE_URL}</span>
              <input
                value={selectedEndpoint.path.replace('{id}', sessionId || '{session_id}')}
                readOnly
                className="flex-1 px-3 py-2 text-xs text-slate-700 font-mono bg-transparent outline-none"
              />
            </div>
            <button onClick={copyCurl} title="Copy as cURL"
              className="shrink-0 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
              <Terminal size={14} />
            </button>
          </div>

          {/* Session ID + Endpoint */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[280px]">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Session ID</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={sessionId}
                  onChange={e => setSessionId(e.target.value)}
                  placeholder="e.g. 6c9582a2-bd33-49e0-bfeb-b45fc46dc210"
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 placeholder:text-slate-300"
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
              </div>
            </div>

            <div className="min-w-[180px]">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Endpoint</label>
              <div className="relative">
                <select value={endpoint} onChange={e => setEndpoint(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                  {ENDPOINTS.map(ep => (
                    <option key={ep.value} value={ep.value}>{ep.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="pt-4">
              <button onClick={handleSend} disabled={loading || !sessionId.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg transition shadow-sm">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Response */}
      {(response || error) && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Response header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
              <FileJson size={14} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">Response</span>
              {meta && (
                <>
                  <StatusBadge status={meta.status} />
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock size={11} /> {meta.duration}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {response && (
                <button onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition">
                  {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>

          {/* Response body */}
          {error ? (
            <div className="p-4">
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <Zap size={14} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Error</p>
                  <p className="text-xs text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-auto">
              <pre className="p-4 text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}

          {/* Request URL footer */}
          {meta?.url && (
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Globe size={11} className="text-slate-400" />
                <span className="text-[11px] font-mono text-slate-500 truncate">{meta.url}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Request History */}
      {history.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">Request History</span>
              <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full">{history.length}</span>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[240px] overflow-auto">
            {history.map((h, i) => (
              <button key={i} onClick={() => { setSessionId(h.sessionId); setEndpoint(h.endpoint) }}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition text-left">
                <StatusBadge status={h.status} />
                <span className="text-xs font-mono text-slate-600 truncate flex-1">{h.sessionId}</span>
                <ArrowRight size={10} className="text-slate-300" />
                <span className="text-[11px] text-slate-500 font-medium">{ENDPOINTS.find(e => e.value === h.endpoint)?.label}</span>
                <span className="text-[10px] text-slate-400">{h.duration}</span>
                <span className="text-[10px] text-slate-400">{h.timestamp}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
