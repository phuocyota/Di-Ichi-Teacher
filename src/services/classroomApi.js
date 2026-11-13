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

const sessionPath = (id) => `/schedule/${encodeURIComponent(id)}/online-session`
export const getOnlineSession = (id) => api.get(sessionPath(id))
export const startOnlineSession = (id) => api.post(`${sessionPath(id)}/start`)
export const endOnlineSession = (id) => api.post(`${sessionPath(id)}/end`, { reason: 'teacher_ended' })
export const configureOnlineSession = (id, { waitingRoomEnabled }) => api.patch(sessionPath(id), { waitingRoomEnabled })
export const readmitStudent = (id, studentId) => api.post(`${sessionPath(id)}/admissions/${encodeURIComponent(studentId)}`, { decision: 'admit' })
export const isFeatureDisabledError = (error) => error?.response?.status === 404
