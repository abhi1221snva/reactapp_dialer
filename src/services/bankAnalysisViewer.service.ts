import api from '../api/axios'

export interface FullAnalysisRequest {
  session_ids: string[]
  include?: string[]
  transaction_limit?: number
}

export const bankAnalysisViewerService = {
  fetchAnalysis: (payload: FullAnalysisRequest) =>
    api.post('/bank-analysis/fetch', payload, { timeout: 120_000 }),
}
