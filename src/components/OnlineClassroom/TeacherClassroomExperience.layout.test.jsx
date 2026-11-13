import '@testing-library/jest-dom/vitest'
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { RoomContext } from '@livekit/components-react'
import { Room } from 'livekit-client'
import { TeacherClassroomExperience } from './TeacherClassroomExperience.jsx'

globalThis.React = React
vi.mock('../../hooks/useClassroomSocket.js', () => ({
  useClassroomSocket: () => ({ socket: null, connected: true }),
}))
vi.mock('../../services/classroomApi.js', async (importOriginal) => ({
  ...await importOriginal(),
  getClassroomParticipants: vi.fn().mockResolvedValue([]),
}))

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('renders the real LiveKit controls inside layout context and toggles settings', () => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(),
  })))
  const room = new Room()
  const view = render(
    <RoomContext.Provider value={room}>
      <TeacherClassroomExperience
        joinData={{ scheduleId: 'schedule-id', permissions: {}, isHost: false }}
        onLeave={vi.fn()} onDeviceError={vi.fn()}
      />
    </RoomContext.Provider>,
  )
  const settings = view.container.querySelector('.lk-settings-toggle')
  expect(settings).toBeInTheDocument()
  expect(settings).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(settings)
  expect(settings).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('heading', { name: 'Trò chuyện', hidden: true })).toBeInTheDocument()
})
