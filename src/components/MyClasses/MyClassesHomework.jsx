import { useEffect, useState } from 'react'
import { Clock, Download, Eye, FilePlus2, FileText, Paperclip, Send, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '../Common/Badge.jsx'
import { Button } from '../Common/Button.jsx'
import { Card } from '../Common/Card.jsx'

const acceptedFileTypes = '.pdf,.doc,.docx,.ppt,.pptx,.mp4'

const getFileKind = (file) => {
  const extension = file.name.split('.').pop()?.toUpperCase() || 'FILE'
  if (['DOC', 'DOCX'].includes(extension)) return 'WORD'
  if (['PPT', 'PPTX'].includes(extension)) return 'PPT'
  return extension
}

const formatFileSize = (size) => {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const formatDueDate = (value) => {
  if (!value) return 'Trong giờ học'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export const MyClassesHomework = ({ selectedClass, selectedSession }) => {
  const sessionHomework = selectedSession?.homework || selectedClass.homework
  const [homeworkList, setHomeworkList] = useState(sessionHomework)
  const [form, setForm] = useState({
    title: '',
    due: '',
    description: '',
  })
  const [files, setFiles] = useState([])

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  useEffect(() => {
    setHomeworkList(sessionHomework)
  }, [sessionHomework])

  const handleFilesChange = (event) => {
    const selectedFiles = Array.from(event.target.files || [])
    const preparedFiles = selectedFiles.map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      kind: getFileKind(file),
      size: formatFileSize(file.size),
      url: URL.createObjectURL(file),
      previewable: file.type === 'application/pdf' || file.type.startsWith('video/'),
    }))

    setFiles((current) => [...current, ...preparedFiles])
    event.target.value = ''
  }

  const handleRemoveFile = (fileId) => {
    setFiles((current) => current.filter((file) => file.id !== fileId))
  }

  const handlePreview = (file) => {
    if (!file.previewable) {
      toast.info('File này không hỗ trợ xem trước trực tiếp', {
        description: 'Bạn có thể tải file về để mở bằng Word hoặc PowerPoint.',
      })
      return
    }

    window.open(file.url, '_blank', 'noopener,noreferrer')
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài tập')
      return
    }

    const newHomework = {
      title: form.title,
      due: formatDueDate(form.due),
      submitted: `0/${selectedClass.size}`,
      status: 'Vừa đăng',
      description: form.description || 'Học sinh có thể bắt đầu làm ngay trong giờ học.',
      files,
    }

    setHomeworkList((current) => [newHomework, ...current])
    setForm({ title: '', due: '', description: '' })
    setFiles([])
    toast.success('Đã đăng bài tập', {
      description: 'Học sinh có thể làm bài và xem tài liệu ngay trong giờ học.',
    })
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
      <Card>
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-orange-700">
            <FilePlus2 size={23} />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-950">Đăng bài tập mới</h3>
            <p className="text-sm text-slate-500">Giao nhanh để học sinh làm ngay trong giờ học.</p>
          </div>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Tiêu đề bài tập</span>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-orange-100 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              onChange={(event) => handleChange('title', event.target.value)}
              placeholder="Ví dụ: In-class Writing Practice"
              value={form.title}
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Hạn nộp</span>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-orange-100 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              onChange={(event) => handleChange('due', event.target.value)}
              type="datetime-local"
              value={form.due}
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Mô tả / hướng dẫn</span>
            <textarea
              className="mt-2 min-h-28 w-full rounded-xl border border-orange-100 p-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              onChange={(event) => handleChange('description', event.target.value)}
              placeholder="Nhập yêu cầu bài tập, thời lượng làm bài hoặc tài liệu cần dùng..."
              value={form.description}
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">File đính kèm</span>
            <div className="mt-2 rounded-2xl border border-dashed border-orange-200 bg-orange-50 p-4 text-center">
              <Upload className="mx-auto text-orange-600" size={24} />
              <p className="mt-2 text-sm font-bold text-slate-700">Upload PDF, Word, PowerPoint hoặc MP4</p>
              <p className="mt-1 text-xs text-slate-500">Học sinh có thể xem hoặc tải file sau khi bài tập được đăng.</p>
              <input className="mt-3 w-full text-sm" type="file" accept={acceptedFileTypes} multiple onChange={handleFilesChange} />
            </div>
          </label>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-3 rounded-xl border border-orange-100 bg-white p-3">
                  <FileText size={18} className="shrink-0 text-orange-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-500">{file.kind} - {file.size}</p>
                  </div>
                  <button className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-orange-50 hover:text-orange-600" type="button" onClick={() => handleRemoveFile(file.id)} aria-label="Xóa file">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button className="w-full" type="submit">
            <Send size={18} />
            Đăng bài tập cho {selectedSession?.title || 'lớp'}
          </Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {homeworkList.map((item) => (
          <Card key={`${item.title}-${item.due}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
                <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500">
                  <Clock size={16} className="text-orange-500" />
                  Hạn nộp: {item.due}
                </p>
                <p className="text-sm text-slate-500">Đã nộp: {item.submitted}</p>
                {item.description && <p className="mt-3 rounded-xl bg-orange-50 p-3 text-sm text-slate-600">{item.description}</p>}

                {item.files?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="inline-flex items-center gap-2 text-sm font-black text-slate-700">
                      <Paperclip size={16} className="text-orange-600" />
                      File bài tập
                    </p>
                    {item.files.map((file) => (
                      <div key={file.id} className="rounded-xl border border-orange-100 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800">{file.name}</p>
                            <p className="text-xs text-slate-500">{file.kind} - {file.size}</p>
                          </div>
                          <Badge tone="slate">{file.kind}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button className="min-h-9 px-3" variant="secondary" onClick={() => handlePreview(file)}>
                            <Eye size={16} />
                            Xem
                          </Button>
                          <a className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700" href={file.url} download={file.name}>
                            <Download size={16} />
                            Tải
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Badge tone={item.status === 'Cần chấm' ? 'rose' : item.status === 'Vừa đăng' ? 'green' : 'amber'}>{item.status}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
