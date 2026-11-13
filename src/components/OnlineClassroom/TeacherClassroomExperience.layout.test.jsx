import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { RoomContext } from '@livekit/components-react';
import { Room } from 'livekit-client';
import { TeacherClassroomExperience } from './TeacherClassroomExperience.jsx';

globalThis.React = React;
vi.mock('../../hooks/useClassroomSocket.js', () => ({
  useClassroomSocket: () => ({ socket: null, connected: true }),
}));
vi.mock('../../services/classroomApi.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getClassroomParticipants: vi.fn().mockResolvedValue([]),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('renders the real LiveKit controls inside layout context and toggles settings', () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
  const room = new Room();
  const view = render(
    <RoomContext.Provider value={room}>
      <TeacherClassroomExperience
        joinData={{ scheduleId: 'schedule-id', permissions: {}, isHost: false }}
        onLeave={vi.fn()}
        onDeviceError={vi.fn()}
      />
    </RoomContext.Provider>,
  );
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    writable: true,
    value() {},
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    writable: true,
    value() {},
  });
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(
    function () {
      this.setAttribute('open', '');
    },
  );
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(
    function () {
      this.removeAttribute('open');
    },
  );
  const footer = screen.getByRole('contentinfo', { name: 'Điều khiển lớp học' });
  expect(footer.parentElement).toHaveClass('live-classroom');
  expect(view.container.querySelector('.live-main')).not.toContainElement(footer);
  const panel = view.container.querySelector('#live-side-panel');
  expect(panel).toHaveAttribute('hidden');
  fireEvent.click(screen.getByRole('button', { name: 'Học sinh', exact: true }));
  expect(panel).not.toHaveAttribute('hidden');
  fireEvent.click(screen.getByRole('button', { name: 'Đóng', exact: true }));
  expect(panel).toHaveAttribute('hidden');
  fireEvent.click(screen.getByRole('button', { name: 'Mở giáo án' }));
  expect(view.container.querySelector('.live-meeting-stage')).toHaveClass(
    'live-meeting-stage--presenting',
  );
  const lesson = view.container.querySelector('.live-lesson-focus');
  expect(lesson).not.toHaveAttribute('hidden');
  expect(
    view.container.querySelector('.live-stage--compact'),
  ).toBeInTheDocument();
  const board = view.container.querySelector('.live-board-workspace');
  const whiteboard = view.container.querySelector('.live-whiteboard-dialog');
  expect(whiteboard).not.toHaveAttribute('open');
  fireEvent.click(
    screen.getByRole('button', { name: 'Bảng trắng', exact: true }),
  );
  expect(whiteboard).toHaveAttribute('open');
  expect(lesson).not.toHaveAttribute('hidden');
  fireEvent.click(screen.getByRole('button', { name: 'Đóng bảng trắng' }));
  expect(whiteboard).not.toHaveAttribute('open');
  expect(view.container.querySelector('.live-board-workspace')).toBe(board);
  expect(view.container.querySelector('.live-lesson-focus')).toBe(lesson);
  const settings = view.container.querySelector('.lk-settings-toggle');
  expect(settings).toBeInTheDocument();
  expect(settings).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(settings);
  expect(settings).toHaveAttribute('aria-pressed', 'true');
  expect(
    screen.getByRole('heading', { name: 'Trò chuyện', hidden: true }),
  ).toBeInTheDocument();
});
