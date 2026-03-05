import api from '../api/axios'

export interface CdrFilters {
  start_date?: string
  end_date?: string
  extension?: string
  campaign?: number | string
  disposition?: number[]
  route?: string
  type?: string
  number?: string
  cli_filter?: string
  lower_limit?: number
  upper_limit?: number
}

export const reportService = {
  getCdr: (params: CdrFilters) =>
    api.post('/report', params),

  getCampaignList: () =>
    api.get('/campaigns'),

  getDispositionList: () =>
    api.post('/disposition', {}),

  // B14 fixed: /export-report added to backend routes/web.php → ReportController@exportReport
  exportCsv: (params: Record<string, unknown>) =>
    api.post('/export-report', params, { responseType: 'blob' }),
}
