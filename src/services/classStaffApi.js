import { api } from './api.js'

export async function getTeacherClassIds(staffId, { signal } = {}) {
  if (!staffId) throw new Error('Không xác định được hồ sơ giáo viên. Vui lòng đăng nhập lại.')

  const ids = new Set()
  const size = 100
  let page = 1
  let loaded = 0
  while (true) {
    const result = await api.get('/class-staff', {
      params: { staffId, role: 'teacher', page, size },
      signal,
    })
    if (
      !Array.isArray(result?.data) ||
      !Number.isInteger(result.total) || result.total < 0 ||
      result.data.some(row =>
        typeof row.classId !== 'string' ||
        row.staffId !== staffId || row.role !== 'teacher',
      )
    ) throw new Error('Dữ liệu phân công lớp không đúng định dạng. Vui lòng thử lại.')

    result.data.forEach(row => ids.add(row.classId))
    loaded += result.data.length
    if (loaded >= result.total) return [...ids]
    if (!result.data.length)
      throw new Error('Chưa tải đủ danh sách phân công lớp. Vui lòng thử lại.')
    page++
  }
}

export function getClassStaffErrorMessage(error) {
  const message = error.response?.data?.error?.message ?? error.response?.data?.message ?? error.message
  return Array.isArray(message) ? message.join('; ') : message || 'Không thể tải phân công lớp. Vui lòng thử lại.'
}
