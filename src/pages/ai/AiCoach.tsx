import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Headphones, Play, BarChart2, CheckCircle2, XCircle, AlertCircle,
  Loader2, Mic, Award, TrendingUp, MessageSquare, ClipboardList,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import api from '../../api/axios'
import { cn } from '../../utils/cn'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface ScorecardItem {
  category: string
  score: number
  notes: string
}

interface CoachResult {
  scorecard: ScorecardItem[]
  summary: {
    total_score?: number
    final_score?: number
    lead_category?: string
    email_subject?: string
    email_body?: string
    transcript?: string
  }
  transcript?: string
  error?: string
}

// ─── Score bar ──────────────────────────────────────────────────────────────────

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.min(100, (score / max) * 100)
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-8 text-right">{score}/{max}</span>
    </div>
  )
}

// ─── Category badge ─────────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return null
  const text = String(category)
  if (text.includes('🟢') || text.toLowerCase().includes('hot')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={14} /> Hot Lead
      </span>
    )
  }
  if (text.includes('🟡') || text.toLowerCase().includes('warm')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <AlertCircle size={14} /> Warm Lead
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-red-50 text-red-700 border border-red-200">
      <XCircle size={14} /> Cold Lead
    </span>
  )
}

// ─── Result Panel ───────────────────────────────────────────────────────────────

function ResultPanel({ result, wavUrl }: { result: CoachResult; wavUrl: string }) {
  const [showTranscript, setShowTranscript] = useState(false)
  const { scorecard, summary } = result
  const transcript = result.transcript ?? summary?.transcript ?? ''

  const finalScore = summary?.final_score ?? 0
  const totalScore = summary?.total_score ?? 0
  const scoreColor = finalScore >= 7 ? 'text-emerald-600' : finalScore >= 4 ? 'text-amber-600' : 'text-red-600'
  const scoreBg = finalScore >= 7 ? 'bg-emerald-50 border-emerald-200' : finalScore >= 4 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

  return (
    <div className="space-y-5">
      {/* Audio player */}
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Play size={15} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Recording</p>
            <p className="text-xs text-slate-400 truncate max-w-xs">{wavUrl}</p>
          </div>
        </div>
        <audio controls className="w-full h-9 rounded-lg" src={wavUrl}>
          Your browser does not support audio playback.
        </audio>
      </div>

      {/* Summary scores */}
      <div className="grid grid-cols-3 gap-4">
        <div className={cn('card border-2 text-center', scoreBg)}>
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Award size={16} className={scoreColor} />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">AI Score</span>
          </div>
          <p className={cn('text-3xl font-black', scoreColor)}>{finalScore.toFixed(1)}</p>
          <p className="text-xs text-slate-400 mt-0.5">out of 10</p>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <TrendingUp size={16} className="text-blue-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{totalScore}</p>
          <p className="text-xs text-slate-400 mt-0.5">out of 80</p>
        </div>
        <div className="card text-center flex flex-col items-center justify-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</span>
          <CategoryBadge category={summary?.lead_category} />
        </div>
      </div>

      {/* Scorecard table */}
      {scorecard && scorecard.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/70 border-b border-slate-100">
            <ClipboardList size={14} className="text-indigo-500" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Scorecard</span>
            <span className="ml-auto text-xs text-slate-400">{scorecard.length} categories</span>
          </div>
          <div className="divide-y divide-slate-100">
            {scorecard.map((item, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <span className="text-sm font-semibold text-slate-800 leading-tight">{item.category}</span>
                  <span className={cn('text-sm font-bold flex-shrink-0',
                    item.score >= 7 ? 'text-emerald-600' : item.score >= 4 ? 'text-amber-600' : 'text-red-600'
                  )}>{item.score}/10</span>
                </div>
                <ScoreBar score={item.score} />
                {item.notes && (
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{item.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcript toggle */}
      {transcript && (
        <div className="card p-0 overflow-hidden">
          <button
            onClick={() => setShowTranscript(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/70 border-b border-slate-100 hover:bg-slate-100/70 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Transcript</span>
            </div>
            {showTranscript ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
          </button>
          {showTranscript && (
            <div className="px-4 py-4">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{transcript}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export function AiCoach() {
  const [wavUrl, setWavUrl] = useState('')
  const [result, setResult] = useState<CoachResult | null>(null)

  const analyzeMutation = useMutation({
    mutationFn: (url: string) =>
      api.get('/ai-coach-api', { params: { wav_url: url } }),
    onSuccess: (res) => {
      const data = res.data as CoachResult
      if (data?.error) {
        setResult(null)
        // show error inline
        return
      }
      setResult(data)
    },
    onError: () => {
      setResult(null)
    },
  })

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault()
    if (!wavUrl.trim()) return
    setResult(null)
    analyzeMutation.mutate(wavUrl.trim())
  }

  return (
    <div className="space-y-6">
      {/* How it works */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Mic, label: 'Transcribe', desc: 'Deepgram converts the call audio to text', color: 'bg-blue-50 text-blue-600' },
          { icon: BarChart2, label: 'Analyze', desc: 'OpenAI scores the conversation on 8 key criteria', color: 'bg-purple-50 text-purple-600' },
          { icon: Award, label: 'Score', desc: 'Get a lead category, agent score, and coaching notes', color: 'bg-amber-50 text-amber-600' },
        ].map(({ icon: Icon, label, desc, color }) => (
          <div key={label} className="card text-center">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2', color)}>
              <Icon size={18} />
            </div>
            <p className="text-sm font-semibold text-slate-900">{label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* Analysis form */}
      <div className="card">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Headphones size={18} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Analyze a Call Recording</h2>
            <p className="text-xs text-slate-500">Paste a direct URL to a .wav or .mp3 call recording</p>
          </div>
        </div>

        <form onSubmit={handleAnalyze} className="flex gap-3">
          <input
            className="input flex-1"
            value={wavUrl}
            onChange={e => setWavUrl(e.target.value)}
            placeholder="https://your-storage.com/recording.wav"
            disabled={analyzeMutation.isPending}
          />
          <button
            type="submit"
            disabled={!wavUrl.trim() || analyzeMutation.isPending}
            className="btn-primary gap-2 flex-shrink-0"
          >
            {analyzeMutation.isPending
              ? <><Loader2 size={15} className="animate-spin" /> Analyzing…</>
              : <><Play size={15} /> Analyze</>}
          </button>
        </form>

        {analyzeMutation.isPending && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 size={15} className="animate-spin text-indigo-500 flex-shrink-0" />
              <span>Transcribing audio with Deepgram… this may take 15–30 seconds</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        )}

        {analyzeMutation.isError && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            <XCircle size={15} className="flex-shrink-0" />
            Failed to analyze recording. Check the URL and try again.
          </div>
        )}
      </div>

      {/* Results */}
      {result && <ResultPanel result={result} wavUrl={wavUrl} />}
    </div>
  )
}
