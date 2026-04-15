import api from '../api/axios'

export interface LeadSourcePayload {
  source_title: string
  url: string
}

export type LeadSourceFieldType = 'text' | 'email' | 'list'

export interface LeadSourceFieldPayload {
  field_name: string
  field_label: string
  field_type: LeadSourceFieldType
  mapped_field_key?: string | null
  is_required: boolean
  description?: string
  allowed_values?: string[]
  display_order?: number
}

export const leadSourceService = {
  /** List all lead sources — GET /lead-source */
  list: () =>
    api.get('/lead-source'),

  /** Create lead source — PUT /add-lead-source */
  create: (data: LeadSourcePayload) =>
    api.put('/add-lead-source', data),

  /** Update lead source — POST /update-lead-sources/{id} */
  update: (id: number, data: LeadSourcePayload) =>
    api.post(`/update-lead-sources/${id}`, data),

  /** Delete lead source — GET /delete-lead-source/{id} */
  delete: (id: number) =>
    api.get(`/delete-lead-source/${id}`),

  // ── Fields ─────────────────────────────────────────────────────────────

  /** List fields for a lead source */
  listFields: (sourceId: number) =>
    api.get(`/lead-source/${sourceId}/fields`),

  /** Create field — PUT /lead-source/{sourceId}/fields */
  createField: (sourceId: number, data: LeadSourceFieldPayload) =>
    api.put(`/lead-source/${sourceId}/fields`, data),

  /** Update field — POST /lead-source/{sourceId}/fields/{fieldId} */
  updateField: (sourceId: number, fieldId: number, data: Partial<LeadSourceFieldPayload>) =>
    api.post(`/lead-source/${sourceId}/fields/${fieldId}`, data),

  /** Delete field — DELETE /lead-source/{sourceId}/fields/{fieldId} */
  deleteField: (sourceId: number, fieldId: number) =>
    api.delete(`/lead-source/${sourceId}/fields/${fieldId}`),

  /** Reorder fields — POST /lead-source/{sourceId}/fields/reorder */
  reorderFields: (sourceId: number, order: number[]) =>
    api.post(`/lead-source/${sourceId}/fields/reorder`, { order }),

  /** Rotate webhook secret — POST /lead-source/{id}/rotate-secret */
  rotateSecret: (id: number) =>
    api.post(`/lead-source/${id}/rotate-secret`),
}
