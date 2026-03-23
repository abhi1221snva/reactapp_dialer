import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

/**
 * The backend DID endpoints (/get-did-by-id, /add-did, /save-edit-did) authenticate
 * by looking up the body 'token' field against the users.secret column in the DB —
 * NOT against the JWT Bearer token.  user.secret is the user's SIP/API secret stored
 * in the backend's users table and is part of the login response payload.
 */
function getUserSecret(): string {
  try {
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed?.state?.user?.secret ?? ''
    }
  } catch { /* ignore */ }
  return ''
}

// String→numeric mapping that matches the backend DB values
const DEST_TYPE_NUM: Record<string, number> = {
  ivr: 0, extension: 1, voicemail: 2, external: 4, queue: 8,
}

export const didService = {
  list: (params: TableParams) => {
    const destTypeStr = params.filters.dest_type
    // Backend filters dest_type against a numeric column — convert string key to number
    const destTypeVal = destTypeStr
      ? (DEST_TYPE_NUM[destTypeStr] !== undefined ? DEST_TYPE_NUM[destTypeStr] : destTypeStr)
      : undefined
    return api.post('/did', {
      start: (params.page - 1) * params.limit,
      limit: params.limit,
      ...(params.search           ? { search: params.search, cli: params.search } : {}),
      ...(params.filters.operator ? { operator:  params.filters.operator } : {}),
      ...(destTypeVal !== undefined ? { dest_type: destTypeVal } : {}),
    })
  },

  // Use 'did_id' — NOT 'id'. Backend middleware checks body 'id' against
  // the authenticated user's ID; sending the DID record ID as 'id' causes
  // "Unauthorized. Invalid Token." because record ID ≠ user ID.
  getById: (id: number) =>
    api.post('/get-did-by-id', { token: getUserSecret(), did_id: id }),

  create: (data: Record<string, unknown> | FormData) => {
    if (data instanceof FormData) {
      data.append('token', getUserSecret())
      return api.post('/add-did', data)
    }
    return api.post('/add-did', { token: getUserSecret(), ...data })
  },

  update: (data: Record<string, unknown> | FormData) => {
    if (data instanceof FormData) {
      data.append('token', getUserSecret())
      return api.post('/save-edit-did', data)
    }
    return api.post('/save-edit-did', { token: getUserSecret(), ...data })
  },

  // /delete-did uses Bearer-header auth — no body token required.
  delete: (id: number) =>
    api.post('/delete-did', { did_id: id }),

  getDetail: (cli: string) =>
    api.post('/did_detail', { cli }),

  getExtensions: () =>
    api.get('/extension'),

  // Dropdown helpers — fetch all items (no pagination) for select inputs
  getIvrList: () =>
    api.post('/ivr', { start: 0, limit: 200 }),

  getRingGroups: () =>
    api.post('/ring-group', { start: 0, limit: 200 }),

  getDepartments: () =>
    api.post('/get-department-list', {}),
}
