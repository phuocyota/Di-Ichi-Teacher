import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api.js'
import { getTeacherClassIds } from './classStaffApi.js'

vi.mock('./api.js', () => ({ api: { get: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())

describe('getTeacherClassIds', () => {
  it('loads every page using the staff id and teacher role, deduplicating classes', async () => {
    const signal = new AbortController().signal
    const row = classId => ({ classId, staffId: 'staff-1', role: 'teacher' })
    api.get.mockResolvedValueOnce({ total: 3, data: [row('class-1'), row('class-2')] })
      .mockResolvedValueOnce({ total: 3, data: [row('class-1')] })
    await expect(getTeacherClassIds('staff-1', { signal })).resolves.toEqual(['class-1', 'class-2'])
    expect(api.get).toHaveBeenNthCalledWith(1, '/class-staff', {
      params: { staffId: 'staff-1', role: 'teacher', page: 1, size: 100 }, signal,
    })
    expect(api.get.mock.calls[1][1].params.page).toBe(2)
  })

  it('returns empty only for a valid empty response', async () => {
    api.get.mockResolvedValue({ total: 0, data: [] })
    await expect(getTeacherClassIds('staff-1')).resolves.toEqual([])
    api.get.mockResolvedValue({ data: [] })
    await expect(getTeacherClassIds('staff-1')).rejects.toThrow('không đúng định dạng')
  })

  it('rejects wrong teacher assignments and missing profiles', async () => {
    await expect(getTeacherClassIds()).rejects.toThrow('hồ sơ giáo viên')
    expect(api.get).not.toHaveBeenCalled()
    api.get.mockResolvedValue({ total: 1, data: [{ classId: 'class-1', staffId: 'other', role: 'teacher' }] })
    await expect(getTeacherClassIds('staff-1')).rejects.toThrow('không đúng định dạng')
  })

  it('propagates API failures and rejects incomplete pagination', async () => {
    api.get.mockRejectedValueOnce(new Error('Forbidden'))
    await expect(getTeacherClassIds('staff-1')).rejects.toThrow('Forbidden')
    api.get.mockResolvedValue({ total: 1, data: [] })
    await expect(getTeacherClassIds('staff-1')).rejects.toThrow('Chưa tải đủ')
  })
})
