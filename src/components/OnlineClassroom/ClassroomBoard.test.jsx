import '@testing-library/jest-dom/vitest'
import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ClassroomBoard } from './ClassroomBoard.jsx'
import { prepareBoardImage } from './boardImage.js'

globalThis.React = React
// jsdom chưa có PointerEvent: fireEvent.pointer* sẽ mất clientX/clientY nếu không polyfill.
if (!window.PointerEvent) {
  window.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init)
      this.pointerId = init.pointerId
    }
  }
}
vi.mock('./boardImage.js', async (importOriginal) => ({ ...await importOriginal(), prepareBoardImage: vi.fn() }))

const scheduleId = 'schedule-id'
const makeSocket = () => {
  const handlers = {}
  return {
    connected: true,
    classroomReady: true,
    handlers,
    emit: vi.fn(),
    on: vi.fn((name, handler) => { handlers[name] = handler }),
    off: vi.fn(),
  }
}
const writer = { canWriteBoard: true, canControlBoard: true }
const viewBox = () => screen.getByLabelText('Bảng trắng').getAttribute('viewBox')
const paste = (file) => {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  event.clipboardData = { files: [file] }
  act(() => { document.body.dispatchEvent(event) })
  return event
}
beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

it('phóng to, thu nhỏ và đưa bảng về vừa khung', () => {
  render(<ClassroomBoard socket={makeSocket()} scheduleId={scheduleId} permissions={writer} />)
  expect(viewBox()).toBe('0 0 1000 500')
  fireEvent.click(screen.getByRole('button', { name: 'Phóng to' }))
  expect(screen.getByText('125%')).toBeInTheDocument()
  expect(viewBox()).toBe('100 50 800 400')
  fireEvent.click(screen.getByRole('button', { name: 'Thu nhỏ' }))
  fireEvent.click(screen.getByRole('button', { name: 'Thu nhỏ' }))
  expect(screen.getByText('80%')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Vừa khung bảng' }))
  expect(viewBox()).toBe('0 0 1000 500')
})

it('kéo bảng di chuyển khung nhìn mà không gửi nét vẽ', () => {
  const socket = makeSocket()
  render(<ClassroomBoard socket={socket} scheduleId={scheduleId} permissions={writer} />)
  const svg = screen.getByLabelText('Bảng trắng')
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 500 })
  fireEvent.click(screen.getByRole('button', { name: 'Phóng to' }))
  fireEvent.click(screen.getByRole('button', { name: 'Kéo bảng' }))
  fireEvent.pointerDown(svg, { clientX: 500, clientY: 250, pointerId: 1 })
  fireEvent.pointerMove(svg, { clientX: 600, clientY: 300, pointerId: 1 })
  fireEvent.pointerUp(svg, { pointerId: 1 })
  expect(viewBox()).toBe('20 10 800 400')
  expect(socket.emit).not.toHaveBeenCalledWith('board:draw', expect.anything())
})

it('dán ảnh vào bảng và đồng bộ qua board:draw', async () => {
  const socket = makeSocket()
  prepareBoardImage.mockResolvedValue({ src: 'data:image/jpeg;base64,AAAA', width: 400, height: 200 })
  const { container } = render(<ClassroomBoard socket={socket} scheduleId={scheduleId} permissions={writer} />)
  const event = paste(new File(['x'], 'a.png', { type: 'image/png' }))
  expect(event.defaultPrevented).toBe(true)
  await waitFor(() => expect(socket.emit).toHaveBeenCalledWith('board:draw', {
    scheduleId,
    data: expect.objectContaining({ type: 'image', src: 'data:image/jpeg;base64,AAAA', x: 300, y: 150, width: 400, height: 200 }),
  }))
  expect(container.querySelector('image')).toHaveAttribute('href', 'data:image/jpeg;base64,AAAA')
})

it('không chèn ảnh khi chưa có quyền viết bảng và bỏ qua ảnh không an toàn', () => {
  const socket = makeSocket()
  const { container } = render(<ClassroomBoard socket={socket} scheduleId={scheduleId} permissions={{ canWriteBoard: false, canControlBoard: false }} />)
  expect(screen.queryByRole('button', { name: /Chèn ảnh/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Xóa bảng/ })).not.toBeInTheDocument()
  paste(new File(['x'], 'a.png', { type: 'image/png' }))
  expect(prepareBoardImage).not.toHaveBeenCalled()
  act(() => socket.handlers['board:draw']({ scheduleId, data: { id: 'bad', type: 'image', src: 'javascript:alert(1)', x: 0, y: 0, width: 10, height: 10 } }))
  act(() => socket.handlers['board:draw']({ scheduleId, data: { id: 'weird', type: 'note' } }))
  expect(container.querySelector('image')).toBeNull()
})

it('không xử lý dán khi bảng nằm trong dialog đang đóng hoặc đang gõ vào ô nhập', () => {
  const dialog = document.createElement('dialog')
  document.body.appendChild(dialog)
  render(<ClassroomBoard socket={makeSocket()} scheduleId={scheduleId} permissions={writer} />, { container: dialog })
  paste(new File(['x'], 'a.png', { type: 'image/png' }))
  expect(prepareBoardImage).not.toHaveBeenCalled()
  dialog.remove()
})
