import '@testing-library/jest-dom/vitest';
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ClassroomWhiteboard } from './ClassroomWhiteboard.jsx';
globalThis.React = React;
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Bảng trắng</button>
      <p>Slide đang trình chiếu</p>
      <ClassroomWhiteboard open={open} onClose={() => setOpen(false)}>
        <input aria-label="Nội dung bảng" defaultValue="Nét vẽ ban đầu" />
      </ClassroomWhiteboard>
    </>
  );
}
it('mở bằng showModal, đóng bằng nút hoặc Escape, giữ nguyên nội dung bảng và slide', () => {
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
  const show = vi
    .spyOn(HTMLDialogElement.prototype, 'showModal')
    .mockImplementation(function () {
      this.setAttribute('open', '');
    });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(
    function () {
      this.removeAttribute('open');
    },
  );
  const view = render(<Harness />);
  const dialog = view.container.querySelector('dialog');
  const input = view.container.querySelector('input');
  expect(dialog).not.toHaveAttribute('open');
  fireEvent.click(screen.getByRole('button', { name: 'Bảng trắng' }));
  expect(show).toHaveBeenCalledOnce();
  expect(dialog).toHaveAttribute('open');
  fireEvent.change(input, { target: { value: 'Nét vẽ mới' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đóng bảng trắng' }));
  expect(dialog).not.toHaveAttribute('open');
  fireEvent.click(screen.getByRole('button', { name: 'Bảng trắng' }));
  expect(input).toHaveValue('Nét vẽ mới');
  expect(view.container.querySelector('input')).toBe(input);
  fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
  expect(dialog).not.toHaveAttribute('open');
  expect(screen.getByText('Slide đang trình chiếu')).toBeInTheDocument();
});
