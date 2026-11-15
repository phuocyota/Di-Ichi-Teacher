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
    if (path === '/options') return { canManage: false, canCreate: manager, classes: [{ id: 'class-1', name: 'Lớp 6A' }] }
    if (path.startsWith('?')) return { items: records, total: records.length }
    if (path === '/lesson-1') {
      if (options?.method === 'PUT') return { ...lesson, canEdit: manager, ...options.body }
      return { ...lesson, canEdit: manager }
    }
    if (options?.method === 'POST' && !path) { records = [{ ...lesson, canEdit: manager, ...options.body }]; return records[0] }
    throw new Error('Unexpected request: ' + path)
  })
})
afterEach(cleanup)

it('renders a truthful empty library with no management actions for learners', async () => {
  render(<LessonLibrary />)
  expect(await screen.findByRole('heading', { name: 'Chưa có bài giảng' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '+ Tạo bài giảng PDF' })).not.toBeInTheDocument()
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
  fireEvent.click(await screen.findByRole('button', { name: '+ Tạo bài giảng PDF' }))
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
  fireEvent.click(await screen.findByRole('button', { name: '+ Tạo bài giảng PDF' }))
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

it('shows teacher create actions and requests mine with status, then clears status on shared tab', async () => {
  manager = true
  render(<LessonLibrary />)
  const mine = await screen.findByRole('button', { name: 'Bài giảng của tôi' })
  expect(screen.getByRole('button', { name: '+ Tạo bài giảng PDF' })).toBeInTheDocument()
  fireEvent.click(mine)
  expect(await screen.findByRole('heading', { name: 'Bạn chưa tạo bài giảng nào.' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'draft' } })
  fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }))
  await waitFor(() => expect(libraryRequest.mock.calls.some(([path]) => path.startsWith('?') && new URLSearchParams(path.slice(1)).get('mine') === 'true' && new URLSearchParams(path.slice(1)).get('status') === 'draft')).toBe(true))
  fireEvent.click(screen.getByRole('button', { name: 'Được chia sẻ' }))
  await waitFor(() => expect(libraryRequest.mock.calls.filter(([path]) => path.startsWith('?')).at(-1)[0]).toContain('mine=false'))
  expect(screen.queryByLabelText('Trạng thái')).not.toBeInTheDocument()
})

