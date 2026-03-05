import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const dncService = {
  // POST /dnc
  // Pagination: lower_limit = offset (start), upper_limit = page size
  // Returns: { success, message, data[], record_count, searchTerm }
  list: (params: TableParams) =>
    api.post('/dnc', {
      lower_limit: (params.page - 1) * params.limit,
      upper_limit: params.limit,
      ...(params.search ? { search: params.search } : {}),
    }),

  // POST /add-dnc
  // Required: number (numeric, min 10 digits). Optional: extension, comment
  add: (number: string, comment: string, extension?: string) =>
    api.post('/add-dnc', {
      number,
      comment,
      ...(extension ? { extension } : {}),
    }),

  // POST /edit-dnc
  // Required: number. Optional: extension, comment
  edit: (number: string, comment: string, extension?: string) =>
    api.post('/edit-dnc', {
      number,
      comment,
      ...(extension ? { extension } : {}),
    }),

  // POST /delete-dnc — hard delete by number
  delete: (number: string) =>
    api.post('/delete-dnc', { number }),
}
