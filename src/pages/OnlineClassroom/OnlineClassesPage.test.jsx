import '@testing-library/jest-dom/vitest'
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OnlineClassesPage } from './OnlineClassesPage.jsx'
import { getOnlineSchedules, joinClassroom, getOnlineSession } from '../../services/classroomApi.js'

globalThis.React = React

vi.mock('../../services/classroomApi.js', () => ({
  getOnlineSchedules: vi.fn(),
  getOnlineSession: vi.fn().mockRejectedValue({ response: { status: 404 } }),
  isFeatureDisabledError: error => error?.response?.status === 404,
  joinClassroom: vi.fn(),
}))

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe('OnlineClassesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getOnlineSession.mockRejectedValue({ response: { status: 404 } })
    getOnlineSchedules.mockResolvedValue([{
      scheduleId: 'a3d40dd8-70e1-4bc5-a64f-6c514d9288dd',
      className: 'TOEIC Online',
      courseName: 'TOEIC',
      startAt: '2026-09-04T10:00:00Z',
      endAt: '2026-09-04T11:00:00Z',
      canStart: true,
      meetingStarted: false,
    }])
    joinClassroom.mockResolvedValue({ token: 'token', serverUrl: 'ws://livekit' })
  })

  it('chống double click và chuyển vào phòng sau khi start thành công', async () => {
    render(
      <MemoryRouter initialEntries={['/vn/lop-hoc-online']}>
        <Routes>
          <Route path="/vn/lop-hoc-online" element={<OnlineClassesPage />} />
          <Route path="/vn/lop-hoc-online/:scheduleId" element={<p>Đã vào phòng</p>} />
        </Routes>
      </MemoryRouter>,
    )
    const button = await screen.findByRole('button', { name: 'Bắt đầu lớp' })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(joinClassroom).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Đã vào phòng')).toBeInTheDocument()
  })
})

it.each([
  ['not_started', true, true, 'Bắt đầu lớp', false],
  ['active', true, true, 'Vào lại lớp', false],
  ['ended', false, false, 'Đã kết thúc', true],
  ['not_started', false, false, 'Chưa đến giờ tham gia', true],
])('renders A1 session %s and respects access', async (status, canStart, canJoin, label, disabled) => {
  getOnlineSchedules.mockResolvedValue([{ scheduleId: 'id', className: 'Class', startAt: '2026-11-13T10:00:00Z', endAt: '2026-11-13T11:00:00Z', canStart }]);
  getOnlineSession.mockResolvedValue({ features: { lifecycle: true }, session: { status }, me: { canStart, canJoin, joinReason: 'Chưa đến giờ tham gia' } });
  render(<MemoryRouter initialEntries={['/vn/lop-hoc-online']}><Routes><Route path="/vn/lop-hoc-online" element={<OnlineClassesPage />} /><Route path="/vn/lop-hoc-online/:scheduleId" element={<p>Prejoin route</p>} /></Routes></MemoryRouter>);
  const button = await screen.findByRole('button', { name: label });
  if (disabled) expect(button).toBeDisabled();
  else {
    fireEvent.click(button);
    await screen.findByText('Prejoin route');
    expect(joinClassroom).not.toHaveBeenCalled();
  }
});
