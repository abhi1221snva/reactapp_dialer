import api from '../api/axios'

export const attendanceService = {
  clockIn: (shift_id?: number) =>
    api.post('/attendance/clock-in', { shift_id }),

  clockOut: () =>
    api.post('/attendance/clock-out'),

  startBreak: (type: string) =>
    api.post('/attendance/break/start', { type }),

  endBreak: () =>
    api.post('/attendance/break/end'),

  getToday: () =>
    api.get('/attendance/today'),

  getHistory: (params?: Record<string, unknown>) =>
    api.get('/attendance/history', { params }),

  getReport: (params: Record<string, unknown>) =>
    api.post('/attendance/report', params),
}
