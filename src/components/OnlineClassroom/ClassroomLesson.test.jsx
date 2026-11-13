import '@testing-library/jest-dom/vitest';
import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ClassroomLesson } from './ClassroomLesson.jsx';
globalThis.React = React;
const mock = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../services/portalApi.js', () => ({
  portalRequest: (...args) => mock.request(...args),
}));
vi.mock('../../lesson-planner/SlidePresentation.jsx', () => ({
  default: (props) => (
    <div>
      <p>
        {props.plan.title} · slide {props.slideIndex}
      </p>
      <button
        disabled={props.navigationLocked}
        onClick={() => props.onSlideChange(1)}
      >
        Slide sau
      </button>
    </div>
  ),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const joinData = { scheduleId: 'schedule', classId: 'class-a', isHost: true };
const plan = {
  id: 'plan',
  classId: 'class-a',
  title: 'Bài chào hỏi',
  revision: 3,
  blocks: [
    { id: 'b1', type: 'text' },
    { id: 'b2', type: 'text' },
  ],
};
function socketFixture() {
  const handlers = new Map();
  const socket = {
    connected: true,
    classroomReady: true,
    on: vi.fn((event, cb) => handlers.set(event, cb)),
    off: vi.fn(),
    timeout: () => socket,
    emit: vi.fn((event, payload, callback) =>
      callback(null, { ok: true, ...payload }),
    ),
  };
  return { socket, handlers };
}
it('lọc đúng lớp và ready, trình chiếu, đổi slide, đồng bộ học viên vào muộn và dừng', async () => {
  mock.request.mockImplementation((path) =>
    Promise.resolve(
      path === '/lesson-plans'
        ? {
            items: [
              { ...plan, status: 'ready' },
              { ...plan, id: 'draft', status: 'draft', title: 'Bản nháp' },
              {
                ...plan,
                id: 'other',
                classId: 'class-b',
                status: 'ready',
                title: 'Lớp khác',
              },
            ],
          }
        : plan,
    ),
  );
  const { socket, handlers } = socketFixture();
  const changed = vi.fn();
  const view = render(
    <ClassroomLesson
      socket={socket}
      connected
      joinData={joinData}
      onPresentationChange={changed}
    />,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Trình chiếu' }));
  await screen.findByText('Bài chào hỏi · slide 0');
  expect(changed).toHaveBeenCalledWith(true);
  expect(screen.queryByText('Bản nháp')).toBeNull();
  expect(screen.queryByText('Lớp khác')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Slide sau' }));
  await screen.findByText('Bài chào hỏi · slide 1');
  socket.emit.mockClear();
  view.rerender(
    <ClassroomLesson
      socket={socket}
      connected={false}
      joinData={joinData}
      onPresentationChange={changed}
    />,
  );
  view.rerender(
    <ClassroomLesson
      socket={socket}
      connected
      joinData={joinData}
      onPresentationChange={changed}
    />,
  );
  await waitFor(() =>
    expect(socket.emit).toHaveBeenCalledWith(
      'lesson:present',
      {
        scheduleId: 'schedule',
        data: { planId: 'plan', revision: 3, slideIndex: 1 },
      },
      expect.any(Function),
    ),
  );
  socket.emit.mockClear();
  handlers.get('lesson:request')({ scheduleId: 'schedule' });
  await waitFor(() =>
    expect(socket.emit).toHaveBeenCalledWith(
      'lesson:present',
      {
        scheduleId: 'schedule',
        data: { planId: 'plan', revision: 3, slideIndex: 1 },
      },
      expect.any(Function),
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Dừng trình chiếu' }));
  await screen.findByRole('button', { name: 'Trình chiếu' });
  expect(changed).toHaveBeenLastCalledWith(false);
  expect(socket.emit).toHaveBeenLastCalledWith(
    'lesson:present',
    { scheduleId: 'schedule', data: { planId: null } },
    expect.any(Function),
  );
  view.unmount();
  expect(socket.off).toHaveBeenCalledWith(
    'lesson:request',
    expect.any(Function),
  );
});
it('giữ nguyên slide khi máy chủ không xác nhận đồng bộ', async () => {
  mock.request.mockImplementation((path) =>
    Promise.resolve(
      path === '/lesson-plans'
        ? { items: [{ ...plan, status: 'ready' }] }
        : plan,
    ),
  );
  const { socket } = socketFixture();
  render(<ClassroomLesson socket={socket} connected joinData={joinData} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Trình chiếu' }));
  await screen.findByText('Bài chào hỏi · slide 0');
  socket.emit.mockImplementation((event, payload, cb) =>
    cb(new Error('timeout')),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Slide sau' }));
  await screen.findByRole('alert');
  expect(screen.getByText('Bài chào hỏi · slide 0')).toBeInTheDocument();
});
