import api from '../api/axios'

export interface LeadSourcePayload {
  source_title: string
  url: string
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
}
