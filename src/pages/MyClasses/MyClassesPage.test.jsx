import React from 'react'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MyClassesPage } from './MyClassesPage.jsx'
import { PortalContext } from '../../portal/portalStore.js'
import { getTeacherClassIds } from '../../services/classStaffApi.js'

vi.mock('../../services/classStaffApi.js', async importOriginal => ({
  ...await importOriginal(), getTeacherClassIds: vi.fn(),
}))
beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

const snapshot = () => ({
  profile: { id: 'staff-1', userId: 'user-1', name: 'Teacher', userType: 'TEACHER' },
  classes: [
    { id: 'class-1', name: 'Lớp giảng dạy', code: 'C1', status: 'active' },
    { id: 'class-2', name: 'Lớp trợ giảng', code: 'C2', status: 'active' },
  ],
  courses: [], students: [], enrollments: [], schedules: [], homework: [],
  submissions: [], scores: [], records: [], notifications: [], documents: [], classDocuments: [],
})
const page = data => (
  <MemoryRouter>
    <PortalContext.Provider value={{ data, reload: vi.fn(), busy: false }}>
      <MyClassesPage />
    </PortalContext.Provider>
  </MemoryRouter>
)

it('uses the staff profile, filters cards and class options, and refreshes assignments with snapshot changes', async () => {
  getTeacherClassIds.mockResolvedValue(['class-1'])
  const view = render(page(snapshot()))
  expect(await screen.findByRole('heading', { name: 'Lớp giảng dạy' })).toBeInTheDocument()
  expect(getTeacherClassIds).toHaveBeenCalledWith('staff-1', { signal: expect.any(AbortSignal) })
  expect(screen.queryByText('Lớp trợ giảng')).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('Xem lớp'))
  expect(screen.getByText('Học sinh')).toBeInTheDocument()
  view.rerender(page(snapshot()))
  expect(await screen.findByText('Học sinh')).toBeInTheDocument()
  expect(screen.getByLabelText('Lọc lớp học')).toHaveValue('class-1')
  getTeacherClassIds.mockResolvedValue([])
  view.rerender(page(snapshot()))
  expect(await screen.findByText('Bạn chưa được phân công hoặc đăng ký lớp học.')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Lớp giảng dạy' })).not.toBeInTheDocument()
})

it('shows a retryable API error without falling back to snapshot classes', async () => {
  getTeacherClassIds.mockRejectedValueOnce({ response: { data: { error: { message: 'Không có quyền' } } } })
    .mockResolvedValueOnce(['class-1'])
  render(page(snapshot()))
  expect(await screen.findByRole('alert')).toHaveTextContent('Không có quyền')
  expect(screen.queryByRole('heading', { name: 'Lớp giảng dạy' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('Thử lại'))
  expect(await screen.findByRole('heading', { name: 'Lớp giảng dạy' })).toBeInTheDocument()
})

it('aborts pending assignment requests when leaving the page', () => {
  getTeacherClassIds.mockReturnValue(new Promise(() => {}))
  const view = render(page(snapshot()))
  const { signal } = getTeacherClassIds.mock.calls[0][1]
  view.unmount()
  expect(signal.aborted).toBe(true)
})
