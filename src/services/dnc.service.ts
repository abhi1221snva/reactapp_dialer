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

  getExtensions: () => api.get('/extension'),
}
