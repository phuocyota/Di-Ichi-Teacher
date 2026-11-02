import React from 'react'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import LessonLibrary from './LessonLibrary.jsx'
import { libraryRequest } from '../services/libraryApi.js'
vi.mock('../services/libraryApi.js', () => ({ libraryRequest: vi.fn() }))
const lesson = { id: 'lesson-1', title: 'Phân số', description: 'Bài học lớp 6', subject: 'Toán', grade: '6', topic: '', status: 'published', classIds: ['class-1'], audiences: ['TEACHER','STUDENT'], assets: [{ id: 'file-1', name: 'bai-hoc.pdf', kind: 'pdf', sizeBytes: 100 }] }
let records, manager
beforeEach(() => {
  records = []; manager = false
  libraryRequest.mockReset()
  libraryRequest.mockImplementation(async (path, options) => {
    if (path === '/options') return { canManage: manager, classes: [{ id: 'class-1', name: 'Lớp 6A' }] }
    if (path.startsWith('?')) return { items: records, total: records.length }
    if (path === '/lesson-1') {
      if (options?.method === 'PUT') return { ...lesson, ...options.body }
      return lesson
    }
    if (options?.method === 'POST' && !path) { records = [{ ...lesson, ...options.body }]; return records[0] }
    throw new Error('Unexpected request: ' + path)
  })
})
afterEach(cleanup)

it('renders a truthful empty library with no management actions for learners', async () => {
  render(<LessonLibrary />)
  expect(await screen.findByRole('heading', { name: 'Chưa có bài giảng' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '+ Thêm bài giảng' })).not.toBeInTheDocument()
})

it('shows API failures and recovers through retry', async () => {
  libraryRequest.mockRejectedValueOnce(new Error('Mất kết nối'))
  render(<LessonLibrary />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối')
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByRole('heading', { name: 'Chưa có bài giảng' })).toBeInTheDocument()
})

it('opens allowed content and keeps read-only controls for a learner', async () => {
  records = [lesson]
  render(<LessonLibrary />)
  fireEvent.click(await screen.findByRole('button', { name: /Phân số/ }))
  const dialog = await screen.findByRole('dialog', { name: 'Chi tiết bài giảng' })
  expect(within(dialog).getByText('bai-hoc.pdf')).toBeInTheDocument()
  expect(within(dialog).queryByRole('button', { name: 'Lưu thay đổi' })).not.toBeInTheDocument()
  expect(within(dialog).queryByText('Gỡ')).not.toBeInTheDocument()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('creates via API with explicit class and audience permissions, then shows saved metadata', async () => {
  manager = true
  render(<LessonLibrary manage />)
  fireEvent.click(await screen.findByRole('button', { name: '+ Thêm bài giảng' }))
  const dialog = screen.getByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('Tên bài giảng *'), { target: { value: 'Phân số mới' } })
  fireEvent.click(within(dialog).getByLabelText('Lớp 6A'))
  fireEvent.change(within(dialog).getByLabelText('Trạng thái'), { target: { value: 'published' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo bài giảng' }))
  await waitFor(() => expect(libraryRequest).toHaveBeenCalledWith('', expect.objectContaining({ method: 'POST', body: expect.objectContaining({ title: 'Phân số mới', classIds: ['class-1'], audiences: ['TEACHER', 'STUDENT'], status: 'published' }) })))
  expect(await within(dialog).findByRole('button', { name: 'Lưu thay đổi' })).toBeInTheDocument()
})

it('does not show save success or invent persisted data on a failed mutation', async () => {
  manager = true
  render(<LessonLibrary manage />)
  fireEvent.click(await screen.findByRole('button', { name: '+ Thêm bài giảng' }))
  const dialog = screen.getByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('Tên bài giảng *'), { target: { value: 'New lesson' } })
  libraryRequest.mockRejectedValueOnce(new Error('Không thể lưu'))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo bài giảng' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Không thể lưu')
  expect(within(dialog).getByRole('button', { name: 'Tạo bài giảng' })).toBeInTheDocument()
})

it('submits filters and resets pagination', async () => {
  render(<LessonLibrary />)
  await screen.findByRole('heading', { name: 'Chưa có bài giảng' })
  fireEvent.change(screen.getByLabelText('Tìm kiếm'), { target: { value: 'Phân số' } })
  fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }))
  await waitFor(() => expect(libraryRequest.mock.calls.some(([path]) => path.startsWith('?') && new URLSearchParams(path.slice(1)).get('search') === 'Phân số' && new URLSearchParams(path.slice(1)).get('page') === '1')).toBe(true))
})
