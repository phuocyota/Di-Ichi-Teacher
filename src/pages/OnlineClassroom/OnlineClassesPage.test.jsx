import '@testing-library/jest-dom/vitest'
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OnlineClassesPage } from './OnlineClassesPage.jsx'
import { getOnlineSchedules, joinClassroom } from '../../services/classroomApi.js'

globalThis.React = React

vi.mock('../../services/classroomApi.js', () => ({
  getOnlineSchedules: vi.fn(),
  joinClassroom: vi.fn(),
}))

describe('OnlineClassesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      <MemoryRouter initialEntries={['/lop-hoc-online']}>
        <Routes>
          <Route path="/lop-hoc-online" element={<OnlineClassesPage />} />
          <Route path="/lop-hoc-online/:scheduleId" element={<p>Đã vào phòng</p>} />
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
