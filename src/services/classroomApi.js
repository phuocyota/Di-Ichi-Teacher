import { api } from './api.js'

export const getOnlineSchedules = () => api.get('/teacher/schedules/online')

export const joinClassroom = (scheduleId) =>
  api.post(`/schedule/${encodeURIComponent(scheduleId)}/livekit/join`)

export const getClassroomParticipants = (scheduleId) =>
  api.get(`/schedule/${encodeURIComponent(scheduleId)}/participants`)

export const kickClassroomParticipant = (scheduleId, identity) =>
  api.delete(`/schedule/${encodeURIComponent(scheduleId)}/participants/${encodeURIComponent(identity)}`)

export const getClassroomErrorMessage = (error) => {
  const message = error.response?.data?.message ?? error.message
  return Array.isArray(message) ? message.join('; ') : message || 'Vui lòng thử lại.'
}

export const updateClassroomPermissions = (scheduleId, studentId, permissions) =>
  api.patch(
    `/schedule/${encodeURIComponent(scheduleId)}/participants/${encodeURIComponent(studentId)}/permissions`,
    permissions,
  )
