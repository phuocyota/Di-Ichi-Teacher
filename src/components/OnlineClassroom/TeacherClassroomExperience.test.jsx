import '@testing-library/jest-dom/vitest'
import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RoomEvent } from 'livekit-client'
import { toast } from 'sonner'
import { TeacherClassroomExperience } from './TeacherClassroomExperience.jsx'
import { getClassroomParticipants, kickClassroomParticipant } from '../../services/classroomApi.js'

globalThis.React = React
const mocks = vi.hoisted(() => ({ room: { on: vi.fn(), off: vi.fn() }, onEvent: null }))
vi.mock('@livekit/components-react', () => ({
  ControlBar: () => null, GridLayout: () => null, ParticipantTile: () => null,
  RoomAudioRenderer: () => null, StartAudio: () => null,
  useTracks: () => [], useRoomContext: () => mocks.room,
}))
vi.mock('../../hooks/useClassroomSocket.js', () => ({ useClassroomSocket: ({ onEvent }) => {
  mocks.onEvent = onEvent
  return { socket: null, connected: true }
} }))
vi.mock('./ClassroomBoard.jsx', () => ({ ClassroomBoard: () => null }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../services/classroomApi.js', async (importOriginal) => ({
  ...await importOriginal(), getClassroomParticipants: vi.fn(), kickClassroomParticipant: vi.fn(),
}))

const student = { studentId: 'student-id', identity: 'user-account-id', displayName: 'Học sinh A', connected: true, permissions: {} }
const mount = () => render(<TeacherClassroomExperience joinData={{ scheduleId: 'schedule-id', permissions: {}, isHost: false }} onLeave={vi.fn()} onDeviceError={vi.fn()} />)
beforeEach(() => {
  vi.clearAllMocks()
  getClassroomParticipants.mockResolvedValue([student])
})
afterEach(cleanup)

describe('Teacher LiveKit participant management', () => {
  it.each([true, false])('kicks by identity, prevents duplicate requests and retains roster (removed=%s)', async (removed) => {
    let finish
    kickClassroomParticipant.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    mount()
    const button = await screen.findByRole('button', { name: 'Mời ra khỏi lớp' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(button).toBeDisabled()
    expect(kickClassroomParticipant).toHaveBeenCalledExactlyOnceWith('schedule-id', student.identity)
    getClassroomParticipants.mockResolvedValue([{ ...student, connected: false }])
    await act(async () => finish({ removed }))
    expect(screen.getByText(student.displayName)).toBeInTheDocument()
    expect(screen.getByText('Chưa vào lớp')).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith(removed ? 'Đã mời học sinh ra khỏi lớp' : 'Học sinh đã rời lớp')
  })

  it('surfaces backend validation errors and allows a retry', async () => {
    kickClassroomParticipant.mockRejectedValue({ response: { data: { message: ['Lỗi một', 'Lỗi hai'] } } })
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Mời ra khỏi lớp' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Không thể mời học sinh ra khỏi lớp', { description: 'Lỗi một; Lỗi hai' }))
    expect(screen.getByRole('button', { name: 'Mời ra khỏi lớp' })).toBeEnabled()
    expect(screen.getByText('Đang trong lớp')).toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('reports roster refresh failure separately after successful removal', async () => {
    kickClassroomParticipant.mockResolvedValue({ removed: true })
    mount()
    const button = await screen.findByRole('button', { name: 'Mời ra khỏi lớp' })
    getClassroomParticipants.mockRejectedValue(new Error('Mất kết nối'))
    fireEvent.click(button)
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Không thể tải danh sách học sinh', { description: 'Mất kết nối' }))
    expect(toast.success).toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(screen.getByText(student.displayName)).toBeInTheDocument()
  })

  it('does not mark a socket-only student online; refreshes on LiveKit events and removes listeners', async () => {
    getClassroomParticipants.mockResolvedValue([{ ...student, connected: false }])
    const view = mount()
    await screen.findByText('Chưa vào lớp')
    await act(async () => mocks.onEvent('classroom:participant-joined', { studentId: student.studentId }))
    expect(screen.queryByRole('button', { name: 'Mời ra khỏi lớp' })).not.toBeInTheDocument()
    for (const event of [RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected, RoomEvent.Reconnected]) {
      const callback = mocks.room.on.mock.calls.find(([name]) => name === event)[1]
      const count = getClassroomParticipants.mock.calls.length
      await act(async () => callback())
      expect(getClassroomParticipants).toHaveBeenCalledTimes(count + 1)
    }
    view.unmount()
    for (const [event, callback] of mocks.room.on.mock.calls) expect(mocks.room.off).toHaveBeenCalledWith(event, callback)
  })

  it('hides removal for a student without an account', async () => {
    getClassroomParticipants.mockResolvedValue([{ ...student, identity: null }])
    mount()
    await screen.findByText(student.displayName)
    expect(screen.queryByRole('button', { name: 'Mời ra khỏi lớp' })).not.toBeInTheDocument()
  })
})
