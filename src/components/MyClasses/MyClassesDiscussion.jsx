import { useEffect, useState } from 'react'
import { MessageSquare, Paperclip, Reply, Send } from 'lucide-react'
import { toast } from 'sonner'
import { discussionThreads } from '../../datas/myClassExtras.js'
import { Badge } from '../Common/Badge.jsx'
import { Button } from '../Common/Button.jsx'
import { Card } from '../Common/Card.jsx'

export const MyClassesDiscussion = ({ selectedClass, selectedSession }) => {
  const sessionThreads = selectedSession?.discussions || discussionThreads
  const [threads, setThreads] = useState(sessionThreads)
  const [message, setMessage] = useState('')
  const [attachmentName, setAttachmentName] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!message.trim()) {
      toast.error('Vui lòng nhập nội dung thảo luận')
      return
    }

    setThreads((current) => [
      {
        id: `disc-${Date.now()}`,
        author: 'Cô Linh Trần',
        role: 'Giáo viên',
        message,
        replies: 0,
        attachment: attachmentName || null,
        time: 'Vừa xong',
      },
      ...current,
    ])
    setMessage('')
    setAttachmentName('')
    toast.success('Đã gửi thảo luận', {
      description: `Thông báo đã được gửi tới lớp ${selectedClass.name}.`,
    })
  }

  useEffect(() => {
    setThreads(sessionThreads)
  }, [sessionThreads])

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <Card>
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-orange-700">
            <MessageSquare size={22} />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-950">Tạo thảo luận</h3>
            <p className="text-sm text-slate-500">Gửi thông báo, trả lời câu hỏi hoặc đính kèm file.</p>
          </div>
        </div>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <textarea className="min-h-32 w-full rounded-xl border border-orange-100 p-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" placeholder="Viết thông báo hoặc bình luận cho lớp..." value={message} onChange={(event) => setMessage(event.target.value)} />
          <label className="block rounded-2xl border border-dashed border-orange-200 bg-orange-50 p-4 text-center">
            <Paperclip className="mx-auto text-orange-600" size={22} />
            <p className="mt-2 text-sm font-bold text-slate-700">{attachmentName || 'Đính kèm file'}</p>
            <input className="mt-3 w-full text-sm" type="file" onChange={(event) => setAttachmentName(event.target.files?.[0]?.name || '')} />
          </label>
          <Button className="w-full" type="submit">
            <Send size={18} />
            Gửi thông báo
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        {threads.map((thread) => (
          <Card key={thread.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-slate-950">{thread.author}</h3>
                  <Badge tone={thread.role === 'Giáo viên' ? 'orange' : 'slate'}>{thread.role}</Badge>
                  <span className="text-xs font-semibold text-slate-400">{thread.time}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{thread.message}</p>
                {thread.attachment && (
                  <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700">
                    <Paperclip size={16} />
                    {thread.attachment}
                  </p>
                )}
              </div>
              <button className="inline-flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700 hover:bg-orange-100">
                <Reply size={16} />
                {thread.replies}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