it('creates a teacher draft and uploads PDF using FormData while keeping the dialog open', async () => {
  manager = true
  const fallback = libraryRequest.getMockImplementation()
  libraryRequest.mockImplementation(async (path, options) => path === '/lesson-1/files' ? { id: 'new-pdf' } : fallback(path, options))
  render(<LessonLibrary />)
  fireEvent.click(await screen.findByRole('button', { name: '+ Tạo bài giảng PDF' }))
  const dialog = screen.getByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('Tên bài giảng *'), { target: { value: 'Teacher draft' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo bài giảng' }))
  const input = await within(dialog).findByLabelText('+ Tải tệp lên')
  expect(input).toHaveAttribute('accept', '.pdf,application/pdf')
  expect(within(dialog).queryByRole('button', { name: 'Thêm liên kết' })).not.toBeInTheDocument()
  const file = new File(['%PDF-1.7'], 'teacher.PDF', { type: 'application/pdf' })
  fireEvent.change(input, { target: { files: [file] } })
  await waitFor(() => expect(libraryRequest).toHaveBeenCalledWith('/lesson-1/files', expect.objectContaining({ method: 'POST', body: expect.any(FormData) })))
  const body = libraryRequest.mock.calls.find(([path]) => path === '/lesson-1/files')[1].body
  expect(body.get('file')).toBe(file)
  expect(await within(dialog).findByRole('status')).toHaveTextContent('Đã tải tệp lên')
})

it.each(['docx', 'oversized', 'empty'])('rejects invalid %s file before calling upload API', async kind => {
  manager = true; records = [lesson]
  render(<LessonLibrary />)
  fireEvent.click(await screen.findByRole('button', { name: /Phân số/ }))
  const dialog = await screen.findByRole('dialog')
  const file = new File(kind === 'empty' ? [] : ['bytes'], kind === 'docx' ? 'lesson.docx' : 'lesson.pdf')
  if (kind === 'oversized') Object.defineProperty(file, 'size', { value: 100 * 1024 * 1024 + 1 })
  fireEvent.change(within(dialog).getByLabelText('+ Tải tệp lên'), { target: { files: [file] } })
  expect(within(dialog).getByRole('alert')).toHaveTextContent(kind === 'docx' ? 'Giáo viên chỉ tải lên được tệp PDF' : kind === 'empty' ? 'Tệp PDF không được rỗng' : 'Tệp vượt quá 100 MB')
  expect(libraryRequest.mock.calls.some(([path]) => path.endsWith('/files'))).toBe(false)
})

it('keeps another author lesson read-only even when the teacher can create', async () => {
  manager = true; records = [lesson]
  const fallback = libraryRequest.getMockImplementation()
  libraryRequest.mockImplementation(async (path, options) => path === '/lesson-1' ? { ...lesson, canEdit: false } : fallback(path, options))
  render(<LessonLibrary />)
  fireEvent.click(await screen.findByRole('button', { name: /Phân số/ }))
  const dialog = await screen.findByRole('dialog', { name: 'Chi tiết bài giảng' })
  expect(within(dialog).queryByLabelText('Tên bài giảng *')).not.toBeInTheDocument()
  expect(within(dialog).queryByLabelText('+ Tải tệp lên')).not.toBeInTheDocument()
  expect(within(dialog).queryByRole('button', { name: 'Xóa bài giảng' })).not.toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Xem' })).toBeInTheDocument()
})

it('shows upload failure without claiming success or closing the editor', async () => {
  manager = true; records = [lesson]
  render(<LessonLibrary />)
  fireEvent.click(await screen.findByRole('button', { name: /Phân số/ }))
  const dialog = await screen.findByRole('dialog')
  libraryRequest.mockRejectedValueOnce(new Error('Upload thất bại'))
  fireEvent.change(within(dialog).getByLabelText('+ Tải tệp lên'), { target: { files: [new File(['%PDF-1.7'], 'lesson.pdf')] } })
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Upload thất bại')
  expect(within(dialog).queryByText('Đã tải tệp lên')).not.toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Lưu thay đổi' })).toBeInTheDocument()
})

it('keeps existing class grants and unsaved edits when files are refreshed', async () => {
  manager = true; records = [lesson]
  const fallback = libraryRequest.getMockImplementation()
  libraryRequest.mockImplementation(async (path, options) => {
    if (path === '/lesson-1/files') return { id: 'new' }
    if (path === '/lesson-1' && !options?.method) return { ...lesson, canEdit: true, classIds: ['class-1', 'former-class'] }
    return fallback(path, options)
  })
  render(<LessonLibrary />)
  fireEvent.click(await screen.findByRole('button', { name: /Phân số/ }))
  const dialog = await screen.findByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('Tên bài giảng *'), { target: { value: 'Unsaved title' } })
  fireEvent.change(within(dialog).getByLabelText('+ Tải tệp lên'), { target: { files: [new File(['%PDF-1.7'], 'lesson.pdf')] } })
  await within(dialog).findByText('Đã tải tệp lên')
  expect(within(dialog).getByLabelText('Tên bài giảng *')).toHaveValue('Unsaved title')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }))
  await waitFor(() => expect(libraryRequest).toHaveBeenCalledWith('/lesson-1', expect.objectContaining({ method: 'PUT', body: expect.objectContaining({ title: 'Unsaved title', classIds: ['class-1', 'former-class'] }) })))
})

