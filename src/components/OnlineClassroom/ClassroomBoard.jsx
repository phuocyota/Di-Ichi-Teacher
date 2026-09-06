import { useEffect, useRef, useState } from 'react'
import { Eraser, PenLine } from 'lucide-react'

export const ClassroomBoard = ({ socket, scheduleId, permissions }) => {
  const [strokes, setStrokes] = useState([])
  const [drawing, setDrawing] = useState(null)
  const strokesRef = useRef(strokes)
  strokesRef.current = strokes

  useEffect(() => {
    if (!socket) return undefined
    const receiveStroke = (event) => event.scheduleId === scheduleId && event.data?.id
      && setStrokes((current) => [...current, event.data])
    const clearBoard = (event) => event.scheduleId === scheduleId && setStrokes([])
    const sendSnapshot = (event) => event.scheduleId === scheduleId && permissions.canControlBoard
      && socket.emit('board:snapshot', { scheduleId, data: strokesRef.current })
    const receiveSnapshot = (event) => event.scheduleId === scheduleId && Array.isArray(event.data)
      && setStrokes(event.data)
    socket.on('board:draw', receiveStroke)
    socket.on('board:clear', clearBoard)
    socket.on('board:snapshot-request', sendSnapshot)
    socket.on('board:snapshot', receiveSnapshot)
    socket.emit('board:snapshot-request', { scheduleId })
    return () => {
      socket.off('board:draw', receiveStroke)
      socket.off('board:clear', clearBoard)
      socket.off('board:snapshot-request', sendSnapshot)
      socket.off('board:snapshot', receiveSnapshot)
    }
  }, [permissions.canControlBoard, scheduleId, socket])

  const point = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: ((event.clientX - rect.left) / rect.width) * 1000, y: ((event.clientY - rect.top) / rect.height) * 500 }
  }
  const start = (event) => {
    if (!permissions.canWriteBoard) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrawing({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, color: '#F97316', width: 4, points: [point(event)] })
  }
  const move = (event) => drawing && setDrawing({ ...drawing, points: [...drawing.points, point(event)] })
  const finish = () => {
    if (!drawing) return
    if (drawing.points.length > 1) {
      setStrokes((current) => [...current, drawing])
      socket?.emit('board:draw', { scheduleId, data: drawing })
    }
    setDrawing(null)
  }
  const clear = () => {
    setStrokes([])
    socket?.emit('board:clear', { scheduleId })
  }

  return (
    <section className="border-t border-white/10 bg-white p-3 text-slate-900">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-black"><PenLine className="h-5 w-5 text-orange-500" />Bảng tương tác</div>
        <button type="button" onClick={clear} className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black">
          <Eraser className="h-4 w-4" /> Xóa bảng
        </button>
      </div>
      <svg viewBox="0 0 1000 500" className="h-56 w-full touch-none cursor-crosshair rounded-2xl border border-slate-200 bg-slate-50" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}>
        {[...strokes, ...(drawing ? [drawing] : [])].map((stroke) => (
          <polyline key={stroke.id} points={stroke.points.map((item) => `${item.x},${item.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    </section>
  )
}
