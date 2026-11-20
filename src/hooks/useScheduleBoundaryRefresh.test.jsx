import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useScheduleBoundaryRefresh } from './useScheduleBoundaryRefresh.js'

const status = vi.hoisted(() => ({ value: 'live' }))
vi.mock('../services/realtime.js', () => ({ useRealtimeStatus: () => status.value }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-20T08:00:00Z'))
  status.value = 'live'
})
afterEach(() => vi.useRealTimers())

const at = (seconds) => new Date(Date.now() + seconds * 1000).toISOString()

it('tải lại đúng mốc mở rồi mốc đóng lớp, không polling khi socket live', () => {
  const refresh = vi.fn()
  const items = [{ joinAvailableAt: at(5), joinClosesAt: at(20) }, { startAt: at(-60), endAt: at(-30) }]
  renderHook(() => useScheduleBoundaryRefresh(items, refresh))
  act(() => { vi.advanceTimersByTime(5000) })
  expect(refresh).not.toHaveBeenCalled()
  act(() => { vi.advanceTimersByTime(1000) })
  expect(refresh).toHaveBeenCalledTimes(1)
  act(() => { vi.advanceTimersByTime(15000) })
  expect(refresh).toHaveBeenCalledTimes(2)
  act(() => { vi.advanceTimersByTime(120000) })
  expect(refresh).toHaveBeenCalledTimes(2)
})

it('polling dự phòng khi kênh realtime không live', () => {
  status.value = 'fallback'
  const refresh = vi.fn()
  renderHook(() => useScheduleBoundaryRefresh([], refresh))
  act(() => { vi.advanceTimersByTime(30000) })
  expect(refresh).toHaveBeenCalledTimes(1)
})
