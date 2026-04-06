import api from '../api/axios'

export interface RecordingReportFilters {
  start_date?: string
  end_date?: string
  number?: string
  extension?: string
  route?: string
  type?: string
  campaign_id?: number | string
  status?: string
  duration_min?: number | string
  duration_max?: number | string
  search?: string
  sort_by?: string
  sort_dir?: string
  page?: number
  per_page?: number
}

export interface RecordingReportStats {
  total_calls: number
  answered: number
  missed: number
  inbound: number
  outbound: number
  avg_duration: number
  total_duration: number
  with_recording: number
}

export const callRecordingReportService = {
  getRecords: (params: RecordingReportFilters) =>
    api.post('/reports/call-recordings', params),

  getStats: (params: { start_date?: string; end_date?: string }) =>
    api.post('/reports/call-recordings/stats', params),

  getDetail: (id: number) =>
    api.get(`/reports/call-recordings/${id}`),

  exportCsv: (params: RecordingReportFilters) =>
    api.post('/reports/call-recordings/export', params, { responseType: 'blob' }),
}
