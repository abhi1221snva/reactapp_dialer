import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const excludeListService = {
  list: (params: TableParams) =>
    api.post('/exclude-number', {
      lower_limit: (params.page - 1) * params.limit,
      upper_limit: params.limit,
      ...(params.search ? { search: params.search } : {}),
    }),

  add: (data: {
    number: string
    campaign_id: number
    first_name?: string
    last_name?: string
    company_name?: string
  }) => api.post('/add-exclude-number', data),

  edit: (data: {
    number: string
    campaign_id: number
    first_name?: string
    last_name?: string
    company_name?: string
  }) => api.post('/edit-exclude-number', data),

  delete: (number: string, campaign_id: number) =>
    api.post('/delete-exclude-number', { number, campaign_id }),

  uploadExcel: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/upload-exclude-number', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
