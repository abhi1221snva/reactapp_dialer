import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

/**
 * Read the full logged-in user object from persisted Zustand auth state.
 * Used to extract asterisk_server_id, secret, id, etc. for request payloads.
 */
function getLoggedInUser(): Record<string, unknown> {
  try {
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed?.state?.user ?? {}
    }
  } catch { /* ignore */ }
  return {}
}

export const userService = {
  // Paginated list — GET /users
  list: (params: TableParams) =>
    api.get('/users', {
      params: {
        start: (params.page - 1) * params.limit,
        limit: params.limit,
        ...(params.search ? { search: params.search } : {}),
        ...(params.filters.status !== undefined && params.filters.status !== ''
          ? { status: params.filters.status }
          : {}),
      },
    }),

  getAll: () => api.get('/users'),

  getById: (id: number) => api.get(`/extension/${id}`),

  // PUT /user (saveNewExtension) — creates user via Easify + local DB.
  // asterisk_server_id is included in `data` from the form's server selector.
  // Falls back to the admin's stored profile value when not explicitly provided.
  create: (data: Record<string, unknown>) => {
    const user = getLoggedInUser()
    return api.put('/user', {
      ...data,
      asterisk_server_id: data.asterisk_server_id ?? user.asterisk_server_id,
    })
  },

  getServers: () => api.get('/servers/client-servers'),

  // POST /edit-extension — pure DB UPDATE, zero Easify/cURL calls.
  // Backend builds a dynamic UPDATE from only the whitelisted fields
  // present in the request.  extension_id = the user's primary DB id.
  update: (data: Record<string, unknown>) =>
    api.post('/edit-extension', data),

  // POST /edit-extension with is_deleted=1 — comprehensive soft-delete:
  //   masks email, cleans up user_extensions / extension_group_map /
  //   permissions / user_packages, sets is_deleted=1 in users table.
  // Works for ALL users regardless of whether easify_user_uuid is set.
  delete: (id: number) =>
    api.post('/edit-extension', { extension_id: id, is_deleted: 1 }),

  getGroups: () => api.get('/extension-group'),

  getRoles: () => api.get('/role'),
}
