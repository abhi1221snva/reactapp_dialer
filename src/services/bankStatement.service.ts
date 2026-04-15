import api from '../api/axios'

export interface BankStatementSession {
  id: number
  lead_id: number | null
  batch_id: string | null
  session_id: string
  file_name: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  model_tier: 'lsc_basic' | 'lsc_pro' | 'lsc_max'
  summary_data: Record<string, unknown> | null
  mca_analysis: Record<string, unknown> | null
  monthly_data: Record<string, unknown>[] | null
  fraud_score: number | null
  total_revenue: number | null
  total_deposits: number | null
  nsf_count: number | null
  error_message: string | null
  uploaded_by: number | null
  analyzed_at: string | null
  created_at: string
  updated_at: string | null
  [key: string]: unknown
}

export const bankStatementService = {
  // ── Standalone page ────────────────────────────────────────────────────────
  getAll: (params?: { lead_id?: number; status?: string; page?: number; per_page?: number }) =>
    api.get('/crm/bank-statements', { params }),

  getBySessionId: (sessionId: string) =>
    api.get(`/crm/bank-statements/${sessionId}`),

  uploadStandalone: (formData: FormData, onUploadProgress?: (evt: { loaded: number; total?: number }) => void) =>
    api.post('/crm/bank-statements/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
      onUploadProgress,
    }),

  // ── Lead-specific ──────────────────────────────────────────────────────────
  getLeadSessions: (leadId: number) =>
    api.get(`/crm/lead/${leadId}/bank-statements`),

  upload: (leadId: number, formData: FormData, onUploadProgress?: (evt: { loaded: number; total?: number }) => void) =>
    api.post(`/crm/lead/${leadId}/bank-statements/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
      onUploadProgress,
    }),

  analyzeDocument: (leadId: number, documentId: number, modelTier = 'lsc_pro') =>
    api.post(`/crm/lead/${leadId}/bank-statements/analyze-document`, {
      document_id: documentId,
      model_tier: modelTier,
    }, { timeout: 120_000 }),

  getByDocuments: (leadId: number) =>
    api.get(`/crm/lead/${leadId}/bank-statements/by-documents`),

  /**
   * Consolidated compliance report: combined totals + per-statement list.
   * Filters to document-linked sessions only (matches Documents tab exactly).
   */
  getBankStatementsAnalysis: (leadId: number) =>
    api.get(`/crm/lead/${leadId}/bank-statements-analysis`, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    }),

  getSummary: (leadId: number, sessionId: string) =>
    api.get(`/crm/lead/${leadId}/bank-statements/${sessionId}/summary`),

  getTransactions: (leadId: number, sessionId: string, params?: { type?: string; date_from?: string; date_to?: string }) =>
    api.get(`/crm/lead/${leadId}/bank-statements/${sessionId}/transactions`, { params }),

  getMcaAnalysis: (leadId: number, sessionId: string) =>
    api.get(`/crm/lead/${leadId}/bank-statements/${sessionId}/mca-analysis`),

  getMonthly: (leadId: number, sessionId: string) =>
    api.get(`/crm/lead/${leadId}/bank-statements/${sessionId}/monthly`),

  refresh: (leadId: number, sessionId: string) =>
    api.post(`/crm/lead/${leadId}/bank-statements/${sessionId}/refresh`, {}),

  destroy: (leadId: number, sessionId: string) =>
    api.delete(`/crm/lead/${leadId}/bank-statements/${sessionId}`),

  // ── CSV / PDF Downloads ──────────────────────────────────────────────────
  downloadCsv: (leadId: number, sessionId: string) =>
    api.get(`/crm/lead/${leadId}/bank-statements/${sessionId}/download-csv`, {
      responseType: 'blob',
    }),

  viewPdf: (leadId: number, sessionId: string, download = false) =>
    api.get(`/crm/lead/${leadId}/bank-statements/${sessionId}/pdf`, {
      params: { download: download ? 1 : 0 },
      responseType: 'blob',
    }),

  // ── Transaction Toggles ────────────────────────────────────────────────
  toggleTransactionType: (transactionId: number) =>
    api.post(`/crm/bank-statements/transactions/${transactionId}/toggle-type`, {}),

  toggleRevenueClassification: (transactionId: number, currentClassification: 'true_revenue' | 'adjustment') =>
    api.post(`/crm/bank-statements/transactions/${transactionId}/toggle-revenue`, {
      current_classification: currentClassification,
    }),

  toggleMcaStatus: (transactionId: number, isMca: boolean, lenderId?: string, lenderName?: string) =>
    api.post(`/crm/bank-statements/transactions/${transactionId}/toggle-mca`, {
      is_mca: isMca,
      lender_id: lenderId,
      lender_name: lenderName,
    }),

  // ── Reference Data ─────────────────────────────────────────────────────
  getMcaLenders: () =>
    api.get('/crm/bank-statements/mca-lenders'),

  getStats: () =>
    api.get('/crm/bank-statements/stats'),

  // ── Learned Patterns ───────────────────────────────────────────────────
  getLearnedPatterns: (params?: { page?: number; per_page?: number }) =>
    api.get('/crm/bank-statements/learned-patterns', { params }),

  clearLearnedPatterns: () =>
    api.delete('/crm/bank-statements/learned-patterns'),

  deleteLearnedPattern: (patternId: number) =>
    api.delete(`/crm/bank-statements/learned-patterns/${patternId}`),

  // ── Logs ──────────────────────────────────────────────────────────────────
  getLogs: (params?: { date?: string; search?: string; level?: string; page?: number; per_page?: number }) =>
    api.get('/crm/bank-statements/logs', { params }),

  // ── API Explorer ─────────────────────────────────────────────────────────
  apiExplorer: (params: { session_id: string; endpoint: string }) =>
    api.get('/crm/balji/api-explorer', { params }),
}
