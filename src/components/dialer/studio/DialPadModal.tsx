import { useState, useEffect } from 'react'
import { X, Delete, Phone, Grid3x3 } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSend: (digits: string) => void
}

const KEYS: { digit: string; letters: string }[] = [
  { digit: '1', letters: ''     },
  { digit: '2', letters: 'ABC'  },
  { digit: '3', letters: 'DEF'  },
  { digit: '4', letters: 'GHI'  },
  { digit: '5', letters: 'JKL'  },
  { digit: '6', letters: 'MNO'  },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV'  },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: ''     },
  { digit: '0', letters: '+'    },
  { digit: '#', letters: ''     },
]

export function DialPadModal({ isOpen, onClose, onSend }: Props) {
  const [digits, setDigits] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setDigits('')
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (/^[0-9*#]$/.test(e.key)) setDigits((d) => d + e.key)
      if (e.key === 'Backspace') setDigits((d) => d.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const add = (d: string) => {
    setDigits((x) => x + d)
    // Optional: play DTMF tone here
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xs bg-white rounded-2xl shadow-2xl animate-slideUp overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Grid3x3 size={14} className="text-white" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Dial Pad</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Display */}
        <div className="px-5 pt-5 pb-3">
          <div className="relative">
            <input
              value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/[^0-9*#+]/g, ''))}
              placeholder="Enter number…"
              className="w-full text-center text-2xl font-semibold tabular-nums text-slate-900 placeholder-slate-300 bg-slate-50 rounded-xl py-3 px-10 outline-none border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
            />
            {digits && (
              <button
                onClick={() => setDigits((d) => d.slice(0, -1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                title="Backspace"
              >
                <Delete size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="px-5 pb-5">
          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((k) => (
              <button
                key={k.digit}
                onClick={() => add(k.digit)}
                className="group flex flex-col items-center justify-center h-14 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 active:bg-indigo-100 transition-all"
              >
                <span className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 leading-none">
                  {k.digit}
                </span>
                {k.letters && (
                  <span className="text-[9px] font-semibold tracking-widest text-slate-400 mt-0.5">
                    {k.letters}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => { onSend(digits); setDigits('') }}
            disabled={!digits.trim()}
            className="mt-4 w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-md hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Phone size={14} /> Send Tones
          </button>
        </div>
      </div>
    </div>
  )
}
