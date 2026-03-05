import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const faxService = {
  // POST /fax → { success, message, data[], total }
  list: (params: TableParams) =>
    api.post('/fax', {
      start: (params.page - 1) * params.limit,
      limit: params.limit,
      ...(params.search ? { search: params.search } : {}),
      ...(params.filters.faxstatus ? { faxstatus: params.filters.faxstatus } : {}),
    }),

  // POST /send-fax — sends fax via external API, requires faxurl + dialednumber
  send: (faxurl: string, dialednumber: string, callid?: string) =>
    api.post('/send-fax', {
      faxurl,
      dialednumber,
      ...(callid ? { callid } : {}),
    }),

  // POST /delete-fax — hard delete by id
  delete: (id: number) =>
    api.post('/delete-fax', { id }),
}
