const KEYS = [
  [{ d: '1', s: '' },     { d: '2', s: 'ABC' },  { d: '3', s: 'DEF' }],
  [{ d: '4', s: 'GHI' },  { d: '5', s: 'JKL' },  { d: '6', s: 'MNO' }],
  [{ d: '7', s: 'PQRS' }, { d: '8', s: 'TUV' },  { d: '9', s: 'WXYZ' }],
  [{ d: '*', s: '' },      { d: '0', s: '+' },     { d: '#', s: '' }],
]

export function DialPad({ onPress, compact = false }: { onPress: (key: string) => void; compact?: boolean }) {
  const h = compact ? 36 : 46

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: compact ? 6 : 8, padding: compact ? '4px 12px' : '4px 14px' }}>
      {KEYS.flat().map(({ d, s }) => (
        <button
          key={d}
          type="button"
          onClick={() => onPress(d)}
          style={{
            height: h,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: compact ? 10 : 13,
            background: 'rgba(59,130,246,0.14)',
            border: '1px solid rgba(96,165,250,0.18)',
            cursor: 'pointer',
            transition: 'background 0.08s ease, transform 0.06s ease',
            userSelect: 'none',
          }}
          onMouseDown={e => {
            e.currentTarget.style.background = 'rgba(59,130,246,0.38)'
            e.currentTarget.style.transform = 'scale(0.93)'
          }}
          onMouseUp={e => {
            e.currentTarget.style.background = 'rgba(59,130,246,0.14)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(59,130,246,0.14)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(59,130,246,0.22)'
          }}
        >
          <span style={{ fontSize: compact ? 15 : 18, fontWeight: 600, color: '#F1F5F9', lineHeight: 1 }}>{d}</span>
          {s && (
            <span style={{ fontSize: 7, fontWeight: 700, color: 'rgba(147,197,253,0.75)', letterSpacing: '0.14em', marginTop: 2 }}>
              {s}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
