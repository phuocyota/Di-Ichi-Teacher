import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EndSessionDialog } from './EndSessionDialog.jsx';
import { endOnlineSession } from '../../services/classroomApi.js';
globalThis.React = React;
vi.mock('../../services/classroomApi.js', () => ({ endOnlineSession: vi.fn(), isFeatureDisabledError: e => e?.response?.status === 404 }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('requires confirmation and surfaces failure without leaving the session', async () => {
  const ended = vi.fn();
  endOnlineSession.mockRejectedValueOnce(new Error('Failed')).mockResolvedValue({});
  render(<EndSessionDialog scheduleId="id" enabled onEnded={ended} onLeave={vi.fn()} />);
  fireEvent.click(screen.getByText('Kết thúc buổi'));
  expect(endOnlineSession).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Xác nhận kết thúc'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Failed');
  expect(ended).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Xác nhận kết thúc'));
  await waitFor(() => expect(ended).toHaveBeenCalledOnce());
});
it('allows temporary leave while hiding End when lifecycle is OFF or user is not host', () => {
  const leave = vi.fn();
  render(<EndSessionDialog scheduleId="id" enabled={false} onLeave={leave} />);
  expect(screen.queryByText('Kết thúc buổi')).toBeNull();
  fireEvent.click(screen.getByText('Rời tạm'));
  expect(leave).toHaveBeenCalledOnce();
  expect(endOnlineSession).not.toHaveBeenCalled();
});
