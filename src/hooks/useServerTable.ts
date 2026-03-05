import { useState, useCallback, useRef, useEffect } from 'react'

export interface TableParams {
  page: number
  limit: number
  search: string
  filters: Record<string, string>
}

interface Options {
  defaultLimit?: number
  defaultFilters?: Record<string, string>
  debounceMs?: number
}

export function useServerTable(options: Options = {}) {
  const { defaultLimit = 15, defaultFilters = {}, debounceMs = 400 } = options

  const [page, setPage] = useState(1)
  const [limit] = useState(defaultLimit)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>(defaultFilters)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, debounceMs)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, debounceMs])

  const setFilter = useCallback((key: string, value: string) => {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters)
    setSearch('')
    setPage(1)
  }, [defaultFilters])

  const params: TableParams = {
    page,
    limit,
    search: debouncedSearch,
    filters,
  }

  return {
    params,
    page,
    setPage,
    limit,
    search,
    setSearch,
    filters,
    setFilter,
    resetFilters,
    hasActiveFilters: debouncedSearch.length > 0 || Object.values(filters).some(v => v !== ''),
  }
}
