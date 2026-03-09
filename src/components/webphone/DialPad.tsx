const KEYS = [
  [{ d: '1', s: '' },    { d: '2', s: 'ABC' },  { d: '3', s: 'DEF' }],
  [{ d: '4', s: 'GHI' }, { d: '5', s: 'JKL' },  { d: '6', s: 'MNO' }],
  [{ d: '7', s: 'PQRS'},{ d: '8', s: 'TUV' },  { d: '9', s: 'WXYZ'}],
  [{ d: '*', s: '' },    { d: '0', s: '+' },     { d: '#', s: '' }],
]

export function DialPad({ onPress }: { onPress: (key: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 px-4">
      {KEYS.flat().map(({ d, s }) => (
        <button
          key={d}
          type="button"
          onClick={() => onPress(d)}
          className="flex flex-col items-center justify-center select-none rounded-2xl transition-transform duration-75"
          style={{ height: '40px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)'; e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.borderColor = '#C7D2FE' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0' }}
        >
          <span style={{ fontSize: '17px', fontWeight: 600, color: '#1E293B', lineHeight: 1 }}>{d}</span>
          {s && <span style={{ fontSize: '8px', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.12em', marginTop: '2px' }}>{s}</span>}
        </button>
      ))}
    </div>
  )
}
