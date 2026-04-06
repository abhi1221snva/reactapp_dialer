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

  download: () =>
    api.get('/download-exclude-number', { responseType: 'blob' }).then((res) => {
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `exclude_list_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    }),

  uploadExcel: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/upload-exclude-number', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
