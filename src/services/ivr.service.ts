import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const ivrService = {
  // IVR list (paginated)
  list: (params: TableParams) =>
    api.post('/ivr', {
      start: (params.page - 1) * params.limit,
      limit: params.limit,
      ...(params.search ? { search: params.search } : {}),
    }),

  create: (data: Record<string, unknown>) => api.post('/add-ivr', data),
  update: (data: Record<string, unknown>) => api.post('/edit-ivr', data),
  delete: (id: number) => api.post('/delete-ivr', { auto_id: id }),

  // IVR Menu
  getMenu: (ivrId: string) => api.post('/ivr-menu', { ivr_id: ivrId }),
  addMenu: (data: Record<string, unknown>) => api.post('/add-ivr-menu', data),
  editMenu: (data: Record<string, unknown>) => api.post('/edit-ivr-menu', data),
  deleteMenu: (id: number) => api.post('/delete-ivr-menu', { auto_id: id }),

  getDestTypes: () => api.post('/dest-type', {}),

  // Audio Messages
  listAudio: (params: TableParams) =>
    api.get('/audio-message', {
      params: {
        start: (params.page - 1) * params.limit,
        limit: params.limit,
        ...(params.search ? { search: params.search } : {}),
      },
    }),
  createAudio: (data: Record<string, unknown>) => api.post('/add-audio-message', data),
  updateAudio: (data: Record<string, unknown>) => api.post('/edit-audio-message', data),
  deleteAudio: (id: number) => api.post('/delete-audio-message', { auto_id: id }),

  // Upload a raw audio file; returns { relative_path, filename }
  uploadAudio: (formData: FormData) =>
    api.post('/upload-audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Generate TTS audio and save to tenant storage; returns { relative_path, filename }
  generateTts: (data: {
    speech_text: string
    language: string
    voice_name?: string
    voice_gender?: string
    speed?: string
    pitch?: string
  }) => api.post('/generate-tts', data),

  // Fetch stored audio file as Blob for in-browser playback
  fetchAudioBlob: (subdir: string, filename: string) =>
    api.get(`/crm/tenant-file/${subdir}/${encodeURIComponent(filename)}`, {
      responseType: 'blob',
    }),

  // Destination lookups for IVR Menu routing
  getClientExtensions: () => api.post('/get-client-extension', {}),
  getRingGroups: () => api.post('/ring-group', {}),
}
