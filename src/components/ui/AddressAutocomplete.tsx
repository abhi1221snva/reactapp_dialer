import { useEffect, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, Loader2 } from 'lucide-react'
import { parseNominatimResult, type ParsedPlace, type NominatimResult } from '../../utils/addressFieldMapping'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect: (parsed: ParsedPlace) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
  /** @deprecated No longer needed — all requests use the public endpoint */
  isPublic?: boolean
}

/** Highlight portions of text that match the query */
function highlightMatch(text: string, query: string) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span className="addr-match">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Start typing an address...',
  className = 'crm-fi',
  style,
}: AddressAutocompleteProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [selected, setSelected] = useState(false)
  const [warning, setWarning] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })

  // Recalculate dropdown position relative to viewport
  const updateDropdownPos = useCallback(() => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    })
  }, [])

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }

    // Cancel previous request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const url = `${API_BASE}/public/geocode/search?q=${encodeURIComponent(query)}`
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) throw new Error('Geocode API error')
      const data: NominatimResult[] = await res.json()
      setSuggestions(data)
      setOpen(data.length > 0)
      setActiveIdx(-1)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setSuggestions([])
        setOpen(false)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const selectResult = useCallback((result: NominatimResult) => {
    const parsed = parseNominatimResult(result)
    setSelected(true)
    setWarning(false)
    setOpen(false)
    setSuggestions([])
    onChange(parsed.street)
    onPlaceSelect(parsed)
  }, [onChange, onPlaceSelect])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSelected(false)
    setWarning(false)
    onChange(val)

    // Debounce API call
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(prev => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(prev => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        selectResult(suggestions[activeIdx])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const handleBlur = () => {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      setOpen(false)
      if (value && !selected) setWarning(true)
    }, 200)
  }

  const handleFocus = () => {
    if (suggestions.length > 0 && !selected) {
      updateDropdownPos()
      setOpen(true)
    }
  }

  // Update dropdown position when open changes or on scroll/resize
  useEffect(() => {
    if (!open) return
    updateDropdownPos()

    const onScroll = () => updateDropdownPos()
    const onResize = () => updateDropdownPos()

    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, updateDropdownPos])

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !dropdownRef.current) return
    const el = dropdownRef.current.children[activeIdx] as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const iconColor = selected ? '#059669' : '#94a3b8'

  // Split display_name into main line + secondary
  const splitDisplay = (result: NominatimResult) => {
    const parts = result.display_name.split(', ')
    const main = parts.slice(0, 2).join(', ')
    const sub = parts.slice(2).join(', ')
    return { main, sub }
  }

  const dropdown = open ? createPortal(
    <div
      className="addr-dd"
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
      }}
    >
      {loading && (
        <div className="addr-dd-loading">
          <Loader2 size={12} className="animate-spin" /> Searching...
        </div>
      )}
      {!loading && suggestions.length === 0 && (
        <div className="addr-dd-empty">No results found</div>
      )}
      {suggestions.map((result, i) => {
        const { main, sub } = splitDisplay(result)
        return (
          <div
            key={result.place_id}
            className={`addr-dd-item${i === activeIdx ? ' active' : ''}`}
            onMouseDown={() => selectResult(result)}
            onMouseEnter={() => setActiveIdx(i)}
          >
            <MapPin size={13} style={{ color: '#94a3b8', marginTop: 2, flexShrink: 0 }} />
            <div>
              <div className="addr-main">{highlightMatch(main, value)}</div>
              {sub && <div className="addr-sub">{sub}</div>}
            </div>
          </div>
        )
      })}
    </div>,
    document.body,
  ) : null

  return (
    <div ref={wrapperRef} style={{ position: 'relative', ...style }}>
      <div style={{ position: 'relative' }}>
        <MapPin
          size={14}
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: iconColor,
            pointerEvents: 'none',
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={className}
          style={{
            paddingLeft: 30,
            width: '100%',
            ...(warning ? { borderColor: '#f59e0b' } : {}),
          }}
          autoComplete="off"
        />
        {loading && (
          <Loader2
            size={13}
            className="animate-spin"
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
        )}
      </div>

      {dropdown}

      {warning && (
        <span style={{ fontSize: 11, color: '#f59e0b', marginTop: 2, display: 'block' }}>
          Please select a valid address from suggestions
        </span>
      )}
    </div>
  )
}
