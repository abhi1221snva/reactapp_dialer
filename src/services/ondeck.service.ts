import api from '../api/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SubmissionType = 'prequalification' | 'preapproval' | 'application' | 'lead'

export type ApplicationStatus =
  | 'pending' | 'submitted' | 'underwriting' | 'approved'
  | 'closing' | 'funded' | 'declined' | 'other' | 'cannot_contact'
  | 'incomplete' | 'closed'

export interface LenderApplication {
  id:                  number
  lead_id:             number
  lender_name:         string
  business_id:         string | null
  application_number:  string | null
  external_customer_id:string | null
  submission_type:     SubmissionType
  status:              ApplicationStatus
  status_note:         string | null
  raw_response:        Record<string, unknown> | null
  submitted_by:        number | null
  created_at:          string
  updated_at:          string
}

export interface LenderDocument {
  id:            number
  lead_id:       number
  business_id:   string
  lender_name:   string
  document_type: string | null
  document_need: string | null
  file_path:     string | null
  original_name: string | null
  upload_status: 'pending' | 'uploaded' | 'failed'
  lender_response: Record<string, unknown> | null
  error_message: string | null
  uploaded_at:   string | null
  created_at:    string
}

export interface LenderOffer {
  id:               number
  lead_id:          number
  business_id:      string
  lender_name:      string
  offer_id:         string | null
  product_type:     'term_loan' | 'line_of_credit' | null
  loan_amount:      number | null
  term_months:      number | null
  factor_rate:      number | null
  apr:              number | null
  payment_frequency:string | null
  payment_amount:   number | null
  origination_fee:  number | null
  total_payback:    number | null
  status:           'active' | 'confirmed' | 'expired' | 'declined'
  raw_offer:        Record<string, unknown> | null
  raw_pricing:      Record<string, unknown> | null
  confirmed_at:     string | null
  created_at:       string
}

export interface OnDeckApiLog {
  id:               number
  lead_id:          number
  request_url:      string
  request_method:   string
  request_payload:  string | null
  response_code:    number | null
  response_body:    string | null
  status:           'success' | 'http_error' | 'timeout' | 'error'
  error_message:    string | null
  duration_ms:      number | null
  attempt:          number
  created_at:       string
}

export interface OnDeckLocalData {
  app:    LenderApplication | null
  docs:   LenderDocument[]
  offers: LenderOffer[]
  logs:   OnDeckApiLog[]
}

export interface OnDeckStatusResponse {
  contactStatus:  string
  applicationNumber: string
  outcomeStatus: {
    stage:  string
    note:   string
    detail: Record<string, unknown>
  }
}

export interface OnDeckPricingParams {
  offerId:           string
  loanAmount?:       number
  paymentFrequency?: 'Daily' | 'Weekly'
  commissionPoints?: number
}

export interface OnDeckPricingResponse {
  businessID:           string
  offerId:              string
  loanAmount:           number
  originationFee:       number
  disbursementAmount:   number
  totalAmountPaidBack:  number
  term:                 number
  paymentFrequency:     string
  apr:                  number
  centsOnDollar:        number
  payment:              number
  numberOfPayments:     number
  commission:           number
  totalCost:            number
}

export interface RequiredDocument {
  requestOfMerchant: string
  documentNeed:      string
  details:           string
  requestStatus:     string
  rejectionReason:   string | null
}

export interface RenewalEligibility {
  beginningBalance:              number
  remainingBalance:              number
  paidDown:                      number
  missedPayments:                number
  expectedRenewalEligibilityDate:string
  renewalEligibility:            boolean
}

// ── Service ───────────────────────────────────────────────────────────────────

const base = (leadId: number) => `/crm/lead/${leadId}/ondeck`

export const onDeckService = {
  /** Return all locally stored OnDeck data (no live API calls) */
  getLocalData: (leadId: number) =>
    api.get<{ data: OnDeckLocalData }>(base(leadId)),

  /** Submit a new application to OnDeck */
  submitApplication: (leadId: number, type: SubmissionType = 'application') =>
    api.post<{ data: LenderApplication }>(
      `${base(leadId)}/application`,
      { submission_type: type }
    ),

  /** Re-submit / update existing application */
  updateApplication: (leadId: number) =>
    api.put<{ data: LenderApplication }>(`${base(leadId)}/application`),

  /** Mark merchant as contactable */
  markContactable: (leadId: number) =>
    api.put(`${base(leadId)}/contactable`),

  /** Upload a single document (multipart) */
  uploadDocument: (leadId: number, formData: FormData) =>
    api.post<{ data: LenderDocument }>(
      `${base(leadId)}/document`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),

  /** Get required documents from OnDeck live */
  getRequiredDocuments: (leadId: number) =>
    api.get<{ data: { requiredDocuments: RequiredDocument[] } }>(
      `${base(leadId)}/required-documents`
    ),

  /** Get locally stored document records */
  getLocalDocuments: (leadId: number) =>
    api.get<{ data: LenderDocument[] }>(`${base(leadId)}/local-documents`),

  /** Get live application status from OnDeck */
  getStatus: (leadId: number) =>
    api.get<{ data: OnDeckStatusResponse }>(`${base(leadId)}/status`),

  /** Fetch live offers from OnDeck */
  getOffers: (leadId: number) =>
    api.get(`${base(leadId)}/offers`),

  /** Get locally stored offer records */
  getLocalOffers: (leadId: number) =>
    api.get<{ data: LenderOffer[] }>(`${base(leadId)}/local-offers`),

  /** Get pricing breakdown for a specific offer */
  getPricing: (leadId: number, params: OnDeckPricingParams) =>
    api.post<{ data: OnDeckPricingResponse }>(`${base(leadId)}/pricing`, params),

  /** Accept / confirm an offer */
  confirmOffer: (leadId: number, params: OnDeckPricingParams) =>
    api.post(`${base(leadId)}/confirm-offer`, params),

  /** Check renewal eligibility */
  getRenewalEligibility: (leadId: number) =>
    api.get<{ data: RenewalEligibility }>(`${base(leadId)}/renewal-eligibility`),

  /** Submit renewal */
  submitRenewal: (leadId: number) =>
    api.post(`${base(leadId)}/renewal`),

  /** Get OnDeck API call logs for this lead */
  getLogs: (leadId: number) =>
    api.get<{ data: OnDeckApiLog[] }>(`${base(leadId)}/logs`),
}
