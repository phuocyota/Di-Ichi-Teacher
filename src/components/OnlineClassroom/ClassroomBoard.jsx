import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser, Hand, ImagePlus, Maximize, PenLine, ZoomIn, ZoomOut } from 'lucide-react'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  INITIAL_VIEW,
  MAX_BOARD_CHARS,
  MAX_ZOOM,
  MIN_ZOOM,
  boardSize,
  clientToBoard,
  isBoardImage,
  isBoardStroke,
  panView,
  placeImage,
  prepareBoardImage,
  viewBoxOf,
  zoomView,
} from './boardImage.js'

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`
const round = (value) => Math.round(value * 10) / 10
const isEditable = (node) =>
  node instanceof HTMLElement && (node.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName))

export const ClassroomBoard = ({ socket, scheduleId, permissions }) => {
  const [strokes, setStrokes] = useState([])
  const [drawing, setDrawing] = useState(null)
  const [view, setView] = useState(INITIAL_VIEW)
  const [tool, setTool] = useState('pen')
  const [notice, setNotice] = useState('')
  const [inserting, setInserting] = useState(false)
  const strokesRef = useRef(strokes)
  strokesRef.current = strokes
  const viewRef = useRef(view)
  viewRef.current = view
  const panning = useRef(null)
  const svgRef = useRef(null)
  const sectionRef = useRef(null)
  const fileRef = useRef(null)
  const canWrite = Boolean(permissions?.canWriteBoard)
  const canControl = Boolean(permissions?.canControlBoard)
  const activeTool = canWrite ? tool : 'pan'

  useEffect(() => {
    if (!socket) return undefined
    const receiveStroke = (event) => event.scheduleId === scheduleId && event.data?.id
      && setStrokes((current) => [...current.filter(item => item.id !== event.data.id), event.data])
    const clearBoard = (event) => event.scheduleId === scheduleId && setStrokes([])
    const sendSnapshot = (event) => event.scheduleId === scheduleId && canControl
      && socket.emit('board:snapshot', { scheduleId, data: strokesRef.current })
    const receiveSnapshot = (event) => event.scheduleId === scheduleId && Array.isArray(event.data)
      && setStrokes(event.data)
    socket.on('board:draw', receiveStroke)
    socket.on('board:clear', clearBoard)
    socket.on('board:snapshot-request', sendSnapshot)
    socket.on('board:snapshot', receiveSnapshot)
    if (socket.classroomReady) socket.emit('board:snapshot-request', { scheduleId })
    return () => {
      socket.off('board:draw', receiveStroke)
      socket.off('board:clear', clearBoard)
      socket.off('board:snapshot-request', sendSnapshot)
      socket.off('board:snapshot', receiveSnapshot)
    }
  }, [canControl, scheduleId, socket])

  const ready = () => Boolean(socket?.connected && socket.classroomReady)
  const point = (event) => {
    const result = clientToBoard(event.currentTarget, event.clientX, event.clientY, viewRef.current)
    return { x: round(result.x), y: round(result.y) }
  }
  const start = (event) => {
    if (activeTool === 'pan' || event.button === 1) {
      event.currentTarget.setPointerCapture?.(event.pointerId)
      const rect = event.currentTarget.getBoundingClientRect()
      const box = viewBoxOf(viewRef.current)
      // preserveAspectRatio="meet": một pixel màn hình tương ứng với tỉ lệ lớn hơn.
      const scale = Math.max(box.width / (rect.width || 1), box.height / (rect.height || 1))
      panning.current = { x: event.clientX, y: event.clientY, view: viewRef.current, scale }
      return
    }
    if (!canWrite || !ready()) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDrawing({ id: newId(), color: '#F97316', width: 4, points: [point(event)] })
  }
  const move = (event) => {
    const pan = panning.current
    if (pan) {
      setView(panView(pan.view, (event.clientX - pan.x) * pan.scale, (event.clientY - pan.y) * pan.scale))
      return
    }
    if (drawing) setDrawing({ ...drawing, points: [...drawing.points, point(event)] })
  }
  const finish = () => {
    if (panning.current) {
      panning.current = null
      return
    }
    if (!drawing) return
    if (!ready()) { setDrawing(null); return }
    if (drawing.points.length > 1) {
      setStrokes((current) => [...current, drawing])
      socket?.emit('board:draw', { scheduleId, data: drawing })
    }
    setDrawing(null)
  }
  const clear = () => {
    if (!canControl || !ready()) return
    setStrokes([])
    socket?.emit('board:clear', { scheduleId })
  }
  const zoomBy = (factor) => setView((current) => zoomView(current, current.zoom * factor))

  // Ctrl/⌘ + cuộn (hoặc chụm trên touchpad) để phóng to quanh con trỏ; cần listener không passive.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    const onWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const anchor = clientToBoard(svg, event.clientX, event.clientY, viewRef.current)
      setView((current) => zoomView(current, current.zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1), anchor))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  const insertImage = useCallback(async (file) => {
    if (!file) return
    if (!canWrite) { setNotice('Bạn chưa có quyền viết bảng.'); return }
    if (!socket?.connected || !socket.classroomReady) { setNotice('Đang mất kết nối, chưa thể chèn ảnh.'); return }
    setInserting(true)
    setNotice('')
    try {
      const prepared = await prepareBoardImage(file)
      const item = { id: newId(), ...placeImage(prepared, viewBoxOf(viewRef.current)) }
      if (boardSize([...strokesRef.current, item]) > MAX_BOARD_CHARS) {
        setNotice('Bảng đã đầy dung lượng ảnh. Hãy xóa bảng trước khi chèn thêm.')
        return
      }
      setStrokes((current) => [...current, item])
      socket.emit('board:draw', { scheduleId, data: item })
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không thể chèn ảnh')
    } finally {
      setInserting(false)
    }
  }, [canWrite, scheduleId, socket])

  useEffect(() => {
    const onPaste = (event) => {
      const section = sectionRef.current
      const dialog = section?.closest('dialog')
      if (!section || (dialog && !dialog.open) || isEditable(event.target)) return
      const file = [...(event.clipboardData?.files ?? [])].find((item) => item.type.startsWith('image/'))
      if (!file) return
      event.preventDefault()
      void insertImage(file)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [insertImage])

  const box = viewBoxOf(view)
  const items = drawing ? [...strokes, drawing] : strokes
  const toolClass = (active) => `flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-black ${active ? 'bg-orange-500 text-white' : 'bg-slate-100'}`
  return (
    <section ref={sectionRef} className="border-t border-white/10 bg-white p-3 text-slate-900">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-black"><PenLine className="h-5 w-5 text-orange-500" />Bảng tương tác</div>
        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Công cụ bảng trắng">
          {canWrite && (
            <button type="button" aria-pressed={activeTool === 'pen'} onClick={() => setTool('pen')} className={toolClass(activeTool === 'pen')}>
              <PenLine className="h-4 w-4" aria-hidden="true" /> Bút
            </button>
          )}
          <button type="button" aria-pressed={activeTool === 'pan'} onClick={() => setTool('pan')} className={toolClass(activeTool === 'pan')}>
            <Hand className="h-4 w-4" aria-hidden="true" /> Kéo bảng
          </button>
          <button type="button" aria-label="Thu nhỏ" disabled={view.zoom <= MIN_ZOOM} onClick={() => zoomBy(1 / 1.25)} className={`${toolClass(false)} disabled:opacity-40`}>
            <ZoomOut className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-12 text-center text-sm font-black" aria-live="polite">{Math.round(view.zoom * 100)}%</span>
          <button type="button" aria-label="Phóng to" disabled={view.zoom >= MAX_ZOOM} onClick={() => zoomBy(1.25)} className={`${toolClass(false)} disabled:opacity-40`}>
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Vừa khung bảng" onClick={() => setView(INITIAL_VIEW)} className={toolClass(false)}>
            <Maximize className="h-4 w-4" aria-hidden="true" />
          </button>
          {canWrite && (
            <>
              <button type="button" disabled={inserting} onClick={() => fileRef.current?.click()} className={`${toolClass(false)} disabled:opacity-40`}>
                <ImagePlus className="h-4 w-4" aria-hidden="true" /> {inserting ? 'Đang chèn...' : 'Chèn ảnh'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                data-testid="board-image-input"
                onChange={(event) => {
                  void insertImage(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </>
          )}
          {canControl && (
            <button type="button" onClick={clear} className={toolClass(false)}>
              <Eraser className="h-4 w-4" aria-hidden="true" /> Xóa bảng
            </button>
          )}
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
        aria-label="Bảng trắng"
        className={`h-56 w-full touch-none rounded-2xl border border-slate-200 bg-slate-200 ${activeTool === 'pan' ? 'cursor-grab' : 'cursor-crosshair'}`}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
      >
        <defs>
          <pattern id={`board-dots-${scheduleId}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#cbd5e1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="#fafbfc" />
        <rect x="0" y="0" width={BOARD_WIDTH} height={BOARD_HEIGHT} fill={`url(#board-dots-${scheduleId})`} />
        {items.map((item) => {
          if (isBoardImage(item))
            return <image key={item.id} href={item.src} x={item.x} y={item.y} width={item.width} height={item.height} preserveAspectRatio="xMidYMid meet" />
          if (!isBoardStroke(item)) return null
          return <polyline key={item.id} points={item.points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={item.color} strokeWidth={item.width} strokeLinecap="round" strokeLinejoin="round" />
        })}
      </svg>
      <p className="mt-2 text-center text-xs font-bold text-slate-500" role="status">
        {notice || (canWrite ? 'Dán ảnh bằng Ctrl/⌘ + V. Ctrl/⌘ + cuộn để phóng to, thu nhỏ.' : 'Ctrl/⌘ + cuộn để phóng to, thu nhỏ; dùng "Kéo bảng" để di chuyển.')}
      </p>
    </section>
  )
}
