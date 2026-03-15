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
}
