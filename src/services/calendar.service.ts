import api from '../api/axios'

export const calendarService = {
  getStatus: () => api.get('/calendar/status'),

  getEvents: (timeMin: string, timeMax: string) =>
    api.get('/calendar/events', { params: { time_min: timeMin, time_max: timeMax } }),

  createEvent: (data: {
    title: string
    description?: string
    location?: string
    all_day?: boolean
    start_date?: string
    end_date?: string
    start_datetime?: string
    end_datetime?: string
    timezone?: string
  }) => api.post('/calendar/events', data),

  updateEvent: (eventId: string, data: {
    title: string
    description?: string
    location?: string
    all_day?: boolean
    start_date?: string
    end_date?: string
    start_datetime?: string
    end_datetime?: string
    timezone?: string
  }) => api.put(`/calendar/events/${eventId}`, data),

  deleteEvent: (eventId: string) => api.delete(`/calendar/events/${eventId}`),
}
