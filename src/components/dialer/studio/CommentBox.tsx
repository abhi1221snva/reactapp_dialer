import { useRef, useEffect } from 'react'
import { MessageSquare, Save, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  value: string
  onChange: (v: string) => void
}

/**
 * Compact auto-expanding comment textarea.
 */
export function CommentBox({ value, onChange }: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [value])

  return (
    <div className="rounded-xl bg-white border border-slate-200/80 overflow-hidden shadow-sm animate-fadeIn">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/40">
        <div className="flex items-center gap-1.5">
          <MessageSquare size={12} className="text-sky-500" />
          <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Quick Comment
          </h3>
        </div>
        <button
          type="button"
          onClick={() => toast.success('Comment saved', { duration: 1400 })}
          disabled={!value.trim()}
          className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Save size={10} /> Save
        </button>
      </div>
      <div className="p-3">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your comment…"
          rows={3}
          className="w-full resize-none text-[13px] text-slate-900 placeholder-slate-400 bg-transparent border-none outline-none leading-relaxed min-h-[64px]"
        />
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-700 transition-colors"
          >
            <Sparkles size={10} /> AI-assist
          </button>
          <span className="text-[10px] text-slate-400 tabular-nums">{value.length} / 1000</span>
        </div>
      </div>
    </div>
  )
}
