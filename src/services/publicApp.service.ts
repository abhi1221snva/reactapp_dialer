import axios from 'axios'

const API = import.meta.env.VITE_API_URL ?? ''

const http = axios.create({ baseURL: API })

export interface PublicCompany {
  company_name: string
  logo_url: string | null
  website_url: string | null
  support_email: string | null
  company_phone?: string
}

export interface PublicFormField {
  key: string
  label: string
  type: string
  required: boolean
  placeholder?: string
  options?: string[]
  column?: string
}

export interface PublicFormSection {
  title: string
  fields: PublicFormField[]
}

export interface PublicApplyData {
  company: PublicCompany
  sections: PublicFormSection[]
  affiliate_user: { name: string; email: string }
}

export interface SubmitResult {
  lead_token: string
  merchant_url: string
  lead_id: number
  message: string
  signature_url: string | null
  pdf_url: string
}

export interface MerchantLeadData {
  id: number
  lead_status: string
  lead_type: string
  lead_token: string
  affiliate_code: string | null
  created_at: string
  fields: Record<string, string>
  signature_url: string | null
  signature_url_2: string | null
  documents: MerchantDocument[]
}

export interface MerchantDocument {
  id: number
  filename: string
  doc_type: string
  url: string
  uploaded: string
}

export interface PublicDocumentType {
  id: number
  title: string
  type_title_url: string
  values: string | null
}

export interface MerchantPortalData {
  company: PublicCompany
  lead: MerchantLeadData
  sections: PublicFormSection[]
}

/**
 * Extract the filename from an axios response's Content-Disposition header.
 * Falls back to `fallback` if the header is absent or has no filename.
 *
 * Backend sets:  Content-Disposition: attachment; filename="john_doe_application.pdf"
 */
export function extractPdfFilename(
  headers: Record<string, string> | undefined,
  fallback = 'application.pdf',
): string {
  const cd = headers?.['content-disposition'] ?? ''
  const match = cd.match(/filename="([^"]+)"/)
  return match ? match[1] : fallback
}

/**
 * Sanitize a name segment into a safe filename part.
 * - Transliterates accented chars (é→e, ñ→n, ü→u)
 * - Lowercase, spaces/specials → underscore
 */
export function sanitizeNamePart(s: string): string {
  return s
    .normalize('NFD')                     // decompose: é → e + combining accent
    .replace(/[\u0300-\u036f]/g, '')      // strip combining accent marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

export const publicAppService = {
  // ── Affiliate Apply Form ──────────────────────────────────────────────────
  getApplyForm(affiliateCode: string) {
    return http.get<{ success: boolean; data: PublicApplyData }>(`/public/apply/${affiliateCode}`)
  },

  submitApplication(affiliateCode: string, formData: Record<string, string>) {
    return http.post<{ success: boolean; data: SubmitResult } & SubmitResult>(
      `/public/apply/${affiliateCode}`,
      formData,
    )
  },

  renderApplicationPdf(leadToken: string): string {
    return `${API}/public/apply/${leadToken}/pdf`
  },

  // ── Merchant Portal ───────────────────────────────────────────────────────
  getMerchantPortal(token: string) {
    return http.get<{ success: boolean; data: MerchantPortalData }>(`/public/merchant/${token}`)
  },

  updateMerchant(token: string, formData: Record<string, string>) {
    return http.post<{ success: boolean; message: string }>(`/public/merchant/${token}`, formData)
  },

  getDocumentTypes(token: string) {
    return http.get<{ success: boolean; data: PublicDocumentType[] }>(`/public/merchant/${token}/document-types`)
  },

  saveSignature(
    token: string,
    signatureDataUri: string,
    field: 'signature_image' | 'owner_2_signature_image' = 'signature_image',
  ) {
    return http.post<{ success: boolean; message: string; signature_url: string }>(
      `/public/merchant/${token}/signature`,
      { signature_image: signatureDataUri, field },
    )
  },

  uploadDocument(token: string, file: File, docType: string) {
    const fd = new FormData()
    fd.append('document', file)
    fd.append('document_type', docType)
    return http.post<{ success: boolean; data: { filename: string; url: string } }>(
      `/public/merchant/${token}/upload`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  deleteDocument(token: string, docId: number) {
    return http.delete<{ success: boolean; message: string }>(
      `/public/merchant/${token}/document/${docId}`,
    )
  },

  /** Fetch document bytes as a Blob (for safe blob: URL viewer — never exposes storage URL). */
  fetchDocumentBlob(token: string, docId: number) {
    return http.get<Blob>(`/public/document/${token}/view/${docId}`, { responseType: 'blob' })
  },

  /** Fetch merchant PDF HTML (CRM template). Falls back to apply-form PDF on error. */
  fetchMerchantPdfHtml(token: string) {
    return http.get<string>(`/public/merchant/${token}/render-pdf`, { responseType: 'text' })
  },

  /** Fetch the apply-form PDF HTML (always available — uses built-in template). */
  fetchApplyPdfHtml(leadToken: string) {
    return http.get<string>(`/public/apply/${leadToken}/pdf`, { responseType: 'text' })
  },

  /**
   * Download the affiliate application as a real PDF file.
   * Returns the binary content as a Blob for use with URL.createObjectURL.
   */
  downloadApplyPdf(token: string) {
    return http.get<Blob>(`/public/apply/${token}/download`, { responseType: 'blob' })
  },

  /**
   * Download the merchant application as a real PDF file.
   * Returns the binary content as a Blob for use with URL.createObjectURL.
   */
  downloadMerchantPdf(token: string) {
    return http.get<Blob>(`/public/merchant/${token}/download`, { responseType: 'blob' })
  },
}
