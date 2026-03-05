import api from '../api/axios'

export const attendanceService = {
  clockIn: (shift_id?: number) =>
    api.post('/attendance/clock-in', { shift_id }),

  clockOut: () =>
    api.post('/attendance/clock-out'),

  startBreak: (type: string) =>
    api.post('/attendance/break/start', { break_type: type }),

  endBreak: () =>
    api.post('/attendance/break/end'),

  // B15 fixed: was GET /attendance/today → backend is GET /attendance/status
  getToday: () =>
    api.get('/attendance/status'),

  // B16 fixed: was GET /attendance/history → backend is GET /attendance/my-attendance
  getHistory: (params?: Record<string, unknown>) =>
    api.get('/attendance/my-attendance', { params }),

  // B17 fixed: was POST /attendance/report → backend has /attendance/report/summary
  getReport: (params: Record<string, unknown>) =>
    api.post('/attendance/report/summary', params),
}
