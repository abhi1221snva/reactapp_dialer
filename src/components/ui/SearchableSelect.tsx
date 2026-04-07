import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, ChevronDown } from 'lucide-react'

export interface SearchableOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SearchableOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  /** Show an empty first option (e.g. "— Select —") */
  emptyLabel?: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  className = 'input',
  disabled = false,
  emptyLabel,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

  const updatePos = useCallback(() => {
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    updatePos()
    const onScroll = () => updatePos()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [isOpen, updatePos])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        wrapRef.current && !wrapRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const selectedLabel = options.find(o => o.value === value)?.label

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setIsOpen(o => !o); setQuery('') } }}
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          paddingRight: 28,
          width: '100%',
          appearance: 'none',
          backgroundImage: 'none',
          position: 'relative',
        }}
      >
        <span style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: selectedLabel ? undefined : '#94a3b8',
          fontSize: 13,
        }}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          size={13}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: `translateY(-50%) rotate(${isOpen ? 180 : 0}deg)`,
            color: '#64748b',
            transition: 'transform 0.15s',
            flexShrink: 0,
          }}
        />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            background: '#fff',
            border: '1.5px solid #e2e8f0',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,.12)',
            zIndex: 9999,
            maxHeight: 280,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Search input */}
          <div style={{
            padding: '8px 10px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}>
            <Search size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              onClick={e => e.stopPropagation()}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: 13,
                color: '#0f172a',
                background: 'transparent',
                padding: 0,
                height: 24,
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Options */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {emptyLabel && (
              <button
                type="button"
                onClick={() => { onChange(''); setIsOpen(false); setQuery('') }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  background: value === '' ? '#eef2ff' : 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#94a3b8',
                  textAlign: 'left',
                  fontStyle: 'italic',
                }}
                onMouseEnter={e => { if (value !== '') e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (value !== '') e.currentTarget.style.background = 'transparent' }}
              >
                {emptyLabel}
              </button>
            )}
            {filtered.map((o, idx) => {
              const sel = o.value === value
              return (
                <button
                  key={`${o.value}-${idx}`}
                  type="button"
                  onClick={() => { onChange(o.value); setIsOpen(false); setQuery('') }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: sel ? '#eef2ff' : 'transparent',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#0f172a',
                    textAlign: 'left',
                    fontWeight: sel ? 600 : 400,
                  }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#f8fafc' }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}
                >
                  {o.label}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '12px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
                No results found
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
