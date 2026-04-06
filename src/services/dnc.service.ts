import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const dncService = {
  list: (params: TableParams) =>
    api.post('/dnc', {
      lower_limit: (params.page - 1) * params.limit,
      upper_limit: params.limit,
      ...(params.search ? { search: params.search } : {}),
    }),

  add: (number: string, comment: string, extension?: string) =>
    api.post('/add-dnc', {
      number,
      comment,
      ...(extension ? { extension } : {}),
    }),

  edit: (number: string, comment: string, extension?: string) =>
    api.post('/edit-dnc', {
      number,
      comment,
      ...(extension ? { extension } : {}),
    }),

  delete: (number: string) =>
    api.post('/delete-dnc', { number }),

  uploadExcel: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/upload-dnc', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },

  download: () =>
    api.get('/download-dnc', { responseType: 'blob' }).then((res) => {
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dnc_list_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    }),

  getExtensions: () => api.get('/extension'),
}
