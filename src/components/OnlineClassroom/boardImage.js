// Hệ tọa độ dùng chung của bảng trắng; mọi người tham gia vẽ trên cùng hệ này.
export const BOARD_WIDTH = 1000
export const BOARD_HEIGHT = 500
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 4
// Backend từ chối sự kiện bảng lớn hơn 750000 ký tự (kể cả snapshot toàn bảng).
export const MAX_IMAGE_CHARS = 240000
export const MAX_BOARD_CHARS = 700000

const SAFE_IMAGE = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i

/** Chỉ hiển thị ảnh data URL dạng raster an toàn nhận từ người khác. */
export const isBoardImage = (item) =>
  item?.type === 'image' &&
  typeof item.src === 'string' &&
  SAFE_IMAGE.test(item.src) &&
  [item.x, item.y, item.width, item.height].every(Number.isFinite) &&
  item.width > 0 &&
  item.height > 0

export const isBoardStroke = (item) =>
  item?.type !== 'image' && Array.isArray(item?.points)

export const boardSize = (items) => JSON.stringify(items).length

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Không đọc được ảnh'))
    }
    image.src = url
  })

/** Thu nhỏ và nén ảnh thành JPEG để vừa giới hạn kích thước sự kiện bảng. */
export async function prepareBoardImage(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Tệp không phải ảnh')
  const image = await loadImage(file)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  let longest = Math.min(1280, Math.max(image.naturalWidth, image.naturalHeight))
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const scale = longest / Math.max(image.naturalWidth, image.naturalHeight)
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    // Nền trắng để ảnh PNG trong suốt không bị đen khi chuyển sang JPEG.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    for (const quality of [0.85, 0.7, 0.55]) {
      const src = canvas.toDataURL('image/jpeg', quality)
      if (src.length <= MAX_IMAGE_CHARS)
        return { src, width: canvas.width, height: canvas.height }
    }
    longest = Math.round(longest * 0.75)
  }
  throw new Error('Ảnh quá lớn, vui lòng dùng ảnh nhỏ hơn')
}

/** Đặt ảnh vào giữa vùng đang xem, chiếm tối đa 60% khung nhìn. */
export function placeImage(prepared, view) {
  const scale = Math.min(
    (view.width * 0.6) / prepared.width,
    (view.height * 0.6) / prepared.height,
    1,
  )
  const width = Math.round(prepared.width * scale * 10) / 10
  const height = Math.round(prepared.height * scale * 10) / 10
  return {
    type: 'image',
    src: prepared.src,
    x: Math.round((view.x + (view.width - width) / 2) * 10) / 10,
    y: Math.round((view.y + (view.height - height) / 2) * 10) / 10,
    width,
    height,
  }
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/** Khung nhìn cục bộ (không đồng bộ): tâm luôn nằm trong vùng bảng. */
export function viewBoxOf({ zoom, cx, cy }) {
  const width = BOARD_WIDTH / zoom
  const height = BOARD_HEIGHT / zoom
  return { x: cx - width / 2, y: cy - height / 2, width, height }
}

export function zoomView(view, nextZoom, anchor) {
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)
  const focus = anchor ?? { x: view.cx, y: view.cy }
  const ratio = view.zoom / zoom
  return {
    zoom,
    cx: clamp(focus.x + (view.cx - focus.x) * ratio, 0, BOARD_WIDTH),
    cy: clamp(focus.y + (view.cy - focus.y) * ratio, 0, BOARD_HEIGHT),
  }
}

export const panView = (view, dx, dy) => ({
  ...view,
  cx: clamp(view.cx - dx, 0, BOARD_WIDTH),
  cy: clamp(view.cy - dy, 0, BOARD_HEIGHT),
})

export const INITIAL_VIEW = {
  zoom: 1,
  cx: BOARD_WIDTH / 2,
  cy: BOARD_HEIGHT / 2,
}

/** Đổi tọa độ màn hình sang tọa độ bảng, đúng cả khi SVG bị letterbox. */
export function clientToBoard(svg, clientX, clientY, view) {
  const ctm = svg.getScreenCTM?.()
  if (ctm && svg.createSVGPoint) {
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const result = point.matrixTransform(ctm.inverse())
    return { x: result.x, y: result.y }
  }
  const rect = svg.getBoundingClientRect()
  const box = viewBoxOf(view)
  return {
    x: box.x + ((clientX - rect.left) / (rect.width || 1)) * box.width,
    y: box.y + ((clientY - rect.top) / (rect.height || 1)) * box.height,
  }
}
