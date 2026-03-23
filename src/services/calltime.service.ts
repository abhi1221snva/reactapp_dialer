import api from '../api/axios'

export const DAY_KEYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const
export type DayKey = typeof DAY_KEYS[number]

export type DaySchedule = { enabled: boolean; from: string; to: string }

export type SchedulePayload = {
  name: string
  description: string
  dept_id: number
  schedule: Record<DayKey, DaySchedule>
}

export type HolidayPayload = {
  holiday_id: number   // 0 = new
  name: string
  month: number        // 1-12
  date: number         // 1-31
}

export const calltimeService = {
  // Get all departments joined with their call timings (RIGHT JOIN)
  getCallTimings: () => api.post('/get-call-timings', {}),

  // Get call timings for one department
  getDepartmentCallTimings: (deptId: number) =>
    api.post('/get-department-call-timings', { dept_id: deptId }),

  // Create or update a department + its per-day timings
  saveCallTimings: (payload: SchedulePayload) =>
    api.post('/save-call-timings', {
      data: {
        name:        payload.name,
        description: payload.description,
        dept_id:     payload.dept_id,
        // Send all 7 days; null from/to means "closed" → backend will DELETE that row
        day:  [...DAY_KEYS],
        from: DAY_KEYS.map(d => payload.schedule[d]?.enabled ? payload.schedule[d].from : null),
        to:   DAY_KEYS.map(d => payload.schedule[d]?.enabled ? payload.schedule[d].to   : null),
      },
    }),

  // Dropdown list of departments
  getDepartments: () => api.post('/get-department-list', {}),

  // ── Holidays ────────────────────────────────────────────────────────────────
  getAllHolidays: () => api.post('/get-all-holidays', {}),

  // Note: backend route has a typo "datail"
  getHolidayDetail: (holidayId: number) =>
    api.post('/get-holiday-datail', { holiday_id: holidayId }),

  saveHoliday: (payload: HolidayPayload) =>
    api.post('/save-holiday-detail', { data: payload }),

  deleteHoliday: (holidayId: number) =>
    api.post('/delete-holiday', { holiday_id: holidayId }),
}