it('uploads a batch sequentially and refreshes all uploaded PDFs', async () => {
  manager = true; records = [lesson]
  const uploaded = []
  const fallback = libraryRequest.getMockImplementation()
  libraryRequest.mockImplementation(async (path, options) => {
    if (path === '/lesson-1/files') {
      const file = options.body.get('file')
      const asset = { id: file.name, name: file.name, kind: 'pdf', sizeBytes: file.size }
      uploaded.push(asset)
      return asset
    }
    if (path === '/lesson-1' && !options?.method) return { ...lesson, canEdit: true, assets: [...lesson.assets, ...uploaded] }
    return fallback(path, options)
  })
  render(<LessonLibrary />)
  fireEvent.click(await screen.findByRole('button', { name: /Phân số/ }))
  const dialog = await screen.findByRole('dialog')
  const input = within(dialog).getByLabelText('+ Tải tệp lên')
  expect(input).toHaveAttribute('multiple')
  fireEvent.change(input, { target: { files: [new File(['%PDF-1.7'], 'one.pdf'), new File(['%PDF-1.7'], 'two.pdf')] } })
  expect(await within(dialog).findByText('two.pdf')).toBeInTheDocument()
  expect(uploaded.map(asset => asset.name)).toEqual(['one.pdf', 'two.pdf'])
  expect(within(dialog).getByText('3 / 20')).toBeInTheDocument()
  expect(within(dialog).getByRole('status')).toHaveTextContent('Đã tải tệp lên')
})

it('stops a failed batch and keeps successful files without reporting full success', async () => {
  manager = true; records = [lesson]
  const fallback = libraryRequest.getMockImplementation()
  const names = []
  libraryRequest.mockImplementation(async (path, options) => {
    if (path === '/lesson-1/files') {
      const name = options.body.get('file').name
      names.push(name)
      if (name === 'two.pdf') throw new Error('Mất kết nối')
      return { id: 'one' }
    }
    return fallback(path, options)
  })
  render(<LessonLibrary />)
  fireEvent.click(await screen.findByRole('button', { name: /Phân số/ }))
  const dialog = await screen.findByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('+ Tải tệp lên'), { target: { files: ['one', 'two', 'three'].map(name => new File(['%PDF-1.7'], name + '.pdf')) } })
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('two.pdf: Mất kết nối')
  expect(names).toEqual(['one.pdf', 'two.pdf'])
  expect(within(dialog).getByRole('status')).toHaveTextContent('Đã giữ các tệp tải thành công')
  expect(within(dialog).queryByText('Đã tải tệp lên')).not.toBeInTheDocument()
})

it('validates the entire selection before uploading any file', async () => {
  manager = true; records = [lesson]
  render(<LessonLibrary />)
  fireEvent.click(await screen.findByRole('button', { name: /Phân số/ }))
  const dialog = await screen.findByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('+ Tải tệp lên'), { target: { files: [new File(['%PDF-1.7'], 'one.pdf'), new File(['PK'], 'two.docx')] } })
  expect(within(dialog).getByRole('alert')).toHaveTextContent('Giáo viên chỉ tải lên được tệp PDF')
  expect(libraryRequest.mock.calls.some(([path]) => path.endsWith('/files'))).toBe(false)
})

it('rejects a batch that exceeds the remaining lesson capacity', async () => {
  manager = true; records = [lesson]
  const fallback = libraryRequest.getMockImplementation()
  libraryRequest.mockImplementation(async (path, options) => path === '/lesson-1' ? { ...lesson, canEdit: true, assets: Array.from({ length: 19 }, (_, index) => ({ ...lesson.assets[0], id: 'file-' + index })) } : fallback(path, options))
  render(<LessonLibrary />)
  fireEvent.click(await screen.findByRole('button', { name: /Phân số/ }))
  const dialog = await screen.findByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('+ Tải tệp lên'), { target: { files: [new File(['%PDF-1.7'], 'one.pdf'), new File(['%PDF-1.7'], 'two.pdf')] } })
  expect(within(dialog).getByRole('alert')).toHaveTextContent('Mỗi bài giảng tối đa 20 tệp')
  expect(libraryRequest.mock.calls.some(([path]) => path.endsWith('/files'))).toBe(false)
})

