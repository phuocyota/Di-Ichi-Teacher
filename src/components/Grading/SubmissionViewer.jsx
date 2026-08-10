import { FileImage, FileText, FileType2, Headphones, Pause, Play } from 'lucide-react'
import { useState } from 'react'

export const SubmissionViewer = ({ submission, content }) => {
  if (!submission || !content) return null

  if (content.contentType === 'audio') {
    return <AudioViewer duration={content.duration} transcript={content.transcript} />
  }

  if (content.contentType === 'text') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-slate-600">
          Writing submission · {content.wordCount} từ
        </div>
        <article className="whitespace-pre-line rounded-2xl border border-gray-200 bg-white p-5 leading-7 text-slate-700">{content.content}</article>
      </div>
    )
  }

  if (content.contentType === 'image') {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <div className="grid aspect-[4/3] place-items-center rounded-2xl border border-dashed border-gray-300 bg-white">
          <div className="text-center">
            <FileImage className="mx-auto text-orange-600" size={44} />
            <p className="mt-3 font-black text-slate-900">{content.fileName}</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">{content.caption}</p>
          </div>
        </div>
      </div>
    )
  }

  const Icon = content.contentType === 'pdf' ? FileText : FileType2
  const label = content.contentType === 'pdf' ? 'PDF Viewer' : 'Word Viewer'

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="min-h-96 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-orange-50 text-orange-700">
            <Icon size={24} />
          </span>
          <div>
            <p className="font-black text-slate-950">{content.fileName}</p>
            <p className="text-sm text-slate-500">{label} · sẵn sàng thay bằng backend file URL</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {(content.previewLines || []).map((line) => (
            <p key={line} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-slate-700">{line}</p>
          ))}
          {content.pages && <p className="text-sm font-bold text-slate-500">{content.pages} trang</p>}
        </div>
      </div>
    </div>
  )
}

const AudioViewer = ({ duration, transcript }) => {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState('1.0x')

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-slate-950 p-5 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <button type="button" onClick={() => setPlaying((value) => !value)} className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-500 text-white hover:bg-orange-600">
            {playing ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 text-sm font-bold">
              <span className="inline-flex items-center gap-2"><Headphones size={16} /> Speaking audio</span>
              <span>{duration}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/15">
              <div className="h-2 w-[42%] rounded-full bg-orange-400" />
            </div>
          </div>
          <select value={speed} onChange={(event) => setSpeed(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-black outline-none">
            {['0.75x', '1.0x', '1.25x', '1.5x', '2.0x'].map((option) => <option key={option}>{option}</option>)}
          </select>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-black uppercase text-slate-400">Transcript / ghi chú nghe nhanh</p>
        <p className="mt-3 leading-7 text-slate-700">{transcript}</p>
      </div>
    </div>
  )
}
