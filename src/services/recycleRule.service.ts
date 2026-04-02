import api from '../api/axios'
import type { TableParams } from '../hooks/useServerTable'

export const recycleRuleService = {
  list: (params: TableParams) =>
    api.post('/recycle-rule', {
      start: (params.page - 1) * params.limit,
      limit: params.limit,
      ...(params.search ? { search: params.search } : {}),
    }),

  create: (data: Record<string, unknown>) =>
    api.post('/add-recycle-rule', data),

  update: (data: Record<string, unknown>) =>
    api.post('/edit-recycle-rule', data),

  delete: (ruleId: number) =>
    api.post('/delete-leads-rule', { rule_id: ruleId }),
}