it('distinguishes an uploaded file from a failed detail refresh', async () => {
  manager = true; records = [lesson]
  const fallback = libraryRequest.getMockImplementation()
  let uploaded = false, failRefresh = true
  libraryRequest.mockImplementation(async (path, options) => {
    if (path === '/lesson-1/files') { uploaded = true; return { id: 'new' } }
    if (path === '/lesson-1' && uploaded && failRefresh) throw new Error('Không tải được chi tiết')
    return fallback(path, options)
  })
  render(<LessonLibrary />)
  fireEvent.click(await screen.findByRole('button', { name: /Phân số/ }))
  const dialog = await screen.findByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('+ Tải tệp lên'), { target: { files: [new File(['%PDF-1.7'], 'one.pdf')] } })
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Tệp đã tải lên nhưng chưa cập nhật được danh sách')
  expect(within(dialog).getByRole('status')).toHaveTextContent('Đã tải tệp lên')
  expect(libraryRequest.mock.calls.filter(([path]) => path.endsWith('/files'))).toHaveLength(1)
  expect(within(dialog).getByLabelText('+ Tải tệp lên')).toBeDisabled()
  failRefresh = false
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tải lại danh sách tệp' }))
  await waitFor(() => expect(within(dialog).getByLabelText('+ Tải tệp lên')).toBeEnabled())
  expect(libraryRequest.mock.calls.filter(([path]) => path.endsWith('/files'))).toHaveLength(1)
})

it('guides creation into My lessons and validates publication access before the API call', async () => {
  manager = true
  render(<LessonLibrary />)
  fireEvent.click(await screen.findByRole('button', { name: '+ Tạo bài giảng PDF' }))
  const dialog = screen.getByRole('dialog')
  expect(screen.getByRole('button', { name: 'Bài giảng của tôi' })).toHaveAttribute('aria-pressed', 'true')
  expect(within(dialog).getByRole('list', { name: 'Các bước tạo bài giảng' })).toBeInTheDocument()
  expect(within(dialog).getByText('Lưu bài giảng để tiếp tục')).toBeInTheDocument()
  fireEvent.change(within(dialog).getByLabelText('Tên bài giảng *'), { target: { value: 'PDF lesson' } })
  fireEvent.change(within(dialog).getByLabelText('Trạng thái'), { target: { value: 'published' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo bài giảng' }))
  expect(within(dialog).getByRole('alert')).toHaveTextContent('Chọn lớp và đối tượng trước khi xuất bản')
  expect(libraryRequest.mock.calls.some(([path, options]) => path === '' && options?.method === 'POST')).toBe(false)
})

it('shows the AI description to the owner while editing without sending it back on save', async () => {
  manager = true; records = [lesson]
  const fallback = libraryRequest.getMockImplementation()
  libraryRequest.mockImplementation(async (path, options) => path === '/lesson-1' && !options?.method ? { ...lesson, canEdit: true, aiDescription: 'Tóm tắt AI: phân số cơ bản' } : fallback(path, options))
  render(<LessonLibrary />)
  fireEvent.click(await screen.findByRole('button', { name: /Phân số/ }))
  const dialog = await screen.findByRole('dialog', { name: 'Quản lý bài giảng' })
  expect(within(dialog).getByLabelText('Tên bài giảng *')).toBeInTheDocument()
  expect(within(dialog).getByText('Tóm tắt AI: phân số cơ bản')).not.toBeVisible()
  fireEvent.click(within(dialog).getByText('Xem mô tả AI'))
  expect(within(dialog).getByText('Tóm tắt AI: phân số cơ bản')).toBeVisible()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }))
  await waitFor(() => expect(libraryRequest).toHaveBeenCalledWith('/lesson-1', expect.objectContaining({ method: 'PUT' })))
  const body = libraryRequest.mock.calls.find(([path, options]) => path === '/lesson-1' && options?.method === 'PUT')[1].body
  expect(body).not.toHaveProperty('aiDescription')
})

it('tells a reader when the lesson has no AI description', async () => {
  records = [lesson]
  render(<LessonLibrary />)
  fireEvent.click(await screen.findByRole('button', { name: /Phân số/ }))
  const dialog = await screen.findByRole('dialog', { name: 'Chi tiết bài giảng' })
  fireEvent.click(within(dialog).getByText('Xem mô tả AI'))
  expect(within(dialog).getByText('Chưa có mô tả AI cho bài giảng này.')).toBeVisible()
})
