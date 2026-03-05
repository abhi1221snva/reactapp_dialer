export * from './auth.types'
export * from './dialer.types'

export interface ApiResponse<T = unknown> {
  status: boolean
  message: string
  data: T
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface SelectOption {
  value: string | number
  label: string
}
